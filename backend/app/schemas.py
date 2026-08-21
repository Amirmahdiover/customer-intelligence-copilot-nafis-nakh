"""Pydantic response/error models for the Customer Analytics API.

Documentation only — field types, descriptions, and examples. None of this
changes how any KPI, Risk_Level, or Recommended_Action value is computed;
that logic lives in the analytics build pipeline and app/rules.py.
"""
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

CustomerSegment = Literal["A", "B", "C"]
CustomerStatus = Literal["فعال", "غیرفعال"]  # فعال = active, غیرفعال = inactive
RFMSegment = Literal[
    "Champions",
    "Loyal Customers",
    "Regular",
    "New / Recent",
    "At Risk (High Value)",
    "Lost / Churned",
    "No Activity (Pre-Onboarding as of Snapshot)",
]
RiskLevel = Literal["Low", "Medium", "High", "Critical", "Not Yet Active"]
MarginConfidence = Literal["High", "Medium", "Low", "Unknown"]
ValueTier = Literal["شریک طلایی", "مشتری پایدار", "مشتری پرچالش", "مشتری قرمز"]


class ErrorResponse(BaseModel):
    """Standard error body returned by every endpoint on failure."""

    detail: str

    model_config = ConfigDict(
        json_schema_extra={"example": {"detail": "Customer 'C_999999' not found"}}
    )


# ---------------------------------------------------------------------------
# /customers — customer_info header pipeline
# ---------------------------------------------------------------------------

class CustomerHeaderItem(BaseModel):
    customer_info: str = Field(
        ...,
        description="Combined identity fields: Customer_ID,Customer_Segment,Customer_Status.",
    )

    model_config = ConfigDict(json_schema_extra={"example": {"customer_info": "C_010649,B,فعال"}})


class CustomerHeaderListResponse(BaseModel):
    customers: list[CustomerHeaderItem]

    model_config = ConfigDict(json_schema_extra={"example": {
        "customers": [
            {"customer_info": "C_010649,B,فعال"},
            {"customer_info": "C_009817,B,غیرفعال"},
        ],
    }})

class CustomerHeaderResponse(BaseModel):
    customer_info: str = Field(
        ...,
        description="Combined identity fields: Customer_ID,Customer_Segment,Customer_Status.",
    )

    model_config = ConfigDict(json_schema_extra={"example": {"customer_info": "C_010649,B,فعال"}})


# ---------------------------------------------------------------------------
# /customers — legacy analytics list/profile (used by sub-endpoints)
# ---------------------------------------------------------------------------

class CustomerSummary(BaseModel):
    Customer_ID: str = Field(..., description="Primary customer identifier. Two source namespaces coexist: 'C_xxxxxx' (MDM) and 'CUST-xxx' (CRM_MASTER, newer onboarding cohort).")
    Customer_Segment: Optional[CustomerSegment] = Field(None, description="Business-assigned tier, A (highest) to C.")
    Customer_Status: Optional[CustomerStatus] = Field(None, description="فعال = active, غیرفعال = inactive, as recorded in the customer master.")
    Location_ID: Optional[str] = Field(None, description="Customer's registered location code.")
    Sales_Rep_ID: Optional[str] = Field(None, description="Assigned sales representative code.")
    RFM_Segment: Optional[RFMSegment] = Field(None, description="Rule-based segment derived from R/F/M quintile scores as of the analytics snapshot (2022-06-30).")
    Risk_Level: Optional[RiskLevel] = Field(None, description="Rule-based risk bucket. 'Not Yet Active' means the customer had no orders as of the snapshot and is excluded from scoring.")
    Recency_Days: Optional[float] = Field(None, description="Days between the snapshot date (2022-06-30) and the customer's last order on/before it. Null if not yet active as of snapshot.")
    Monetary_Total_Revenue: Optional[float] = Field(None, description="Total sales revenue on/before the snapshot date (RFM 'M' component).")
    LTV: Optional[float] = Field(None, description="Cumulative realized margin (profit) across the customer's full transaction history — not snapshot-limited.")

    model_config = ConfigDict(json_schema_extra={"example": {
        "Customer_ID": "C_010649",
        "Customer_Segment": "B",
        "Customer_Status": "فعال",
        "Location_ID": "LOC-007",
        "Sales_Rep_ID": "REP-008",
        "RFM_Segment": "Lost / Churned",
        "Risk_Level": "Medium",
        "Recency_Days": 73.0,
        "Monetary_Total_Revenue": 15602480.76,
        "LTV": 2883618.18,
    }})


