"""HTTP contract for the global sales-assistant chat."""
from pydantic import BaseModel, Field
from fastapi import APIRouter

from backend.app.chat_service import sales_assistant_service


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    session_id: str | None = Field(default=None, min_length=1, max_length=128)


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]
    session_id: str


router = APIRouter(tags=["AI Sales Assistant"])


@router.post("/chat", response_model=ChatResponse, summary="Ask the data-grounded sales assistant")
def chat(request: ChatRequest) -> ChatResponse:
    answer, sources, session_id = sales_assistant_service.answer(request.message.strip(), request.session_id)
    return ChatResponse(answer=answer, sources=sources, session_id=session_id)


@router.delete("/chat/sessions/{session_id}", status_code=204, summary="Clear a sales-assistant conversation")
def clear_chat_session(session_id: str) -> None:
    sales_assistant_service.clear_session(session_id)
