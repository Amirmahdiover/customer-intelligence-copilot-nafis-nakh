"""مدل‌های Pydantic برای پاسخ‌های API — این‌ها دقیقاً شکل JSON خروجی را تعیین می‌کنند."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ProfitabilityBlock(BaseModel):
    margin_pct: Optional[float] = Field(None, description="حاشیه سود درصدی (فروش-هزینه)/فروش")
    margin_abs: Optional[float] = Field(None, description="سود مطلق به ریال")
    cost_confidence_pct: Optional[float] = Field(
        None, description="چند درصد از فروش این مشتری بر پایه هزینه واقعی (نه برآوردی) محاسبه شده"
    )
    score: Optional[float] = Field(None, description="امتیاز صدکی ۰ تا ۱۰۰")


class PaymentBehaviorBlock(BaseModel):
    avg_delay_days: Optional[float] = Field(
        None, description="میانگین تأخیر پرداخت به روز (بازسازی‌شده از تاریخ‌ها، منفی=زودهنگام)"
    )
    score: Optional[float] = None


class VolumeShareBlock(BaseModel):
    revenue_share_pct: Optional[float] = Field(None, description="سهم این مشتری از کل فروش شرکت")
    revenue_total: Optional[float] = None
    score: Optional[float] = None


class ServiceCostBlock(BaseModel):
    invoices_per_million_revenue: Optional[float] = None
    n_complaints: int = 0
    score: Optional[float] = None


class TrendBlock(BaseModel):
    growth_pct_yoy: Optional[float] = Field(None, description="رشد فروش ۱۲ ماه اخیر نسبت به ۱۲ ماه قبل")
    score: Optional[float] = None


class ComponentsBlock(BaseModel):
    profitability: ProfitabilityBlock
    payment_behavior: PaymentBehaviorBlock
    volume_share: VolumeShareBlock
    service_cost: ServiceCostBlock
    trend: TrendBlock


class ContributionMarginBlock(BaseModel):
    margin_abs: Optional[float] = None
    margin_pct: Optional[float] = None
    cost_confidence_pct: Optional[float] = None


class RevenueVsProfitBlock(BaseModel):
    revenue_rank_pct: Optional[float] = None
    profit_rank_pct: Optional[float] = None
    rank_gap: Optional[float] = None
    interpretation: str


class CustomerProfitResponse(BaseModel):
    customer_id: str
    relationship_value_score: Optional[float] = Field(
        None, description="امتیاز نهایی ارزش ادامه همکاری، ۰ تا ۱۰۰"
    )
    components: ComponentsBlock
    contribution_margin: ContributionMarginBlock
    revenue_vs_profit: RevenueVsProfitBlock


class CustomerListItem(BaseModel):
    customer_id: str
    relationship_value_score: Optional[float] = None
    revenue: Optional[float] = None
    margin_pct: Optional[float] = None


class ErrorResponse(BaseModel):
    detail: str
