"""Transparent, non-predictive customer opportunity ranking."""
from __future__ import annotations

from typing import Any


OPPORTUNITY_THRESHOLD = 60
ACTIVE_CUSTOMER_STATUS = "فعال"
INELIGIBLE_OPPORTUNITY_RISK_LEVELS = {"High", "Critical", "Not Yet Active"}


def _number(value: Any) -> float:
    try:
        return float(value) if value is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


def build_opportunity_assessment(
    customer: dict[str, Any],
    benchmarks: dict[str, float],
) -> dict[str, Any]:
    """Score observable expansion signals; this is not a forecast or model."""
    score = 0
    evidence: list[dict[str, Any]] = []

    revenue = _number(customer.get("Annual_Sales_Trailing12M"))
    margin = _number(customer.get("Margin_Total_Lifetime"))
    ltv = _number(customer.get("LTV"))
    raw_share = customer.get("Revenue_Share_Pct_Latest")
    share = _number(raw_share)
    frequency = _number(customer.get("Frequency_Orders"))
    recency = _number(customer.get("Recency_Days"))
    rfm_segment = customer.get("RFM_Segment") or ""

    if raw_share is not None and 0 <= share < 0.30:
        score += 30
        evidence.append({
            "name": "Revenue share",
            "value": round(share, 4),
            "rule": "0 < Revenue_Share_Pct_Latest < 0.30",
            "interpretation": "Current wallet share is low relative to estimated customer purchasing potential.",
        })
    elif 0.30 <= share < 0.50:
        score += 15
        evidence.append({
            "name": "Revenue share",
            "value": round(share, 4),
            "rule": "0.30 <= Revenue_Share_Pct_Latest < 0.50",
            "interpretation": "There may be room to grow wallet share.",
        })

    if revenue >= benchmarks.get("annual_sales", 0) and revenue > 0:
        score += 20
        evidence.append({
            "name": "Annual sales",
            "value": round(revenue, 2),
            "rule": "Annual_Sales_Trailing12M >= portfolio median",
            "interpretation": "The customer has at least median portfolio sales value.",
        })
    if margin >= benchmarks.get("margin", 0) and margin > 0:
        score += 15
        evidence.append({
            "name": "Lifetime margin",
            "value": round(margin, 2),
            "rule": "Margin_Total_Lifetime >= portfolio median",
            "interpretation": "The customer contributes at least median lifetime margin.",
        })
    if ltv >= benchmarks.get("ltv", 0) and ltv > 0:
        score += 10
        evidence.append({
            "name": "Lifetime value",
            "value": round(ltv, 2),
            "rule": "LTV >= portfolio median",
            "interpretation": "The customer has at least median lifetime value.",
        })
    if frequency >= benchmarks.get("frequency", 0) and frequency > 0:
        score += 10
        evidence.append({
            "name": "Order frequency",
            "value": int(frequency),
            "rule": "Frequency_Orders >= portfolio median",
            "interpretation": "The customer has an established ordering pattern.",
        })
    if rfm_segment in {"Champions", "Loyal Customers", "Regular"}:
        score += 10
        evidence.append({
            "name": "RFM segment",
            "value": rfm_segment,
            "rule": "RFM segment indicates an established customer relationship",
            "interpretation": "The relationship has a demonstrated commercial base for expansion.",
        })
    if 0 < recency <= 90:
        score += 5
        evidence.append({
            "name": "Recent purchase activity",
            "value": round(recency, 1),
            "rule": "0 < Recency_Days <= 90",
            "interpretation": "The customer has purchased relatively recently in the analytics snapshot.",
        })

    score = min(score, 100)
    reasons = [item["interpretation"] for item in evidence]
    return {
        "opportunity_score": score,
        "reasons": reasons,
        "evidence": evidence,
    }


def is_growth_opportunity(
    customer: dict[str, Any], opportunity: dict[str, Any]
) -> bool:
    """Return the single Dashboard definition of a qualified growth opportunity."""
    return (
        opportunity["opportunity_score"] >= OPPORTUNITY_THRESHOLD
        and customer.get("Customer_Status") == ACTIVE_CUSTOMER_STATUS
        and customer.get("Risk_Level") not in INELIGIBLE_OPPORTUNITY_RISK_LEVELS
    )
