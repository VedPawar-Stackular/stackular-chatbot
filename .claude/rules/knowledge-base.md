# Knowledge Base

- **File:** `knowledge_base.md` — complete content from all Stackular website pages (fully updated 2026-05-14)
- Sections use `## Heading` with `> Source: <url>` inline. The ingestion pipeline strips source/category tags before chunking and stores the URL as Pinecone metadata.
- **Open Positions:** Job listings change. When roles change: edit the Open Positions section in `knowledge_base.md`, then `POST /admin/reindex`.
- **To update any content:** edit `knowledge_base.md` → `POST /admin/reindex` → `GET /health` to confirm vector count > 0.
