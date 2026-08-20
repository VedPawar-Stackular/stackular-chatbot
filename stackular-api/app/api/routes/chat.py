from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from app.models.schemas import ChatRequest
from app.services.rag_service import rag_stream_answer
from app.api.deps import get_index, get_embedder
from app.core.rate_limit import limiter
from app.core.config import settings

router = APIRouter()

# Headers that stop proxies/buffers from holding back the SSE stream.
_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


@router.post("/chat")
@limiter.limit(settings.CHAT_RATE_LIMIT)
async def chat(
    request: Request,
    body: ChatRequest,
    index=Depends(get_index),
    embedder=Depends(get_embedder),
):
    return StreamingResponse(
        rag_stream_answer(body.question, index, embedder, body.session_id),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )
