# API Endpoints & Environment Variables

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | None | Health ping |
| GET | `/health` | None | Returns `{status, vectors_in_index}` |
| POST | `/chat` | None | Streaming chat (`ChatRequest` → `text/event-stream`) |
| POST | `/admin/reindex` | `X-Admin-Token` header | Triggers background reindex from `knowledge_base.md` |

## Environment Variables (`stackular-api/.env`)

```
GROQ_API_KEY=...
PINECONE_API_KEY=...
ADMIN_TOKEN=dev-reindex-token          # any string; use a strong secret in production
ALLOWED_ORIGINS=*                      # set to https://www.stackular.com before production deploy
```
