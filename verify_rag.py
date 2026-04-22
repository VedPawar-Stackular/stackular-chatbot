import os
from dotenv import load_dotenv
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from app.services.rag_service import retrieve
from app.core.config import settings

load_dotenv()

# Setup
pc = Pinecone(api_key=settings.PINECONE_API_KEY)
index = pc.Index(settings.PINECONE_INDEX_NAME)
embedder = SentenceTransformer('BAAI/bge-small-en')

def test_retrieval():
    print("Testing Retrieval with Metadata...")
    question = "What is Stackular's ownership mindset?"
    results = retrieve(question, index, embedder)
    
    if not results:
        print("FAIL: No results found. Index might be empty.")
        return

    print(f"Found {len(results)} matches.")
    for i, res in enumerate(results):
        print(f"\nMatch {i+1}:")
        print(f"Text: {res.get('text')[:100]}...")
        print(f"Source: {res.get('source')}")
        
    if all('source' in res for res in results):
        print("\nSUCCESS: All results contain 'source' metadata.")
    else:
        print("\nFAIL: Some results are missing 'source' metadata.")

if __name__ == "__main__":
    test_retrieval()