class CustomerListResponse(BaseModel):
    total: int = Field(..., description="Total customers matching the applied filters, before pagination.")
    skip: int = Field(..., description="Number of records skipped (offset).")
    limit: int = Field(..., description="Page size requested.")
    count: int = Field(..., description="Number of records actually returned in this page.")
    items: list[CustomerSummary]

    model_config = ConfigDict(json_schema_extra={"example": {
        "total": 644, "skip": 0, "limit": 50, "count": 50,
        "items": [CustomerSummary.model_config["json_schema_extra"]["example"]],
    }})


class CustomerProfile(BaseModel):
    Customer_ID: str = Field(..., description="Primary customer identifier.")
    Customer_Segment: Optional[CustomerSegment] = Field(None, description="Business-assigned tier, A (highest) to C.")
    Customer_Status: Optional[CustomerStatus] = Field(None, description="فعال = active, غیرفعال = inactive.")
    Location_ID: Optional[str] = Field(None, description="Customer's registered location code.")
    Sales_Rep_ID: Optional[str] = Field(None, description="Assigned sales representative code.")
    Credit_Limit: Optional[float] = Field(None, description="Approved credit limit, source currency units.")
    Payment_Terms_Days: Optional[float] = Field(None, description="Contractual payment terms in days.")
    Recency_Days: Optional[float] = Field(None, description="Days since last order, measured against the 2022-06-30 snapshot. Null = not yet active as of snapshot.")
    Days_Since_Last_Order: Optional[float] = Field(None, description="Identical to Recency_Days — kept as a separate named field for dashboard clarity.")
    Frequency_Orders: Optional[int] = Field(None, description="Distinct invoice count on/before the snapshot date (RFM 'F' component).")
    Monetary_Total_Revenue: Optional[float] = Field(None, description="Total sales revenue on/before the snapshot date (RFM 'M' component).")
    R_Score: Optional[int] = Field(None, ge=1, le=5, description="Recency quintile score, 5 = most recent.")
    F_Score: Optional[int] = Field(None, ge=1, le=5, description="Frequency quintile score, 5 = most orders.")
    M_Score: Optional[int] = Field(None, ge=1, le=5, description="Monetary quintile score, 5 = highest revenue.")
    RFM_Score: Optional[str] = Field(None, description="R_Score, F_Score, M_Score concatenated as a 3-digit string, e.g. '111' or '435'.")
    RFM_Segment: Optional[RFMSegment] = Field(None, description="Rule-based segment label derived from R/F/M scores.")
    Last_Order_Date: Optional[str] = Field(None, description="Most recent order date on/before the snapshot (ISO date).")
    First_Order_Date: Optional[str] = Field(None, description="Earliest order date on record, unbounded by snapshot (ISO date).")
    Avg_Order_Interval_Days: Optional[float] = Field(None, description="Mean gap between consecutive orders on/before the snapshot. Null if fewer than 2 qualifying orders.")
    Order_Interval_Std_Days: Optional[float] = Field(None, description="Standard deviation of order intervals — a rough regularity indicator. Null if fewer than 3 qualifying orders.")
    Avg_Payment_Delay_Days: Optional[float] = Field(None, description="Mean days late on collections, scoped to on/before the snapshot. Null if no collections recorded by then.")
    Max_Payment_Delay_Days: Optional[float] = Field(None, description="Worst single collection delay, scoped to on/before the snapshot.")
    Collections_Count: Optional[int] = Field(None, description="Number of collection events on/before the snapshot.")
    Bounced_Check_Rate: Optional[float] = Field(None, ge=0, le=1, description="Share of collections marked as a bounced check, 0-1.")
    Lifetime_Days: Optional[float] = Field(None, description="Days between First_Order_Date and the true (unbounded) last order date — a full-history fact, not snapshot-limited.")
    Lifetime_Years: Optional[float] = Field(None, description="Lifetime_Days / 365.25.")
    Annual_Sales_Trailing12M: Optional[float] = Field(None, description="Revenue in the 365 days ending on the snapshot date.")
    Revenue_Total_Lifetime: Optional[float] = Field(None, description="Total revenue across the customer's complete transaction history (unbounded).")
    Cost_Total_Lifetime: Optional[float] = Field(None, description="Total realized-or-estimated cost across full history.")
    Margin_Total_Lifetime: Optional[float] = Field(None, description="Revenue_Total_Lifetime minus Cost_Total_Lifetime.")
    Margin_Pct: Optional[float] = Field(None, description="Margin_Total_Lifetime / Revenue_Total_Lifetime.")
    Margin_Cost_Basis_Actual_Pct: Optional[float] = Field(None, ge=0, le=1, description="Share of this customer's revenue costed from realized cost records vs. monthly estimates — higher means more trustworthy margin figures.")
    Margin_RARE_Revenue_Pct: Optional[float] = Field(None, ge=0, le=1, description="Share of revenue from P_RARE_* aggregated product codes, which carry less precise cost estimates.")
    Margin_Confidence: Optional[MarginConfidence] = Field(None, description="Overall confidence in Margin/LTV, derived from cost-basis quality and RARE-product exposure. Treat Low as indicative, not exact.")
    LTV: Optional[float] = Field(None, description="Cumulative realized margin (profit) across full history — equal to Margin_Total_Lifetime.")
    Revenue_Share_As_Of_Month: Optional[str] = Field(None, description="The most recent month (YYYY-MM) with a wallet-share record for this customer. Source data ends 2022-06 — treat as historical, not current.")
    Revenue_Share_Pct_Latest: Optional[float] = Field(None, description="Nafis_Purchase / Estimated_Total_Purchase for Revenue_Share_As_Of_Month.")
    Revenue_Share_Pct_Avg: Optional[float] = Field(None, description="Mean wallet share across all months on record for this customer.")
    Lifetime_Complaints: Optional[int] = Field(None, description="Total complaints ever recorded (unbounded by snapshot).")
    Recent_Complaints_12M: Optional[int] = Field(None, description="Complaints created in the 365 days ending on the snapshot date.")
    Biggest_Problem: Optional[str] = Field(None, description="Most frequent Complaint_Title for this customer. Null if no complaints on record.")
    Expected_Next_Order_Date: Optional[str] = Field(None, description="Last_Order_Date + Avg_Order_Interval_Days. Null if the interval couldn't be computed.")
    Days_Until_Expected_Next_Order: Optional[float] = Field(None, description="Expected_Next_Order_Date minus the snapshot date. Negative means the customer was already overdue vs. their own pattern as of the snapshot.")
    Risk_Score: Optional[float] = Field(None, description="Sum of rule-based risk points (see /risk for the breakdown). Null if Not Yet Active.")
    Risk_Level: Optional[RiskLevel] = Field(None, description="Bucketed Risk_Score.")
    Recommended_Action: Optional[str] = Field(None, description="Rule-based next-best-action text (see /actions for the triggering context).")

    model_config = ConfigDict(json_schema_extra={"example": {
        "Customer_ID": "C_010649", "Customer_Segment": "B", "Customer_Status": "فعال",
        "Location_ID": "LOC-007", "Sales_Rep_ID": "REP-008", "Credit_Limit": 5630000.0,
        "Payment_Terms_Days": 0.0, "Recency_Days": 73.0, "Days_Since_Last_Order": 73.0,
        "Frequency_Orders": 24, "Monetary_Total_Revenue": 15602480.76, "R_Score": 1,
        "F_Score": 1, "M_Score": 1, "RFM_Score": "111", "RFM_Segment": "Lost / Churned",
        "Last_Order_Date": "2022-04-18", "First_Order_Date": "2020-03-30",
        "Avg_Order_Interval_Days": 32.6, "Order_Interval_Std_Days": 67.4,
        "Avg_Payment_Delay_Days": 23.4, "Max_Payment_Delay_Days": 47.0,
        "Collections_Count": 25, "Bounced_Check_Rate": 0.0, "Lifetime_Days": 749.0,
        "Lifetime_Years": 2.05, "Annual_Sales_Trailing12M": 8835037.62,
        "Revenue_Total_Lifetime": 15602480.76, "Cost_Total_Lifetime": 12718862.5758,
        "Margin_Total_Lifetime": 2883618.1842, "Margin_Pct": 0.1848,
        "Margin_Cost_Basis_Actual_Pct": 0.279, "Margin_RARE_Revenue_Pct": 1.0,
        "Margin_Confidence": "Low", "LTV": 2883618.18,
        "Revenue_Share_As_Of_Month": "2022-06", "Revenue_Share_Pct_Latest": 0.0,
        "Revenue_Share_Pct_Avg": 0.1858, "Lifetime_Complaints": 0, "Recent_Complaints_12M": 0,
        "Biggest_Problem": None, "Expected_Next_Order_Date": "2022-05-20",
        "Days_Until_Expected_Next_Order": -41.0, "Risk_Score": 2.0, "Risk_Level": "Medium",
        "Recommended_Action": "Upsell / grow share-of-wallet — low share vs estimated potential",
    }})


