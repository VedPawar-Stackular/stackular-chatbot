from fastapi import APIRouter, Depends
from app.models.schemas import ChatRequest, ChatResponse
from app.services.rag_service import rag_answer
from app.api.deps import get_index, get_embedder

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, index=Depends(get_index), embedder=Depends(get_embedder)):
    answer = rag_answer(request.question, index, embedder)
    return ChatResponse(answer=answer)
