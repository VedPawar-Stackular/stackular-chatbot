from fastapi import APIRouter, Depends, BackgroundTasks
from app.services.rag_service import build_index_if_empty
from app.api.deps import get_index, get_embedder

router = APIRouter()

@router.post("/reindex")
async def trigger_reindex(background_tasks: BackgroundTasks, force: bool = True, index=Depends(get_index), embedder=Depends(get_embedder)):
    """
    Triggers a full scrape and re-indexing of the Stackular knowledge base.
    This runs in the background to avoid blocking the API.
    """
    background_tasks.add_task(build_index_if_empty, index, embedder, force)
    return {"status": "Re-indexing started in background. This may take a few minutes."}
