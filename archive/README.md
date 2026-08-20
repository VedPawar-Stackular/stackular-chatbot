# Archive

Not part of the running app. Kept for history/reference, organized by role:

- **`deprecated-scripts/`** — old tooling that's been superseded and should not be run. `manual_reindex.py` uses `bge-large-en-v1.5` (1024-dim) and will break the runtime index (`bge-small-en`, 384-dim) if executed. Use `POST /admin/reindex` instead — see [`.claude/rules/api-endpoints.md`](../.claude/rules/api-endpoints.md).
- **`notes/`** — scratch/working notes (early to-do list, an early prompt draft). Superseded by [`.claude/rules/roadmap.md`](../.claude/rules/roadmap.md) and the real prompt in [`stackular-api/app/services/rag_service.py`](../stackular-api/app/services/rag_service.py).
- **`research/`** — background reading and notes from early RAG/hybrid-search research, kept separate from [`knowledge_base.md`](../knowledge_base.md) (the actual source of truth the chatbot indexes) to avoid the two being confused.
