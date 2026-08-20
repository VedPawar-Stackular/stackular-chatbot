# Stackular Chatbot — High-Level Architecture

A 30,000-foot view of the system. Use this for the "walk me through your project" opener before diving into the detailed diagram ([ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)).

---

## 1. The Big Picture

Four systems, three connections between them:

```mermaid
flowchart LR
    User(["👤 Website Visitor"])
    FE["🖥️ Frontend\nNext.js Chat Widget"]
    BE["⚙️ Backend\nFastAPI RAG Service"]
    AI["🧠 AI Layer\nEmbeddings + LLM"]
    DB[("📚 Knowledge Store\nPinecone Vector DB")]

    User -- "asks a question" --> FE
    FE -- "REST + streaming" --> BE
    BE -- "search" --> DB
    BE -- "generate answer" --> AI
    AI -- "streamed tokens" --> BE
    BE -- "SSE stream" --> FE
    FE -- "live-typing answer" --> User

    style User fill:#1d6ef5,stroke:#fff,color:#fff
    style FE fill:#0f1729,stroke:#1d6ef5,color:#fff
    style BE fill:#0f1729,stroke:#1d6ef5,color:#fff
    style AI fill:#1a1035,stroke:#8b5cf6,color:#fff
    style DB fill:#1a1035,stroke:#8b5cf6,color:#fff
```

That's the whole product. Everything else is detail on top of these four boxes.

---

## 2. Four Layers, Four Jobs

```mermaid
flowchart TB
    subgraph L1["1️⃣ Presentation Layer"]
        A["Chat widget on the website\nCollects question, shows streamed answer"]
    end

    subgraph L2["2️⃣ API / Orchestration Layer"]
        B["FastAPI server\nRoutes requests, enforces limits,\ncoordinates the RAG pipeline"]
    end

    subgraph L3["3️⃣ Retrieval Layer"]
        C["Hybrid search + reranking\nFinds the right knowledge chunks\nfor the question"]
    end

    subgraph L4["4️⃣ Generation Layer"]
        D["LLM (Groq)\nTurns retrieved facts + question\ninto a written answer"]
    end

    L1 -->|"question"| L2
    L2 -->|"query"| L3
    L3 -->|"relevant chunks"| L4
    L4 -->|"generated answer"| L2
    L2 -->|"streamed response"| L1

    style L1 fill:#0b1220,stroke:#1d6ef5,color:#fff
    style L2 fill:#0f1729,stroke:#1d6ef5,color:#fff
    style L3 fill:#1a1035,stroke:#8b5cf6,color:#fff
    style L4 fill:#1a1035,stroke:#8b5cf6,color:#fff
```

Each layer has exactly one job. This separation is the thing to emphasize in an interview — it's why the system is testable, swappable, and debuggable (e.g., swap Groq for OpenAI without touching retrieval; swap Pinecone for another vector DB without touching the LLM call).

---

## 3. Two Journeys Through the System

Every RAG system has exactly two paths data takes. Naming both, unprompted, is the single strongest signal of understanding the pattern (not just having copied a tutorial).

```mermaid
flowchart TB
    subgraph Journey1["🔵 Journey 1 — Content goes IN (rare, admin-triggered)"]
        direction LR
        KB["Knowledge base\n(markdown file)"] --> Chunk["Split into chunks"] --> Embed["Convert to vectors"] --> Store["Store in Pinecone"]
    end

    subgraph Journey2["🟢 Journey 2 — Question comes THROUGH (constant, visitor-triggered)"]
        direction LR
        Q["Visitor question"] --> Search["Search Pinecone\nfor relevant chunks"] --> Gen["LLM writes answer\nusing those chunks"] --> Ans["Answer streams\nback to visitor"]
    end

    style Journey1 fill:#1a1035,stroke:#8b5cf6,color:#fff
    style Journey2 fill:#0f1729,stroke:#1d6ef5,color:#fff
```

- **Journey 1** happens maybe once a week, when someone edits company content.
- **Journey 2** happens on every single chat message.

