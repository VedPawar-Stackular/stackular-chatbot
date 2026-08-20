from fastapi import APIRouter
from app.api.routes import chat, health, admin, events, feedback

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(events.router, tags=["analytics"])
api_router.include_router(feedback.router, tags=["analytics"])
