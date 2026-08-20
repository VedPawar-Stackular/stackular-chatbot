# Directory Structure

```
Stackular_Demo/
├── CLAUDE.md                    ← project context for Claude
├── README.md                    ← setup and workflow documentation
├── package.json                 ← root scripts: `npm run dev:all` starts both services
├── knowledge_base.md            ← fully curated source-of-truth for RAG (all website pages)
├── bm25_params.json             ← fitted BM25 sparse encoder params (auto-generated on reindex)
├── assests/                     ← README screenshots (chatbot-ui.png, terminal-output.png)
├── archive/                     ← not part of the running app — old scripts, notes, research; see archive/README.md
│   ├── deprecated-scripts/manual_reindex.py  ← ⚠ DO NOT USE — bge-large-en-v1.5 (1024-dim), breaks the runtime index
│   ├── notes/                   ← early to-do list, an early prompt draft
│   └── research/                ← early RAG/hybrid-search research notes (not the knowledge base itself)
│
├── stackular-api/               ← FastAPI backend (Python 3.14, venv at .venv/)
│   ├── main.py                  ← FastAPI app, lifespan startup, CORS + rate-limit middleware
│   ├── reindex.py               ← in-package reindex helper (not the archived manual_reindex.py)
│   ├── requirements.txt
│   ├── .env                     ← GROQ_API_KEY, PINECONE_API_KEY, ADMIN_TOKEN, ALLOWED_ORIGINS
│   ├── eval/                    ← retrieval/response quality eval harness (eval_set.jsonl + run_eval.py)
│   └── app/
│       ├── core/
│       │   ├── config.py        ← Settings: API keys, ADMIN_TOKEN, ALLOWED_ORIGINS, model names, rate limits
│       │   ├── logging_config.py ← structured stdout logging for the 'stackular' logger namespace
│       │   └── rate_limit.py    ← shared slowapi Limiter (keyed by client IP)
│       ├── models/schemas.py    ← ChatRequest, EventRequest, FeedbackRequest
│       ├── api/
│       │   ├── deps.py          ← get_embedder() / get_index() / get_pinecone_client() (lazy singletons)
│       │   ├── main.py          ← APIRouter aggregator
│       │   └── routes/
│       │       ├── chat.py      ← POST /chat → StreamingResponse (text/event-stream), rate-limited
│       │       ├── health.py    ← GET /health → {status, vectors_in_index}
│       │       ├── admin.py     ← POST /admin/reindex → requires X-Admin-Token header
│       │       ├── events.py    ← POST /event → lightweight analytics (logged, not persisted)
│       │       └── feedback.py  ← POST /feedback → 👍/👎 on a message (logged, not persisted)
│       └── services/
│           └── rag_service.py   ← core RAG logic: hybrid retrieval, rerank, query condensing, streaming
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