# ---------------------------------------------------------------------------
# /customers/{id}/kpis
# ---------------------------------------------------------------------------

class KPIResponse(BaseModel):
    Customer_ID: str
    Recency_Days: Optional[float] = Field(None, description="Days since last order as of the 2022-06-30 snapshot.")
    Days_Since_Last_Order: Optional[float] = Field(None, description="Identical to Recency_Days.")
    Frequency_Orders: Optional[int] = Field(None, description="Distinct invoices on/before the snapshot.")
    Monetary_Total_Revenue: Optional[float] = Field(None, description="Total revenue on/before the snapshot.")
    R_Score: Optional[int] = Field(None, ge=1, le=5)
    F_Score: Optional[int] = Field(None, ge=1, le=5)
    M_Score: Optional[int] = Field(None, ge=1, le=5)
    RFM_Score: Optional[str] = Field(None, description="R+F+M concatenated, e.g. '111'.")
    RFM_Segment: Optional[RFMSegment] = None
    Last_Order_Date: Optional[str] = None
    First_Order_Date: Optional[str] = None
    Avg_Order_Interval_Days: Optional[float] = Field(None, description="Mean days between orders on/before the snapshot.")
    Order_Interval_Std_Days: Optional[float] = None
    Avg_Payment_Delay_Days: Optional[float] = None
    Max_Payment_Delay_Days: Optional[float] = None
    Bounced_Check_Rate: Optional[float] = Field(None, ge=0, le=1)
    Lifetime_Days: Optional[float] = Field(None, description="Full-history span, unbounded by snapshot.")
    Lifetime_Years: Optional[float] = None
    Annual_Sales_Trailing12M: Optional[float] = Field(None, description="Revenue in the 365 days ending on the snapshot.")
    Revenue_Total_Lifetime: Optional[float] = Field(None, description="Full-history revenue, unbounded by snapshot.")
    Cost_Total_Lifetime: Optional[float] = None
    Margin_Total_Lifetime: Optional[float] = None
    Margin_Pct: Optional[float] = None
    Margin_Confidence: Optional[MarginConfidence] = Field(None, description="Confidence in the margin figures above — see /customers/{id} for the underlying cost-basis and RARE-exposure signals.")
    LTV: Optional[float] = Field(None, description="Cumulative realized margin across full history.")
    Revenue_Share_As_Of_Month: Optional[str] = Field(None, description="Historical — source data ends 2022-06.")
    Revenue_Share_Pct_Latest: Optional[float] = None
    Revenue_Share_Pct_Avg: Optional[float] = None
    Expected_Next_Order_Date: Optional[str] = None
    Days_Until_Expected_Next_Order: Optional[float] = Field(None, description="Negative means overdue vs. this customer's own order pattern as of the snapshot.")

    model_config = ConfigDict(json_schema_extra={"example": {
        "Customer_ID": "C_010649", "Recency_Days": 73.0, "Days_Since_Last_Order": 73.0,
        "Frequency_Orders": 24, "Monetary_Total_Revenue": 15602480.76, "R_Score": 1,
        "F_Score": 1, "M_Score": 1, "RFM_Score": "111", "RFM_Segment": "Lost / Churned",
        "Last_Order_Date": "2022-04-18", "First_Order_Date": "2020-03-30",
        "Avg_Order_Interval_Days": 32.6, "Order_Interval_Std_Days": 67.4,
        "Avg_Payment_Delay_Days": 23.4, "Max_Payment_Delay_Days": 47.0, "Bounced_Check_Rate": 0.0,
        "Lifetime_Days": 749.0, "Lifetime_Years": 2.05, "Annual_Sales_Trailing12M": 8835037.62,
        "Revenue_Total_Lifetime": 15602480.76, "Cost_Total_Lifetime": 12718862.5758,
        "Margin_Total_Lifetime": 2883618.1842, "Margin_Pct": 0.1848, "Margin_Confidence": "Low",
        "LTV": 2883618.18, "Revenue_Share_As_Of_Month": "2022-06", "Revenue_Share_Pct_Latest": 0.0,
        "Revenue_Share_Pct_Avg": 0.1858, "Expected_Next_Order_Date": "2022-05-20",
        "Days_Until_Expected_Next_Order": -41.0,
    }})


