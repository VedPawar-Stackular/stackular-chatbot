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
    
    if settings.PINECONE_INDEX_NAME not in pc.list_indexes().names():
        print(f"Creating Pinecone index '{settings.PINECONE_INDEX_NAME}' with 1024 dims...")
        from pinecone import ServerlessSpec
        pc.create_index(
            name=settings.PINECONE_INDEX_NAME,
            dimension=1024,
            metric='dotproduct',
            spec=ServerlessSpec(cloud='aws', region='us-east-1')
        )
    
    index = pc.Index(settings.PINECONE_INDEX_NAME)
    
    print("Loading embedding model...")
    embedder = SentenceTransformer('BAAI/bge-large-en-v1.5')
    
    print("Starting full re-indexing (force=True)...")
    build_index_if_empty(index, embedder, force=True)
    print("DONE: Re-indexing complete.")

if __name__ == "__main__":
    trigger_manual_reindex()
