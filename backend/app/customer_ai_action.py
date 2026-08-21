"""Rule-based factor extraction and baseline decision for one customer.

Feeds the per-customer AI action card (backend/app/dashboard/ai_service.py).
Everything here is a single-row lookup — no portfolio-wide scan — so the
customer detail page stays fast regardless of how many customers exist.
The AI layer only narrates this baseline; it never overrides it.
"""
from __future__ import annotations

from typing import Any

from .complaint_store import complaint_store
from .crm_store import crm_store
from .dashboard.logic.risk import HIGH_RISK_LEVELS
from .financial_store import financial_store
from .rules import risk_breakdown


def _number(value: Any) -> float:
    try:
        return float(value) if value is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


GROWTH_RFM_SEGMENTS = {"Champions", "Loyal Customers"}

CATEGORY_LABELS = {
    "customer_recovery": "حفظ مشتری",
    "financial_followup": "پیگیری مالی",
    "service_recovery": "رسیدگی به شکایت",
    "growth_opportunity": "فرصت رشد",
    "routine_follow_up": "پیگیری معمول",
}


def extract_customer_factors(customer_id: str, record: dict[str, Any]) -> dict[str, Any]:
    """Pull the key rule-based factors for one customer: risk, RFM, purchase
    status, debt, and open tickets — each an indexed single-customer lookup."""
    financial = financial_store.get_status(customer_id)
    latest_crm = crm_store.get_latest(customer_id)

    return {
        "customer_id": customer_id,
        "customer_status": record.get("Customer_Status"),
        "rfm_segment": record.get("RFM_Segment"),
        "risk_level": record.get("Risk_Level"),
        "risk_score": record.get("Risk_Score"),
        "risk_factors": risk_breakdown(record),
        "recency_days": record.get("Recency_Days"),
        "frequency_orders": record.get("Frequency_Orders"),
        "days_until_expected_next_order": record.get("Days_Until_Expected_Next_Order"),
        "outstanding_balance": financial.get("outstanding_balance"),
        "credit_used_percent": financial.get("credit_used_percent"),
        "has_returned_check": financial.get("has_returned_check"),
        "returned_check_count": financial.get("returned_check_count"),
        "delay_cost": financial.get("delay_cost"),
        "complaint_count": complaint_store.count_for_customer(customer_id),
        "existing_recommended_action": record.get("Recommended_Action"),
        "latest_crm_next_action": latest_crm.get("next_action") if latest_crm else None,
        "crm_urgency": latest_crm.get("urgency") if latest_crm else None,
    }


def build_rule_based_decision(factors: dict[str, Any]) -> dict[str, Any]:
    """Deterministic baseline category/priority/reason — the source of truth
    that the AI explanation is only allowed to narrate, never change."""
    risk_level = factors.get("risk_level")
    has_returned_check = bool(factors.get("has_returned_check"))
    credit_used = _number(factors.get("credit_used_percent"))
    complaint_count = factors.get("complaint_count") or 0
    rfm_segment = factors.get("rfm_segment")

    if risk_level in HIGH_RISK_LEVELS:
        category = "customer_recovery"
        return {
            "category": category,
            "category_label": CATEGORY_LABELS[category],
            "priority": "high" if risk_level == "Critical" else "medium",
            "reason": f"سطح ریسک فعلی: {risk_level}",
        }

    if has_returned_check or credit_used >= 80:
        category = "financial_followup"
        reason = (
            "چک برگشتی ثبت‌شده نیازمند پیگیری فوری است."
            if has_returned_check
            else f"اعتبار مصرف‌شده: {credit_used:.0f}٪"
        )
        return {
            "category": category,
            "category_label": CATEGORY_LABELS[category],
            "priority": "high" if has_returned_check else "medium",
            "reason": reason,
        }

    if complaint_count >= 1:
        category = "service_recovery"
        return {
            "category": category,
            "category_label": CATEGORY_LABELS[category],
            "priority": "medium",
            "reason": f"تعداد شکایات ثبت‌شده: {complaint_count}",
        }

    if rfm_segment in GROWTH_RFM_SEGMENTS:
        category = "growth_opportunity"
        return {
            "category": category,
            "category_label": CATEGORY_LABELS[category],
            "priority": "medium",
            "reason": f"بخش RFM: {rfm_segment}",
        }

    category = "routine_follow_up"
    return {
        "category": category,
        "category_label": CATEGORY_LABELS[category],
        "priority": "low",
        "reason": "بدون سیگنال قابل‌توجه در ریسک، پرداخت یا شکایات.",
    }