# ---------------------------------------------------------------------------
# /customers/{id}/crm — customer_crm_interactions.csv pipeline
# ---------------------------------------------------------------------------

class CrmLatestResponse(BaseModel):
    customer_id: str
    next_action: Optional[str] = Field(None, description="Primary next action for the sales UI (source: Next_Action).")
    interaction_type: Optional[str] = Field(None, description="CRM interaction type (source: Interaction_Type).")
    summary_text: Optional[str] = Field(None, description="Original summary text; not rewritten (source: Summary_Text).")
    updated_at: Optional[str] = Field(None, description="ISO YYYY-MM-DD (source: Updated_At).")
    urgency: Optional[str] = Field(None, description="Extracted from summary_text via 'فوریت: …'. Null if not present.")

    model_config = ConfigDict(json_schema_extra={"example": {
        "customer_id": "C_051706",
        "next_action": "پیگیری تلفنی",
        "interaction_type": "نمونه محصول",
        "summary_text": "مشخصات نمونه و شرایط آزمون با مشتری هماهنگ شد. اقدام بعدی: پیگیری تلفنی؛ فوریت: مهم؛ کد پیگیری 0007.",
        "updated_at": "2020-08-15",
        "urgency": "مهم",
    }})


class CrmInteractionItem(BaseModel):
    next_action: Optional[str] = None
    interaction_type: Optional[str] = None
    summary_text: Optional[str] = None
    updated_at: Optional[str] = None
    urgency: Optional[str] = None

    model_config = ConfigDict(json_schema_extra={"example": {
        "next_action": "پیگیری تلفنی",
        "interaction_type": "نمونه محصول",
        "summary_text": "مشخصات نمونه و شرایط آزمون با مشتری هماهنگ شد. اقدام بعدی: پیگیری تلفنی؛ فوریت: مهم؛ کد پیگیری 0007.",
        "updated_at": "2020-08-15",
        "urgency": "مهم",
    }})


