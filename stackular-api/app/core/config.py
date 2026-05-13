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

settings = Settings()
