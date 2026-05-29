# Architecture

## High-Level Flow

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

## Data Ingestion Flow

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
