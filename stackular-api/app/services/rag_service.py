from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time
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

def build_index_if_empty(index, embedder):
    stats = index.describe_index_stats()
    vector_count = stats.get("total_vector_count", 0)

    if vector_count > 0:
        print(f"OK: Pinecone index already has {vector_count} vectors. Skipping scrape.")
        return

    print("Building RAG index...")
    raw_texts = []
    for url in STACKULAR_PAGES:
        print(f"  Scraping: {url}")
        text = scrape_page(url)
        if text:
            raw_texts.append(text)

    raw_texts.extend(CURATED_FACTS)

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50, separators=["\n\n", "\n", ".", " "])
    all_chunks = []
    for text in raw_texts:
        all_chunks.extend(splitter.split_text(text))

    print(f"  Total chunks: {len(all_chunks)}")
    embeddings = embedder.encode(all_chunks, show_progress_bar=True)

    vectors = [
        {"id": f"chunk_{i}", "values": emb.tolist(), "metadata": {"text": chunk}}
        for i, (chunk, emb) in enumerate(zip(all_chunks, embeddings))
    ]

    for i in range(0, len(vectors), 100):
        index.upsert(vectors=vectors[i:i+100])

    print("OK: RAG index ready.")

def retrieve(question: str, index, embedder, top_k: int = 3) -> list:
    q_embedding = embedder.encode([question]).tolist()[0]
    results = index.query(vector=q_embedding, top_k=top_k, include_metadata=True)
    return [match["metadata"]["text"] for match in results["matches"]]

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

def rag_answer(question: str, index, embedder, session_id: str = None) -> str:
    chunks = retrieve(question, index, embedder)
    context = "\n\n".join(chunks)
    
    history_context = get_history(session_id)

    question_lower = question.lower()
    relevant_url = next((url for keyword, url in SOURCE_URLS.items() if keyword in question_lower), "https://www.stackular.com")

    text = "My expertise is focused on Stackular's services, industries, and company. For anything else, here's how to reach the team: [Contact Stackular](https://www.stackular.com/contact-us)"

    prompt = f"""You are a concise, friendly assistant embedded on the Stackular website.
Stackular is a software consulting and development company. 

CRITICAL: When the user says "this company", "we", "our", "you guys", or "the firm", they are referring to Stackular. Always assume the context is Stackular unless explicitly stated otherwise.
Use the "Recent Conversation History" below to understand context, resolve pronouns (like "he", "they", "it"), and provide a cohesive experience.

You help website visitors — potential clients, job applicants, or general visitors — get clear answers about Stackular.

{history_context}

---
## RESPONSE RULES

### RULE 1 — Answer length
- Always answer in 1–2 sentences maximum.
- Never pad answers with phrases like "you can find more information" UNLESS specifically asked for a link or contact.
- For greetings, respond warmly in one sentence.

### RULE 2 — Links & Hyperlinks
- Any URL provided MUST be formatted as a markdown hyperlink: `[Link Description](URL)`. 
- Only include a link if:
  (a) Asking about contact, careers, portfolio, or services.
  (b) The context points to a specific page for more details.
  (c) The visitor asks "where can I learn more".

### RULE 3 — Link placement
- Place hyperlinks on a new line AFTER the initial answer.

### RULE 4 — Lists
- Use bullet points only when listing 2 or more items.

### RULE 5 — Off-topic questions
- If the question is entirely unrelated to Stackular or professional services, respond exactly:
"{text}"

### RULE 6 — Missing information
- If the provided context does not contain the specific answer, state that "the details are not explicitly mentioned in my current records" and provide a relevant link to the Stackular website (e.g., Contact or About page) in markdown format.

### RULE 7 - Context Assumption
- If the user asks a question like "Who founded this company?" or "What do you do?", answer based on Stackular's information provided in the context.

---
## EXAMPLES

Q: Hi
A: Hello! Welcome to Stackular — feel free to ask me anything about our services or team. 👋

Q: Who founded this company?
A: Stackular was founded by Jason Storch and Venkat Varkala in 2015.

Q: How can I contact you?
A: You can reach the Stackular team directly through our contact page:
[Contact Stackular](https://www.stackular.com/contact-us)

---
Context from Stackular's website:
{context}

Visitor's question: {question}

Answer:"""

    llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=settings.GROQ_API_KEY, temperature=0.7)
    response = llm.invoke([HumanMessage(content=prompt)])
    answer = response.content

    # Store in history if session exists
    if session_id:
        if session_id not in CHAT_HISTORY:
            CHAT_HISTORY[session_id] = []
        CHAT_HISTORY[session_id].append({"q": question, "a": answer})
        # Keep history manageable
        if len(CHAT_HISTORY[session_id]) > 10:
            CHAT_HISTORY[session_id].pop(0)

    return answer
