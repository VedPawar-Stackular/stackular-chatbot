# Stackular Demo — Project Context for Claude

## Working with Claude Code

Use these practices when prompting Claude Code on this project. They apply the 32 tricks from https://www.youtube.com/watch?v=jqoFP9QapXI to this codebase.

### Front-load constraints (Trick 11)
Start every prompt with what NOT to do before describing what you want:
> "Don't add new pip packages. Don't touch the Pinecone index metric. Keep all styles inline. Now add X…"

### Effort levels (Trick 4)
Tag your prompt so Claude scales its depth appropriately:
- `[low]` — single-file typo/rename, straightforward change
- `[medium]` — feature touching 2–3 files, needs light planning
- `[high]` — cross-stack change, new service, or anything touching rag_service.py + frontend

### Plan before code (Trick 9)
For any `[medium]` or `[high]` task, ask for a plan first:
> "Before writing any code, give me a written plan for how you'll implement X."

### GSD framework (Trick 12)
For large features, split across three separate sessions:
1. **Gather** — explore only, no edits (spawn Explore agents)
2. **Specify** — write the plan (Plan mode)
3. **Do** — implement with a clean context window

### Self-critique step (Trick 15)
After Claude generates code, follow up with:
> "What are the edge cases and failure modes in what you just wrote?"

### Checkpoint commits (Trick 26)
Before handing off between major tasks (e.g., backend done, now starting frontend), commit the backend work so there's a clean rollback point.

### Git worktrees for parallel work (Trick 21)
When backend and frontend changes are independent, use `git worktree add` to run two Claude Code sessions simultaneously without branch conflicts.

### Context management (Tricks 1, 6)
- Run `/compact` after finishing a logical chunk (e.g., after RAG service changes, before starting frontend)
- Start a new session for unrelated tasks — don't carry RAG context into a Navbar change

---

## Project Overview

An AI-powered RAG chatbot for the Stackular website. Visitors can ask questions about Stackular's services, company info, and portfolio. The bot retrieves relevant context from a local knowledge base using hybrid vector search and generates streaming answers via an LLM.

**Current branch:** `text_rag` (active development)  
**Main branch:** `main` (not yet merged)

---

## Architecture

### High-Level Flow

```
User query → Next.js frontend (ChatWidget.jsx)
                  │  POST /chat { question, session_id }
                  ▼
           FastAPI backend (port 8000)
                  │
                  ├─ Hybrid retrieval from Pinecone
                  │    ├─ Dense: BAAI/bge-small-en (384-dim, local)
                  │    └─ Sparse: BM25Encoder (pinecone-text)
                  │
                  ├─ Context + last 5 turns of history → prompt
                  │
                  └─ Groq API → llama-3.3-70b-versatile → StreamingResponse
```

### Data Ingestion Flow

```
knowledge_base.md (manual markdown, source of truth)
    │
    ├─ RecursiveCharacterTextSplitter (600 chars / 100 overlap)
    │
    ├─ Dense embeddings: BAAI/bge-small-en (384-dim, sentence-transformers)
    ├─ Sparse embeddings: BM25Encoder fitted on same corpus
    │
    └─ Hybrid upsert → Pinecone index "bge-small-en" (dotproduct metric, AWS us-east-1)
         └─ bm25_params.json saved to repo root (auto-generated on each reindex)
```

To update content: edit `knowledge_base.md`, then `POST /admin/reindex` with `X-Admin-Token` header.

---

## Directory Structure

```
Stackular_Demo/
├── CLAUDE.md                    ← this file
├── README.md                    ← setup and workflow documentation
├── package.json                 ← root scripts: `npm run dev:all` starts both services
├── knowledge_base.md            ← fully curated source-of-truth for RAG (all website pages)
├── bm25_params.json             ← fitted BM25 sparse encoder params (auto-generated on reindex)
├── manual_reindex.py            ← ⚠ DO NOT USE — uses bge-large-en-v1.5 (1024-dim), breaks index
├── verify_rag.py                ← test retrieval quality
├── verify_response.py           ← test end-to-end response quality
├── interaction.md               ← example Q&A showing desired output format
├── project_review.txt           ← senior dev review with roadmap recommendations
│
├── stackular-api/               ← FastAPI backend (Python 3.14, venv at .venv/)
│   ├── main.py                  ← FastAPI app, CORS middleware, lazy startup
│   ├── reindex.py               ← in-package reindex helper (not the root manual_reindex.py)
│   ├── requirements.txt         ← no selenium/beautifulsoup4/webdriver-manager
│   ├── .env                     ← GROQ_API_KEY, PINECONE_API_KEY, ADMIN_TOKEN, ALLOWED_ORIGINS
│   └── app/
│       ├── core/config.py       ← Settings: PINECONE_API_KEY, GROQ_API_KEY, ADMIN_TOKEN, ALLOWED_ORIGINS
│       ├── models/schemas.py    ← ChatRequest with field_validator (strips whitespace, ≤1000 chars)
│       ├── api/
│       │   ├── deps.py          ← get_embedder() + get_index() (lazy singletons, auto-creates index)
│       │   ├── main.py          ← APIRouter aggregator
│       │   └── routes/
│       │       ├── chat.py      ← POST /chat → StreamingResponse (text/event-stream)
│       │       ├── health.py    ← GET /health → {status, vectors_in_index}
│       │       └── admin.py     ← POST /admin/reindex → requires X-Admin-Token header
│       └── services/
│           └── rag_service.py   ← core RAG logic (see below)
│
└── stackular-frontend/          ← Next.js 14 frontend (App Router)
    ├── .env.local               ← NEXT_PUBLIC_CHATBOT_API_URL=http://localhost:8000
    ├── app/
    │   ├── layout.js            ← RootLayout: loads Inter font, mounts ChatWidget globally
    │   └── page.js              ← Home page: Navbar, HeroSection, WorldMapSection, ClientLogosSection
    └── components/
        ├── chat/ChatWidget.jsx  ← floating chat widget (all features, all inline styles)
        ├── home/HeroSection.jsx
        ├── home/WorldMapSection.jsx
        ├── home/ClientLogosSection.jsx
        └── layout/Navbar.jsx
```

