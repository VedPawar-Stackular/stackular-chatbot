from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
from app.core.config import settings

INDEX_NAME = "bge-small-en"
EMBEDDING_DIM = 384

_embedder = None
_index = None
_pc = None


def get_embedder():
    global _embedder
    if _embedder is None:
        print("Loading embedding model...")
        _embedder = SentenceTransformer("BAAI/bge-small-en")
    return _embedder


def get_pinecone_client():
    """Lazy singleton for the Pinecone client.

    Shared by get_index() and the reranker (rag_service._rerank) so we only
    instantiate one client and reuse its connection pool.
    """
    global _pc
    if _pc is None:
        print("Connecting to Pinecone...")
        _pc = Pinecone(api_key=settings.PINECONE_API_KEY)
    return _pc


def get_index():
    global _index
    if _index is None:
        pc = get_pinecone_client()
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
