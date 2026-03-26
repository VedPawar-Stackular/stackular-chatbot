from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.models.schemas import ChatRequest
from app.services.rag_service import rag_stream_answer
from app.api.deps import get_index, get_embedder

router = APIRouter()

@router.post("/chat")
async def chat(request: ChatRequest, index=Depends(get_index), embedder=Depends(get_embedder)):
    return StreamingResponse(
        rag_stream_answer(request.question, index, embedder, request.session_id),
        media_type="text/event-stream"
    )
