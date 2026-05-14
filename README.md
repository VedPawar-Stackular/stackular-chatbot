# Stackular Website Chatbot

This project is an AI-powered website chatbot designed for the Stackular website. It provides automated, context-aware responses to user queries relating to Stackular's services, industry expertise, and company contact information.

## What We Built

A RAG (Retrieval-Augmented Generation) chatbot that answers questions about Stackular using a curated knowledge base. The bot uses hybrid search (dense vectors + BM25 keyword matching) against a Pinecone index to retrieve relevant context, then streams grounded answers from Llama 3.3 70B via Groq.

## How It Works — Architectural Flow

```
User query
    │
    ▼
Next.js frontend (ChatWidget.jsx)
    │  POST /chat { question, session_id }
    ▼
FastAPI backend (port 8000)
    │
    ├─ Hybrid retrieval from Pinecone
    │    ├─ Dense: BAAI/bge-small-en (384-dim, local)
    │    └─ Sparse: BM25Encoder (pinecone-text)
    │
    ├─ Context + chat history injected into prompt
    │
    └─ Groq API → llama-3.3-70b-versatile → StreamingResponse
```

### Knowledge Base & Indexing Flow

Content is maintained as a manually curated Markdown file — no runtime web scraping.

```
knowledge_base.md (local Markdown)
    │
    ├─ RecursiveCharacterTextSplitter (600 chars / 100 overlap)
    │
    ├─ Dense embeddings: BAAI/bge-small-en (384-dim, sentence-transformers)
    ├─ Sparse embeddings: BM25Encoder (pinecone-text)
    │
    └─ Hybrid upsert → Pinecone index "bge-small-en" (dotproduct metric)
         └─ bm25_params.json saved to repo root (auto-generated on reindex)
```

To update the knowledge base:
1. Edit `knowledge_base.md`
2. Trigger a reindex: `POST /admin/reindex` with header `X-Admin-Token: <your-token>`

## Models and Technologies

### Core Models

| Component | Value |
|---|---|
| LLM | `llama-3.3-70b-versatile` via Groq API, temperature 0.3 |
| Embedding | `BAAI/bge-small-en` (384-dim, local via sentence-transformers) |
| Sparse | BM25Encoder via `pinecone-text` |

### Infrastructure Stack

- **Vector Database:** Pinecone serverless (AWS us-east-1, `dotproduct` metric — required for hybrid search)
- **Backend API:** FastAPI + Uvicorn (port 8000)
- **Frontend:** Next.js 14 App Router (port 3000)
- **Orchestration:** LangChain (text splitting, message formatting)
- **Dev runner:** `concurrently` via root `npm run dev:all`

## Frontend Features

- Floating chat bubble (bottom-right, fixed position)
- Full markdown rendering: bullet lists, numbered lists, bold, inline code, links (XSS-safe)
- Voice input via Web Speech API
- Lead capture card on high-intent queries (pricing, demo, hire, etc.)
- "Talk to the team" CTA after 3+ bot exchanges
- Chat resets on every page refresh (no localStorage persistence)
- Mobile-responsive panel (`min(360px, calc(100vw - 32px))`)

## How to Run Locally

### 1. Prerequisites

- Python 3.10+ (3.11 or 3.12 recommended for production)
- Node.js & npm (v18+)

### 2. Environment Configuration

Create `stackular-api/.env` with the following:

```text
GROQ_API_KEY=your_groq_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
ADMIN_TOKEN=your_admin_token_here
ALLOWED_ORIGINS=*
```

> **Before production deploy:** Set `ALLOWED_ORIGINS=https://www.stackular.com` and use a strong random `ADMIN_TOKEN`.

### 3. Install Root Dependencies

```bash
npm install
```

### 4. Install Component Dependencies

**Backend:**
```bash
cd stackular-api
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

**Frontend:**
```bash
cd stackular-frontend
npm install
cd ..
```

### 5. Start the Application

```bash
npm run dev:all
```

Both services start concurrently. On first run, the backend downloads the embedding model and auto-creates the Pinecone index (if it doesn't exist). The index is populated from `knowledge_base.md` automatically on the first request if it is empty.

*(You will see Uvicorn start on port 8000 and Next.js start on port 3000)*

### 6. Access the Application

Open your browser and navigate to `http://localhost:3000`.

> **Pydantic V1 warning:** LangChain uses Pydantic V1 internally. Python 3.14 triggers a compatibility warning — it is non-blocking and the app runs normally. Use Python 3.11/3.12 in production to avoid this.

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | None | Health ping |
| GET | `/health` | None | Returns `{status, vectors_in_index}` |
| POST | `/chat` | None | Streaming chat (text/event-stream) |
| POST | `/admin/reindex` | `X-Admin-Token` header | Triggers background reindex from knowledge_base.md |

## Updating the Knowledge Base

1. Edit `knowledge_base.md` with new or corrected content
2. Save the file
3. Trigger a reindex:

```bash
curl -X POST http://localhost:8000/admin/reindex \
  -H "X-Admin-Token: your_admin_token_here"
```

4. Verify it completed:

```bash
curl http://localhost:8000/health
```

The `vectors_in_index` count should be greater than zero.
