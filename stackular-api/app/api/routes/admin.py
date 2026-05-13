from fastapi import APIRouter, Depends, BackgroundTasks, Header, HTTPException
from app.services.rag_service import build_index_if_empty
from app.api.deps import get_index, get_embedder
from app.core.config import settings

router = APIRouter()

def _verify_admin(x_admin_token: str = Header(default="")):
    if not settings.ADMIN_TOKEN:
        raise HTTPException(status_code=503, detail="Admin endpoint disabled: ADMIN_TOKEN not configured.")
    if x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Admin-Token header.")

@router.post("/reindex", dependencies=[Depends(_verify_admin)])
async def trigger_reindex(
    background_tasks: BackgroundTasks,
    force: bool = True,
    index=Depends(get_index),
    embedder=Depends(get_embedder),
):
    background_tasks.add_task(build_index_if_empty, index, embedder, force)
    return {"status": "Re-indexing started in background. This may take a few minutes."}
