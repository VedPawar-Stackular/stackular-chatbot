import asyncio
import os
from dotenv import load_dotenv
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from app.services.rag_service import rag_stream_answer
from app.core.config import settings

load_dotenv()

# Setup
pc = Pinecone(api_key=settings.PINECONE_API_KEY)
index = pc.Index(settings.PINECONE_INDEX_NAME)
embedder = SentenceTransformer('BAAI/bge-small-en')

async def test_response():
    print("Testing Conversational Response Quality...")
    question = "Who founded Stackular and what services do they provide?"
    
    print(f"Question: {question}\n")
    print("--- Streaming Answer ---\n")
    
    full_answer = ""
    async for chunk in rag_stream_answer(question, index, embedder, session_id="test_session"):
        print(chunk, end="", flush=True)
        full_answer += chunk
    
    print("\n\n--- Verification Summary ---")
    if len(full_answer.split('\n')) > 3:
        print("SUCCESS: Response has good depth (multiple paragraphs/lines).")
    else:
        print("FAIL: Response might be too brief.")
        
    if "https://" in full_answer:
        print("SUCCESS: Response contains links/citations.")
    else:
        print("FAIL: No links found in response.")

if __name__ == "__main__":
    asyncio.run(test_response())
