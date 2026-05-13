from pydantic import BaseModel, field_validator

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
