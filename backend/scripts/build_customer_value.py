"""Build customer value scores (0-100) and four-tier labels from DATASET.xlsx.

Usage (from backend/):
    python scripts/build_customer_value.py

DATASET.xlsx is read-only; this script never modifies it.

Window: 2022-01-01 .. 2022-06-30 (snapshot 2022-06-30).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SOURCE_XLSX = DATA_DIR / "DATASET.xlsx"
HEADER_CSV = DATA_DIR / "customer_header.csv"
OUTPUT_CSV = DATA_DIR / "customer_value_scores.csv"
META_JSON = DATA_DIR / "customer_value_meta.json"

SNAPSHOT = pd.Timestamp("2022-06-30")
WINDOW_START = pd.Timestamp("2022-01-01")
WINDOW_END = SNAPSHOT

RETURNED_YES = "بله"
ACCEPT_LABEL = "قبول"
REJECT_LABEL = "رد"

WEIGHTS = {
    "monetary": 0.18,
    "sow": 0.14,
    "margin": 0.13,
    "on_time": 0.12,
    "check_quality": 0.10,
    "frequency": 0.10,
    "recency": 0.08,
    "trend": 0.08,
    "offer_accept": 0.04,
    "growth_capacity": 0.03,
}

TIER_GOLDEN = "شریک طلایی"
TIER_STABLE = "مشتری پایدار"
TIER_CHALLENGE = "مشتری پرچالش"
TIER_RED = "مشتری قرمز"


def _to_dt(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce")


def _clean_id(series: pd.Series) -> pd.Series:
    return series.astype(str).str.strip().replace({"nan": "", "None": ""})


def _percentile_rank(series: pd.Series, invert: bool = False) -> pd.Series:
    """Map values to (0, 1] by rank so outliers do not collapse the scale."""
    values = pd.to_numeric(series, errors="coerce")
    ranked = values.rank(pct=True, method="average")
    if invert:
        ranked = 1.0 - ranked
    return ranked


def _tier(score: float) -> str:
    if score < 40:
        return TIER_RED
    if score < 60:
        return TIER_CHALLENGE
    if score < 80:
        return TIER_STABLE
    return TIER_GOLDEN


def _load_header_ids() -> list[str]:
    if not HEADER_CSV.exists():
        raise FileNotFoundError(f"{HEADER_CSV} not found")
    hdr = pd.read_csv(HEADER_CSV, dtype=str)
    ids: list[str] = []
    for raw in hdr["customer_info"].fillna(""):
        cid = str(raw).split(",", 1)[0].strip()
        if cid:
            ids.append(cid)
    return ids


def _window_mask(dates: pd.Series) -> pd.Series:
    return (dates >= WINDOW_START) & (dates <= WINDOW_END)


def _monthly_slopes(monthly: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, object]] = []
    for cid, grp in monthly.groupby("customer_id"):
        ordered = grp.sort_values("_month")["month_amt"]
        if len(ordered) < 2:
            rows.append({"customer_id": cid, "trend": np.nan})
            continue
        y = ordered.to_numpy(dtype=float)
        mask = np.isfinite(y)
        if mask.sum() < 2:
            rows.append({"customer_id": cid, "trend": np.nan})
            continue
        x = np.arange(len(y), dtype=float)
        coef = np.polyfit(x[mask], y[mask], 1)
        rows.append({"customer_id": cid, "trend": float(coef[0])})
    return pd.DataFrame(rows)


def build() -> pd.DataFrame:
    if not SOURCE_XLSX.exists():
        raise FileNotFoundError(f"Source file not found: {SOURCE_XLSX}")

    customer_ids = _load_header_ids()
    base = pd.DataFrame({"customer_id": customer_ids})

    print("Loading DATASET.xlsx sheets...")
    invoices = pd.read_excel(SOURCE_XLSX, sheet_name="فاکتورها", engine="openpyxl")
    sales = pd.read_excel(SOURCE_XLSX, sheet_name="فروش", engine="openpyxl")
    costs = pd.read_excel(SOURCE_XLSX, sheet_name="اجزای_هزینه_تحقق", engine="openpyxl")
    estimates = pd.read_excel(SOURCE_XLSX, sheet_name="برآورد_هزینه_ماهانه", engine="openpyxl")
    wallet = pd.read_excel(SOURCE_XLSX, sheet_name="سهم_سبد", engine="openpyxl")
    offers = pd.read_excel(SOURCE_XLSX, sheet_name="آفرها", engine="openpyxl")
    collections = pd.read_excel(SOURCE_XLSX, sheet_name="وصول", engine="openpyxl")

    invoices["Customer_ID"] = _clean_id(invoices["Customer_ID"])
    invoices["_date"] = _to_dt(invoices["تاریخ"])
    inv_win = invoices.loc[_window_mask(invoices["_date"])].copy()

    recency = (
        invoices.loc[invoices["_date"] <= SNAPSHOT]
        .groupby("Customer_ID")["_date"]
        .max()
        .rename("last_invoice")
        .reset_index()
    )
    recency["recency_days"] = (SNAPSHOT - recency["last_invoice"]).dt.days
    recency = recency.rename(columns={"Customer_ID": "customer_id"})

    frequency = (
        inv_win.groupby("Customer_ID")["شماره فاکتور"]
        .nunique()
        .rename("frequency")
        .reset_index()
        .rename(columns={"Customer_ID": "customer_id"})
    )

    sales["Customer_ID"] = _clean_id(sales["Customer_ID"])
    sales["_date"] = _to_dt(sales["تاریخ"])
    sales["_amount"] = pd.to_numeric(sales["مبلغ کل"], errors="coerce").fillna(0.0)
    sales["_qty"] = pd.to_numeric(sales["مقدار"], errors="coerce").fillna(0.0)
    sales["_month"] = sales["_date"].dt.to_period("M").astype(str)
    sales_win = sales.loc[_window_mask(sales["_date"])].copy()

    costs["_returned_amt"] = pd.to_numeric(costs["مبلغ برگشتی"], errors="coerce").fillna(0.0)
    costs["_returned_qty"] = pd.to_numeric(costs["مقدار برگشتی"], errors="coerce").fillna(0.0)
    costs["_unit_cost"] = pd.to_numeric(costs["هزینه کل به ازای واحد"], errors="coerce")
    cost_by_line = (
        costs.sort_values("Cost_Close_Date")
        .groupby("Sales_Line_ID", as_index=False)
        .agg(
            unit_cost=("_unit_cost", "last"),
            returned_amt=("_returned_amt", "sum"),
            returned_qty=("_returned_qty", "sum"),
        )
    )

    estimates["_est_cost"] = pd.to_numeric(
        estimates["هزینه کل برآوردی به ازای واحد"], errors="coerce"
    )
    estimates["_month"] = estimates["Month_Key"].astype(str).str.strip()
    est_by_prod_month = (
        estimates.groupby(["Product_ID", "_month"], as_index=False)["_est_cost"]
        .last()
        .rename(columns={"_est_cost": "est_unit_cost"})
    )

    sales_cost = sales_win.merge(cost_by_line, on="Sales_Line_ID", how="left")
    sales_cost = sales_cost.merge(
        est_by_prod_month,
        on=["Product_ID", "_month"],
        how="left",
    )
    sales_cost["unit_cost_final"] = sales_cost["unit_cost"].fillna(sales_cost["est_unit_cost"])
    sales_cost["returned_amt"] = sales_cost["returned_amt"].fillna(0.0)
    sales_cost["returned_qty"] = sales_cost["returned_qty"].fillna(0.0)
    sales_cost["net_qty"] = (sales_cost["_qty"] - sales_cost["returned_qty"]).clip(lower=0)
    sales_cost["line_cost"] = sales_cost["unit_cost_final"].fillna(0.0) * sales_cost["net_qty"]

    monetary = (
        sales_cost.groupby("Customer_ID")
        .agg(
            revenue=("_amount", "sum"),
            returned=("returned_amt", "sum"),
            cost=("line_cost", "sum"),
        )
        .reset_index()
        .rename(columns={"Customer_ID": "customer_id"})
    )
    monetary["monetary"] = monetary["revenue"] - monetary["returned"]
    monetary["margin"] = np.where(
        monetary["revenue"] > 0,
        (monetary["revenue"] - monetary["cost"] - monetary["returned"]) / monetary["revenue"],
        np.nan,
    )

    monthly = (
        sales_cost.groupby(["Customer_ID", "_month"], as_index=False)["_amount"]
        .sum()
        .rename(columns={"Customer_ID": "customer_id", "_amount": "month_amt"})
    )
    trends = _monthly_slopes(monthly)

    wallet["Customer_ID"] = _clean_id(wallet["Customer_ID"])
    wallet["_month"] = wallet["Month_Key"].astype(str).str.strip()
    wallet["_nafis"] = pd.to_numeric(wallet["Nafis_Purchase"], errors="coerce")
    wallet["_total"] = pd.to_numeric(wallet["Estimated_Total_Purchase"], errors="coerce")
    wallet["_date"] = pd.to_datetime(wallet["_month"] + "-01", errors="coerce")
    wallet_win = wallet.loc[_window_mask(wallet["_date"])].copy()
    wallet_win["sow_row"] = np.where(
        wallet_win["_total"] > 0,
        wallet_win["_nafis"] / wallet_win["_total"],
        np.nan,
    )
    sow = (
        wallet_win.groupby("Customer_ID")
        .agg(
            sow=("sow_row", "mean"),
            est_total=("_total", "mean"),
        )
        .reset_index()
        .rename(columns={"Customer_ID": "customer_id"})
    )
    sow["growth_capacity"] = (1.0 - sow["sow"].clip(0, 1)) * sow["est_total"]

    offers["Customer_ID"] = _clean_id(offers["Customer_ID"])
    offers["_date"] = _to_dt(offers["Offer_Date"])
    offers_win = offers.loc[_window_mask(offers["_date"])].copy()
    decided = offers_win[offers_win["Result"].isin([ACCEPT_LABEL, REJECT_LABEL])]
    offer_stats = (
        decided.groupby("Customer_ID")
        .agg(
            n_accept=("Result", lambda s: int((s == ACCEPT_LABEL).sum())),
            n_decided=("Result", "size"),
        )
        .reset_index()
        .rename(columns={"Customer_ID": "customer_id"})
    )
    offer_stats["offer_accept"] = np.where(
        offer_stats["n_decided"] > 0,
        offer_stats["n_accept"] / offer_stats["n_decided"],
        np.nan,
    )

    collections["Customer_ID"] = _clean_id(collections["Customer_ID"])
    collections["_event"] = _to_dt(collections["تاریخ رویداد وصول"])
    collections["_delay"] = pd.to_numeric(collections["روز تأخیر"], errors="coerce")
    collections["_amt"] = pd.to_numeric(collections["مبلغ وصول"], errors="coerce").fillna(0.0)
    collections["_bounced"] = collections["چک برگشتی"].astype(str).str.strip() == RETURNED_YES
    coll_win = collections.loc[_window_mask(collections["_event"])].copy()
    coll_win["on_time_amt"] = np.where(coll_win["_delay"].fillna(1) <= 0, coll_win["_amt"], 0.0)

    pay = (
        coll_win.groupby("Customer_ID")
        .agg(
            collected=("_amt", "sum"),
            on_time_amt=("on_time_amt", "sum"),
            n_events=("_amt", "size"),
            n_bounced=("_bounced", "sum"),
        )
        .reset_index()
        .rename(columns={"Customer_ID": "customer_id"})
    )
    pay["on_time"] = np.where(pay["collected"] > 0, pay["on_time_amt"] / pay["collected"], np.nan)
    pay["check_quality"] = np.where(
        pay["n_events"] > 0,
        1.0 - (pay["n_bounced"] / pay["n_events"]),
        np.nan,
    )

    df = base.merge(recency[["customer_id", "recency_days"]], on="customer_id", how="left")
    df = df.merge(frequency, on="customer_id", how="left")
    df = df.merge(monetary[["customer_id", "monetary", "margin"]], on="customer_id", how="left")
    df = df.merge(trends, on="customer_id", how="left")
    df = df.merge(sow[["customer_id", "sow", "growth_capacity"]], on="customer_id", how="left")
    df = df.merge(offer_stats[["customer_id", "offer_accept"]], on="customer_id", how="left")
    df = df.merge(pay[["customer_id", "on_time", "check_quality"]], on="customer_id", how="left")

    df["frequency"] = df["frequency"].fillna(0)
    df["monetary"] = df["monetary"].fillna(0)

    raw = df.copy()
    df["monetary_n"] = _percentile_rank(df["monetary"])
    df["sow_n"] = _percentile_rank(df["sow"])
    df["margin_n"] = _percentile_rank(df["margin"])
    df["on_time_n"] = _percentile_rank(df["on_time"])
    df["check_quality_n"] = _percentile_rank(df["check_quality"])
    df["frequency_n"] = _percentile_rank(df["frequency"])
    df["recency_n"] = _percentile_rank(df["recency_days"], invert=True)
    df["trend_n"] = _percentile_rank(df["trend"])
    df["offer_accept_n"] = _percentile_rank(df["offer_accept"])
    df["growth_capacity_n"] = _percentile_rank(df["growth_capacity"])

    norm_map = {
        "monetary": "monetary_n",
        "sow": "sow_n",
        "margin": "margin_n",
        "on_time": "on_time_n",
        "check_quality": "check_quality_n",
        "frequency": "frequency_n",
        "recency": "recency_n",
        "trend": "trend_n",
        "offer_accept": "offer_accept_n",
        "growth_capacity": "growth_capacity_n",
    }

    scores: list[float] = []
    for _, row in df.iterrows():
        num = 0.0
        den = 0.0
        for feat, col in norm_map.items():
            val = row[col]
            if pd.isna(val):
                continue
            weight = WEIGHTS[feat]
            num += weight * float(val)
            den += weight
        scores.append(float(100.0 * num / den) if den > 0 else 0.0)

    df["score"] = np.clip(np.round(scores, 1), 0, 100)
    df["value_tier"] = df["score"].map(_tier)

    out = pd.DataFrame({
        "customer_id": df["customer_id"],
        "monetary": df["monetary_n"].round(4),
        "sow": df["sow_n"].round(4),
        "margin": df["margin_n"].round(4),
        "on_time": df["on_time_n"].round(4),
        "check_quality": df["check_quality_n"].round(4),
        "frequency": df["frequency_n"].round(4),
        "recency": df["recency_n"].round(4),
        "trend": df["trend_n"].round(4),
        "offer_accept": df["offer_accept_n"].round(4),
        "growth_capacity": df["growth_capacity_n"].round(4),
        "score": df["score"],
        "value_tier": df["value_tier"],
        "monetary_raw": raw["monetary"].round(2),
        "sow_raw": raw["sow"].round(4),
        "margin_raw": raw["margin"].round(4),
        "on_time_raw": raw["on_time"].round(4),
        "check_quality_raw": raw["check_quality"].round(4),
        "frequency_raw": raw["frequency"].astype("Int64"),
        "recency_days": raw["recency_days"].astype("Int64"),
    })

    meta = {
        "snapshot_date": SNAPSHOT.date().isoformat(),
        "window_start": WINDOW_START.date().isoformat(),
        "window_end": WINDOW_END.date().isoformat(),
        "normalization": "percentile_rank",
        "weights": WEIGHTS,
        "tiers": {
            TIER_RED: "0-39",
            TIER_CHALLENGE: "40-59",
            TIER_STABLE: "60-79",
            TIER_GOLDEN: "80-100",
        },
        "n_customers": int(len(out)),
        "tier_counts": {str(k): int(v) for k, v in out["value_tier"].value_counts().items()},
        "score_mean": float(out["score"].mean()),
        "score_min": float(out["score"].min()),
        "score_max": float(out["score"].max()),
    }
    META_JSON.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return out


def main() -> int:
    output = build()
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    output.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    counts = {str(k): int(v) for k, v in output["value_tier"].value_counts().items()}
    print("--- customer_value_scores ---")
    print(f"Wrote {len(output)} rows to {OUTPUT_CSV}")
    print(f"Tier counts: {counts}")
    print(
        f"Score range: {output['score'].min()} – {output['score'].max()}  "
        f"mean={output['score'].mean():.1f}"
    )
    print(f"Meta: {META_JSON}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