---

## Key Files — Details

### `stackular-api/app/services/rag_service.py`

Core RAG logic — no dead code, no Selenium imports.

- **`CURATED_FACTS`** — 6 hardcoded strings always added to the index at reindex time (founders, HQ, key URLs). Acts as a safety net for most-asked facts.
- **`build_index_if_empty(index, embedder, force=False)`** — reads `knowledge_base.md`, splits into 600-char chunks, strips `> [Source:]` and `> [Category:]` metadata tags, fits BM25 on all chunks, encodes dense + sparse vectors, upserts to Pinecone in batches of 100.
- **`hybrid_score_norm(dense, sparse, alpha)`** — scales dense by `alpha`, sparse by `1 - alpha`. alpha=0.7 means 70% dense / 30% BM25.
- **`retrieve(question, index, embedder, top_k=10, alpha=0.7)`** — encodes query, loads `bm25_params.json`, runs hybrid query. Falls back to dense-only if hybrid fails (e.g., wrong Pinecone metric).
- **`CHAT_HISTORY`** — in-memory dict keyed by session_id. Stores up to 10 turns. Cleared on server restart.
- **`get_history(session_id, limit=5)`** — returns last 5 turns formatted as `Visitor: ... / Assistant: ...`
- **`_build_prompt(question, context, history_context)`** — builds the full LLM prompt via string concatenation (not f-strings with triple quotes). Contains: persona, contextual info (history + retrieved chunks), 8 response guidelines, a few-shot example showing bullet-list format, then the visitor's question.
- **`rag_stream_answer(question, index, embedder, session_id)`** — async generator. Retrieves → builds prompt → streams via `ChatGroq(temperature=0.3).astream()` → yields each chunk → appends full answer to `CHAT_HISTORY` after stream completes. No artificial delay.

### `stackular-api/app/api/deps.py`

- `INDEX_NAME = "bge-small-en"`, `EMBEDDING_DIM = 384` — hardcoded constants.
- `get_embedder()` — lazy singleton. Loads `BAAI/bge-small-en` via sentence-transformers on first call.
- `get_index()` — lazy singleton. Connects to Pinecone, **auto-creates the index** with `dotproduct` metric and `ServerlessSpec(cloud="aws", region="us-east-1")` if it doesn't exist.

### `stackular-api/app/api/routes/admin.py`

- `_verify_admin(x_admin_token)` — dependency that checks the `X-Admin-Token` header against `settings.ADMIN_TOKEN`. Returns 503 if `ADMIN_TOKEN` not set in env, 401 if token mismatch.
- `POST /admin/reindex` — protected by `_verify_admin`. Runs `build_index_if_empty(force=True)` as a background task.

### `stackular-api/app/models/schemas.py`

- `ChatRequest(question: str, session_id: str | None)` — `field_validator` strips whitespace, rejects empty string, enforces ≤1000 chars. No `ChatResponse` model (endpoint returns `StreamingResponse`).

### `stackular-api/app/core/config.py`

```python
class Settings:
    PINECONE_API_KEY: str       # from env
    GROQ_API_KEY: str           # from env
    ADMIN_TOKEN: str            # from env — required for POST /admin/reindex
    ALLOWED_ORIGINS: list[str]  # comma-separated env var; default "*"; set to domain in production
```

### `stackular-api/main.py`

- CORS driven by `settings.ALLOWED_ORIGINS` (not hardcoded `["*"]`).
- `allow_methods=["GET", "POST", "OPTIONS"]`, `allow_headers=["Content-Type", "X-Admin-Token"]`.
- Lazy startup — no model pre-loading. Models initialize on the first `/chat` request.

### `stackular-frontend/components/chat/ChatWidget.jsx`

All inline styles, no external UI library. Dark theme (`#060b14` bg, `#1d6ef5` blue).

