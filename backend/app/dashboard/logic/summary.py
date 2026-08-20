"""Deterministic executive-summary generation for the Dashboard."""
from __future__ import annotations

from typing import Any


def build_executive_summary(
    *,
    snapshot_date: str,
    risk_customer_count: int,
    opportunity_customer_count: int,
    revenue_at_risk: float,
    priority_customers: list[dict[str, Any]],
) -> dict[str, Any]:
    """Summarize observed Dashboard outputs without prediction or ML claims."""
    headline = (
        f"{risk_customer_count} customers require risk attention and "
        f"{opportunity_customer_count} active, non-high-risk customers qualify as rule-based growth opportunities."
    )
    findings = [
        f"Revenue at risk is {revenue_at_risk:.2f}, calculated from annual sales for High and Critical risk customers.",
        "All findings are derived from the historical analytics snapshot and explicit rules.",
    ]
    focus_areas: list[str] = []
    for customer in priority_customers[:3]:
        category = customer.get("decision_category", "priority")
        focus_areas.append(
            f"{category} — {customer['customer_id']}: {customer['recommended_action']}"
        )
    if not focus_areas:
        focus_areas.append("Review the portfolio regularly for new rule-based signals.")

    return {
        "snapshot_date": snapshot_date,
        "method": "rule_based",
        "headline": headline,
        "key_findings": findings,
        "important_focus_areas": focus_areas,
    }
