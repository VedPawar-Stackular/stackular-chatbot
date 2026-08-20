import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    ADMIN_TOKEN: str = os.getenv("ADMIN_TOKEN", "")
    # Comma-separated list of allowed CORS origins.
    # Default is open for local development; set to your domain in production.
    ALLOWED_ORIGINS: list[str] = [
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()
    ]

    # --- Models ---
    # Main answer model (streamed to the visitor).
    CHAT_MODEL: str = os.getenv("CHAT_MODEL", "openai/gpt-oss-120b")
    # Small/fast model used only to rewrite follow-up questions before retrieval.
    CONDENSE_MODEL: str = os.getenv("CONDENSE_MODEL", "openai/gpt-oss-20b")
    # Pinecone-hosted reranker used in the second retrieval stage.
    RERANK_MODEL: str = os.getenv("RERANK_MODEL", "bge-reranker-v2-m3")

    # --- Retrieval tuning ---
    # First-stage hybrid candidate pool size, then reranked down to RERANK_TOP_N.
    RETRIEVE_TOP_K: int = int(os.getenv("RETRIEVE_TOP_K", "30"))
    RERANK_TOP_N: int = int(os.getenv("RERANK_TOP_N", "6"))

    # --- Rate limiting ---
    # Per-IP limit applied to /chat (slowapi syntax, e.g. "20/minute").
    CHAT_RATE_LIMIT: str = os.getenv("CHAT_RATE_LIMIT", "20/minute")
    # Per-IP limit for lightweight analytics/feedback endpoints.
    EVENT_RATE_LIMIT: str = os.getenv("EVENT_RATE_LIMIT", "60/minute")

settings = Settings()
