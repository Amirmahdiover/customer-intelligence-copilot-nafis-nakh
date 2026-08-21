"""HTTP contract for the global sales-assistant chat."""
from pydantic import BaseModel, Field
from fastapi import APIRouter

from backend.app.chat_service import sales_assistant_service


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]


router = APIRouter(tags=["AI Sales Assistant"])


@router.post("/chat", response_model=ChatResponse, summary="Ask the data-grounded sales assistant")
def chat(request: ChatRequest) -> ChatResponse:
    answer, sources = sales_assistant_service.answer(request.message.strip())
    return ChatResponse(answer=answer, sources=sources)
