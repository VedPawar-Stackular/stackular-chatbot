from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.models.schemas import ChatRequest
from app.services.rag_service import rag_stream_answer
from app.api.deps import get_index, get_embedder

router = APIRouter()


async def _safe_stream(question, index, embedder, session_id):
    try:
        async for chunk in rag_stream_answer(question, index, embedder, session_id):
            yield chunk
    except Exception as e:
        error_type = type(e).__name__
        if "groq" in error_type.lower() or "api" in error_type.lower():
            yield "I'm having trouble reaching my AI service right now. Please try again in a moment."
        elif "pinecone" in error_type.lower() or "index" in error_type.lower():
            yield "I'm having trouble searching the knowledge base right now. Please try again."
        else:
            yield "Something went wrong on my end. Please try again in a moment."


@router.post("/chat")
async def chat(request: ChatRequest, index=Depends(get_index), embedder=Depends(get_embedder)):
    return StreamingResponse(
        _safe_stream(request.question, index, embedder, request.session_id),
        media_type="text/event-stream"
    )
