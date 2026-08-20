"""Read-only API routes for the isolated Executive Dashboard module."""
from fastapi import APIRouter, HTTPException, Query

from backend.app.dashboard.schemas import (
    DashboardOverviewResponse,
    DashboardAIExecutiveSummaryResponse,
    DashboardAIExplanationResponse,
    DashboardPriorityCustomer,
    ExecutiveSummaryResponse,
    RiskOpportunityMapResponse,
)
from backend.app.dashboard.service import dashboard_service


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/overview",
    response_model=DashboardOverviewResponse,
    summary="Get executive Dashboard metrics",
)
def get_dashboard_overview() -> DashboardOverviewResponse:
    """Return snapshot-dated, rule-based portfolio metrics."""
    return dashboard_service.get_overview()


@router.get(
    "/priorities",
    response_model=list[DashboardPriorityCustomer],
    summary="List rule-based priority customers",
)
def get_dashboard_priorities(
    limit: int = Query(default=10, ge=1, le=100),
) -> list[DashboardPriorityCustomer]:
    """Return customers ranked with visible signals and recommended actions."""
    return dashboard_service.get_priority_customers(limit=limit)


@router.get(
    "/risk-opportunity-map",
    response_model=RiskOpportunityMapResponse,
    summary="Get customer risk and opportunity points",
)
def get_risk_opportunity_map() -> RiskOpportunityMapResponse:
    """Return rule-based customer positions for a risk/opportunity visualization."""
    return dashboard_service.get_risk_opportunity_map()


@router.get(
    "/summary",
    response_model=ExecutiveSummaryResponse,
    summary="Get deterministic executive summary",
)
def get_dashboard_summary() -> ExecutiveSummaryResponse:
    """Return a historical, rule-based management summary."""
    return dashboard_service.get_executive_summary()


@router.get(
    "/ai/executive-summary",
    response_model=DashboardAIExecutiveSummaryResponse,
    summary="Get an optional AI sales interpretation of the Dashboard snapshot",
)
def get_dashboard_ai_executive_summary() -> DashboardAIExecutiveSummaryResponse:
    """Return a cached Persian AI interpretation, with a deterministic fallback."""
    return dashboard_service.get_ai_executive_summary()


@router.get(
    "/ai/explanation/{customer_id}",
    response_model=DashboardAIExplanationResponse,
    summary="Get an optional AI explanation for an existing Dashboard decision",
)
def get_dashboard_ai_explanation(customer_id: str) -> DashboardAIExplanationResponse:
    """Return a cached Persian customer explanation without changing the decision."""
    try:
        return dashboard_service.get_ai_explanation(customer_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail="Customer was not found") from error