- **Floating bubble** — bottom-right fixed position
- **Session ID** — generated on mount (`Math.random` + `Date.now`). Chat clears on every page refresh (no localStorage).
- **Markdown rendering** — full block-aware `renderMarkdown()` + `renderInline()`:
  - Block: `- ` / `* ` prefixed lines → `<ul><li>`, `\d+. ` → `<ol><li>`, blank lines → spacer `<div>`, else `<p>`
  - Inline: `**bold**` → `<strong>`, `` `code` `` → `<code>`, `[text](url)` → `<a>` (XSS-safe: only `http://`, `https://`, or `/` paths allowed)
- **Lead capture** — `LeadCaptureCard` component appears after a message matches `HIGH_INTENT` regex (`pricing|price|cost|quote|how much|demo|hire|engage|work with|partner|start a project|get started|project rate|rate card|retainer`). Shows email input. Once dismissed or submitted, doesn't reappear in session.
- **CTA bar** — "Talk to the team →" bar (links to `/contact-us`) appears above input after `botExchangeCount >= 3`. Hidden once lead card is dismissed.
- **Suggestion chips** — 4 starter questions in a scrollable row with left/right arrows. Hidden after first use.
- **Voice input** — Web Speech API `SpeechRecognition`. Mic button in input bar.
- **Mobile responsive** — `width: 'min(360px, calc(100vw - 32px))'`
- **Input max length** — `maxLength={1000}`
- **Stream handling** — `ReadableStream` reader. Each chunk appended to the last bot message in state. `TextDecoder` final flush called after loop.

---

## Models & Infrastructure

| Component | Value |
|---|---|
| LLM | `llama-3.3-70b-versatile` via Groq API, temperature 0.3 |
| Embedding | `BAAI/bge-small-en` (384-dim, local via sentence-transformers) |
| Sparse vectors | BM25Encoder (pinecone-text), params in `bm25_params.json` |
| Vector DB | Pinecone serverless — index `bge-small-en`, **dotproduct metric** (required for hybrid) |
| Backend | FastAPI + Uvicorn (port 8000) |
| Frontend | Next.js 14 App Router (port 3000) |
| Python | 3.14 (Pydantic V1 warning from LangChain — non-blocking; use 3.11/3.12 in prod) |
| Dev runner | `concurrently` via root `npm run dev:all` |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | None | Health ping |
| GET | `/health` | None | Returns `{status, vectors_in_index}` |
| POST | `/chat` | None | Streaming chat (`ChatRequest` → `text/event-stream`) |
| POST | `/admin/reindex` | `X-Admin-Token` header | Triggers background reindex from `knowledge_base.md` |

---

## Environment Variables (`stackular-api/.env`)

```
GROQ_API_KEY=...
PINECONE_API_KEY=...
ADMIN_TOKEN=dev-reindex-token          # any string; use a strong secret in production
ALLOWED_ORIGINS=*                      # set to https://www.stackular.com before production deploy
```

---

## Knowledge Base

- **File:** `knowledge_base.md` — complete content from all Stackular website pages (fully updated 2026-05-14)
- Sections use `## Heading` with `> Source: <url>` inline. The ingestion pipeline strips source/category tags before chunking and stores the URL as Pinecone metadata.
- **Open Positions:** Job listings change. When roles change: edit the Open Positions section in `knowledge_base.md`, then `POST /admin/reindex`.
- **To update any content:** edit `knowledge_base.md` → `POST /admin/reindex` → `GET /health` to confirm vector count > 0.

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

---

## Known Issues / Gotchas

1. **dotproduct metric is mandatory** — Pinecone hybrid search only works with `dotproduct`. The old index was `cosine` and caused crashes. `deps.py` now auto-creates with `dotproduct`. If you ever need to recreate the index, delete it from the Pinecone console and restart the backend.
2. **`manual_reindex.py` at repo root uses `bge-large-en-v1.5` (1024-dim)** — running it against the runtime `bge-small-en` index (384-dim) will break dimension compatibility. Use `POST /admin/reindex` instead.
3. **Session history is in-memory** — `CHAT_HISTORY` dict is lost on server restart. Frontend chat also resets on page refresh (intentional — localStorage was removed).
4. **Pydantic V1 warning** — LangChain uses Pydantic V1 internally; Python 3.14 triggers a warning. Non-blocking. Use Python 3.11/3.12 in production.
5. **Emails from lead capture are not sent** — `LeadCaptureCard` shows a confirmation but no backend endpoint or email service (Resend, SendGrid, etc.) is wired up.
6. **No rate limiting** — `/chat` has no protection against spam. Add before production.

---

## Roadmap (pending)

- **Email delivery for lead capture** — wire up Resend or SendGrid to actually send/store captured emails
- **Rate limiting** on `/chat` endpoint
- **Merge `text_rag` → `main`**
- **Production deploy** — set `ALLOWED_ORIGINS=https://www.stackular.com` and strong `ADMIN_TOKEN`

---

## Desired Response Format

From `interaction.md`: bullet points for lists, short paragraphs (1–3 sentences), hyperlinks on their own line at the end of the response. The few-shot example in `_build_prompt()` enforces this at LLM-prompt level.
