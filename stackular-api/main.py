from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.main import api_router
from app.services.rag_service import build_index_if_empty
from app.api.deps import get_index, get_embedder
import os
import sys

# Ensure `app/` is discoverable when running scripts from root
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def create_app() -> FastAPI:
    app = FastAPI(title="Stackular Chatbot API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    @app.get("/")
    def root():
        return {"status": "Stackular chatbot API is running"}
        
    @app.on_event("startup")
    def startup_event():
        print("Initializing models and indexes...")
        index = get_index()
        embedder = get_embedder()
        build_index_if_empty(index, embedder)
        print("API ready.")

    return app

app = create_app()
