"""Data-grounded sales-assistant orchestration.

Only the compact results returned by :class:`CrmChatTools` are provided to the
language model.  The customer dataset itself never leaves the backend.
"""
from __future__ import annotations

import json
import logging
import os
import re
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
logger = logging.getLogger(__name__)
_OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
_CUSTOMER_ID = re.compile(r"\b(C_(?:\d+)|CUST-\d+)\b", re.IGNORECASE)
_GREETING = re.compile(r"^\s*(سلام|سلام علیکم|درود|وقت بخیر|خوبی|خوبی\?|hello|hi)\s*[!؟?.]*\s*$", re.IGNORECASE)

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
    without_ids = _CUSTOMER_ID.sub("", text)
    return bool(re.search(r"[A-Za-z]{3,}", without_ids))


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
        intent = self._classify_intent(message)
        if intent == "greeting":
            return (
                "سلام، من دستیار فروش هوشمند هستم. می‌توانم درباره مشتریان، ریسک ریزش، فرصت‌های رشد و اولویت‌های فروش به شما کمک کنم.",
                [],
            )
        if intent == "unknown":
            return "لطفاً سؤال خود را درباره مشتریان، فروش یا وضعیت داشبورد مشخص‌تر کنید.", []

        context, sources = self._select_context(message, intent)
        try:
            answer = self._ask_openai(message, context)
            if not self._has_managerial_structure(answer, context):
                raise RuntimeError("OpenAI response did not match the sales-manager format")
        except RuntimeError:
            answer = self._fallback_answer(message, context)
        return answer, sources

    @staticmethod
    def _has_managerial_structure(answer: str, context: dict[str, Any]) -> bool:
        required = ("نوع اقدام", "دلیل اهمیت", "اقدام پیشنهادی")
        if "customer_details" in context:
            customer = context["customer_details"] or {}
            return all(label in answer for label in required) and str(customer.get("customer_id") or "") in answer
        if any(key in context for key in ("top_risk_customers", "growth_opportunities", "priority_customers")):
            return all(label in answer for label in required) and bool(_CUSTOMER_ID.search(answer))
        return True

    @staticmethod
    def _classify_intent(message: str) -> str:
        """Classify before any data-tool call, so greetings stay lightweight."""
        normalized = message.strip().casefold()
        if _GREETING.fullmatch(normalized):
            return "greeting"
        if _CUSTOMER_ID.search(message):
            return "customer_specific_query"
        if any(word in normalized for word in (
            "وضعیت فروش", "وضعیت داشبورد", "چند مشتری", "خلاصه فروش", "عملکرد فروش", "فروش چگونه",
        )):
            return "dashboard_query"
        if any(word in normalized for word in (
            "پیگیری", "مهم امروز", "اولویت", "در خطر", "ریزش", "ریسک", "حفظ", "فرصت رشد", "فرصت‌های رشد",
        )):
            return "priority_customer_query"
        return "unknown"

    def _select_context(self, message: str, intent: str) -> tuple[dict[str, Any], list[str]]:
        customer_match = _CUSTOMER_ID.search(message)
        if intent == "customer_specific_query" and customer_match:
            customer_id = customer_match.group(1).upper()
            details = self.tools.get_customer_details(customer_id)
            return {"customer_details": details}, ["داده‌های مشتری", "تاریخچه مشتری"]

        normalized = message.casefold()
        if intent == "priority_customer_query" and any(word in normalized for word in ("ریزش", "ریسک", "حفظ", "در خطر")):
            return {"top_risk_customers": self.tools.get_top_risk_customers()}, ["داده‌های مشتری", "اولویت‌های فروش"]
        if intent == "priority_customer_query" and any(word in normalized for word in ("رشد", "فرصت")):
            return {"growth_opportunities": self.tools.get_growth_opportunities()}, ["داده‌های مشتری", "اولویت‌های فروش"]
        if intent == "priority_customer_query":
            return {"priority_customers": self.tools.get_priority_customers()}, ["اولویت‌های فروش"]
        return {
            "dashboard_summary": self.tools.get_dashboard_summary(),
            "priority_customers": self.tools.get_priority_customers(),
        }, ["خلاصه مدیریتی فروش", "اولویت‌های فروش"]

    @staticmethod
    def _ask_openai(message: str, context: dict[str, Any]) -> str:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        instructions = """شما دستیار فروش هوشمند برای مدیر فروش هستید.
همیشه فقط به زبان فارسی و با لحن مدیریتی و عملیاتی پاسخ دهید.
پاسخ را فقط بر اساس نتایج ابزارهای CRM بنویسید و هرگز واقعیت، عدد، مشتری یا اقدامی اضافه نکنید.
فقط برای پرسش‌های صریح کسب‌وکاری از نتایج CRM استفاده کنید؛ برای سلام و گفت‌وگوی عمومی، دادهٔ CRM ارائه نکنید.
هیچ متن انگلیسی یا عبارت خام داده‌ها را نمایش ندهید؛ متن‌های ورودی را به فارسی روان تبدیل کنید.
از اصطلاحات فنی و داخلی مانند rule_based، score و decision_category استفاده نکنید.
برای فهرست مشتریان، هر مشتری را با «نوع اقدام»، «دلیل اهمیت» و «اقدام پیشنهادی» ارائه کنید.
اگر داده‌ای وجود ندارد، آن را شفاف و محترمانه اعلام کنید."""
        body = json.dumps({
            "model": os.getenv("OPENAI_MODEL", "gpt-5.6"),
            "instructions": instructions,
            "input": json.dumps({"question": message, "crm_tool_results": context}, ensure_ascii=False, default=str),
            "store": False,
            "max_output_tokens": 550,
        }, ensure_ascii=False).encode("utf-8")
        request = Request(_OPENAI_RESPONSES_URL, data=body, headers={
            "Authorization": f"Bearer {api_key}", "Content-Type": "application/json",
        }, method="POST")
        try:
            with urlopen(request, timeout=20) as response:
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
                    return answer
                raise ValueError("OpenAI response contained untranslated English")
            raise ValueError("OpenAI response did not contain output_text")
        except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
            logger.warning("Sales assistant OpenAI request failed: %s", error)
            raise RuntimeError("OpenAI is unavailable") from error

    @staticmethod
    def _fallback_answer(message: str, context: dict[str, Any]) -> str:
        if "customer_details" in context:
            customer = context["customer_details"]
            if not customer:
                return "برای این شناسه مشتری، داده‌ای در CRM پیدا نشد."
            churn = (customer.get("churn") or {}).get("churn_probability")
            evidence = [f"سطح ریسک: {customer.get('risk_level') or 'نامشخص'}"]
            if isinstance(churn, (int, float)):
                evidence.append(f"احتمال ریزش ثبت‌شده: {churn:.1%}")
            evidence.append(f"فروش ۱۲ماهه: {customer.get('annual_sales_trailing_12m') or 0:,.0f}")
            return "\n".join((
                f"تحلیل مشتری {customer['customer_id']}",
                f"نوع اقدام: {customer.get('action_type') or 'پیگیری مشتری'}",
                "", "دلیل اهمیت:", customer.get("decision_reason") or "دلیل اولویت در داده‌های موجود ثبت نشده است.",
                "", "شواهد:", *[f"• {item}" for item in evidence],
                "", "اقدام پیشنهادی:", customer.get("recommended_action") or "اقدام مشخصی ثبت نشده است.",
            ))
        customers = context.get("top_risk_customers") or context.get("growth_opportunities") or context.get("priority_customers") or []
        if customers:
            heading = "مشتریان پیشنهادی برای پیگیری امروز" if "priority_customers" in context else "مشتریان منتخب"
            lines = [heading + ":"]
            for index, item in enumerate(customers, start=1):
                lines.extend((
                    "", f"{index}. مشتری {item['customer_id']}",
                    f"نوع اقدام: {item.get('action_type') or 'پیگیری مشتری'}", "", "دلیل اهمیت:",
                    item.get('decision_reason') or 'دلیل اولویت در داده‌های موجود ثبت نشده است.',
                    "", "اقدام پیشنهادی:", item.get('recommended_action') or 'اقدام مشخصی ثبت نشده است.',
                ))
            return "\n".join(lines)
        return "برای این پرسش، دادهٔ کافی در خروجی‌های CRM موجود نیست."


sales_assistant_service = SalesAssistantService()