They share the vector database as the handoff point — Journey 1 fills it, Journey 2 reads from it. This is the core insight of RAG: **the LLM never "learns" the company's content**; it's handed the relevant slice fresh on every request.

---

## 4. Core Concepts to Know Cold

| Concept | One-line definition | Where it lives here |
|---|---|---|
| **RAG** | Look up relevant info first, then have the LLM write an answer using it | The whole architecture |
| **Embedding** | Turning text into a list of numbers that captures its meaning | Frontend question → vector, before search |
| **Vector database** | A database built to find "similar" vectors fast, at scale | Pinecone |
| **Hybrid search** | Combining meaning-based search with keyword-based search | Retrieval layer |
| **Reranking** | A second, smarter pass that re-orders search results by true relevance | Retrieval layer, after hybrid search |
| **Prompt engineering** | Writing careful instructions so the LLM answers in the right tone/format/scope | Generation layer |
| **Streaming response** | Sending the answer word-by-word instead of waiting for the whole thing | Backend → Frontend (SSE) |
| **Rate limiting** | Capping how many requests one visitor can send, to prevent abuse | API layer |

If your friend can define each of these in one sentence and point at the box on the diagram where it lives, that covers 90% of what a RAG-focused interview question will probe.

---

## 5. What Connects to What (in plain English)

```mermaid
flowchart TB
    Widget["Chat Widget"] -->|"1. sends question"| API["FastAPI Server"]
    API -->|"2. checks: too many requests?"| Limiter["Rate Limiter"]
    API -->|"3. turns question into a vector"| Embedder["Embedding Model"]
    API -->|"4. finds matching content"| Pinecone["Pinecone (Vector DB)"]
    API -->|"5. re-scores top matches"| Reranker["Reranker"]
    API -->|"6. writes the answer"| LLM["Groq LLM"]
    LLM -->|"7. streams words back"| API
    API -->|"8. forwards the stream"| Widget

    style Widget fill:#0b1220,stroke:#1d6ef5,color:#fff
    style API fill:#0f1729,stroke:#1d6ef5,color:#fff
    style Limiter fill:#1a1035,stroke:#8b5cf6,color:#fff
    style Embedder fill:#1a1035,stroke:#8b5cf6,color:#fff
    style Pinecone fill:#1a1035,stroke:#8b5cf6,color:#fff
    style Reranker fill:#1a1035,stroke:#8b5cf6,color:#fff
    style LLM fill:#1a1035,stroke:#8b5cf6,color:#fff
```

Numbered so it can be narrated top to bottom exactly as drawn.

---

## 6. Why It's Built This Way (design reasoning, not just "what")

- **Why not just fine-tune an LLM on company content?** Fine-tuning is expensive, slow to update, and can't cite sources. RAG updates instantly (edit the markdown, reindex) and every answer is traceable back to a real document.
- **Why hybrid search instead of just embeddings?** Pure semantic search misses exact terms — company names, acronyms, job titles. Keyword search misses paraphrasing. Combining both covers more real questions.
- **Why rerank after search?** Initial search is optimized for speed over large data (cast a wide net). Reranking is slower but smarter, so it's only run on the small shortlist — best of both.
- **Why stream the answer instead of waiting for the full response?** Perceived speed. An LLM answer can take 3-5 seconds to fully generate; streaming shows the first words almost immediately.
- **Why separate ingestion from querying?** Ingestion is a heavy, occasional batch job (re-embedding a whole knowledge base). Querying must be fast and cheap on every request. Coupling them would make every chat message slow.

---

## 7. How to Present This in an Interview

1. Start with **Section 1** — the four-box picture. Get the interviewer oriented in 15 seconds.
2. Name the **two journeys** (Section 3) before anything else — it immediately signals "I understand RAG, not just glue code."
3. Walk the **numbered connections** (Section 5) as the request lifecycle.
4. If asked "why this design" for any piece, answer from **Section 6** — reasoning beats description.
5. Only go into implementation specifics (chunk sizes, alpha weights, exact model names) if asked — that's what [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) covers.
