"""
بخش «بهینه‌سازی سود، بررسی هزینه و فرصت» — قلب محاسباتی پروژه.

خروجی نهایی این ماژول یک جدول (DataFrame) با یک سطر به ازای هر مشتری است،
شامل هفت مؤلفه و امتیاز نهایی «ارزش ادامه همکاری».

تمام محاسبات نسبت به config.SNAPSHOT_DATE انجام می‌شود، نه تاریخ امروز.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from src import config
from src.loaders import (
    load_sales,
    load_cost_actual,
    load_cost_estimate,
    load_collections,
    load_complaints,
)


# ---------------------------------------------------------------------------
# ابزار کمکی
# ---------------------------------------------------------------------------
def _percentile_score(series: pd.Series, higher_is_better: bool = True) -> pd.Series:
    """
    تبدیل یک ستون عددی به امتیاز ۰ تا ۱۰۰ بر اساس رتبه صدکی در بین همه مشتریان.
    این روش نسبت به outlierها مقاوم‌تر از نرمال‌سازی min-max است.
    """
    ranks = series.rank(pct=True, na_option="keep") * 100
    if not higher_is_better:
        ranks = 100 - ranks
    return ranks


# ---------------------------------------------------------------------------
# مرحله ۱: هزینه واقعی یا برآوردی به ازای هر ردیف فروش
# ---------------------------------------------------------------------------
def _attach_cost_to_sales() -> pd.DataFrame:
    """
    به هر ردیف فروش، هزینه واحد را متصل می‌کند:
      اولویت ۱: هزینه واقعی (از شیت اجزای هزینه تحقق) روی Sales_Line_ID
      اولویت ۲: هزینه برآوردی (از شیت برآورد ماهانه) روی Product_ID + ماه
      اگر هیچ‌کدام نبود: NaN و علامت cost_source='unavailable'
    """
    sales = load_sales().copy()
    cost_actual = load_cost_actual()
    cost_estimate = load_cost_estimate()

    sales["Month_Key"] = sales["تاریخ"].dt.to_period("M").astype(str)

    merged = sales.merge(
        cost_actual[["Sales_Line_ID", "هزینه کل به ازای واحد"]],
        on="Sales_Line_ID",
        how="left",
    ).rename(columns={"هزینه کل به ازای واحد": "unit_cost_actual"})

    merged = merged.merge(
        cost_estimate[["Product_ID", "Month_Key", "هزینه کل برآوردی به ازای واحد"]],
        on=["Product_ID", "Month_Key"],
        how="left",
    ).rename(columns={"هزینه کل برآوردی به ازای واحد": "unit_cost_estimate"})

    merged["unit_cost"] = merged["unit_cost_actual"].fillna(merged["unit_cost_estimate"])
    merged["cost_source"] = np.select(
        [merged["unit_cost_actual"].notna(), merged["unit_cost_estimate"].notna()],
        ["actual", "estimated"],
        default="unavailable",
    )

    merged["cost_total"] = merged["unit_cost"] * merged["مقدار"]
    merged["margin"] = merged["مبلغ کل"] - merged["cost_total"]
    return merged


# ---------------------------------------------------------------------------
# مرحله ۲: تجمیع در سطح مشتری — هفت Feature
# ---------------------------------------------------------------------------
def compute_customer_profit_table() -> pd.DataFrame:
    """
    خروجی: یک DataFrame با ایندکس Customer_ID و ستون‌های:
      revenue, margin_abs, margin_pct, cost_confidence_pct,
      avg_delay_days, revenue_share_pct, invoices_per_million,
      n_complaints, trend_pct,
      score_profitability, score_payment, score_volume,
      score_service_cost, score_trend, relationship_value_score,
      rev_rank, profit_rank, rank_gap
    """
    priced_sales = _attach_cost_to_sales()

    # --- سودآوری (فقط روی ردیف‌هایی که هزینه‌شان معلوم است) ---
    known_cost = priced_sales[priced_sales["cost_source"] != "unavailable"]
    profit_agg = known_cost.groupby("Customer_ID").agg(
        revenue_known_cost=("مبلغ کل", "sum"),
        margin_abs=("margin", "sum"),
    )
    profit_agg["margin_pct"] = profit_agg["margin_abs"] / profit_agg["revenue_known_cost"] * 100

    # سهم فروش دارای هزینه واقعی (نه برآوردی) از کل فروش این مشتری -> برچسب اعتماد
    actual_only = priced_sales[priced_sales["cost_source"] == "actual"]
    actual_rev = actual_only.groupby("Customer_ID")["مبلغ کل"].sum()

    # --- کل فروش و تعداد فاکتور (مستقل از پوشش هزینه) ---
    total_agg = priced_sales.groupby("Customer_ID").agg(
        revenue=("مبلغ کل", "sum"),
        n_invoices=("شماره فاکتور", "nunique"),
    )
    total_agg["cost_confidence_pct"] = (
        actual_rev.reindex(total_agg.index).fillna(0) / total_agg["revenue"] * 100
    )

    total_company_revenue = total_agg["revenue"].sum()
    total_agg["revenue_share_pct"] = total_agg["revenue"] / total_company_revenue * 100
    total_agg["invoices_per_million"] = total_agg["n_invoices"] / total_agg["revenue"] * 1_000_000

    # --- خوش‌حسابی ---
    collections = load_collections()
    payment_agg = collections.groupby("Customer_ID")["delay_days"].mean().rename("avg_delay_days")

    # --- شکایات (بخشی از هزینه سرویس‌دهی) ---
    complaints = load_complaints()
    complaint_count = complaints.groupby("Customer_ID").size().rename("n_complaints")

    # --- روند: فروش ۱۲ ماه اخیر در برابر ۱۲ ماه قبل‌تر ---
    sales_for_trend = load_sales()
    snap = config.SNAPSHOT_DATE
    recent_start = snap - pd.Timedelta(days=config.TREND_RECENT_WINDOW_DAYS)
    prior_start = recent_start - pd.Timedelta(days=config.TREND_PRIOR_WINDOW_DAYS)

    recent = sales_for_trend[
        (sales_for_trend["تاریخ"] > recent_start) & (sales_for_trend["تاریخ"] <= snap)
    ].groupby("Customer_ID")["مبلغ کل"].sum()
    prior = sales_for_trend[
        (sales_for_trend["تاریخ"] > prior_start) & (sales_for_trend["تاریخ"] <= recent_start)
    ].groupby("Customer_ID")["مبلغ کل"].sum()

    trend_pct = ((recent / prior.replace(0, np.nan)) - 1) * 100
    trend_pct = trend_pct.rename("trend_pct")

    # --- ترکیب همه ---
    df = total_agg.join(profit_agg[["margin_abs", "margin_pct"]], how="left")
    df = df.join(payment_agg, how="left")
    df = df.join(complaint_count, how="left")
    df = df.join(trend_pct, how="left")
    df["n_complaints"] = df["n_complaints"].fillna(0)

    # هزینه سرویس‌دهی ترکیبی: فاکتور به ازای میلیون + جریمه شکایت
    df["service_cost_raw"] = df["invoices_per_million"] + (df["n_complaints"] * 10)

    # --- امتیازهای صدکی هر بُعد (۰ تا ۱۰۰) ---
    df["score_profitability"] = _percentile_score(df["margin_pct"], higher_is_better=True)
    df["score_payment"] = _percentile_score(df["avg_delay_days"], higher_is_better=False)
    df["score_volume"] = _percentile_score(df["revenue_share_pct"], higher_is_better=True)
    df["score_service_cost"] = _percentile_score(df["service_cost_raw"], higher_is_better=False)
    df["score_trend"] = _percentile_score(df["trend_pct"], higher_is_better=True)

    # --- امتیاز نهایی: ارزش ادامه همکاری ---
    w = config.RELATIONSHIP_VALUE_WEIGHTS
    score_cols = {
        "profitability": "score_profitability",
        "payment_behavior": "score_payment",
        "volume_share": "score_volume",
        "service_cost": "score_service_cost",
        "trend": "score_trend",
    }
    df["relationship_value_score"] = sum(
        df[score_cols[k]].fillna(df[score_cols[k]].median()) * weight
        for k, weight in w.items()
    )

    # --- نسبت فروش به سود (Rank Gap) ---
    df["rev_rank"] = df["revenue"].rank(pct=True) * 100
    df["profit_rank"] = df["margin_abs"].rank(pct=True) * 100
    df["rank_gap"] = df["rev_rank"] - df["profit_rank"]

    df.index.name = "Customer_ID"
    return df.reset_index()


def get_customer_profit_row(customer_id: str) -> dict | None:
    """خروجی کامل بخش «بهینه‌سازی سود» برای یک مشتری، آماده برای API."""
    table = compute_customer_profit_table()
    row = table[table["Customer_ID"] == customer_id]
    if row.empty:
        return None
    r = row.iloc[0]

    def _r(x, nd=2):
        return None if pd.isna(x) else round(float(x), nd)

    return {
        "customer_id": customer_id,
        "relationship_value_score": _r(r["relationship_value_score"], 1),
        "components": {
            "profitability": {
                "margin_pct": _r(r["margin_pct"]),
                "margin_abs": _r(r["margin_abs"], 0),
                "cost_confidence_pct": _r(r["cost_confidence_pct"], 0),
                "score": _r(r["score_profitability"], 1),
            },
            "payment_behavior": {
                "avg_delay_days": _r(r["avg_delay_days"], 1),
                "score": _r(r["score_payment"], 1),
            },
            "volume_share": {
                "revenue_share_pct": _r(r["revenue_share_pct"], 3),
                "revenue_total": _r(r["revenue"], 0),
                "score": _r(r["score_volume"], 1),
            },
            "service_cost": {
                "invoices_per_million_revenue": _r(r["invoices_per_million"], 1),
                "n_complaints": int(r["n_complaints"]),
                "score": _r(r["score_service_cost"], 1),
            },
            "trend": {
                "growth_pct_yoy": _r(r["trend_pct"]),
                "score": _r(r["score_trend"], 1),
            },
        },
        "contribution_margin": {
            "margin_abs": _r(r["margin_abs"], 0),
            "margin_pct": _r(r["margin_pct"]),
            "cost_confidence_pct": _r(r["cost_confidence_pct"], 0),
        },
        "revenue_vs_profit": {
            "revenue_rank_pct": _r(r["rev_rank"], 1),
            "profit_rank_pct": _r(r["profit_rank"], 1),
            "rank_gap": _r(r["rank_gap"], 1),
            "interpretation": _interpret_rank_gap(r["rank_gap"]),
        },
    }


def _interpret_rank_gap(gap: float) -> str:
    if pd.isna(gap):
        return "داده کافی برای مقایسه موجود نیست"
    if gap >= 30:
        return "فروش بالا نسبت به سود — نیازمند بازبینی قیمت یا شرایط"
    if gap <= -30:
        return "سود بالا نسبت به فروش — مشتری کم‌حجم اما با ارزش"
    return "فروش و سود متناسب‌اند"
