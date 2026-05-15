import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
import re
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
import time
import asyncio
from app.core.config import settings
from pinecone_text.sparse import BM25Encoder
import json

CURATED_FACTS = [
    "Stackular was founded by Jason Storch and Venkat Varkala in 2015.",
    "Stackular is headquartered in Columbia, Maryland, USA with an office in Hyderabad, India.",
    "Contact Stackular at https://www.stackular.com/contact-us",
    "View open job positions at Stackular at https://www.stackular.com/joinus",
    "Stackular's full portfolio of projects is at https://www.stackular.com/portfolio",
    "Stackular's privacy policy is available at https://www.stackular.com/privacy-policy",
]


def hybrid_score_norm(dense, sparse, alpha: float):
    if alpha < 0 or alpha > 1:
        raise ValueError("Alpha must be between 0 and 1")
    hdense = [v * alpha for v in dense]
    hsparse = {
        "indices": sparse["indices"],
        "values": [v * (1 - alpha) for v in sparse["values"]],
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

    content_dir = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
    content_file = os.path.join(content_dir, "knowledge_base.md")
    bm25_path = os.path.join(content_dir, "bm25_params.json")

    if os.path.exists(content_file):
        print(f"  Reading local content from: {content_file}")
        with open(content_file, "r", encoding="utf-8") as f:
            text = f.read()

        sections = re.split(r"\n(?=# )", text)
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
        vectors.append(
            {
                "id": f"chunk_{i}_{int(time.time())}",
                "values": emb.tolist(),
                "sparse_values": sparse,
                "metadata": meta,
            }
        )

    for i in range(0, len(vectors), 100):
        index.upsert(vectors=vectors[i : i + 100])

    print("OK: Re-indexing and Hybrid Vectors ready.")


def retrieve(question: str, index, embedder, top_k: int = 10, alpha: float = 0.7, min_score: float = 0.1) -> list:
    content_dir = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
    bm25_path = os.path.join(content_dir, "bm25_params.json")
    dense = embedder.encode([question]).tolist()[0]

    if os.path.exists(bm25_path):
        try:
            bm25 = BM25Encoder().load(bm25_path)
            sparse = bm25.encode_queries(question)
            hdense, hsparse = hybrid_score_norm(dense, sparse, alpha=alpha)
            results = index.query(
                vector=hdense, sparse_vector=hsparse, top_k=top_k, include_metadata=True
            )
        except Exception as e:
            print(f"  WARNING: Hybrid search failed ({e}). Falling back to dense-only. "
                  "Recreate the Pinecone index with dotproduct metric to enable hybrid search.")
            results = index.query(vector=dense, top_k=top_k, include_metadata=True)
    else:
        results = index.query(vector=dense, top_k=top_k, include_metadata=True)

    matches = [m for m in results["matches"] if m.get("score", 0) >= min_score]
    return [match["metadata"] for match in matches]


CHAT_HISTORY = {}


def get_history(session_id: str, limit: int = 5) -> str:
    if not session_id or session_id not in CHAT_HISTORY:
        return ""
    history_items = CHAT_HISTORY[session_id][-limit:]
    if not history_items:
        return ""
    formatted = "\n--- Recent Conversation History ---\n"
    for turn in history_items:
        formatted += f"Visitor: {turn['q']}\nAssistant: {turn['a']}\n"
    return formatted


def _build_prompt(question: str, context: str, history_context: str) -> str:
    few_shot = (
        'Visitor: "What services does Stackular offer?"\n'
        "Assistant: We offer five core service areas, each built to drive measurable business outcomes:\n\n"
        "- **Cloud Infrastructure** — Cloud automation, modernization, and managed services across AWS, Azure, and GCP.\n"
        "- **Digital Experience** — UI/UX design, usability testing, branding, and UX research.\n"
        "- **Data Intelligence** — AI solutions, business intelligence, and data visualization.\n"
        "- **Enterprise Systems** — Data platform modernization, business process automation, CRM, and managed services.\n"
        "- **Product Development** — AI-driven development with agile methodology and post-launch ownership.\n\n"
        "We tailor every engagement to the client's industry and goals.\n\n"
        "[Services Page](https://www.stackular.com/services/)"
    )
    off_topic = (
        "My expertise is focused on Stackular's services, industries, and company. "
        "For anything else, here's how to reach the team: "
        "[Contact Stackular](https://www.stackular.com/contact-us)"
    )
    # Constraints are front-loaded before context so the LLM internalises rules
    # before reading any retrieved content (reduces rule drift on longer answers).
    return (
        'You are an AI Assistant for Stackular, a premier software consulting and development firm. '
        'Speak on behalf of Stackular using "we" and "our" — never "I" or "the company".\n'
        "Your goal is to provide comprehensive, professional, and helpful responses to visitors.\n\n"
        "---\n"
        "## RESPONSE RULES (read and apply before using any context below)\n\n"
        "1. **Depth & Quality:** Provide detailed answers (1-3 paragraphs if needed) that fully address "
        "the visitor's query using the provided context. Avoid overly brief responses unless it is a simple greeting.\n"
        "2. **Professional Tone:** Maintain a helpful, high-end consulting firm voice. Be clear, authoritative, and welcoming.\n"
        '3. **Pronoun Resolution:** When users say "you", "this company", or "the firm", they are referring to Stackular.\n'
        "4. **Citations & Links:**\n"
        "   - If the information is specific to a service, project, or company detail, cite the source.\n"
        '   - At the end of your response, if relevant sources were used, add a "Learn More" section with markdown links.\n'
        "   - Example: For more details, visit our [Services Page](https://www.stackular.com/services/).\n"
        "5. **Off-topic:** If the question is entirely unrelated to Stackular or professional services, respond exactly:\n"
        f'"{off_topic}"\n'
        "6. **Formatting (CRITICAL — never deviate):**\n"
        "   - Never write massive, continuous blocks of text. Break your responses into distinct, short paragraphs "
        "(1-3 sentences maximum per paragraph).\n"
        '   - Whenever you list more than two items, you MUST format them as a vertical bulleted list using "- " prefix, '
        "each item on its own line.\n"
        "7. Any URL provided MUST be formatted as a markdown hyperlink: `[Link Description](URL)`. Only include a link if:\n"
        "  (a) Asking about contact, careers, portfolio, or services.\n"
        "  (b) Providing a specific URL citation based on the context.\n"
        "8. Place hyperlinks on a new line at the very end of your response.\n\n"
        "---\n"
        "## CONTEXTUAL INFORMATION\n"
        f"{history_context}\n\n"
        "### Context from Stackular's website:\n"
        f"{context}\n\n"
        "---\n"
        "## EXAMPLE RESPONSE FORMAT (mirror this structure exactly)\n\n"
        f"{few_shot}\n\n"
        "---\n\n"
        f"Visitor's question: {question}\n\n"
        "Before responding, verify: does this answer the visitor's specific question? "
        "If the provided context is insufficient, say so directly rather than guessing.\n\n"
        "Answer:"
    )


async def rag_stream_answer(question: str, index, embedder, session_id: str = None):
    results = retrieve(question, index, embedder)

    context_parts = [
        f"Content: {res['text']}\nSource: {res['source']}" for res in results
    ]
    context = "\n\n---\n\n".join(context_parts)
    history_context = get_history(session_id)

    prompt = _build_prompt(question, context, history_context)
    llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=settings.GROQ_API_KEY, temperature=0.3)

    full_answer = ""
    async for chunk in llm.astream([HumanMessage(content=prompt)]):
        content = chunk.content
        full_answer += content
        yield content

    if session_id:
        if session_id not in CHAT_HISTORY:
            CHAT_HISTORY[session_id] = []
        CHAT_HISTORY[session_id].append({"q": question, "a": full_answer})
        if len(CHAT_HISTORY[session_id]) > 10:
            CHAT_HISTORY[session_id].pop(0)
