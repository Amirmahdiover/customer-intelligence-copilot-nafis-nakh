"""Generate visible, rule-based recommended actions."""
from __future__ import annotations

from typing import Any


def _urgency_weight(urgency: str | None) -> int:
    return {"فوری": 20, "مهم": 10}.get(urgency or "", 0)


def build_recommended_actions(
    customer: dict[str, Any],
    risk: dict[str, Any],
    opportunity: dict[str, Any],
    latest_crm: dict[str, str | None] | None,
) -> dict[str, Any]:
    """Create ordered ``Signal -> Interpretation -> Action`` recommendations."""
    candidates: list[dict[str, Any]] = []
    for signal in risk["signals"]:
        candidates.append({
            "signal": f"{signal['name']}: {signal['value']}",
            "interpretation": signal["interpretation"],
            "action": signal["action"],
            "priority": 80 if signal["severity"] == "high" else 60,
        })

    if opportunity["opportunity_score"] >= 60:
        candidates.append({
            "signal": f"Opportunity score: {opportunity['opportunity_score']}",
            "interpretation": "Observable value, relationship, or wallet-share signals indicate room for commercial growth.",
            "action": "Review a suitable cross-sell or wallet-share offer with the customer.",
            "priority": 50,
        })

    crm_urgency = latest_crm.get("urgency") if latest_crm else None
    crm_next_action = latest_crm.get("next_action") if latest_crm else None
    if crm_next_action:
        candidates.append({
            "signal": f"CRM urgency: {crm_urgency or 'not specified'}",
            "interpretation": "The latest recorded CRM interaction identifies a pending customer follow-up.",
            "action": crm_next_action,
            "priority": 55 + _urgency_weight(crm_urgency),
        })

    existing_action = customer.get("Recommended_Action")
    if existing_action:
        candidates.append({
            "signal": "Existing recommended action",
            "interpretation": "The customer analytics dataset already provides a rule-based next best action.",
            "action": existing_action,
            "priority": 40,
        })

    if not candidates:
        candidates.append({
            "signal": "No elevated Dashboard signal",
            "interpretation": "No risk, opportunity, CRM urgency, or existing recommendation was available.",
            "action": "Maintain the regular customer engagement plan.",
            "priority": 0,
        })

    candidates.sort(key=lambda item: item["priority"], reverse=True)
    primary = candidates[0]
    return {
        "primary_action": primary["action"],
        "primary_interpretation": primary["interpretation"],
        "recommendations": candidates,
    }