class CrmInteractionsListResponse(BaseModel):
    customer_id: str
    interactions: list[CrmInteractionItem]

    model_config = ConfigDict(json_schema_extra={"example": {
        "customer_id": "C_051706",
        "interactions": [CrmInteractionItem.model_config["json_schema_extra"]["example"]],
    }})


# ---------------------------------------------------------------------------
# /customers/{id}/complaints — customer_complaints.csv pipeline
# ---------------------------------------------------------------------------

class ComplaintDetailItem(BaseModel):
    Product_id: Optional[str] = Field(None, description="Product identifier (source: Product_ID).")
    complaint_text: Optional[str] = Field(None, description="Complaint description (source: Complaint_Text).")
    severity: Optional[str] = Field(None, description="Severity level (source: Severity).")
    created_at: Optional[str] = Field(None, description="Complaint creation date, ISO YYYY-MM-DD (source: Created_At).")
    complaint_status: Optional[str] = Field(None, description="Complaint status (source: Complaint_Status).")
    text_resolution: Optional[str] = Field(None, description="Resolution outcome text (source: Resolution_Text). Null if unresolved.")

    model_config = ConfigDict(json_schema_extra={"example": {
        "Product_id": "PRD-POY-001",
        "complaint_text": "نخ در بعضي جاها سيمي ميباشد...",
        "severity": "کم",
        "created_at": "2025-04-15",
        "complaint_status": "پذیرفته‌شده",
        "text_resolution": "موضوع از داخل سازمان بررسی گردید...",
    }})


class ComplaintsCountResponse(BaseModel):
    customer_id: str
    complaints_count: int

    model_config = ConfigDict(json_schema_extra={"example": {
        "customer_id": "C_683666",
        "complaints_count": 37,
    }})


class CustomerComplaintsListResponse(BaseModel):
    customer_id: str
    complaints_count: int
    complaints: list[ComplaintDetailItem]

    model_config = ConfigDict(json_schema_extra={"example": {
        "customer_id": "C_683666",
        "complaints_count": 2,
        "complaints": [ComplaintDetailItem.model_config["json_schema_extra"]["example"]],
    }})


# ---------------------------------------------------------------------------
# /customers/{id}/complaints — legacy analytics sheet (deprecated)
# ---------------------------------------------------------------------------

class ComplaintRecord(BaseModel):
    Complaint_ID: str
    Customer_ID: str
    Product_ID: Optional[str] = None
    Product_Group: Optional[str] = Field(None, alias="گروه کالا", description="Product family the complaint relates to.")
    Complaint_Title: Optional[str] = None
    Complaint_Text: Optional[str] = Field(None, description="Free-text complaint description, original language.")
    Hembaft_Reference: Optional[str] = Field(None, description="Rare cross-reference to a Hembaft (co-woven) lot. Null for the large majority of complaints.")
    Severity: Optional[str] = None
    Created_At: Optional[str] = None
    Available_At: Optional[str] = None
    Complaint_Status: Optional[str] = None
    Resolved_At: Optional[str] = Field(None, description="Null if the complaint is still open/unresolved.")
    Resolution_Available_At: Optional[str] = None
    Resolution_Text: Optional[str] = Field(None, description="Null if not yet resolved.")
    Source_System: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class ComplaintsResponse(BaseModel):
    Customer_ID: str
    Lifetime_Complaints: Optional[int] = Field(None, description="Total complaints ever recorded for this customer.")
    Recent_Complaints_12M: Optional[int] = Field(None, description="Complaints in the 365 days ending on the snapshot date.")
    Biggest_Problem: Optional[str] = Field(None, description="Most frequent Complaint_Title for this customer.")
    complaints: list[ComplaintRecord] = Field(..., description="Full complaint detail records, most recent first as stored.")

    model_config = ConfigDict(json_schema_extra={"example": {
        "Customer_ID": "C_683666", "Lifetime_Complaints": 37, "Recent_Complaints_12M": 13,
        "Biggest_Problem": "بدپیچی / سفتی بسته",
        "complaints": [{
            "Complaint_ID": "CMP-0051", "Customer_ID": "C_683666",
            "Product_ID": "P_RARE_Product_Family_03", "گروه کالا": "Product_Family_03",
            "Complaint_Title": "بدپیچی / سفتی بسته",
            "Complaint_Text": "در همبافت 1320400494 بسته‌ها سختي يکنواخت ندارند...",
            "Hembaft_Reference": None, "Severity": "زیاد", "Created_At": "2021-12-06",
            "Available_At": "2021-12-09", "Complaint_Status": "درحال بررسی",
            "Resolved_At": None, "Resolution_Available_At": None, "Resolution_Text": None,
            "Source_System": "QMS_COMPLAINTS",
        }],
    }})


