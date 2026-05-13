from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.main import api_router
from app.core.config import settings
import os
import sys

# Ensure `app/` is discoverable when running scripts from root
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def create_app() -> FastAPI:
    app = FastAPI(title="Stackular Chatbot API")

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
        
    @app.on_event("startup")
    def startup_event():
        # Removed pre-loading for instant startup. 
        # Index and Embedder will lazy-load on the first /chat request.
        print("API is fast-starting. Models will initialize on first request.")

    return app

app = create_app()
