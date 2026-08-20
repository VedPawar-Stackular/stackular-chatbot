import os
import sys
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.main import api_router
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.rate_limit import limiter

# Ensure `app/` is discoverable when running scripts from root
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Replaces the deprecated @app.on_event("startup") hook. Lazy startup is kept:
    # the embedder and Pinecone index initialize on the first /chat request, not here.
    setup_logging()
    logging.getLogger("stackular").info(
        "API started (fast start; models initialize on first request)."
    )
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Stackular Chatbot API", lifespan=lifespan)

    # Rate limiting (slowapi): register the shared limiter + 429 handler.
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-Admin-Token"],
    )

    app.include_router(api_router)

    @app.get("/")
    def root():
        return {"status": "Stackular chatbot API is running"}

    return app


app = create_app()