# ---------------------------------------------------------------------------
# /customers/{id}/risk
# ---------------------------------------------------------------------------

class RiskFactor(BaseModel):
    factor: str = Field(..., description="Name of the input the rule inspected.")
    value: Optional[float | str] = Field(None, description="That input's value for this customer.")
    points: Optional[int] = Field(None, description="Points this factor contributed to Risk_Score. Null when the customer isn't scored (Not Yet Active).")
    rule: str = Field(..., description="Exact threshold rule applied, in human-readable form.")


class RiskResponse(BaseModel):
    Customer_ID: str
    Snapshot_Date: str = Field(..., description="As-of date used for every snapshot-relative field (fixed: 2022-06-30).")
    Risk_Score: Optional[float] = Field(None, description="Sum of all factor points. Null if Not Yet Active.")
    Risk_Level: Optional[RiskLevel] = None
    factors: list[RiskFactor] = Field(..., description="Every rule check applied, in evaluation order, with the points each contributed.")
    method: Literal["rule_based"] = Field("rule_based", description="Always 'rule_based' — no ML or statistical model is used anywhere in this API.")

    model_config = ConfigDict(json_schema_extra={"example": {
        "Customer_ID": "C_010649", "Snapshot_Date": "2022-06-30", "Risk_Score": 2.0,
        "Risk_Level": "Medium",
        "factors": [
            {"factor": "Recency_Days", "value": 73.0, "points": 0, "rule": "Recency_Days <= 90 -> +0"},
            {"factor": "Avg_Payment_Delay_Days", "value": 23.4, "points": 1, "rule": "14 < Avg_Payment_Delay_Days <= 30 -> +1"},
            {"factor": "Recent_Complaints_12M", "value": 0.0, "points": 0, "rule": "Recent_Complaints_12M == 0 -> +0"},
            {"factor": "Customer_Status", "value": "فعال", "points": 0, "rule": "Customer_Status == 'فعال' (active) -> +0"},
            {"factor": "Revenue_Share_Pct_Latest", "value": 0.0, "points": 1, "rule": "Revenue_Share_Pct_Latest < 0.30 -> +1"},
        ],
        "method": "rule_based",
    }})


# ---------------------------------------------------------------------------
# /customers/{id}/actions
# ---------------------------------------------------------------------------

class ActionResponse(BaseModel):
    Customer_ID: str
    Recommended_Action: str = Field(..., description="Rule-based next-best-action text, chosen by priority order (first matching rule wins).")
    Risk_Level: Optional[RiskLevel] = None
    RFM_Segment: Optional[RFMSegment] = None
    Customer_Status: Optional[CustomerStatus] = None
    Days_Until_Expected_Next_Order: Optional[float] = Field(None, description="Negative means overdue vs. this customer's own order pattern as of the snapshot.")
    method: Literal["rule_based"] = Field("rule_based", description="Always 'rule_based' — no ML or statistical model is used anywhere in this API.")

    model_config = ConfigDict(json_schema_extra={"example": {
        "Customer_ID": "C_010649",
        "Recommended_Action": "Upsell / grow share-of-wallet — low share vs estimated potential",
        "Risk_Level": "Medium", "RFM_Segment": "Lost / Churned", "Customer_Status": "فعال",
        "Days_Until_Expected_Next_Order": -41.0, "method": "rule_based",
    }})


# ---------------------------------------------------------------------------
# /customers/{id}/offers/best — ML offer acceptance
# ---------------------------------------------------------------------------

