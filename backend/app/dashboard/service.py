"""Read-only orchestration for the isolated Executive Dashboard module."""
from __future__ import annotations

from statistics import median
from typing import Any

from ..complaint_store import complaint_store
from ..crm_store import crm_store
from ..customer_ai_action import build_rule_based_decision, extract_customer_factors
from ..financial_store import financial_store
from ..liquidity_store import liquidity_store
from .ai_service import dashboard_ai_service
from .logic.actions import build_recommended_actions
from .logic.decisions import classify_dashboard_decision
from .logic.matrix import build_strategic_matrix
from .logic.opportunity import (
    build_opportunity_assessment,
    is_growth_opportunity,
)
from .logic.risk import HIGH_RISK_LEVELS, build_risk_explanation
from .logic.summary import build_executive_summary
from .schemas import (
    CustomerAIActionResponse,
    DashboardMetric,
    DashboardAIExecutiveSummaryResponse,
    DashboardAIExplanationResponse,
    DashboardOverviewResponse,
    DashboardPriorityCustomer,
    DashboardSignal,
    ExecutiveSummaryResponse,
    RiskOpportunityMapResponse,
    RiskOpportunityPoint,
    StrategicMatrixResponse,
)
from ..data_loader import SNAPSHOT_DATE, store


# Matches the existing Dashboard priority definition; used only to flag map points.
PRIORITY_CUSTOMER_THRESHOLD = 50


def _number(value: Any) -> float:
    try:
        return float(value) if value is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


