# Models & Infrastructure

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
