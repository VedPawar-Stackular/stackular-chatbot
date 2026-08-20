import logging

from fastapi import APIRouter, Request

from app.models.schemas import FeedbackRequest
from app.core.rate_limit import limiter
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger("stackular.analytics")


@router.post("/feedback")
@limiter.limit(settings.EVENT_RATE_LIMIT)
async def submit_feedback(request: Request, feedback: FeedbackRequest):
    """Record 👍/👎 on an assistant message. Stores rating only — no message text."""
    logger.info(
        "feedback rating=%s session=%s message_id=%s",
        feedback.rating,
        feedback.session_id,
        feedback.message_id,
    )
    return {"ok": True}