class DashboardService:
    """Build Dashboard read models without mutating shared customer data."""

    @staticmethod
    def _records() -> list[dict[str, Any]]:
        records, _ = store.list_customers({}, skip=0, limit=10000)
        return records

    @staticmethod
    def _benchmarks(records: list[dict[str, Any]]) -> dict[str, float]:
        def field_median(name: str) -> float:
            values = [_number(record.get(name)) for record in records]
            values = [value for value in values if value > 0]
            return float(median(values)) if values else 0.0

        return {
            "annual_sales": field_median("Annual_Sales_Trailing12M"),
            "margin": field_median("Margin_Total_Lifetime"),
            "ltv": field_median("LTV"),
            "frequency": field_median("Frequency_Orders"),
        }

    @staticmethod
    def _status(
        customer: dict[str, Any],
        risk: dict[str, Any],
        opportunity: dict[str, Any],
        latest_crm: dict[str, str | None] | None,
    ) -> str:
        if risk["risk_level"] in HIGH_RISK_LEVELS:
            return "risk"
        if is_growth_opportunity(customer, opportunity):
            return "opportunity"
        if latest_crm and latest_crm.get("urgency") in {"فوری", "مهم"}:
            return "attention"
        return "attention"

    def _customer_read_model(
        self, customer: dict[str, Any], benchmarks: dict[str, float]
    ) -> dict[str, Any]:
        customer_id = str(customer["Customer_ID"])
        complaint_count = complaint_store.count_for_customer(customer_id)
        risk = build_risk_explanation(customer, complaint_count=complaint_count)
        opportunity = build_opportunity_assessment(customer, benchmarks)
        latest_crm = crm_store.get_latest(customer_id)
        actions = build_recommended_actions(customer, risk, opportunity, latest_crm)
        decision = classify_dashboard_decision(
            customer,
            risk,
            opportunity,
            latest_crm,
            median_business_value=benchmarks["annual_sales"],
        )
        status = self._status(customer, risk, opportunity, latest_crm)
        annual_sales = _number(customer.get("Annual_Sales_Trailing12M"))
        risk_weight = {"Critical": 60, "High": 45, "Medium": 25, "Low": 5}.get(
            risk["risk_level"], 0
        )
        urgency_weight = {"فوری": 20, "مهم": 10}.get(
            latest_crm.get("urgency") if latest_crm else "", 0
        )
        priority_score = min(
            100,
            risk_weight + opportunity["opportunity_score"] // 3 + urgency_weight,
        )
        signals = [DashboardSignal(**signal) for signal in risk["signals"]]
        main_signal = (
            (decision["decision_evidence"][0] if decision and decision["decision_evidence"] else None)
            or (signals[0].interpretation if signals else None)
            or actions["primary_interpretation"]
        )
        return {
            "customer_id": customer_id,
            "status": status,
            "customer_status": customer.get("Customer_Status"),
            "business_value": annual_sales,
            "annual_sales_trailing_12m": annual_sales,
            "margin_total_lifetime": _number(customer.get("Margin_Total_Lifetime")),
            "ltv": _number(customer.get("LTV")),
            "risk_level": risk["risk_level"],
            "risk_score": risk["risk_score"],
            "opportunity_score": opportunity["opportunity_score"],
            "is_growth_opportunity": is_growth_opportunity(customer, opportunity),
            "priority_score": priority_score,
            "decision_category": decision["decision_category"] if decision else None,
            "decision_score": decision["decision_score"] if decision else None,
            "decision_reason": decision["decision_reason"] if decision else None,
            "decision_evidence": decision["decision_evidence"] if decision else [],
            "main_signal": main_signal,
            "signals": signals,
            "interpretation": actions["primary_interpretation"],
            "recommended_action": actions["primary_action"],
            "latest_crm_next_action": latest_crm.get("next_action") if latest_crm else None,
            "crm_urgency": latest_crm.get("urgency") if latest_crm else None,
            "complaint_count": complaint_count,
        }

    def _read_models(self) -> list[dict[str, Any]]:
        records = self._records()
        benchmarks = self._benchmarks(records)
        return [self._customer_read_model(record, benchmarks) for record in records]

    @staticmethod
    def _balanced_priority_models(
        models: list[dict[str, Any]], limit: int
    ) -> list[dict[str, Any]]:
        categories = (
            "customer_recovery",
            "growth_opportunity",
            "sales_opportunity",
        )
        grouped = {category: [] for category in categories}
        for model in models:
            category = model["decision_category"]
            if category:
                grouped[category].append(model)

        for category_models in grouped.values():
            category_models.sort(
                key=lambda model: (
                    model["decision_score"] or 0,
                    model["business_value"],
                ),
                reverse=True,
            )

        selected: list[dict[str, Any]] = []
        index = 0
        while len(selected) < limit:
            added = False
            for category in categories:
                if index < len(grouped[category]) and len(selected) < limit:
                    selected.append(grouped[category][index])
                    added = True
            if not added:
                break
            index += 1
        return selected

    def get_overview(self) -> DashboardOverviewResponse:
        models = self._read_models()
        risk_distribution: dict[str, int] = {}
        for model in models:
            level = model["risk_level"] or "Unknown"
            risk_distribution[level] = risk_distribution.get(level, 0) + 1

        at_risk = [model for model in models if model["risk_level"] in HIGH_RISK_LEVELS]
        opportunities = [model for model in models if model["is_growth_opportunity"]]
        priority_actions = [model for model in models if model["decision_category"]]
        active_customers = sum(
            1 for record in self._records() if record.get("Customer_Status") == "فعال"
        )
        revenue_at_risk = sum(model["annual_sales_trailing_12m"] for model in at_risk)
        trailing_12m_revenue = sum(
            _number(record.get("Annual_Sales_Trailing12M")) for record in self._records()
        )
        total_liquidity = liquidity_store.compute(customer_id=None, days=None)["total_liquidity"]

        return DashboardOverviewResponse(
            snapshot_date=SNAPSHOT_DATE,
            metrics=[
                DashboardMetric(key="active_customers", label="Active Customers", value=active_customers),
                DashboardMetric(key="customers_at_risk", label="Customers At Risk", value=len(at_risk)),
                DashboardMetric(key="revenue_at_risk", label="Revenue At Risk", value=round(revenue_at_risk, 2)),
                DashboardMetric(key="growth_opportunities", label="Growth Opportunities", value=len(opportunities)),
                DashboardMetric(key="priority_actions", label="Priority Actions", value=len(priority_actions)),
                DashboardMetric(
                    key="trailing_12m_revenue",
                    label="Trailing 12M Revenue",
                    value=round(trailing_12m_revenue, 2),
                ),
                DashboardMetric(
                    key="total_liquidity",
                    label="Company Liquidity",
                    value=total_liquidity,
                ),
            ],
            risk_distribution=risk_distribution,
        )

    def get_priority_customers(self, limit: int = 10) -> list[DashboardPriorityCustomer]:
        # Interleave decision categories so a short API response remains a
        # balanced queue rather than being monopolized by risk cases.
        selected = self._balanced_priority_models(self._read_models(), limit)
        return [DashboardPriorityCustomer(**model) for model in selected]

    def get_risk_opportunity_map(self) -> RiskOpportunityMapResponse:
        models = self._read_models()
        return RiskOpportunityMapResponse(
            snapshot_date=SNAPSHOT_DATE,
            customers=[
                RiskOpportunityPoint(
                    customer_id=model["customer_id"],
                    risk_level=model["risk_level"],
                    risk_score=model["risk_score"],
                    opportunity_score=model["opportunity_score"],
                    business_value=model["business_value"],
                    status=model["status"],
                    attention_required=model["priority_score"] >= PRIORITY_CUSTOMER_THRESHOLD,
                )
                for model in models
            ],
        )

    def get_strategic_matrix(self) -> StrategicMatrixResponse:
        active_records = [
            record for record in self._records() if record.get("Customer_Status") == "فعال"
        ]
        result = build_strategic_matrix(active_records)
        return StrategicMatrixResponse(snapshot_date=SNAPSHOT_DATE, **result)

    def get_executive_summary(self) -> ExecutiveSummaryResponse:
        models = self._read_models()
        at_risk = [model for model in models if model["risk_level"] in HIGH_RISK_LEVELS]
        opportunities = [model for model in models if model["is_growth_opportunity"]]
        priority_customers = self._balanced_priority_models(models, limit=3)
        summary = build_executive_summary(
            snapshot_date=SNAPSHOT_DATE,
            risk_customer_count=len(at_risk),
            opportunity_customer_count=len(opportunities),
            revenue_at_risk=sum(model["annual_sales_trailing_12m"] for model in at_risk),
            priority_customers=priority_customers,
        )
        return ExecutiveSummaryResponse(**summary)

    def get_ai_explanation(self, customer_id: str) -> DashboardAIExplanationResponse:
        """Explain one existing decision without changing its deterministic result."""
        customer = next(
            (model for model in self._read_models() if model["customer_id"] == customer_id),
            None,
        )
        if customer is None:
            raise KeyError(customer_id)
        # Read-only facts enrich the AI narration; they never alter the
        # deterministic priority, scoring, or Dashboard decision.
        record = store.get_customer_record(customer_id) or {}
        customer["customer_profile"] = {
            "segment": record.get("Customer_Segment"),
            "status": record.get("Customer_Status"),
            "last_order_date": record.get("Last_Order_Date"),
            "days_since_last_order": record.get("Days_Since_Last_Order"),
            "purchase_frequency": record.get("Frequency_Orders"),
            "average_order_interval_days": record.get("Avg_Order_Interval_Days"),
            "annual_sales": record.get("Annual_Sales_Trailing12M"),
            "recent_complaints": record.get("Recent_Complaints_12M"),
            "lifetime_complaints": record.get("Lifetime_Complaints"),
            "payment_delay_days": record.get("Avg_Payment_Delay_Days"),
        }
        customer["crm_history"] = crm_store.list_interactions(customer_id)[:5]
        customer["complaints"] = complaint_store.list_for_customer(customer_id)[:5]
        customer["financial_status"] = financial_store.get_status(customer_id)
        customer["not_due_invoices"] = financial_store.list_not_due_invoices(customer_id)[:5]
        explanation = dashboard_ai_service.explain_customer(customer)
        return DashboardAIExplanationResponse(customer_id=customer_id, **explanation)

    def get_customer_ai_action(self, customer_id: str) -> CustomerAIActionResponse:
        """AI-narrated operational action for one customer.

        Unlike ``get_ai_explanation`` above, this does a single-record lookup
        instead of rebuilding read models for the whole portfolio, so it stays
        fast no matter how many customers exist.
        """
        record = store.get_customer_record(customer_id)
        if record is None:
            raise KeyError(customer_id)
        factors = extract_customer_factors(customer_id, record)
        baseline = build_rule_based_decision(factors)
        narration = dashboard_ai_service.recommend_customer_action(factors, baseline)
        return CustomerAIActionResponse(
            customer_id=customer_id,
            category=baseline["category"],
            category_label=baseline["category_label"],
            priority=baseline["priority"],
            action=narration["action"],
            reason=narration["reason"],
            source=narration["source"],
            cached=narration["cached"],
        )

    def get_ai_executive_summary(self) -> DashboardAIExecutiveSummaryResponse:
        """Interpret the current Dashboard snapshot using OpenAI or a transparent fallback."""
        models = self._read_models()
        overview = self.get_overview().model_dump()
        priorities = self._balanced_priority_models(models, limit=9)
        summary = dashboard_ai_service.executive_summary(overview, priorities)
        return DashboardAIExecutiveSummaryResponse(
            snapshot_date=overview["snapshot_date"], **summary
        )


dashboard_service = DashboardService()
