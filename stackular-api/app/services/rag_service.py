import os
from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter
import re
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time
import asyncio
from app.core.config import settings

STACKULAR_PAGES = [
    "https://www.stackular.com/",
    "https://www.stackular.com/services/",
    "https://www.stackular.com/about",
    "https://www.stackular.com/industries",
    "https://www.stackular.com/portfolio",
    "https://www.stackular.com/joinus",
    "https://www.stackular.com/contact-us",
    "https://www.stackular.com/privacy-policy",
    "https://www.stackular.com/portfolio/ap-automation-for-global-hospitality-organization",
    "https://www.stackular.com/portfolio/case-management-system-for-healthcare-services-company",
    "https://www.stackular.com/portfolio/ux-redesign-for-international-rideshare-company",
    "https://www.stackular.com/portfolio/extranet-modernization-for-global-hospitality-organization",
    "https://www.stackular.com/portfolio/modern-data-platform-for-healthcare-services-company",
    "https://www.stackular.com/portfolio/procure-to-pay-app-modernization-for-global-hospitality-organization",
]

CURATED_FACTS = [
    "Stackular was founded by Jason Storch and Venkat Varkala in 2015.",
    "Stackular is headquartered in Columbia, Maryland, USA with an office in Hyderabad, India.",
    "Contact Stackular at https://www.stackular.com/contact-us",
    "View open job positions at Stackular at https://www.stackular.com/joinus",
    "Stackular's full portfolio of projects is at https://www.stackular.com/portfolio",
    "Stackular's privacy policy is available at https://www.stackular.com/privacy-policy",
]

SOURCE_URLS = {
    "contact": "https://www.stackular.com/contact-us",
    "careers": "https://www.stackular.com/joinus",
    "jobs": "https://www.stackular.com/joinus",
    "privacy": "https://www.stackular.com/privacy-policy",
    "portfolio": "https://www.stackular.com/portfolio",
    "services": "https://www.stackular.com/services/",
    "about": "https://www.stackular.com/about",
}

def scrape_page(url: str) -> str:
    try:
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        driver.get(url)
        time.sleep(3)
        soup = BeautifulSoup(driver.page_source, "html.parser")
        driver.quit()
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        return soup.get_text(separator=" ", strip=True)
    except Exception as e:
        print(f"Failed to scrape {url}: {e}")
        return ""

from pinecone_text.sparse import BM25Encoder
import json

def hybrid_score_norm(dense, sparse, alpha: float):
    """Hybrid score using convex combination."""
    if alpha < 0 or alpha > 1:
        raise ValueError("Alpha must be between 0 and 1")
    hdense = [v * alpha for v in dense]
    hsparse = {
        'indices': sparse['indices'],
        'values':  [v * (1 - alpha) for v in sparse['values']]
    }
    return hdense, hsparse

def build_index_if_empty(index, embedder, force: bool = False):
    stats = index.describe_index_stats()
    vector_count = stats.get("total_vector_count", 0)

    if vector_count > 0 and not force:
        print(f"OK: Pinecone index already has {vector_count} vectors. Skipping scrape.")
        return

    if force:
        print("Force re-indexing: Cleaning existing vectors...")
        try:
            index.delete(delete_all=True)
        except Exception as e:
            print(f"  Note: Namespace clear skipped or already empty: {e}")

    print("Building RAG index from local markdown file...")
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=100)
    
    all_chunks = []
    metadatas = []

    content_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    content_file = os.path.join(content_dir, "knowledge_base.md")
    bm25_path = os.path.join(content_dir, "bm25_params.json")
    
    if os.path.exists(content_file):
        print(f"  Reading local content from: {content_file}")
        with open(content_file, "r", encoding="utf-8") as f:
            text = f.read()
        
        sections = re.split(r'\n(?=# )', text)
        
        for section in sections:
            if not section.strip():
                continue
            
            source_match = re.search(r"> \[Source:\s*(https?://[^\s\]]+)\]", section)
            source_url = source_match.group(1) if source_match else "Stackular Official Website"
            
            clean_text = re.sub(r"> \[Source:.*?\]\n?", "", section)
            clean_text = re.sub(r"> \[Category:.*?\]\n?", "", clean_text)
            
            splits = text_splitter.split_text(clean_text)
            for split in splits:
                all_chunks.append(split)
                metadatas.append({"text": split, "source": source_url})
    else:
        print(f"  WARNING: Local content file not found at {content_file}. Skipping local ingestion.")

    for fact in CURATED_FACTS:
        chunks = text_splitter.split_text(fact)
        all_chunks.extend(chunks)
        metadatas.extend([{"text": c, "source": "Company Fact Sheet"} for c in chunks])

    print(f"  Total chunks: {len(all_chunks)}")
    
    print("Fitting BM25 Model for Sparse Vectors...")
    bm25 = BM25Encoder()
    bm25.fit(all_chunks)
    bm25.dump(bm25_path)
    
    embeddings = embedder.encode(all_chunks, show_progress_bar=True)
    sparse_embeddings = bm25.encode_documents(all_chunks)

    vectors = []
    for i, (emb, meta, sparse) in enumerate(zip(embeddings, metadatas, sparse_embeddings)):
        vectors.append({
            "id": f"chunk_{i}_{int(time.time())}", 
            "values": emb.tolist(), 
            "sparse_values": sparse,
            "metadata": meta
        })

    for i in range(0, len(vectors), 100):
        index.upsert(vectors=vectors[i:i+100])

    print("OK: Re-indexing and Hybrid Vectors ready.")

