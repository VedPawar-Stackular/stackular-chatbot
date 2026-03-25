# rag.py

from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from pinecone import Pinecone
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import os
import time
from langchain_openai import ChatOpenAI

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
        driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=options
        )
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

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " "]
    )
    all_chunks = []
    for text in raw_texts:
        all_chunks.extend(splitter.split_text(text))

    print(f"  Total chunks: {len(all_chunks)}")
    embeddings = embedder.encode(all_chunks, show_progress_bar=True)

    vectors = [
        {
            "id": f"chunk_{i}",
            "values": emb.tolist(),
            "metadata": {"text": chunk}
        }
        for i, (chunk, emb) in enumerate(zip(all_chunks, embeddings))
    ]

    for i in range(0, len(vectors), 100):
        index.upsert(vectors=vectors[i:i+100])

    print("OK: RAG index ready.")


def retrieve(question: str, index, embedder, top_k: int = 3) -> list[str]:
    q_embedding = embedder.encode([question]).tolist()[0]
    results = index.query(
        vector=q_embedding,
        top_k=top_k,
        include_metadata=True
    )
    return [match["metadata"]["text"] for match in results["matches"]]


def rag_answer(question: str, index, embedder) -> str:
    chunks = retrieve(question, index, embedder)
    context = "\n\n".join(chunks)

    question_lower = question.lower()
    relevant_url = next(
        (url for keyword, url in SOURCE_URLS.items() if keyword in question_lower),
        "https://www.stackular.com"
    )

    text = "My expertise is focused on Stackular's services, industries, and company. For anything else, here's how to reach the team: [Contact Stackular](https://www.stackular.com/contact-us)"

    prompt = f"""You are a concise, friendly assistant embedded on the Stackular website.
Stackular is a software consulting and development company based in Columbia, Maryland, USA and Hyderabad, India.

You help website visitors — potential clients, job applicants, or general visitors — get clear answers about Stackular.

---

## RESPONSE RULES

### RULE 1 — Answer length
- Always answer in 1–2 sentences maximum.
- Never pad answers with phrases like "you can find more information", "feel free to contact us", or "visit our website" UNLESS the visitor explicitly asks for contact details or more information.
- For greetings (Hi, Hello, Hey, etc.), respond warmly in one sentence only. No company pitch. No links.

### RULE 2 — Links are conditional, not automatic
Only include a link if ONE of these is true:
  (a) The visitor is asking about contact, careers, or privacy — use the designated links below.
  (b) The context is incomplete and the link will directly answer what was asked.
  (c) The visitor explicitly asks "where can I learn more" or similar.

NEVER append a link just to be helpful. If the answer is in the context, the answer alone is sufficient.

Designated links (use ONLY when condition above is met):
- Contact questions → [Contact Stackular](https://www.stackular.com/contact-us#:~:text=info%40stackular.com,888)%20278%2D8667)
- Career questions → [View open positions](https://www.stackular.com/joinus#:~:text=OUR%20CURRENT%20OPENINGS)
- Privacy/data questions → [Privacy Policy](https://www.stackular.com/privacy-policy)
- Portfolio questions → [View Portfolio](https://www.stackular.com/portfolio)

### RULE 3 — Link placement
When a link IS needed, place it on a new line AFTER the answer. Never embed it inside the answer sentence.

### RULE 4 — Lists
Use bullet points only when listing 3 or more items. Never for single items.

### RULE 5 — Off-topic questions
If the question is unrelated to Stackular, respond with exactly:
"{text}"

### RULE 6 — Missing information
If the context does not contain the answer, say so briefly and point to the most relevant page. Never say "I don't have that information" in isolation.

---

## EXAMPLES (follow these exactly)

Q: Hi
A: Hello! Welcome to Stackular — feel free to ask me anything about our services or company. 👋

Q: Where is Stackular located in India?
A: Stackular's India office is located in Hyderabad.

Q: Where is Stackular?
A: Stackular is headquartered in Columbia, Maryland, USA, with an office in Hyderabad, India.

Q: What projects has Stackular done?
A: Stackular has worked across industries including Commercial and Hospitality, with projects featuring redesigned interfaces, unified entry points, and expanded offerings.
[View Portfolio](https://www.stackular.com/portfolio)

Q: How can I contact Stackular?
A: You can reach the Stackular team directly here:
[Contact Stackular](https://www.stackular.com/contact-us#:~:text=info%40stackular.com,888)%20278%2D8667)

Q: What is the weather today?
A: My expertise is focused on Stackular's services, industries, and company. For anything else, here's how to reach the team: [Contact Stackular](https://www.stackular.com/contact-us)

---

Context from Stackular's website:
{context}

Visitor's question: {question}

Answer:"""

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.7
    )

    # llm = ChatOpenAI(
    #     model="google/gemini-2.0-flash-exp:free",
    #     openai_api_key=os.getenv("OPENROUTER_API_KEY"),
    #     openai_api_base="https://openrouter.ai",
    #     temperature=0.7
    # )
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content