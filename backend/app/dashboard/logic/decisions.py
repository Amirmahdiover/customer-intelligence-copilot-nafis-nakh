"""Transparent business-decision classification for the Executive Dashboard."""
from __future__ import annotations

from typing import Any

from .opportunity import ACTIVE_CUSTOMER_STATUS
from .risk import HIGH_RISK_LEVELS


CRM_SALES_URGENCIES = {"فوری", "مهم"}
RECOVERY_SIGNAL_NAMES = {
    "Purchase inactivity",
    "Payment delay",
    "Recent complaints",
    "Complaint history",
}


def _number(value: Any) -> float:
    try:
        return float(value) if value is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


def _value_weight(business_value: float, median_business_value: float) -> int:
    if median_business_value <= 0:
        return 0
    if business_value >= median_business_value * 2:
        return 25
    if business_value >= median_business_value:
        return 15
    return 5


def classify_dashboard_decision(
    customer: dict[str, Any],
    risk: dict[str, Any],
    opportunity: dict[str, Any],
    latest_crm: dict[str, str | None] | None,
    *,
    median_business_value: float,
) -> dict[str, Any] | None:
    """Assign one explainable, mutually exclusive commercial decision category."""
    business_value = _number(customer.get("Annual_Sales_Trailing12M"))
    risk_level = risk.get("risk_level")
    opportunity_score = int(opportunity.get("opportunity_score", 0))
    is_active = customer.get("Customer_Status") == ACTIVE_CUSTOMER_STATUS
    crm_urgency = latest_crm.get("urgency") if latest_crm else None
    crm_next_action = latest_crm.get("next_action") if latest_crm else None

    if risk_level in HIGH_RISK_LEVELS:
        retention_signals = [
            signal["interpretation"]
            for signal in risk.get("signals", [])
            if signal.get("name") in RECOVERY_SIGNAL_NAMES
        ]
        evidence = [f"Existing risk level: {risk_level}", *retention_signals]
        evidence.append(f"Annual sales value: {business_value:.2f}")
        severity_weight = 60 if risk_level == "Critical" else 45
        return {
            "decision_category": "customer_recovery",
            "decision_score": min(
                100,
                severity_weight
                + _value_weight(business_value, median_business_value)
                + min(15, len(retention_signals) * 5),
            ),
            "decision_reason": "High existing risk combined with customer value requires a retention decision.",
            "decision_evidence": evidence,
        }

    eligible_for_growth = (
        is_active
        and risk_level not in HIGH_RISK_LEVELS
        and opportunity_score >= 60
    )
    if not eligible_for_growth:
        return None

    opportunity_evidence = list(opportunity.get("reasons", []))
    opportunity_evidence.extend((
        f"Opportunity score: {opportunity_score}",
        f"Annual sales value: {business_value:.2f}",
    ))

    if crm_urgency in CRM_SALES_URGENCIES:
        urgency_weight = 20 if crm_urgency == "فوری" else 10
        if crm_next_action:
            opportunity_evidence.append(f"CRM next action: {crm_next_action}")
        opportunity_evidence.append(f"CRM urgency: {crm_urgency}")
        return {
            "decision_category": "sales_opportunity",
            "decision_score": min(
                100,
                opportunity_score + urgency_weight + _value_weight(business_value, median_business_value),
            ),
            "decision_reason": "A healthy, high-potential customer has an important or urgent CRM follow-up for near-term sales action.",
            "decision_evidence": opportunity_evidence,
        }

    return {
        "decision_category": "growth_opportunity",
        "decision_score": min(
            100,
            opportunity_score + _value_weight(business_value, median_business_value),
        ),
        "decision_reason": "An active customer with acceptable risk has observable potential for account growth.",
        "decision_evidence": opportunity_evidence,
    }
