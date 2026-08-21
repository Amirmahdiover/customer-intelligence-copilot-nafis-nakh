# -*- coding: utf-8 -*-
"""
مرحله ۲: Feature Engineering برای ۴ محور
------------------------------------------------------
برای یک snapshot date مشخص، فقط با استفاده از دادهٔ «تا همان تاریخ»
(ضد data leakage) فیچرهای هر ۴ محور رو محاسبه می‌کنه.
"""
import numpy as np
import pandas as pd


def _safe_div(a, b):
    return a / b if b else np.nan


def compute_features(snapshot_date, data):
    """
    snapshot_date : pd.Timestamp
    data : dict شامل دیتافریم‌های پردازش‌شده

    خروجی: DataFrame یک ردیف به‌ازای هر مشتری که تا snapshot حداقل یک تراکنش داشته
    """
    sales = data["sales"]
    collections = data["collections"]
    basket = data["basket_share"]
    customers = data["customers"]
    crm = data["crm"]
    complaints = data["complaints"]
    dev = data["dev_requests"]
    actual_cost = data["actual_cost"]

    hist = sales[sales["sale_date"] <= snapshot_date]
    if hist.empty:
        return pd.DataFrame()

    cust_ids = hist["customer_id"].unique()
    hist = hist.sort_values(["customer_id", "sale_date"])

    def win(days, df=hist, col="sale_date"):
        return df[df[col] > snapshot_date - pd.Timedelta(days=days)]

    # ---------- پایه: RFM ----------
    last_purchase = hist.groupby("customer_id")["sale_date"].max()
    first_purchase = hist.groupby("customer_id")["sale_date"].min()
    w90, w180, w365 = win(90), win(180), win(365)
    w90_prev = hist[(hist["sale_date"] > snapshot_date - pd.Timedelta(days=180)) &
                    (hist["sale_date"] <= snapshot_date - pd.Timedelta(days=90))]

    freq90 = w90.groupby("customer_id")["invoice_no"].nunique()
    freq180 = w180.groupby("customer_id")["invoice_no"].nunique()
    freq365 = w365.groupby("customer_id")["invoice_no"].nunique()
    freq90_prev = w90_prev.groupby("customer_id")["invoice_no"].nunique()
    monetary90 = w90.groupby("customer_id")["amount"].sum()
    monetary365 = w365.groupby("customer_id")["amount"].sum()
    avg_txn = w365.groupby("customer_id")["amount"].mean()

    def gap_stats(g):
        d = g["sale_date"].drop_duplicates().diff().dt.days.dropna()
        return pd.Series({"gap_mean": d.mean() if len(d) else np.nan,
                          "gap_std": d.std() if len(d) > 1 else np.nan})
    gaps = hist.groupby("customer_id").apply(gap_stats, include_groups=False)

    # ---------- محور ۱: وصول ----------
    coll_h = collections[collections["invoice_date"] <= snapshot_date]
    coll_recent = coll_h[coll_h["invoice_date"] > snapshot_date - pd.Timedelta(days=365)]
    coll_old = coll_h[coll_h["invoice_date"] <= snapshot_date - pd.Timedelta(days=365)]

    avg_delay = coll_h.groupby("customer_id")["delay_days"].mean()
    max_delay = coll_h.groupby("customer_id")["delay_days"].max()
    delay_recent = coll_recent.groupby("customer_id")["delay_days"].mean()
    delay_old = coll_old.groupby("customer_id")["delay_days"].mean()
    on_time = coll_h.groupby("customer_id")["delay_days"].apply(lambda s: (s <= 0).mean())
    bounce_rate = coll_h.groupby("customer_id")["bounced_check"].mean()
    bounce_count = coll_h.groupby("customer_id")["bounced_check"].sum()
    collected_sum = coll_h.groupby("customer_id")["collected_amount"].sum()

    bounced_only = coll_h[coll_h["bounced_check"] == 1]
    last_bounce = bounced_only.groupby("customer_id")["invoice_date"].max()

    crm_h = crm[crm["event_time"] <= snapshot_date]
    crm_365 = crm_h[crm_h["event_time"] > snapshot_date - pd.Timedelta(days=365)]
    crm_collection = crm_365[crm_365["interaction_type"] == "وصول مطالبات"].groupby("customer_id").size()

    # ---------- محور ۳: وفاداری ----------
    bs_h = basket[basket["month_end"] <= snapshot_date].sort_values("month_end")
    last_ws = bs_h.groupby("customer_id")["wallet_share"].last()
    ws_6m = bs_h[bs_h["month_end"] > snapshot_date - pd.Timedelta(days=190)]

    def ws_trend(g):
        g = g.dropna(subset=["wallet_share"])
        if len(g) < 2:
            return np.nan
        x = np.arange(len(g))
        return np.polyfit(x, g["wallet_share"].values, 1)[0]
    ws_trend_s = ws_6m.groupby("customer_id").apply(ws_trend, include_groups=False) if len(ws_6m) else pd.Series(dtype=float)

    comp_div = bs_h.groupby("customer_id")["main_competitor"].nunique()
    nuniq_prod = w365.groupby("customer_id")["product_id"].nunique()
    nuniq_grp = w365.groupby("customer_id")["product_group"].nunique()

    dev_h = dev[dev["created_at"] <= snapshot_date]
    dev_count = dev_h.groupby("customer_id").size()
    dev_approved = dev_h.groupby("customer_id")["status"].apply(lambda s: (s == "نمونه تأیید").mean())
    dev_rejected = dev_h.groupby("customer_id")["status"].apply(lambda s: (s == "فنی رد").mean())
    crm_sample = crm_365[crm_365["interaction_type"] == "نمونه محصول"].groupby("customer_id").size()

    # ---------- محور ۴: نقدینگی ----------
    cash_365 = w365.groupby("customer_id")["payment_type"].apply(lambda s: (s == "cash_or_prepaid").mean())
    cash_prev = w90_prev.groupby("customer_id")["payment_type"].apply(lambda s: (s == "cash_or_prepaid").mean())
    cash_90 = w90.groupby("customer_id")["payment_type"].apply(lambda s: (s == "cash_or_prepaid").mean())

    # حاشیهٔ سود واقعی از اتصال فروش به اجزای_هزینه_تحقق
    ac = actual_cost[actual_cost["cost_close_date"] <= snapshot_date]
    margin_src = w365.merge(ac[["sales_line_id", "actual_unit_cost", "returned_qty"]],
                            on="sales_line_id", how="inner")
    if len(margin_src):
        margin_src["margin"] = margin_src["unit_price"] - margin_src["actual_unit_cost"]
        margin_src["margin_pct"] = margin_src["margin"] / margin_src["unit_price"].replace(0, np.nan)
        avg_margin_pct = margin_src.groupby("customer_id")["margin_pct"].mean()
        return_rate = margin_src.groupby("customer_id").apply(
            lambda g: _safe_div(g["returned_qty"].sum(), g["qty"].sum()), include_groups=False)
    else:
        avg_margin_pct = pd.Series(dtype=float)
        return_rate = pd.Series(dtype=float)

    # ---------- شکایات (اثر بر حفظ مشتری) ----------
    cmp_h = complaints[complaints["created_at"] <= snapshot_date]
    cmp_365 = cmp_h[cmp_h["created_at"] > snapshot_date - pd.Timedelta(days=365)]
    cmp_count = cmp_365.groupby("customer_id").size()
    cmp_critical = cmp_365[cmp_365["severity"].isin(["بحرانی", "زیاد"])].groupby("customer_id").size()
    cmp_unresolved = cmp_h[cmp_h["resolved_at"].isna()].groupby("customer_id").size()
    crm_quality = crm_365[crm_365["interaction_type"] == "کیفیت محصول"].groupby("customer_id").size()
    crm_total = crm_365.groupby("customer_id").size()

    # ---------- master ----------
    cm = customers.set_index("customer_id")

    rows = []
    for c in cust_ids:
        lp = last_purchase.get(c)
        fp = first_purchase.get(c)
        d_rec, d_old = delay_recent.get(c, np.nan), delay_old.get(c, np.nan)
        rel_start = cm["relationship_start"].get(c, pd.NaT)
        lb = last_bounce.get(c, pd.NaT)

        rows.append({
            "customer_id": c,
            "snapshot_date": snapshot_date,
            # پایه / RFM
            "recency_days": (snapshot_date - lp).days if pd.notna(lp) else np.nan,
            "tenure_days": (snapshot_date - fp).days if pd.notna(fp) else np.nan,
            "relationship_days": (snapshot_date - rel_start).days if pd.notna(rel_start) else np.nan,
            "freq_90d": freq90.get(c, 0),
            "freq_180d": freq180.get(c, 0),
            "freq_365d": freq365.get(c, 0),
            "freq_trend": freq90.get(c, 0) - freq90_prev.get(c, 0),
            "monetary_90d": monetary90.get(c, 0.0),
            "monetary_365d": monetary365.get(c, 0.0),
            "avg_txn_size": avg_txn.get(c, 0.0),
            "gap_mean_days": gaps["gap_mean"].get(c, np.nan) if len(gaps) else np.nan,
            "gap_std_days": gaps["gap_std"].get(c, np.nan) if len(gaps) else np.nan,
            # محور ۱ - وصول
            "avg_delay_days": avg_delay.get(c, np.nan),
            "max_delay_days": max_delay.get(c, np.nan),
            "delay_trend": (d_rec - d_old) if (pd.notna(d_rec) and pd.notna(d_old)) else 0.0,
            "on_time_ratio": on_time.get(c, np.nan),
            "bounced_check_rate": bounce_rate.get(c, np.nan),
            "bounced_check_count": bounce_count.get(c, 0),
            "days_since_last_bounce": (snapshot_date - lb).days if pd.notna(lb) else 9999,
            "collection_completeness": _safe_div(collected_sum.get(c, 0.0), monetary365.get(c, 0.0)),
            "crm_collection_pressure": crm_collection.get(c, 0),
            "credit_limit": cm["credit_limit"].get(c, np.nan),
            "payment_terms_days": cm["payment_terms_days"].get(c, np.nan),
            # محور ۳ - وفاداری
            "wallet_share": last_ws.get(c, np.nan),
            "wallet_share_trend": ws_trend_s.get(c, np.nan) if len(ws_trend_s) else np.nan,
            "competitor_diversity": comp_div.get(c, 0),
            "nunique_product_365d": nuniq_prod.get(c, 0),
            "nunique_group_365d": nuniq_grp.get(c, 0),
            "dev_request_count": dev_count.get(c, 0),
            "dev_approved_ratio": dev_approved.get(c, np.nan),
            "dev_rejected_ratio": dev_rejected.get(c, np.nan),
            "crm_sample_requests": crm_sample.get(c, 0),
            # محور ۴ - نقدینگی
            "cash_ratio_365d": cash_365.get(c, np.nan),
            "cash_ratio_trend": (cash_90.get(c, np.nan) - cash_prev.get(c, np.nan))
                                if (pd.notna(cash_90.get(c, np.nan)) and pd.notna(cash_prev.get(c, np.nan))) else 0.0,
            "avg_margin_pct": avg_margin_pct.get(c, np.nan),
            "return_rate": return_rate.get(c, np.nan),
            # شکایات و CRM
            "complaint_count_365d": cmp_count.get(c, 0),
            "critical_complaint_count": cmp_critical.get(c, 0),
            "unresolved_complaints": cmp_unresolved.get(c, 0),
            "crm_quality_issues": crm_quality.get(c, 0),
            "crm_interaction_count": crm_total.get(c, 0),
            # master
            "segment_A": 1 if cm["segment"].get(c) == "A" else 0,
            "segment_B": 1 if cm["segment"].get(c) == "B" else 0,
        })

    feat = pd.DataFrame(rows)

    # پرکردن missingهای معنادار (صفر واقعی در برابر «سابقه ندارد»)
    feat["has_collection_history"] = feat["avg_delay_days"].notna().astype(int)
    feat["has_wallet_data"] = feat["wallet_share"].notna().astype(int)
    feat["has_margin_data"] = feat["avg_margin_pct"].notna().astype(int)
    for col in ["bounced_check_rate", "on_time_ratio", "dev_approved_ratio",
                "dev_rejected_ratio", "return_rate"]:
        feat[col] = feat[col].fillna(0)

    return feat
