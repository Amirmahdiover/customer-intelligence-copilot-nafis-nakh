"""Explain existing customer risk values without replacing their calculation."""
from __future__ import annotations

from typing import Any


HIGH_RISK_LEVELS = {"High", "Critical"}


def _number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def build_risk_explanation(
    customer: dict[str, Any], complaint_count: int | None = None
) -> dict[str, Any]:
    """Return visible risk evidence based on the existing analytics fields.

    ``Risk_Score`` and ``Risk_Level`` are retained as the authoritative shared
    values. This function only translates their contributing fields into
    Dashboard-facing explanations.
    """
    signals: list[dict[str, Any]] = []
    risk_level = customer.get("Risk_Level")
    risk_score = _number(customer.get("Risk_Score"))
    recency = _number(customer.get("Recency_Days"))
    payment_delay = _number(customer.get("Avg_Payment_Delay_Days"))
    recent_complaints = _number(customer.get("Recent_Complaints_12M")) or 0
    overdue_days = _number(customer.get("Days_Until_Expected_Next_Order"))

    if risk_level in HIGH_RISK_LEVELS:
        signals.append({
            "name": "Existing risk level",
            "value": risk_level,
            "rule": "Existing analytics risk level is High or Critical",
            "interpretation": "Customer requires management attention based on the existing rule-based score.",
            "action": "Review the customer with the sales manager.",
            "severity": "high",
        })

    if recency is not None and recency > 180:
        signals.append({
            "name": "Purchase inactivity",
            "value": round(recency, 1),
            "rule": "Recency_Days > 180",
            "interpretation": "The customer has had a prolonged period without an order in the analytics snapshot.",
            "action": "Contact the customer for reactivation.",
            "severity": "high",
        })
    elif recency is not None and recency > 90:
        signals.append({
            "name": "Purchase inactivity",
            "value": round(recency, 1),
            "rule": "90 < Recency_Days <= 180",
            "interpretation": "Purchase activity is becoming stale relative to the analytics snapshot.",
            "action": "Schedule a sales follow-up.",
            "severity": "medium",
        })

    if payment_delay is not None and payment_delay > 30:
        signals.append({
            "name": "Payment delay",
            "value": round(payment_delay, 1),
            "rule": "Avg_Payment_Delay_Days > 30",
            "interpretation": "Collections behavior presents a material financial risk.",
            "action": "Coordinate sales and collections follow-up.",
            "severity": "high",
        })
    elif payment_delay is not None and payment_delay > 14:
        signals.append({
            "name": "Payment delay",
            "value": round(payment_delay, 1),
            "rule": "14 < Avg_Payment_Delay_Days <= 30",
            "interpretation": "Collections behavior should be monitored.",
            "action": "Review payment status before the next order.",
            "severity": "medium",
        })

    if recent_complaints >= 3:
        signals.append({
            "name": "Recent complaints",
            "value": int(recent_complaints),
            "rule": "Recent_Complaints_12M >= 3",
            "interpretation": "Repeated recent complaints indicate customer service or quality risk.",
            "action": "Review customer issues with the quality team.",
            "severity": "high",
        })
    elif recent_complaints >= 1:
        signals.append({
            "name": "Recent complaints",
            "value": int(recent_complaints),
            "rule": "1 <= Recent_Complaints_12M < 3",
            "interpretation": "Complaint history should be considered in the next customer conversation.",
            "action": "Confirm complaint resolution with the customer.",
            "severity": "medium",
        })

    if complaint_count and recent_complaints == 0:
        signals.append({
            "name": "Complaint history",
            "value": complaint_count,
            "rule": "Complaint store contains one or more records; no recent snapshot count is available",
            "interpretation": "Customer complaint history is available and should be reviewed before outreach.",
            "action": "Review recorded customer issues before the next contact.",
            "severity": "low",
        })

    if overdue_days is not None and overdue_days < 0:
        signals.append({
            "name": "Expected order overdue",
            "value": round(overdue_days, 1),
            "rule": "Days_Until_Expected_Next_Order < 0",
            "interpretation": "The expected next order was overdue in the analytics snapshot.",
            "action": "Check the next-order plan with the customer.",
            "severity": "medium",
        })

    if signals:
        explanation = " ".join(signal["interpretation"] for signal in signals[:2])
    else:
        explanation = "No elevated rule-based Dashboard risk signals were found in the analytics snapshot."

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "signals": signals,
        "explanation": explanation,
    }
