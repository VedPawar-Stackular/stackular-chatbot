from pydantic import BaseModel, field_validator

# Analytics events the frontend is allowed to emit. Anything else is rejected so
# the /event endpoint can't be turned into an arbitrary log-injection sink.
ALLOWED_EVENTS = {
    "chat_started",
    "message_sent",
    "high_intent_matched",
    "cta_clicked",
    "chip_clicked",
    "suggestion_clicked",
    "stop_clicked",
    "retry_clicked",
}


class ChatRequest(BaseModel):
    question: str
    session_id: str | None = None

    @field_validator("question")
    @classmethod
    def question_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("question must not be empty")
        if len(v) > 1000:
            raise ValueError("question must be 1000 characters or fewer")
        return v


class EventRequest(BaseModel):
    """A lightweight, non-PII analytics event from the chat widget."""

    name: str
    session_id: str | None = None
    props: dict | None = None

    @field_validator("name")
    @classmethod
    def known_event(cls, v: str) -> str:
        v = v.strip()
        if v not in ALLOWED_EVENTS:
            raise ValueError(f"unknown event name: {v}")
        return v


class FeedbackRequest(BaseModel):
    """Thumbs up/down on a specific assistant message. No message text stored."""

    session_id: str | None = None
    message_id: str | None = None
    rating: str

    @field_validator("rating")
    @classmethod
    def valid_rating(cls, v: str) -> str:
        if v not in ("up", "down"):
            raise ValueError("rating must be 'up' or 'down'")
        return v
