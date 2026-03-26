from fastapi import APIRouter, Depends
from app.api.deps import get_index

router = APIRouter()

@router.get("/health")
def health(index=Depends(get_index)):
    stats = index.describe_index_stats()
    return {
        "status": "ok",
        "vectors_in_index": stats.get("total_vector_count", 0)
    }
