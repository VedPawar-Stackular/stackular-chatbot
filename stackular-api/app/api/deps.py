from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
from app.core.config import settings

INDEX_NAME = "bge-small-en"
EMBEDDING_DIM = 384

_embedder = None
_index = None


def get_embedder():
    global _embedder
    if _embedder is None:
        print("Loading embedding model...")
        _embedder = SentenceTransformer("BAAI/bge-small-en")
    return _embedder


def get_index():
    global _index
    if _index is None:
        print("Connecting to Pinecone...")
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        existing = [idx.name for idx in pc.list_indexes()]
        if INDEX_NAME not in existing:
            print(f"  Creating Pinecone index '{INDEX_NAME}' (dotproduct, {EMBEDDING_DIM}-dim)...")
            pc.create_index(
                name=INDEX_NAME,
                dimension=EMBEDDING_DIM,
                metric="dotproduct",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
        _index = pc.Index(INDEX_NAME)
    return _index
