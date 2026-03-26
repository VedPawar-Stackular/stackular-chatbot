from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from app.core.config import settings

# Global variables for caching
_embedder = None
_index = None

def get_embedder():
    global _embedder
    if _embedder is None:
        print("Loading embedding model...")
        _embedder = SentenceTransformer('BAAI/bge-small-en')
    return _embedder

def get_index():
    global _index
    if _index is None:
        print("Connecting to Pinecone...")
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        _index = pc.Index("bge-small-en")
    return _index