def retrieve(question: str, index, embedder, top_k: int = 10, alpha: float = 0.7) -> list:
    content_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    bm25_path = os.path.join(content_dir, "bm25_params.json")
    
    dense = embedder.encode([question]).tolist()[0]
    
    if os.path.exists(bm25_path):
        bm25 = BM25Encoder().load(bm25_path)
        sparse = bm25.encode_queries(question)
        hdense, hsparse = hybrid_score_norm(dense, sparse, alpha=alpha)
        
        results = index.query(
            vector=hdense, 
            sparse_vector=hsparse, 
            top_k=top_k, 
            include_metadata=True
        )
    else:
        results = index.query(vector=dense, top_k=top_k, include_metadata=True)
        
    return [match["metadata"] for match in results["matches"]]

# In-memory session-based chat history store
CHAT_HISTORY = {}

def get_history(session_id: str, limit: int = 3) -> str:
    if not session_id or session_id not in CHAT_HISTORY:
        return ""
    
    history_items = CHAT_HISTORY[session_id][-limit:]
    if not history_items:
        return ""
        
    formatted = "\n--- Recent Conversation History ---\n"
    for turn in history_items:
        formatted += f"Visitor: {turn['q']}\nAssistant: {turn['a']}\n"
    return formatted

async def rag_stream_answer(question: str, index, embedder, session_id: str = None):
    results = retrieve(question, index, embedder)
    
    # Format context with sources
    context_parts = []
    for res in results:
        context_parts.append(f"Content: {res['text']}\nSource: {res['source']}")
            
    context = "\n\n---\n\n".join(context_parts)
    history_context = get_history(session_id)
    text = "My expertise is focused on Stackular's services, industries, and company. For anything else, here's how to reach the team: [Contact Stackular](https://www.stackular.com/contact-us)"
    prompt = f"""You are a senior AI Assistant for Stackular, a premier software consulting and development firm. 
Your goal is to provide comprehensive, professional, and helpful responses to visitors.

---
## CONTEXTUAL INFORMATION
{history_context}

### Context from Stackular's website:
{context}

---
## RESPONSE GUIDELINES

1. **Depth & Quality:** Provide detailed answers (1-3 paragraphs if needed) that fully address the visitor's query using the provided context. Avoid overly brief responses unless it's a simple greeting.
2. **Professional Tone:** Maintain a helpful, high-end consulting firm "voice". Be clear, authoritative, and welcoming.
3. **Pronoun Resolution:** When users say "you", "this company", or "the firm", they are referring to Stackular.
4. **Citations & Links:** 
   - If the information is specific to a service, project, or company detail, cite the source.
   - At the end of your response, if relevant sources were used, add a "Learn More" section with markdown links.
   - Example: For more details, visit our [Services Page](https://www.stackular.com/services/).
5. **Off-topic:** If the question is entirely unrelated to Stackular or professional services, respond exactly:
"{text}"
6. **Formatting constraints for readability (CRITICAL):** 
   - Never write massive, continuous blocks of text. Break your responses into distinct, short paragraphs (1-3 sentences maximum per paragraph).
   - Whenever you list more than two items (e.g., a list of services or features), you MUST format them as a vertical bulleted list, each on its own line.
7. Any URL provided MUST be formatted as a markdown hyperlink: `[Link Description](URL)`. Only include a link if:
  (a) Asking about contact, careers, portfolio, or services.
  (b) Providing a specific URL citation based on the context.
8. Place hyperlinks on a new line at the very end of your response.

Visitor's question: {question}

Answer:"""

    llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=settings.GROQ_API_KEY, temperature=0.7)
    
    full_answer = ""
    async for chunk in llm.astream([HumanMessage(content=prompt)]):
        content = chunk.content
        full_answer += content
        yield content
        await asyncio.sleep(0.1)  # Increase to slow down, decrease to speed up

    # Store in history if session exists after stream finished
    if session_id:
        if session_id not in CHAT_HISTORY:
            CHAT_HISTORY[session_id] = []
        CHAT_HISTORY[session_id].append({"q": question, "a": full_answer})
        if len(CHAT_HISTORY[session_id]) > 10:
            CHAT_HISTORY[session_id].pop(0)

def rag_answer(question: str, index, embedder, session_id: str = None) -> str:
    # Keep the synchronous version for compatibility if needed, 
    # but we'll primarily use the stream in the route.
    import asyncio
    
    async def get_all():
        ans = ""
        async for chunk in rag_stream_answer(question, index, embedder, session_id):
            ans += chunk
        return ans
    
    return asyncio.run(get_all())