class OfferRecommendation(BaseModel):
    Offer_Type: str = Field(..., description="Commercial offer type (قیمتی / حجمی / مدت‌دار).")
    Offer_Reason: str = Field(..., description="Business reason for the offer.")
    Product_Family: Optional[str] = Field(None, description="Suggested product family for the offer context.")
    Offer_Discount_Pct: float = Field(..., description="Recommended discount as a fraction (0.05 = 5%).")
    Validity_Days: int = Field(..., description="Suggested offer validity window in days.")
    accept_probability: float = Field(..., description="Calibrated P(accept) from the ML model.")
    business_score: float = Field(
        ...,
        description="P(accept) * (1 - discount); balances acceptance vs margin giveaway.",
    )


class BestOfferResponse(BaseModel):
    Customer_ID: str
    method: Literal["ml_offer_accept"] = "ml_offer_accept"
    best_offer: OfferRecommendation
    alternatives: list[OfferRecommendation] = Field(default_factory=list)

    model_config = ConfigDict(json_schema_extra={"example": {
        "Customer_ID": "C_746892",
        "method": "ml_offer_accept",
        "best_offer": {
            "Offer_Type": "قیمتی",
            "Offer_Reason": "افزایش سهم از سبد",
            "Product_Family": "Product_Family_03",
            "Offer_Discount_Pct": 0.05,
            "Validity_Days": 14,
            "accept_probability": 0.72,
            "business_score": 0.68,
        },
        "alternatives": [],
    }})


# ---------------------------------------------------------------------------
# /customers/{id}/churn — ML churn probability
# ---------------------------------------------------------------------------

ChurnRiskLevelFa = Literal["پایین", "متوسط", "بالا"]


class ChurnResponse(BaseModel):
    Customer_ID: str
    method: Literal["ml_churn"] = "ml_churn"
    churn_probability: float = Field(..., description="P(churn) in the next 90 days.")
    churn_prediction: int = Field(..., description="1 if probability >= 0.5, else 0.")
    risk_level: ChurnRiskLevelFa = Field(..., description="بالا if p>=0.7, متوسط if p>=0.4, else پایین.")
    snapshot_date: Optional[str] = Field(None, description="Feature snapshot date used for inference.")

    model_config = ConfigDict(json_schema_extra={"example": {
        "Customer_ID": "C_672256",
        "method": "ml_churn",
        "churn_probability": 0.81,
        "churn_prediction": 1,
        "risk_level": "بالا",
        "snapshot_date": "2022-03-01",
    }})


class NegotiationPillar(BaseModel):
    score: float = Field(..., ge=0, le=1, description="Pillar score on a 0-1 scale.")
    weight: float = Field(..., ge=0, le=1)
    contribution: float
    method: Literal["ml_model", "rule_based_scorecard"]
    note: Optional[str] = None
    confidence: Literal["high", "medium", "low"]


class NegotiationScoreResponse(BaseModel):
    Customer_ID: str
    method: Literal["negotiation_score"] = "negotiation_score"
    negotiation_score: float = Field(..., ge=0, le=100, description="Weighted success score 0-100.")
    recommendation: str
    pillars: dict[str, NegotiationPillar]
    key_drivers: list[str]
    warnings: list[str]
    snapshot_date: Optional[str] = Field(
        None, description="Negotiation profile snapshot date (2022-03-01)."
    )

    model_config = ConfigDict(json_schema_extra={"example": {
        "Customer_ID": "C_551361",
        "method": "negotiation_score",
        "negotiation_score": 69.41,
        "recommendation": "شانس موفقیت متوسط - نیازمند آماده‌سازی و امتیاز متقابل. ضعیف‌ترین محور: سلامت وصول (49%)",
        "pillars": {
            "collection": {
                "score": 0.49, "weight": 0.25, "contribution": 0.1225,
                "method": "rule_based_scorecard", "note": "سابقهٔ پرداخت متوسط", "confidence": "medium",
            },
            "retention": {
                "score": 0.99, "weight": 0.25, "contribution": 0.2475,
                "method": "ml_model", "note": "مدل Logistic Regression، AUC=0.8823", "confidence": "high",
            },
            "loyalty": {
                "score": 0.49, "weight": 0.25, "contribution": 0.1225,
                "method": "ml_model", "note": "سهم سبد پیش‌بینی‌شده؛ مدل Ridge، R²=0.3983", "confidence": "medium",
            },
            "cash": {
                "score": 0.80, "weight": 0.25, "contribution": 0.2,
                "method": "rule_based_scorecard", "note": "مشتری نقدی و سودآور", "confidence": "medium",
            },
        },
        "key_drivers": ["✓ خرید اخیر (12 روز پیش) - رابطهٔ فعال"],
        "warnings": [],
        "snapshot_date": "2022-03-01",
    }})


