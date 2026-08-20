import json
import logging

from fastapi import APIRouter, Request

from app.models.schemas import EventRequest
from app.core.rate_limit import limiter
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger("stackular.analytics")


@router.post("/event")
@limiter.limit(settings.EVENT_RATE_LIMIT)
async def track_event(request: Request, event: EventRequest):
    """Record a lightweight conversion-analytics event from the chat widget.

    Sink is structured stdout logging — no new infra. Swap for Langfuse/PostHog
    later if richer dashboards are needed.
    """
    # props is client-controlled: cap serialized size so it can't bloat logs.
    props = json.dumps(event.props or {}, default=str)[:500]
    logger.info("event name=%s session=%s props=%s", event.name, event.session_id, props)
    return {"ok": True}
