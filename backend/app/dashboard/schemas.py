"""Response contracts for the isolated, rule-based Dashboard module."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class DashboardSignal(BaseModel):
    """One visible fact used to explain a Dashboard conclusion."""

    name: str
    value: str | int | float | None
    rule: str
    interpretation: str
    action: str
    severity: Literal["low", "medium", "high"]


class DashboardMetric(BaseModel):
    key: str
    label: str
    value: int | float


class DashboardOverviewResponse(BaseModel):
    snapshot_date: str
    method: Literal["rule_based"] = "rule_based"
    metrics: list[DashboardMetric]
    risk_distribution: dict[str, int]


class DashboardPriorityCustomer(BaseModel):
    customer_id: str
    status: Literal["risk", "opportunity", "attention"]
    customer_status: str | None = None
    business_value: float = 0.0
    annual_sales_trailing_12m: float = 0.0
    margin_total_lifetime: float = 0.0
    ltv: float = 0.0
    risk_level: str | None = None
    risk_score: float | None = None
    opportunity_score: int = 0
    priority_score: int = 0
    decision_category: Literal[
        "customer_recovery", "growth_opportunity", "sales_opportunity"
    ] | None = None
    decision_score: int | None = None
    decision_reason: str | None = None
    decision_evidence: list[str] = Field(default_factory=list)
    signals: list[DashboardSignal]
    interpretation: str
    recommended_action: str
    latest_crm_next_action: str | None = None
    crm_urgency: str | None = None


class RiskOpportunityPoint(BaseModel):
    customer_id: str
    risk_level: str | None = None
    risk_score: float | None = None
    opportunity_score: int
    business_value: float
    status: Literal["risk", "opportunity", "attention"]
    attention_required: bool


class RiskOpportunityMapResponse(BaseModel):
    snapshot_date: str
    method: Literal["rule_based"] = "rule_based"
    customers: list[RiskOpportunityPoint]


class ExecutiveSummaryResponse(BaseModel):
    snapshot_date: str
    method: Literal["rule_based"] = "rule_based"
    headline: str
    key_findings: list[str]
    important_focus_areas: list[str]


class DashboardAIExplanationResponse(BaseModel):
    """Optional natural-language explanation of an existing Dashboard decision."""

    customer_id: str
    summary: str
    why_it_matters: str
    recommended_action: str
    source: Literal["openai", "fallback"]
    cached: bool


class DashboardAIExecutiveSummaryResponse(BaseModel):
    """Optional AI interpretation of the current deterministic Dashboard snapshot."""

    snapshot_date: str
    current_sales_status: str
    main_risks: str
    followable_opportunities: str
    recommended_action: str
    source: Literal["openai", "fallback"]
    cached: bool
