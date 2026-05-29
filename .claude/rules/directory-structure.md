# Directory Structure

```
Stackular_Demo/
├── CLAUDE.md                    ← project context for Claude
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
│           └── rag_service.py   ← core RAG logic
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
