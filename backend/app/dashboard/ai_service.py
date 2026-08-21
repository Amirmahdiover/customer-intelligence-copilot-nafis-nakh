"""Optional OpenAI explanation layer for the Executive Dashboard.

This module never changes the deterministic Dashboard decision.  It only turns
the already-computed evidence into concise Persian language for sales managers.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


logger = logging.getLogger(__name__)


_CACHE_TTL_SECONDS = 15 * 60
_OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"


def _persian_action(action: str | None, category: str) -> str:
    """Return a Persian fallback without exposing a raw English CRM action."""
    known_actions = {
        "Review customer issues with the quality team.": "مشکلات ثبت‌شده مشتری را با تیم کیفیت بررسی کنید.",
        "Review payment status before the next order.": "وضعیت پرداخت مشتری را پیش از سفارش بعدی پیگیری کنید.",
        "Schedule a sales follow-up.": "پیگیری فروش با مشتری را زمان‌بندی کنید.",
        "Check the next-order plan with the customer.": "برنامه سفارش بعدی را با مشتری بررسی کنید.",
        "Review a suitable cross-sell or wallet-share offer with the customer.": "یک پیشنهاد متناسب برای توسعه خرید مشتری آماده کنید.",
        "Maintain the regular customer engagement plan.": "برنامه ارتباط منظم با مشتری را ادامه دهید.",
    }
    if action in known_actions:
        return known_actions[action]
    category_actions = {
        "customer_recovery": "با مشتری تماس بگیرید و مسیر حفظ همکاری را مشخص کنید.",
        "growth_opportunity": "پیشنهاد توسعه فروش متناسب با نیاز مشتری آماده کنید.",
        "sales_opportunity": "پیگیری تجاری ثبت‌شده را با زمان‌بندی مشخص انجام دهید.",
    }
    return category_actions.get(category, "اقدام بعدی مشتری را با تیم فروش بررسی کنید.")


def _fallback_explanation(customer: dict[str, Any]) -> dict[str, str]:
    category = str(customer.get("decision_category") or "")
    labels = {
        "customer_recovery": "حفظ مشتری",
        "growth_opportunity": "توسعه فروش",
        "sales_opportunity": "پیگیری فرصت فروش",
    }
    label = labels.get(category, "پیگیری فروش")
    return {
        "summary": f"بر پایه داده‌های موجود، این مشتری در اولویت «{label}» قرار دارد.",
        "why_it_matters": "شواهد ثبت‌شده و ارزش فروش این مشتری، پیگیری هدفمند تیم فروش را ضروری می‌کند.",
        "recommended_action": _persian_action(customer.get("recommended_action"), category),
    }


_CUSTOMER_ACTION_FALLBACKS = {
    "customer_recovery": "با مشتری تماس بگیرید و علت کاهش تعامل را بررسی کنید.",
    "financial_followup": "وضعیت مالی و اعتباری مشتری را با تیم مالی پیگیری کنید.",
    "service_recovery": "شکایات ثبت‌شده را بررسی و با مشتری تماس بگیرید.",
    "growth_opportunity": "فرصت افزایش سهم خرید مشتری را با یک پیشنهاد متناسب بررسی کنید.",
    "routine_follow_up": "طبق برنامه معمول با مشتری در ارتباط بمانید.",
}


def _fallback_customer_action(baseline: dict[str, Any]) -> dict[str, str]:
    category = str(baseline.get("category") or "routine_follow_up")
    return {
        "action": _CUSTOMER_ACTION_FALLBACKS.get(category, _CUSTOMER_ACTION_FALLBACKS["routine_follow_up"]),
        "reason": str(baseline.get("reason") or ""),
    }


def _fallback_executive_summary(
    overview: dict[str, Any], priorities: list[dict[str, Any]]
) -> dict[str, str]:
    metrics = {item["key"]: item["value"] for item in overview.get("metrics", [])}
    recovery_count = sum(
        item.get("decision_category") == "customer_recovery" for item in priorities
    )
    growth_count = sum(
        item.get("decision_category") == "growth_opportunity" for item in priorities
    )
    sales_count = sum(
        item.get("decision_category") == "sales_opportunity" for item in priorities
    )
    return {
        "current_sales_status": (
            f"{metrics.get('active_customers', 0)} مشتری فعال در سبد فروش قرار دارند و "
            f"{metrics.get('priority_actions', 0)} مشتری برای یک تصمیم فروش شناسایی شده‌اند."
        ),
        "main_risks": (
            f"{metrics.get('customers_at_risk', 0)} مشتری نیازمند توجه هستند؛ "
            f"در فهرست اولویت‌ها {recovery_count} مورد برای حفظ مشتری دیده می‌شود."
        ),
        "followable_opportunities": (
            f"{metrics.get('growth_opportunities', 0)} مشتری ظرفیت رشد دارند؛ "
            f"{growth_count} فرصت رشد و {sales_count} فرصت فروش در اولویت‌های نمایشی قرار گرفته‌اند."
        ),
        "recommended_action": "ابتدا مشتریان نیازمند حفظ را پیگیری کنید، سپس برای فرصت‌های رشد و فروش زمان اقدام مشخص کنید.",
    }


class DashboardAIService:
    """Server-side OpenAI client with a short-lived, in-memory result cache."""

    def __init__(self) -> None:
        self._cache: dict[str, tuple[float, dict[str, str], str]] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _cache_key(prefix: str, payload: dict[str, Any]) -> str:
        encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str)
        return f"{prefix}:{hashlib.sha256(encoded.encode('utf-8')).hexdigest()}"

    def _cached(self, key: str) -> tuple[dict[str, str], str] | None:
        with self._lock:
            cached = self._cache.get(key)
            if not cached or cached[0] <= time.monotonic():
                self._cache.pop(key, None)
                return None
            return cached[1], cached[2]

    def _store(self, key: str, result: dict[str, str], source: str) -> None:
        with self._lock:
            self._cache[key] = (time.monotonic() + _CACHE_TTL_SECONDS, result, source)

    @staticmethod
    def _response_text(response: dict[str, Any]) -> str:
        if isinstance(response.get("output_text"), str):
            return response["output_text"]
        for output in response.get("output", []):
            for content in output.get("content", []):
                if content.get("type") in {"output_text", "text"} and isinstance(content.get("text"), str):
                    return content["text"]
        raise ValueError("OpenAI response did not include text output")

    @staticmethod
    def _parse_json(text: str, keys: tuple[str, ...]) -> dict[str, str]:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        decoded = json.loads(cleaned)
        if not isinstance(decoded, dict) or any(not isinstance(decoded.get(key), str) for key in keys):
            raise ValueError("OpenAI response did not match the Dashboard contract")
        return {key: decoded[key].strip() for key in keys}

    def _ask_openai(
        self,
        *,
        instructions: str,
        input_text: str,
        keys: tuple[str, ...],
        model: str | None = None,
    ) -> dict[str, str]:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        body = json.dumps(
            {
                "model": model or os.getenv("OPENAI_MODEL", "gpt-5.6"),
                "instructions": instructions,
                "input": input_text,
                "store": False,
                "max_output_tokens": 500,
            },
            ensure_ascii=False,
        ).encode("utf-8")
        request = Request(
            _OPENAI_RESPONSES_URL,
            data=body,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=15) as response:
                payload = json.loads(response.read().decode("utf-8"))
            return self._parse_json(self._response_text(payload), keys)
        except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
            logger.warning("Dashboard AI explanation unavailable: %s", error)
            raise RuntimeError("OpenAI explanation unavailable") from error

    def explain_customer(self, customer: dict[str, Any]) -> dict[str, Any]:
        payload = {
            key: customer.get(key)
            for key in (
                "customer_id", "decision_category", "business_value", "decision_reason",
                "decision_evidence", "recommended_action", "latest_crm_next_action", "crm_urgency",
            )
        }
        payload["signals"] = [
            {
                "name": getattr(signal, "name", None),
                "value": getattr(signal, "value", None),
                "interpretation": getattr(signal, "interpretation", None),
            }
            for signal in customer.get("signals", [])
        ]
        key = self._cache_key("customer", payload)
        cached = self._cached(key)
        if cached:
            result, source = cached
            return {**result, "source": source, "cached": True}

        instructions = (
            "شما دستیار مدیر فروش صنعتی هستید. فقط بر اساس داده‌های ورودی، یک توضیح کوتاه، "
            "دقیق و حرفه‌ای به زبان فارسی بنویسید. درباره مدل، امتیاز، الگوریتم یا پیش‌بینی صحبت نکنید. "
            "چیزی را حدس نزنید. خروجی فقط JSON معتبر با کلیدهای summary، why_it_matters و "
            "recommended_action باشد؛ هر مقدار یک جمله کوتاه فارسی باشد."
        )
        try:
            result = self._ask_openai(
                instructions=instructions,
                input_text=f"داده تصمیم مشتری:\n{json.dumps(payload, ensure_ascii=False, default=str)}",
                keys=("summary", "why_it_matters", "recommended_action"),
            )
            source = "openai"
        except RuntimeError:
            result = _fallback_explanation(customer)
            source = "fallback"
        self._store(key, result, source)
        return {**result, "source": source, "cached": False}

    def recommend_customer_action(
        self, factors: dict[str, Any], baseline: dict[str, Any]
    ) -> dict[str, Any]:
        """Narrate the deterministic baseline into a short operational action.
        Cache key is a hash of the factors + baseline, so unchanged customer
        data returns instantly without a repeat OpenAI call."""
        payload = {"factors": factors, "baseline": baseline}
        key = self._cache_key("customer_action", payload)
        cached = self._cached(key)
        if cached:
            result, source = cached
            return {**result, "source": source, "cached": True}

        instructions = (
            "شما دستیار عملیاتی یک اپراتور فروش/پشتیبانی مشتری هستید. فقط بر اساس داده‌های ورودی، "
            "بدون حدس زدن یا افزودن اطلاعات جدید، یک اقدام پیشنهادی کوتاه و عملیاتی برای اپراتور "
            "بنویسید. درباره مدل، امتیاز یا الگوریتم صحبت نکنید. خروجی فقط JSON معتبر با کلیدهای "
            "action و reason باشد؛ هر مقدار یک جمله کوتاه فارسی باشد."
        )
        try:
            result = self._ask_openai(
                instructions=instructions,
                input_text=f"فاکتورهای مشتری و تصمیم پایه:\n{json.dumps(payload, ensure_ascii=False, default=str)}",
                keys=("action", "reason"),
                model=os.getenv("OPENAI_MODEL_CUSTOMER_ACTION", "gpt-4o-mini"),
            )
            source = "openai"
        except RuntimeError:
            result = _fallback_customer_action(baseline)
            source = "fallback"
        self._store(key, result, source)
        return {**result, "source": source, "cached": False}

    def executive_summary(
        self, overview: dict[str, Any], priorities: list[dict[str, Any]]
    ) -> dict[str, Any]:
        payload = {
            "snapshot_date": overview.get("snapshot_date"),
            "metrics": overview.get("metrics", []),
            "priority_customers": [
                {
                    "customer_id": item.get("customer_id"),
                    "decision_category": item.get("decision_category"),
                    "business_value": item.get("business_value"),
                    "decision_reason": item.get("decision_reason"),
                    "decision_evidence": item.get("decision_evidence", [])[:2],
                    "recommended_action": item.get("recommended_action"),
                }
                for item in priorities[:9]
            ],
        }
        key = self._cache_key("executive", payload)
        cached = self._cached(key)
        if cached:
            result, source = cached
            return {**result, "source": source, "cached": True}

        instructions = (
            "شما دستیار مدیر فروش صنعتی هستید. فقط با اتکا به داده‌های ورودی، برای مدیر فروش "
            "جمع‌بندی کوتاه و عملی به فارسی بنویسید. از مدل، امتیاز، الگوریتم، پیش‌بینی یا داده خارج از ورودی "
            "حرفی نزنید و هیچ واقعیتی نسازید. خروجی فقط JSON معتبر با کلیدهای current_sales_status، "
            "main_risks، followable_opportunities و recommended_action باشد؛ هر مقدار حداکثر دو جمله کوتاه فارسی باشد."
        )
        try:
            result = self._ask_openai(
                instructions=instructions,
                input_text=f"تصویر فعلی فروش:\n{json.dumps(payload, ensure_ascii=False, default=str)}",
                keys=("current_sales_status", "main_risks", "followable_opportunities", "recommended_action"),
            )
            source = "openai"
        except RuntimeError:
            result = _fallback_executive_summary(overview, priorities)
            source = "fallback"
        self._store(key, result, source)
        return {**result, "source": source, "cached": False}


dashboard_ai_service = DashboardAIService()
