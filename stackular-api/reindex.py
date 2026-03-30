import os
import sys
from app.services.rag_service import build_index_if_empty
from app.api.deps import get_index, get_embedder

# Ensure `app/` is discoverable
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def run_reindex():
    print("--- Stackular Manual Re-indexing ---")
    print("Connecting to Pinecone...")
    index = get_index()
    print("Loading embedding model...")
    embedder = get_embedder()
    
    print("Checking if index needs update/rebuild...")
    # Passing the Pinecone index and the embedder to the service
    # We can also modify build_index_if_empty to ALWAYS build if we want a full refresh
    build_index_if_empty(index, embedder)
    print("--- Done ---")

if __name__ == "__main__":
    run_reindex()
