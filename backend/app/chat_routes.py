"""HTTP contract for the global sales-assistant chat."""
import json

from pydantic import BaseModel, Field
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.app.chat_service import sales_assistant_service


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    session_id: str | None = Field(default=None, min_length=1, max_length=128)


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]
    session_id: str


class ChatSuggestionsResponse(BaseModel):
    suggestions: list[dict[str, str]]


router = APIRouter(tags=["AI Sales Assistant"])


@router.post("/chat", response_model=ChatResponse, summary="Ask the data-grounded sales assistant")
def chat(request: ChatRequest) -> ChatResponse:
    answer, sources, session_id = sales_assistant_service.answer(request.message.strip(), request.session_id)
    return ChatResponse(answer=answer, sources=sources, session_id=session_id)


@router.post("/chat/stream", summary="Stream an answer from the data-grounded sales assistant")
def stream_chat(request: ChatRequest) -> StreamingResponse:
    def events():
        for event in sales_assistant_service.stream_answer(request.message.strip(), request.session_id):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/chat/suggestions/{session_id}", response_model=ChatSuggestionsResponse)
def chat_suggestions(session_id: str) -> ChatSuggestionsResponse:
    return ChatSuggestionsResponse(suggestions=sales_assistant_service.suggested_questions(session_id))


@router.delete("/chat/sessions/{session_id}", status_code=204, summary="Clear a sales-assistant conversation")
def clear_chat_session(session_id: str) -> None:
    sales_assistant_service.clear_session(session_id)
