import os
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from app.services.rag_service import build_index_if_empty
from app.core.config import settings
from dotenv import load_dotenv

load_dotenv()

def trigger_manual_reindex():
    print("Connecting to Pinecone...")
    pc = Pinecone(api_key=settings.PINECONE_API_KEY)
    index = pc.Index(settings.PINECONE_INDEX_NAME)
    
    print("Loading embedding model...")
    embedder = SentenceTransformer('BAAI/bge-small-en')
    
    print("Starting full re-indexing (force=True)...")
    build_index_if_empty(index, embedder, force=True)
    print("DONE: Re-indexing complete.")

if __name__ == "__main__":
    trigger_manual_reindex()
