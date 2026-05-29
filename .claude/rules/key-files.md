# Key Files — Details

## `stackular-api/app/services/rag_service.py`

Core RAG logic — no dead code, no Selenium imports.

- **`CURATED_FACTS`** — 6 hardcoded strings always added to the index at reindex time (founders, HQ, key URLs). Acts as a safety net for most-asked facts.
- **`build_index_if_empty(index, embedder, force=False)`** — reads `knowledge_base.md`, splits into 600-char chunks, strips `> [Source:]` and `> [Category:]` metadata tags, fits BM25 on all chunks, encodes dense + sparse vectors, upserts to Pinecone in batches of 100.
- **`hybrid_score_norm(dense, sparse, alpha)`** — scales dense by `alpha`, sparse by `1 - alpha`. alpha=0.7 means 70% dense / 30% BM25.
- **`retrieve(question, index, embedder, top_k=10, alpha=0.7)`** — encodes query, loads `bm25_params.json`, runs hybrid query. Falls back to dense-only if hybrid fails (e.g., wrong Pinecone metric).
- **`CHAT_HISTORY`** — in-memory dict keyed by session_id. Stores up to 10 turns. Cleared on server restart.
- **`get_history(session_id, limit=5)`** — returns last 5 turns formatted as `Visitor: ... / Assistant: ...`
- **`_build_prompt(question, context, history_context)`** — builds the full LLM prompt via string concatenation (not f-strings with triple quotes). Contains: persona, contextual info (history + retrieved chunks), 8 response guidelines, a few-shot example showing bullet-list format, then the visitor's question.
- **`rag_stream_answer(question, index, embedder, session_id)`** — async generator. Retrieves → builds prompt → streams via `ChatGroq(temperature=0.3).astream()` → yields each chunk → appends full answer to `CHAT_HISTORY` after stream completes. No artificial delay.

## `stackular-api/app/api/deps.py`

- `INDEX_NAME = "bge-small-en"`, `EMBEDDING_DIM = 384` — hardcoded constants.
- `get_embedder()` — lazy singleton. Loads `BAAI/bge-small-en` via sentence-transformers on first call.
- `get_index()` — lazy singleton. Connects to Pinecone, **auto-creates the index** with `dotproduct` metric and `ServerlessSpec(cloud="aws", region="us-east-1")` if it doesn't exist.

## `stackular-api/app/api/routes/admin.py`

- `_verify_admin(x_admin_token)` — dependency that checks the `X-Admin-Token` header against `settings.ADMIN_TOKEN`. Returns 503 if `ADMIN_TOKEN` not set in env, 401 if token mismatch.
- `POST /admin/reindex` — protected by `_verify_admin`. Runs `build_index_if_empty(force=True)` as a background task.

## `stackular-api/app/models/schemas.py`

- `ChatRequest(question: str, session_id: str | None)` — `field_validator` strips whitespace, rejects empty string, enforces ≤1000 chars. No `ChatResponse` model (endpoint returns `StreamingResponse`).

## `stackular-api/app/core/config.py`

```python
class Settings:
    PINECONE_API_KEY: str       # from env
    GROQ_API_KEY: str           # from env
    ADMIN_TOKEN: str            # from env — required for POST /admin/reindex
    ALLOWED_ORIGINS: list[str]  # comma-separated env var; default "*"; set to domain in production
```

## `stackular-api/main.py`

- CORS driven by `settings.ALLOWED_ORIGINS` (not hardcoded `["*"]`).
- `allow_methods=["GET", "POST", "OPTIONS"]`, `allow_headers=["Content-Type", "X-Admin-Token"]`.
- Lazy startup — no model pre-loading. Models initialize on the first `/chat` request.

## `stackular-frontend/components/chat/ChatWidget.jsx`

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
