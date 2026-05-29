# Known Issues / Gotchas

1. **dotproduct metric is mandatory** — Pinecone hybrid search only works with `dotproduct`. The old index was `cosine` and caused crashes. `deps.py` now auto-creates with `dotproduct`. If you ever need to recreate the index, delete it from the Pinecone console and restart the backend.
2. **`manual_reindex.py` at repo root uses `bge-large-en-v1.5` (1024-dim)** — running it against the runtime `bge-small-en` index (384-dim) will break dimension compatibility. Use `POST /admin/reindex` instead.
3. **Session history is in-memory** — `CHAT_HISTORY` dict is lost on server restart. Frontend chat also resets on page refresh (intentional — localStorage was removed).
4. **Pydantic V1 warning** — LangChain uses Pydantic V1 internally; Python 3.14 triggers a warning. Non-blocking. Use Python 3.11/3.12 in production.
5. **Emails from lead capture are not sent** — `LeadCaptureCard` shows a confirmation but no backend endpoint or email service (Resend, SendGrid, etc.) is wired up.
6. **No rate limiting** — `/chat` has no protection against spam. Add before production.
