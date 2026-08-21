"""Data-grounded sales-assistant orchestration.

Only the compact results returned by :class:`CrmChatTools` are provided to the
language model.  The customer dataset itself never leaves the backend.
"""
from __future__ import annotations

import json
import logging
import os
import re
import threading
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv

from backend.app.churn_model import ChurnFeaturesNotFound, ChurnModelUnavailable, predict_churn
from backend.app.complaint_store import complaint_store
from backend.app.crm_store import crm_store
from backend.app.dashboard.logic.risk import HIGH_RISK_LEVELS
from backend.app.dashboard.service import dashboard_service
from backend.app.data_loader import store
from backend.app.financial_store import financial_store


load_dotenv(Path(__file__).resolve().parent.parent / ".env")
# Uvicorn configures this logger with its server handler, making request audits
# visible in normal backend logs without exposing credentials or CRM payloads.
logger = logging.getLogger("uvicorn.error")
_OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
_CUSTOMER_ID = re.compile(r"\b(C_(?:\d+)|CUST-\d+)\b", re.IGNORECASE)
_GREETING = re.compile(r"^\s*(سلام|سلام علیکم|درود|وقت بخیر|hello|hi)\s*[!؟?.]*\s*$", re.IGNORECASE)
_PORTFOLIO_CACHE_TTL_SECONDS = 90
_CUSTOMER_CACHE_TTL_SECONDS = 300
_MEMORY_WINDOW = 8
_MEMORY_SUMMARY_LIMIT = 1800

_REASON_TRANSLATIONS = {
    "high existing risk combined with customer value requires a retention decision.": "این مشتری به دلیل ریسک ریزش و ارزش فروش فعلی، نیازمند اقدام برای حفظ مشتری است.",
    "an active customer with acceptable risk has observable potential for account growth.": "این مشتری فعال، با سطح ریسک قابل‌قبول، ظرفیت قابل مشاهده‌ای برای توسعه فروش دارد.",
    "a healthy, high-potential customer has an important or urgent crm follow-up for near-term sales action.": "این مشتری ظرفیت فروش بالایی دارد و یک پیگیری مهم فروش برای او ثبت شده است.",
}
_ACTION_TRANSLATIONS = {
    "review the customer with the sales manager.": "بررسی وضعیت مشتری با مدیر فروش",
    "review customer issues with the quality team.": "بررسی مشکلات مشتری با تیم کیفیت",
    "review payment status before the next order.": "بررسی وضعیت پرداخت قبل از ثبت سفارش بعدی",
    "review a suitable cross-sell or wallet-share offer with the customer.": "بررسی فرصت توسعه حساب مشتری و پیشنهاد فروش مکمل",
    "maintain the regular customer engagement plan.": "ادامه برنامه ارتباط منظم با مشتری",
}
_RISK_LABELS = {"Critical": "بسیار بالا", "High": "بالا", "Medium": "متوسط", "Low": "پایین"}
_ACTION_TYPES = {
    "customer_recovery": "حفظ مشتری",
    "growth_opportunity": "فرصت رشد",
    "sales_opportunity": "پیگیری فروش",
}


def _has_untranslated_english(text: str) -> bool:
    """Customer IDs are identifiers, not user-facing English prose."""
    without_identifiers = _CUSTOMER_ID.sub("", text)
    without_identifiers = re.sub(r"\b(?:CRM|AI)\b", "", without_identifiers, flags=re.IGNORECASE)
    return bool(re.search(r"[A-Za-z]{3,}", without_identifiers))