# ---------------------------------------------------------------------------
# /customers/{id}/financial — customer_financial_status.csv pipeline
# ---------------------------------------------------------------------------

CreditStatus = Literal["safe", "warning", "critical", "over_limit", "unknown"]


class NotDueInvoicesSummary(BaseModel):
    count: int = Field(..., description="Number of open invoices whose due date is after the snapshot.")


class ReturnedChecksSummary(BaseModel):
    has_returned_check: bool
    count: int
    last_date: Optional[str] = Field(None, description="Most recent returned-check event date, ISO YYYY-MM-DD.")


class CreditSummary(BaseModel):
    limit: Optional[float] = Field(None, description="Approved credit limit from customers sheet.")
    used_percent: Optional[float] = Field(None, description="Outstanding balance / credit limit × 100.")
    remaining: Optional[float] = Field(None, description="Credit limit minus outstanding balance.")
    status: CreditStatus = Field(..., description="Derived from configurable thresholds in app/config.py.")


class DelayCostSummary(BaseModel):
    amount: float = Field(..., description="Sum of financing cost for delayed collections.")
    annual_financing_rate: float = Field(..., description="Configurable annual rate used in delay cost formula.")


class CustomerFinancialResponse(BaseModel):
    customer_id: str
    outstanding_balance: float = Field(..., description="Sum of max(invoice_total − collected, 0) across all invoices.")
    not_due_invoices: NotDueInvoicesSummary
    returned_checks: ReturnedChecksSummary
    credit: CreditSummary
    delay_cost: DelayCostSummary

    model_config = ConfigDict(json_schema_extra={"example": {
        "customer_id": "C_050237",
        "outstanding_balance": 340000000.0,
        "not_due_invoices": {"count": 0},
        "returned_checks": {"has_returned_check": False, "count": 0, "last_date": None},
        "credit": {"limit": 400000000.0, "used_percent": 85.0, "remaining": 60000000.0, "status": "critical"},
        "delay_cost": {"amount": 12000000.0, "annual_financing_rate": 0.36},
    }})


class NotDueInvoiceItem(BaseModel):
    invoice_id: Optional[str] = None
    invoice_total: float
    amount_collected: float
    outstanding_balance: float
    due_date: Optional[str] = Field(None, description="Due date from collections sheet (not reconstructed from payment terms).")

    model_config = ConfigDict(json_schema_extra={"example": {
        "invoice_id": "T_1003",
        "invoice_total": 150000000.0,
        "amount_collected": 50000000.0,
        "outstanding_balance": 100000000.0,
        "due_date": "2022-07-15",
    }})


class NotDueInvoicesResponse(BaseModel):
    customer_id: str
    count: int
    invoices: list[NotDueInvoiceItem]

    model_config = ConfigDict(json_schema_extra={"example": {
        "customer_id": "C_050237",
        "count": 0,
        "invoices": [],
    }})


class ReturnedCheckItem(BaseModel):
    date: Optional[str] = Field(None, description="Collection event date for a returned check, ISO YYYY-MM-DD.")

    model_config = ConfigDict(json_schema_extra={"example": {
        "date": "2022-06-15",
    }})


class ReturnedChecksResponse(BaseModel):
    customer_id: str
    count: int
    checks: list[ReturnedCheckItem]

    model_config = ConfigDict(json_schema_extra={"example": {
        "customer_id": "C_050237",
        "count": 0,
        "checks": [],
    }})
# ---------------------------------------------------------------------------
# /value-segments — customer value score 0-100
# ---------------------------------------------------------------------------

class CustomerValueItem(BaseModel):
    customer_id: str
    score: float = Field(..., ge=0, le=100, description="Weighted value score on a 0-100 scale.")
    value_tier: ValueTier
    monetary: Optional[float] = None
    sow: Optional[float] = None
    margin: Optional[float] = None
    on_time: Optional[float] = None
    check_quality: Optional[float] = None
    frequency: Optional[float] = None
    recency: Optional[float] = None
    trend: Optional[float] = None
    offer_accept: Optional[float] = None
    growth_capacity: Optional[float] = None

    model_config = ConfigDict(json_schema_extra={"example": {
        "customer_id": "C_010649",
        "score": 82.0,
        "value_tier": "شریک طلایی",
        "monetary": 0.71,
        "sow": 0.64,
        "margin": 0.58,
        "on_time": 0.9,
        "check_quality": 1.0,
        "frequency": 0.55,
        "recency": 0.88,
        "trend": 0.62,
        "offer_accept": 0.5,
        "growth_capacity": 0.2,
    }})


class CustomerValueListResponse(BaseModel):
    count: int
    customers: list[CustomerValueItem]


class CustomerValueResponse(CustomerValueItem):
    pass
