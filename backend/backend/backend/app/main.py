"""Customer Analytics API.

Serves the derived customer-level analytics dataset (data/customer_analytics_dataset.csv,
snapshot 2022-06-30) and complaint detail records (from DATASET.xlsx, sheet شکایات).
DATASET.xlsx is opened read-only and never modified.

Every KPI here (RFM, Margin, Risk, Recommended_Action, ...) is a deterministic
aggregation or explicit rule — no ML/statistical model is used anywhere.
"""
from typing import Optional

from fastapi import FastAPI, HTTPException, Path, Query

from app.data_loader import SNAPSHOT_DATE, store
from app.rules import risk_breakdown
from app.schemas import (
    ActionResponse,
    ComplaintsResponse,
    CustomerListResponse,
    CustomerProfile,
    CustomerSegment,
    CustomerStatus,
    ErrorResponse,
    KPIResponse,
    RFMSegment,
    RiskLevel,
    RiskResponse,
)

OPENAPI_TAGS = [
    {"name": "Customers", "description": "Customer master data and full analytics profile."},
    {"name": "KPIs", "description": "RFM, order pattern, delay, lifetime, margin, LTV, and revenue-share metrics."},
    {"name": "Complaints", "description": "Complaint history and detail records."},
    {"name": "Risk", "description": "Rule-based risk scoring with a transparent, factor-by-factor breakdown."},
    {"name": "Recommended Actions", "description": "Rule-based next-best-action per customer."},
]

app = FastAPI(
    title="Customer Analytics API",
    description=(
        "Rule-based customer KPIs, risk, and recommended actions derived from DATASET.xlsx.\n\n"
        f"**Snapshot date:** all snapshot-relative fields (Recency, RFM, Next Order, Risk, "
        f"Recent Complaints) are computed as of **{SNAPSHOT_DATE}** — not the current date, "
        "and not the latest date in the raw data. Lifetime/full-history fields (Margin, LTV, "
        "Lifetime_Complaints, Lifetime_Days) are unbounded by the snapshot.\n\n"
        "**No ML.** Every value is a deterministic aggregation or an explicit if/then rule; "
        "there is no statistical or machine-learning model anywhere in this API."
    ),
    version="1.0.0",
    openapi_tags=OPENAPI_TAGS,
)

NOT_FOUND_RESPONSES = {404: {"model": ErrorResponse, "description": "Customer not found"}}

CUSTOMER_ID_PATH = Path(
    ...,
    description="Customer identifier. Two ID namespaces coexist in the data: 'C_xxxxxx' (MDM source) and 'CUST-xxx' (CRM_MASTER source, newer onboarding cohort).",
    examples=["C_010649", "CUST-003"],
)


def _get_customer_or_404(customer_id: str) -> dict:
    record = store.get_customer_record(customer_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Customer '{customer_id}' not found")
    return record


@app.get(
    "/customers",
    response_model=CustomerListResponse,
    tags=["Customers"],
    summary="List customers",
    description="Paginated, filterable list of customer summaries. Use the full-profile "
                "endpoint (`GET /customers/{customer_id}`) for all fields on one customer.",
)
def list_customers(
    skip: int = Query(0, ge=0, description="Number of records to skip.", examples=[0]),
    limit: int = Query(50, ge=1, le=500, description="Max records to return.", examples=[50]),
    customer_status: Optional[CustomerStatus] = Query(None, description="Filter: exact Customer_Status."),
    risk_level: Optional[RiskLevel] = Query(None, description="Filter: exact Risk_Level."),
    rfm_segment: Optional[RFMSegment] = Query(None, description="Filter: exact RFM_Segment."),
    customer_segment: Optional[CustomerSegment] = Query(None, description="Filter: exact Customer_Segment."),
):
    records, total = store.list_customers(
        filters={
            "customer_status": customer_status,
            "risk_level": risk_level,
            "rfm_segment": rfm_segment,
            "customer_segment": customer_segment,
        },
        skip=skip,
        limit=limit,
    )
    return CustomerListResponse(total=total, skip=skip, limit=limit, count=len(records), items=records)


@app.get(
    "/customers/{customer_id}",
    response_model=CustomerProfile,
    responses=NOT_FOUND_RESPONSES,
    tags=["Customers"],
    summary="Get full customer profile",
    description="Every field in the analytics dataset for one customer — identity, RFM, "
                "order pattern, delay, lifetime, margin/LTV, revenue share, complaints, "
                "next order, risk, and recommended action.",
)
def get_customer(customer_id: str = CUSTOMER_ID_PATH):
    return _get_customer_or_404(customer_id)


@app.get(
    "/customers/{customer_id}/kpis",
    response_model=KPIResponse,
    responses=NOT_FOUND_RESPONSES,
    tags=["KPIs"],
    summary="Get customer KPIs",
    description="RFM, order pattern, delay, lifetime, annual sales, margin, LTV, and "
                "revenue-share metrics only — a subset of the full profile.",
)
def get_customer_kpis(customer_id: str = CUSTOMER_ID_PATH):
    return _get_customer_or_404(customer_id)


@app.get(
    "/customers/{customer_id}/complaints",
    response_model=ComplaintsResponse,
    responses=NOT_FOUND_RESPONSES,
    tags=["Complaints"],
    summary="Get customer complaint history",
    description="Lifetime/recent complaint counts and the most frequent complaint title, "
                "plus every individual complaint record for this customer from the شکایات sheet.",
)
def get_customer_complaints(customer_id: str = CUSTOMER_ID_PATH):
    record = _get_customer_or_404(customer_id)
    complaints = store.get_complaints_for_customer(customer_id)
    return {
        "Customer_ID": customer_id,
        "Lifetime_Complaints": record.get("Lifetime_Complaints"),
        "Recent_Complaints_12M": record.get("Recent_Complaints_12M"),
        "Biggest_Problem": record.get("Biggest_Problem"),
        "complaints": complaints,
    }


@app.get(
    "/customers/{customer_id}/risk",
    response_model=RiskResponse,
    responses=NOT_FOUND_RESPONSES,
    tags=["Risk"],
    summary="Get customer risk score and breakdown",
    description="Rule-based Risk_Score/Risk_Level plus the exact factor-by-factor breakdown "
                "(value, points, and the threshold rule applied) that produced it. "
                "'Not Yet Active' customers are excluded from scoring (no orders as of the snapshot).",
)
def get_customer_risk(customer_id: str = CUSTOMER_ID_PATH):
    record = _get_customer_or_404(customer_id)
    factors = risk_breakdown(record)
    return RiskResponse(
        Customer_ID=customer_id,
        Snapshot_Date=SNAPSHOT_DATE,
        Risk_Score=record.get("Risk_Score"),
        Risk_Level=record.get("Risk_Level"),
        factors=factors,
    )


@app.get(
    "/customers/{customer_id}/actions",
    response_model=ActionResponse,
    responses=NOT_FOUND_RESPONSES,
    tags=["Recommended Actions"],
    summary="Get recommended action for a customer",
    description="The rule-based next-best-action for this customer, plus the context "
                "(Risk_Level, RFM_Segment, overdue status) that determined it.",
)
def get_customer_actions(customer_id: str = CUSTOMER_ID_PATH):
    record = _get_customer_or_404(customer_id)
    return ActionResponse(
        Customer_ID=customer_id,
        Recommended_Action=record.get("Recommended_Action"),
        Risk_Level=record.get("Risk_Level"),
        RFM_Segment=record.get("RFM_Segment"),
        Customer_Status=record.get("Customer_Status"),
        Days_Until_Expected_Next_Order=record.get("Days_Until_Expected_Next_Order"),
    )
