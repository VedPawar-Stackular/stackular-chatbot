# Stackular Demo — Project Context for Claude

## Project Overview

An AI-powered RAG chatbot for the Stackular website. Visitors can ask questions about Stackular's services, company info, and portfolio. The bot retrieves relevant context from a local knowledge base and generates streaming answers via an LLM.

**Current branch:** `text_rag` (active development)  
**Main branch:** `main`

---

## Architecture

### High-Level Flow

```
User query → Next.js frontend → FastAPI backend → Pinecone (hybrid vector search)
                                                         ↓
                                               Retrieved context chunks
                                                         ↓
                                             Groq (Llama 3.3 70B) LLM → Streaming response
```

### Data Ingestion Flow

```
knowledge_base.md (local markdown) → Chunked (600 chars / 100 overlap)
                                    → Dense embeddings: BAAI/bge-small-en (384 dims)
                                    → Sparse embeddings: BM25Encoder (pinecone-text)
                                    → Hybrid upsert to Pinecone index "bge-small-en"
                                    → BM25 params saved to bm25_params.json (root)
```

---

## Directory Structure

```
Stackular_Demo/
├── CLAUDE.md                    ← this file
├── README.md                    ← setup instructions
├── package.json                 ← root scripts: `npm run dev:all` starts both services
├── knowledge_base.md            ← source-of-truth content for RAG (manual markdown)
├── bm25_params.json             ← fitted BM25 sparse encoder params (auto-generated)
├── manual_reindex.py            ← standalone reindex script (uses bge-large-en-v1.5)
├── verify_rag.py                ← test retrieval quality
├── verify_response.py           ← test end-to-end response quality
├── interaction.md               ← example Q&A showing desired output format
├── project_review.txt           ← senior dev review with roadmap recommendations
│
├── stackular-api/               ← FastAPI backend (Python 3.14, venv at .venv/)
│   ├── main.py                  ← FastAPI app entry point (lazy-loads models on first request)
│   ├── reindex.py               ← in-package reindex helper
│   ├── requirements.txt
│   ├── .env                     ← GROQ_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME
│   └── app/
│       ├── core/config.py       ← Settings class (reads .env)
│       ├── models/schemas.py    ← ChatRequest (question, session_id), ChatResponse
│       ├── api/
│       │   ├── deps.py          ← get_embedder() + get_index() (cached globals, lazy init)
│       │   ├── main.py          ← APIRouter aggregator
│       │   └── routes/
│       │       ├── chat.py      ← POST /chat → StreamingResponse (text/event-stream)
│       │       ├── health.py    ← GET /health → vector count
│       │       └── admin.py     ← POST /admin/reindex → background reindex task
│       └── services/
│           └── rag_service.py   ← core RAG logic (see below)
│
└── stackular-frontend/          ← Next.js 14 frontend (App Router)
    ├── .env.local               ← NEXT_PUBLIC_CHATBOT_API_URL=http://localhost:8000
    ├── app/
    │   ├── layout.js            ← RootLayout: loads Inter font, mounts ChatWidget globally
    │   └── page.js              ← Home page: Navbar, HeroSection, WorldMapSection, ClientLogosSection
    └── components/
        ├── chat/ChatWidget.jsx  ← floating chat bubble + panel (self-contained, all inline styles)
        ├── home/HeroSection.jsx
        ├── home/WorldMapSection.jsx
        ├── home/ClientLogosSection.jsx
        └── layout/Navbar.jsx
```

---

## Key Files — Details

### `stackular-api/app/services/rag_service.py`

The core of the system:

- **`STACKULAR_PAGES`** — list of 14 Stackular URLs (legacy, was used for Selenium scraping; now superseded by `knowledge_base.md`)
- **`CURATED_FACTS`** — 6 hardcoded facts always appended to the index (founders, HQ, key URLs)
- **`build_index_if_empty(index, embedder, force=False)`** — reads `knowledge_base.md`, splits into chunks, fits BM25, encodes dense+sparse, upserts to Pinecone. Skips if index already populated (unless `force=True`).
- **`retrieve(question, index, embedder, top_k=10, alpha=0.7)`** — hybrid search: alpha=0.7 weights dense 70%, sparse 30%
- **`CHAT_HISTORY`** — in-memory dict keyed by session_id; keeps last 10 turns, injects last 3 into prompt
- **`rag_stream_answer(question, index, embedder, session_id)`** — async generator; retrieves context, formats prompt, streams from Groq LLM, appends to history after completion
- **System prompt** — strict persona, 8 response rules (depth, tone, pronoun resolution, citations, off-topic handling, formatting, links)

### `stackular-api/app/api/deps.py`

