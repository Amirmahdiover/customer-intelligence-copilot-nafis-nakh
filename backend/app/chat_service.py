"""Data-grounded sales-assistant orchestration.

Only the compact results returned by :class:`CrmChatTools` are provided to the
language model.  The customer dataset itself never leaves the backend.
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any
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


class CrmChatTools:
    """Read-only, bounded views over the existing CRM services."""

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

    def get_sales_copilot_context(self, customer_id: str | None = None) -> dict[str, Any]:
        """Compact, live CRM context shared with every OpenAI request."""
        context = {
            "dashboard_metrics": self.get_dashboard_metrics(),
            "dashboard_summary": self.get_dashboard_summary(),
            "priority_customers": self.get_priority_customers(),
            "top_risk_customers": self.get_top_risk_customers(),
            "growth_opportunities": self.get_growth_opportunities(),
        }
        if customer_id:
            context["customer_details"] = self.get_customer_details(customer_id)
        return context

    def get_customer_history(self, customer_id: str) -> dict[str, Any] | None:
        if store.get_customer_record(customer_id) is None:
            return None
        return {
            "recent_interactions": crm_store.list_interactions(customer_id)[:5],
            "complaints": complaint_store.list_for_customer(customer_id)[:5],
        }

    def get_customer_details(self, customer_id: str) -> dict[str, Any] | None:
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
        return {
            **self._customer_brief(model),
            "segment": raw.get("Customer_Segment"),
            "customer_status": raw.get("Customer_Status"),
            "churn": churn,
            "financial": {
                "outstanding_balance": financial.get("outstanding_balance"),
                "credit_status": financial.get("credit_status"),
            },
            "history": self.get_customer_history(customer_id),
        }

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

    def answer(self, message: str) -> tuple[str, list[str]]:
        customer_match = _CUSTOMER_ID.search(message)
        customer_id = customer_match.group(1).upper() if customer_match else None
        context = self.tools.get_sales_copilot_context(customer_id)
        sources = ["شاخص‌های داشبورد", "اولویت‌های فروش", "مشتریان پرریسک", "فرصت‌های رشد"]
        if customer_id:
            sources.append("جزئیات و تاریخچه مشتری")
        try:
            answer = self._ask_openai(message, context)
        except RuntimeError:
            answer = self._fallback_answer(message, context)
        return answer, sources

    @staticmethod
    def _ask_openai(message: str, context: dict[str, Any]) -> str:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("Sales copilot fallback used: OPENAI_API_KEY is not configured")
            raise RuntimeError("OPENAI_API_KEY is not configured")
        model = os.getenv("OPENAI_MODEL", "gpt-5.6")
        instructions = """You are an intelligent sales assistant for a CRM system.

Your job is to help sales managers make decisions using the provided CRM data.
You can analyze customer risks, churn probability, revenue at risk, growth opportunities, sales priorities, and recommended actions.

Rules:
- Always answer in Persian.
- Be concise, management-oriented, and explain the reason behind every recommendation.
- Use only the CRM data provided. Never fabricate customers, facts, or numbers.
- If the CRM data is insufficient, say that more information is needed.
- Do not expose raw field names, technical implementation details, or English source text to the user.
- Greetings and general questions must still receive a helpful Persian answer; do not claim CRM facts unless the supplied data supports them."""
        body = json.dumps({
            "model": model,
            "instructions": instructions,
            "input": json.dumps({"question": message, "crm_tool_results": context}, ensure_ascii=False, default=str),
            "store": False,
            "max_output_tokens": 550,
        }, ensure_ascii=False).encode("utf-8")
        request = Request(_OPENAI_RESPONSES_URL, data=body, headers={
            "Authorization": f"Bearer {api_key}", "Content-Type": "application/json",
        }, method="POST")
        started_at = time.perf_counter()
        logger.info("Sales copilot OpenAI request sent: model=%s", model)
        try:
            timeout_seconds = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "40"))
            with urlopen(request, timeout=timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
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
                        "Sales copilot OpenAI response received: model=%s duration_ms=%d",
                        model,
                        (time.perf_counter() - started_at) * 1000,
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
    def _fallback_answer(message: str, context: dict[str, Any]) -> str:
        """Only used after an OpenAI connectivity or contract failure."""
        return "در حال حاضر ارتباط با سرویس هوش مصنوعی برقرار نشد. لطفاً چند لحظه دیگر دوباره تلاش کنید."


sales_assistant_service = SalesAssistantService()