def _plain_persian_text(text: str) -> str:
    """Remove markdown tokens while retaining readable plain-text structure."""
    cleaned = re.sub(r"`([^`]+)`", r"\1", text)
    cleaned = re.sub(r"^\s{0,3}#{1,6}\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", cleaned)
    cleaned = re.sub(r"^\s*[-*+]\s+", "• ", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\bCRM\b", "سامانه مدیریت ارتباط با مشتری", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bAI\b", "هوش مصنوعی", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned


def _localized_reason(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return "دلیل اولویت این مشتری در داده‌های موجود ثبت نشده است."
    translated = _REASON_TRANSLATIONS.get(text.casefold())
    if translated:
        return translated
    return "این مشتری بر اساس وضعیت فعلی و داده‌های فروش، نیازمند پیگیری است." if _has_untranslated_english(text) else text


def _localized_action(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return "اقدام مشخصی برای این مشتری ثبت نشده است"
    translated = _ACTION_TRANSLATIONS.get(text.casefold())
    if translated:
        return translated
    return "بررسی وضعیت مشتری و تعیین اقدام بعدی با مدیر فروش" if _has_untranslated_english(text) else text


@dataclass
class ConversationMemory:
    summary: str = ""
    messages: deque[dict[str, str]] = field(default_factory=lambda: deque(maxlen=_MEMORY_WINDOW))
    active_customer_id: str | None = None
    updated_at: float = field(default_factory=time.monotonic)


class ConversationMemoryStore:
    """In-memory, session-isolated bounded conversation memory."""

    def __init__(self) -> None:
        self._sessions: dict[str, ConversationMemory] = {}
        self._lock = threading.RLock()

    def get(self, session_id: str | None) -> tuple[str, ConversationMemory]:
        with self._lock:
            resolved_id = session_id or str(uuid.uuid4())
            return resolved_id, self._sessions.setdefault(resolved_id, ConversationMemory())

    def context(self, memory: ConversationMemory) -> dict[str, Any]:
        return {"summary": memory.summary, "recent_messages": list(memory.messages), "active_customer_id": memory.active_customer_id}

    def append(self, memory: ConversationMemory, message: str, answer: str, customer_id: str | None) -> None:
        with self._lock:
            if len(memory.messages) == _MEMORY_WINDOW:
                oldest = memory.messages.popleft()
                memory.summary = (memory.summary + f" کاربر: {oldest['user']} | پاسخ: {oldest['assistant']}")[-_MEMORY_SUMMARY_LIMIT:]
            memory.messages.append({"user": message, "assistant": answer})
            if customer_id:
                memory.active_customer_id = customer_id
            memory.updated_at = time.monotonic()

    def clear(self, session_id: str) -> bool:
        with self._lock:
            return self._sessions.pop(session_id, None) is not None


conversation_memory_store = ConversationMemoryStore()


class CrmChatTools:
    """Read-only, bounded views over the existing CRM services."""

    def __init__(self) -> None:
        self._cache: dict[str, tuple[float, dict[str, Any]]] = {}
        self._lock = threading.RLock()

    def _cached(self, key: str) -> dict[str, Any] | None:
        with self._lock:
            cached = self._cache.get(key)
            if cached and cached[0] > time.monotonic():
                return cached[1]
            self._cache.pop(key, None)
            return None

    def _store(self, key: str, value: dict[str, Any], ttl: int) -> dict[str, Any]:
        with self._lock:
            self._cache[key] = (time.monotonic() + ttl, value)
        return value

    @staticmethod
    def _models() -> list[dict[str, Any]]:
        return dashboard_service._read_models()

    def get_top_risk_customers(self, limit: int = 5) -> list[dict[str, Any]]:
        customers = [item for item in self._models() if item["risk_level"] in HIGH_RISK_LEVELS]
        customers.sort(key=lambda item: ((item["risk_score"] or 0), item["business_value"]), reverse=True)
        return [self._customer_brief(item) for item in customers[:limit]]

    def get_growth_opportunities(self, limit: int = 5) -> list[dict[str, Any]]:
        customers = [item for item in self._models() if item["is_growth_opportunity"]]
        customers.sort(key=lambda item: (item["opportunity_score"], item["business_value"]), reverse=True)
        return [self._customer_brief(item) for item in customers[:limit]]

    def get_priority_customers(self, limit: int = 6) -> list[dict[str, Any]]:
        return [self._customer_brief(item.model_dump()) for item in dashboard_service.get_priority_customers(limit)]

    def get_dashboard_summary(self) -> dict[str, Any]:
        return dashboard_service.get_executive_summary().model_dump()

    def get_dashboard_metrics(self) -> dict[str, Any]:
        return dashboard_service.get_overview().model_dump()

    def _portfolio_snapshot(self) -> dict[str, Any]:
        cached = self._cached("portfolio")
        if cached:
            return cached
        snapshot = {
            "dashboard_metrics": self.get_dashboard_metrics(),
            "dashboard_summary": self.get_dashboard_summary(),
            "priority_customers": self.get_priority_customers(),
            "top_risk_customers": self.get_top_risk_customers(),
            "growth_opportunities": self.get_growth_opportunities(),
        }
        return self._store("portfolio", snapshot, _PORTFOLIO_CACHE_TTL_SECONDS)

    def retrieve_context(self, question: str, customer_id: str | None = None) -> tuple[dict[str, Any], list[str]]:
        """Select the smallest relevant live CRM view for the user's question."""
        normalized = question.casefold()
        if _GREETING.fullmatch(question.strip()):
            return {}, []

        if customer_id:
            snapshot = self._portfolio_snapshot()
            return {
                "customer_details": self.get_customer_details(customer_id),
                "dashboard_metrics": snapshot["dashboard_metrics"],
            }, ["جزئیات و تاریخچه مشتری", "شاخص‌های داشبورد"]

        if any(term in normalized for term in ("ریزش", "ریسک", "خطر", "churn", "risk")):
            snapshot = self._portfolio_snapshot()
            return {"top_risk_customers": snapshot["top_risk_customers"]}, ["مشتریان پرریسک"]
        if any(term in normalized for term in ("رشد", "فرصت", "growth", "best customer")):
            snapshot = self._portfolio_snapshot()
            return {
                "growth_opportunities": snapshot["growth_opportunities"],
                "priority_customers": snapshot["priority_customers"][:3],
            }, ["فرصت‌های رشد", "اولویت‌های فروش"]
        if any(term in normalized for term in ("پیگیری", "تماس", "امروز", "today", "contact", "sales team")):
            snapshot = self._portfolio_snapshot()
            return {"priority_customers": snapshot["priority_customers"]}, ["اولویت‌های فروش"]

        snapshot = self._portfolio_snapshot()
        return {"dashboard_summary": snapshot["dashboard_summary"]}, ["خلاصه مدیریتی فروش"]

    def get_customer_history(self, customer_id: str) -> dict[str, Any] | None:
        if store.get_customer_record(customer_id) is None:
            return None
        return {
            "recent_interactions": crm_store.list_interactions(customer_id)[:5],
            "complaints": complaint_store.list_for_customer(customer_id)[:5],
        }

    def get_customer_details(self, customer_id: str) -> dict[str, Any] | None:
        cache_key = f"customer:{customer_id}"
        cached = self._cached(cache_key)
        if cached:
            return cached
        raw = store.get_customer_record(customer_id)
        if raw is None:
            return None
        model = next((item for item in self._models() if item["customer_id"] == customer_id), None)
        if model is None:
            return None
        try:
            churn = predict_churn(customer_id)
        except (ChurnModelUnavailable, ChurnFeaturesNotFound):
            churn = None
        financial = financial_store.get_status(customer_id)
        customer = {
            **self._customer_brief(model),
            "segment": raw.get("Customer_Segment"),
            "customer_status": raw.get("Customer_Status"),
            "historical_profile": {
                "last_order_date": raw.get("Last_Order_Date"),
                "first_order_date": raw.get("First_Order_Date"),
                "purchase_frequency": raw.get("Frequency_Orders"),
                "average_order_interval_days": raw.get("Avg_Order_Interval_Days"),
                "days_since_last_order": raw.get("Days_Since_Last_Order"),
                "annual_sales": raw.get("Annual_Sales_Trailing12M"),
                "recent_complaints": raw.get("Recent_Complaints_12M"),
                "lifetime_complaints": raw.get("Lifetime_Complaints"),
                "payment_delay_days": raw.get("Avg_Payment_Delay_Days"),
            },
            "churn": churn,
            "financial": {
                "outstanding_balance": financial.get("outstanding_balance"),
                "credit_status": financial.get("credit_status"),
            },
            "history": self.get_customer_history(customer_id),
        }
        return self._store(cache_key, customer, _CUSTOMER_CACHE_TTL_SECONDS)

    @staticmethod
    def _customer_brief(customer: dict[str, Any]) -> dict[str, Any]:
        return {
            "customer_id": customer.get("customer_id"),
            "risk_level": _RISK_LABELS.get(customer.get("risk_level"), customer.get("risk_level") or "نامشخص"),
            "annual_sales_trailing_12m": customer.get("annual_sales_trailing_12m"),
            "business_value": customer.get("business_value"),
            "opportunity_score": customer.get("opportunity_score"),
            "action_type": _ACTION_TYPES.get(customer.get("decision_category"), "پیگیری مشتری"),
            "decision_reason": _localized_reason(customer.get("decision_reason")),
            "recommended_action": _localized_action(customer.get("recommended_action")),
            "latest_crm_next_action": _localized_action(customer.get("latest_crm_next_action")),
            "complaint_count": customer.get("complaint_count"),
        }


class SalesAssistantService:
    def __init__(self) -> None:
        self.tools = CrmChatTools()

    @staticmethod
    def clear_session(session_id: str) -> bool:
        return conversation_memory_store.clear(session_id)

    def answer(self, message: str, session_id: str | None = None) -> tuple[str, list[str], str]:
        total_started_at = time.perf_counter()
        session_id, memory = conversation_memory_store.get(session_id)
        customer_match = _CUSTOMER_ID.search(message)
        is_greeting = bool(_GREETING.fullmatch(message.strip()))
        customer_id = customer_match.group(1).upper() if customer_match else (None if is_greeting else memory.active_customer_id)
        retrieval_started_at = time.perf_counter()
        crm_context, sources = self.tools.retrieve_context(message, customer_id)
        retrieval_ms = (time.perf_counter() - retrieval_started_at) * 1000
        history_started_at = time.perf_counter()
        conversation_context = conversation_memory_store.context(memory)
        history_ms = (time.perf_counter() - history_started_at) * 1000
        preparation_started_at = time.perf_counter()
        context = {"crm_context": crm_context, "conversation_context": conversation_context}
        preparation_ms = (time.perf_counter() - preparation_started_at) * 1000
        model = self._select_model(customer_id)
        try:
            answer = _plain_persian_text(self._ask_openai(message, context, model))
        except RuntimeError:
            answer = self._fallback_answer(message, context)
        answer_customer_match = _CUSTOMER_ID.search(answer)
        conversation_memory_store.append(
            memory,
            message,
            answer,
            customer_id or (answer_customer_match.group(1).upper() if answer_customer_match else None),
        )
        logger.info(
            "Sales copilot latency: session_id=%s retrieval_ms=%d preparation_ms=%d history_ms=%d total_ms=%d",
            session_id,
            retrieval_ms,
            preparation_ms,
            history_ms,
            (time.perf_counter() - total_started_at) * 1000,
        )
        return answer, sources, session_id

    def stream_answer(self, message: str, session_id: str | None = None) -> Iterator[dict[str, Any]]:
        """Yield OpenAI text deltas while retaining the same isolated memory flow.

        CRM retrieval completes before the stream opens, so the model still gets
        a coherent, bounded live-data context without delaying every token.
        """
        total_started_at = time.perf_counter()
        session_id, memory = conversation_memory_store.get(session_id)
        customer_match = _CUSTOMER_ID.search(message)
        is_greeting = bool(_GREETING.fullmatch(message.strip()))
        customer_id = customer_match.group(1).upper() if customer_match else (None if is_greeting else memory.active_customer_id)

        retrieval_started_at = time.perf_counter()
        crm_context, sources = self.tools.retrieve_context(message, customer_id)
        retrieval_ms = (time.perf_counter() - retrieval_started_at) * 1000
        history_started_at = time.perf_counter()
        conversation_context = conversation_memory_store.context(memory)
        history_ms = (time.perf_counter() - history_started_at) * 1000
        context = {"crm_context": crm_context, "conversation_context": conversation_context}
        model = self._select_model(customer_id)
        yield {"type": "meta", "session_id": session_id, "sources": sources}

        answer_parts: list[str] = []
        first_token_at: float | None = None
        try:
            for delta in self._stream_openai(message, context, model):
                # OpenAI may deliver a space or newline as its own delta.
                # Never trim or normalize an individual delta: doing so joins
                # Persian words together in the browser.
                if delta:
                    if first_token_at is None:
                        first_token_at = time.perf_counter()
                        logger.info(
                            "Sales copilot stream first_token: session_id=%s model=%s ttft_ms=%d retrieval_ms=%d history_ms=%d",
                            session_id, model, (first_token_at - total_started_at) * 1000, retrieval_ms, history_ms,
                        )
                    answer_parts.append(delta)
                    yield {"type": "delta", "delta": delta}
            answer = _plain_persian_text("".join(answer_parts))
            if not answer or _has_untranslated_english(answer):
                raise RuntimeError("OpenAI streaming response was empty or untranslated")
        except RuntimeError:
            answer = self._fallback_answer(message, context)
            if not answer_parts:
                yield {"type": "delta", "delta": answer}
            logger.warning("Sales copilot streaming fallback used: session_id=%s", session_id)

        answer_customer_match = _CUSTOMER_ID.search(answer)
        conversation_memory_store.append(
            memory, message, answer,
            customer_id or (answer_customer_match.group(1).upper() if answer_customer_match else None),
        )
        logger.info(
            "Sales copilot stream completed: session_id=%s model=%s ttft_ms=%s total_ms=%d retrieval_ms=%d history_ms=%d",
            session_id, model,
            int((first_token_at - total_started_at) * 1000) if first_token_at else "n/a",
            (time.perf_counter() - total_started_at) * 1000, retrieval_ms, history_ms,
        )
        yield {"type": "done", "sources": sources}

    @staticmethod
    def _select_model(customer_id: str | None) -> str:
        """Allow a faster default model while retaining an optional complex-analysis model."""
        fast_model = os.getenv("OPENAI_MODEL_FAST", "gpt-4.1-mini")
        complex_model = os.getenv("OPENAI_MODEL_COMPLEX", os.getenv("OPENAI_MODEL", fast_model))
        return complex_model if customer_id else fast_model

    @staticmethod
    def _ask_openai(message: str, context: dict[str, Any], model: str) -> str:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("Sales copilot fallback used: OPENAI_API_KEY is not configured")
            raise RuntimeError("OPENAI_API_KEY is not configured")
        instructions = """You are an intelligent sales assistant for a CRM system.

Your job is to help sales managers make decisions using the provided CRM data.
You can analyze customer risks, churn probability, revenue at risk, growth opportunities, sales priorities, and recommended actions.

Rules:
- Always answer in Persian.
- Be concise, management-oriented, and explain the reason behind every recommendation.
- Use only the CRM data provided. Never fabricate customers, facts, or numbers.
- If the CRM data is insufficient, say that more information is needed.
- Do not expose raw field names, technical implementation details, or English source text to the user.
- Greetings and general questions must still receive a helpful Persian answer; do not claim CRM facts unless the supplied data supports them.
For customer analysis, structure the answer as: وضعیت فعلی، چرا مهم است، شواهد از CRM، اقدام پیشنهادی.
Use historical evidence only when it is present in the CRM context.
Return plain Persian text only. Do not use Markdown symbols such as **, #, backticks, or Markdown list markers; use simple Persian headings and the • character when a list is necessary."""
        context_preparation_started_at = time.perf_counter()
        input_text = json.dumps({"question": message, **context}, ensure_ascii=False, default=str)
        body = json.dumps({
            "model": model,
            "instructions": instructions,
            "input": input_text,
            "store": False,
            "max_output_tokens": 550,
        }, ensure_ascii=False).encode("utf-8")
        request = Request(_OPENAI_RESPONSES_URL, data=body, headers={
            "Authorization": f"Bearer {api_key}", "Content-Type": "application/json",
        }, method="POST")
        started_at = time.perf_counter()
        logger.info(
            "Sales copilot OpenAI request started: model=%s context_size_bytes=%d context_preparation_ms=%d",
            model,
            len(input_text.encode("utf-8")),
            (started_at - context_preparation_started_at) * 1000,
        )
        try:
            timeout_seconds = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "40"))
            with urlopen(request, timeout=timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
            processing_started_at = time.perf_counter()
            text = payload.get("output_text")
            if not isinstance(text, str):
                for output in payload.get("output", []):
                    for content in output.get("content", []):
                        if content.get("type") in {"output_text", "text"} and isinstance(content.get("text"), str):
                            text = content["text"]
                            break
                    if isinstance(text, str):
                        break
            if isinstance(text, str) and text.strip():
                answer = text.strip()
                if not _has_untranslated_english(answer):
                    logger.info(
                        "Sales copilot OpenAI response received: model=%s request_ms=%d response_processing_ms=%d",
                        model,
                        (processing_started_at - started_at) * 1000,
                        (time.perf_counter() - processing_started_at) * 1000,
                    )
                    return answer
                raise ValueError("OpenAI response contained untranslated English")
            raise ValueError("OpenAI response did not contain output_text")
        except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
            logger.warning(
                "Sales copilot fallback used: model=%s duration_ms=%d error=%s",
                model,
                (time.perf_counter() - started_at) * 1000,
                error,
            )
            raise RuntimeError("OpenAI is unavailable") from error

    @staticmethod
    def _stream_openai(message: str, context: dict[str, Any], model: str) -> Iterator[str]:
        """Read Responses API server-sent events and expose output-text deltas."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        instructions = """You are an intelligent sales assistant for a CRM system.

Your job is to help sales managers make decisions using the provided CRM data.
Rules:
- Always answer in Persian and only from the CRM data provided.
- Be concise, management-oriented, and explain the reason behind every recommendation.
- Never fabricate customers, facts, or numbers, and say when data is insufficient.
- Do not expose raw field names, technical details, or English source text.
- Greetings and general questions must still receive a helpful Persian answer; do not claim CRM facts without context.
- Use historical evidence only when it exists in CRM context.
Return plain Persian text only. Do not use Markdown symbols such as **, #, backticks, or Markdown list markers; use simple headings and the • character only when a list is necessary."""
        input_text = json.dumps({"question": message, **context}, ensure_ascii=False, default=str)
        body = json.dumps({
            "model": model,
            "instructions": instructions,
            "input": input_text,
            "store": False,
            "stream": True,
            "max_output_tokens": 550,
        }, ensure_ascii=False).encode("utf-8")
        request = Request(_OPENAI_RESPONSES_URL, data=body, headers={
            "Authorization": f"Bearer {api_key}", "Content-Type": "application/json", "Accept": "text/event-stream",
        }, method="POST")
        started_at = time.perf_counter()
        logger.info("Sales copilot OpenAI stream started: model=%s context_size_bytes=%d", model, len(input_text.encode("utf-8")))
        try:
            timeout_seconds = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "40"))
            with urlopen(request, timeout=timeout_seconds) as response:
                for raw_line in response:
                    line = raw_line.decode("utf-8").strip()
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    event = json.loads(data)
                    if event.get("type") == "response.output_text.delta":
                        delta = event.get("delta")
                        if isinstance(delta, str):
                            yield delta
            logger.info("Sales copilot OpenAI stream response completed: model=%s request_ms=%d", model, (time.perf_counter() - started_at) * 1000)
        except (HTTPError, URLError, TimeoutError, ValueError, UnicodeDecodeError, json.JSONDecodeError) as error:
            logger.warning("Sales copilot OpenAI stream failed: model=%s duration_ms=%d error=%s", model, (time.perf_counter() - started_at) * 1000, error)
            raise RuntimeError("OpenAI streaming is unavailable") from error

    @staticmethod
    def _fallback_answer(message: str, context: dict[str, Any]) -> str:
        """Only used after an OpenAI connectivity or contract failure."""
        return "در حال حاضر ارتباط با سرویس هوش مصنوعی برقرار نشد. لطفاً چند لحظه دیگر دوباره تلاش کنید."


sales_assistant_service = SalesAssistantService()