- Lazy-loaded singleton globals: `_embedder` (SentenceTransformer) and `_index` (Pinecone)
- **Pinecone index name:** `"bge-small-en"` (hardcoded in `get_index()`, separate from `PINECONE_INDEX_NAME` setting)
- **Embedding model:** `BAAI/bge-small-en` (384-dim) — NOTE: `manual_reindex.py` at root uses `bge-large-en-v1.5` (1024-dim), which is inconsistent

### `stackular-frontend/components/chat/ChatWidget.jsx`

- Floating blue bubble (bottom-right, fixed position)
- Session ID generated on mount (`Math.random` + `Date.now`)
- Reads stream chunks incrementally, updating the last bot message in place
- Suggestion chips: "What services do you offer?", "Who founded Stackular?", "Open positions", "Contact Information" — hidden after first use
- Voice input via Web Speech API (`SpeechRecognition`)
- Custom markdown renderer for `**bold**` and `[link](url)` — no external markdown library
- No external UI library; all inline styles with dark theme (`#060b14` background, `#1d6ef5` blue)

---

## Models & Infrastructure

| Component | Value |
|---|---|
| LLM | `llama-3.3-70b-versatile` via Groq API |
| Embedding (runtime) | `BAAI/bge-small-en` (384-dim, local via sentence-transformers) |
| Embedding (manual_reindex) | `BAAI/bge-large-en-v1.5` (1024-dim) — **inconsistency with runtime** |
| Vector DB | Pinecone (serverless, AWS us-east-1, dotproduct metric) |
| Sparse vectors | BM25 via `pinecone-text` |
| Backend | FastAPI + Uvicorn (port 8000) |
| Frontend | Next.js 14 App Router (port 3000) |
| Python version | 3.14 (causes Pydantic V1 warning from LangChain — non-blocking) |
| Dev runner | `concurrently` via root `npm run dev:all` |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health ping |
| GET | `/health` | Returns `{status, vectors_in_index}` |
| POST | `/chat` | Streaming chat (`ChatRequest` → `text/event-stream`) |
| POST | `/admin/reindex` | Triggers background re-index (force=True by default) |

---

## Knowledge Base

- **File:** `knowledge_base.md` — manually curated markdown; source of truth for all RAG content
- Each section starts with `# Section Title`, includes `> [Source: URL]` and `> [Category: ...]` metadata tags
- The ingestion pipeline strips these tags before chunking and stores the URL as Pinecone metadata
- **Sections covered:** Overview, About, Cloud Infrastructure, (and more services/portfolio entries in the full file)
- To update content: edit `knowledge_base.md`, then call `POST /admin/reindex` or run `manual_reindex.py`

---

## Running Locally

```bash
# Install root dev deps
npm install

# Backend setup (one-time)
cd stackular-api
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Frontend setup (one-time)
cd stackular-frontend && npm install && cd ..

# Start both services
npm run dev:all
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

**Required `.env` in `stackular-api/`:**
```
GROQ_API_KEY=...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=bge-large-en   # used by manual_reindex.py; runtime uses hardcoded "bge-small-en"
```

---

## Known Issues / Gotchas

1. **Embedding model inconsistency:** `deps.py` uses `bge-small-en` (384-dim), but `manual_reindex.py` at the repo root uses `bge-large-en-v1.5` (1024-dim). Running the root reindex script against the runtime index will break dimension compatibility.
2. **Pinecone index name hardcoded:** `get_index()` in `deps.py` hardcodes `"bge-small-en"` — ignores `PINECONE_INDEX_NAME` env var.
3. **CORS:** Currently `allow_origins=["*"]` — fine for demo, restrict for production.
4. **Pydantic V1 warning:** LangChain uses Pydantic V1 internally; Python 3.14 triggers a compatibility warning. Non-blocking. Recommend Python 3.11/3.12 for production.
5. **Session memory is in-memory:** `CHAT_HISTORY` dict is lost on server restart. No persistence.
6. **Selenium scraper still in code** (`rag_service.py`) but is not called — knowledge base is loaded from `knowledge_base.md`. The scraper functions and `STACKULAR_PAGES` list are dead code.

---

## Roadmap (from `project_review.txt`)

- **Lead capture:** Ask for email when user shows high purchase intent
- **Intent handoff:** "Chat with a Human" / Calendly link button
- **Persistent sessions:** `localStorage` on frontend + backend session store
- **Webhook-triggered reindex:** Replace manual reindex with a push-based webhook when website changes
- **Rich components / action buttons:** UI beyond plain text (e.g., "Book a Call" CTA buttons)
- **Hybrid LLM routing:** Use Claude/GPT-4o for complex queries, Groq for simple ones
- **Few-shot examples in prompt:** Bake in "Stackular Voice" via examples

---

## Desired Response Format

From `interaction.md`: the bot should break lists into vertical bullet points, use short paragraphs (1-3 sentences each), and place hyperlinks on their own line at the end of the response. Avoid large blocks of continuous text.
