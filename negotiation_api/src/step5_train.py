# -*- coding: utf-8 -*-
"""
مرحله ۵: آموزش و ارزیابی سه مدل
------------------------------------------------------
۱. مدل وصول    (classification) -> P(وصول به‌موقع)
۲. مدل حفظ     (classification) -> P(حفظ مشتری)
۳. مدل وفاداری (regression)     -> سهم سبد پیش‌بینی‌شده

Split زمانی: snapshotهای قدیمی‌تر train، جدیدترها test.
اجرا: python src/step5_train.py
"""
import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score, r2_score, mean_absolute_error
from config import PROCESSED_DIR, MODEL_DIR

TEST_RATIO = 0.2
DROP_COLS = ["customer_id", "snapshot_date", "y_retention", "y_collection", "y_loyalty"]

# فیچرهای هر مدل - عمداً محدود به محور مربوطه تا مدل‌ها تفسیرپذیر بمونن
COLLECTION_FEATURES = [
    "avg_delay_days", "max_delay_days", "delay_trend", "on_time_ratio",
    "bounced_check_rate", "bounced_check_count", "days_since_last_bounce",
    "collection_completeness", "crm_collection_pressure", "credit_limit",
    "payment_terms_days", "has_collection_history",
    "freq_365d", "monetary_365d", "avg_txn_size", "cash_ratio_365d",
    "segment_A", "segment_B", "relationship_days",
]

RETENTION_FEATURES = [
    "recency_days", "tenure_days", "relationship_days",
    "freq_90d", "freq_180d", "freq_365d", "freq_trend",
    "monetary_90d", "monetary_365d", "avg_txn_size",
    "gap_mean_days", "gap_std_days",
    "nunique_product_365d", "nunique_group_365d",
    "complaint_count_365d", "critical_complaint_count", "unresolved_complaints",
    "crm_quality_issues", "crm_interaction_count",
    "dev_request_count", "return_rate",
    "avg_delay_days", "bounced_check_rate",
    "segment_A", "segment_B",
]

LOYALTY_FEATURES = [
    "wallet_share", "wallet_share_trend", "competitor_diversity",
    "nunique_product_365d", "nunique_group_365d",
    "dev_request_count", "dev_approved_ratio", "dev_rejected_ratio",
    "crm_sample_requests", "crm_interaction_count",
    "freq_365d", "monetary_365d", "avg_txn_size",
    "relationship_days", "tenure_days",
    "segment_A", "segment_B", "has_wallet_data",
]


def time_split(df):
    snaps = sorted(df["snapshot_date"].unique())
    cut = int(len(snaps) * (1 - TEST_RATIO))
    return df[df["snapshot_date"].isin(snaps[:cut])], df[df["snapshot_date"].isin(snaps[cut:])]


def clf_pipeline():
    return Pipeline([
        ("imp", SimpleImputer(strategy="median")),
        ("sc", StandardScaler()),
        ("clf", LogisticRegression(max_iter=2000, class_weight="balanced")),
    ])


def reg_pipeline():
    return Pipeline([
        ("imp", SimpleImputer(strategy="median")),
        ("sc", StandardScaler()),
        ("reg", Ridge(alpha=1.0)),
    ])


def train_classifier(name, df, features, target):
    d = df.dropna(subset=[target])
    tr, te = time_split(d)
    Xtr, ytr = tr[features], tr[target]
    Xte, yte = te[features], te[target]

    pipe = clf_pipeline()
    pipe.fit(Xtr, ytr)
    proba = pipe.predict_proba(Xte)[:, 1]
    pred = (proba >= 0.5).astype(int)

    metrics = {
        "auc": round(float(roc_auc_score(yte, proba)), 4),
        "precision": round(float(precision_score(yte, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(yte, pred, zero_division=0)), 4),
        "f1": round(float(f1_score(yte, pred, zero_division=0)), 4),
        "n_train": len(Xtr), "n_test": len(Xte),
        "positive_rate": round(float(ytr.mean()), 4),
    }
    print(f"\n--- مدل {name} ---")
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    coefs = dict(zip(features, pipe.named_steps["clf"].coef_[0].round(4)))
    top = sorted(coefs.items(), key=lambda x: abs(x[1]), reverse=True)[:8]
    print("  مهم‌ترین فیچرها:", ", ".join(f"{k}({v})" for k, v in top))

    # مدل نهایی روی کل داده
    final = clf_pipeline()
    final.fit(d[features], d[target])
    return final, metrics


def train_regressor(name, df, features, target):
    d = df.dropna(subset=[target])
    tr, te = time_split(d)
    pipe = reg_pipeline()
    pipe.fit(tr[features], tr[target])
    pred = pipe.predict(te[features])

    metrics = {
        "r2": round(float(r2_score(te[target], pred)), 4),
        "mae": round(float(mean_absolute_error(te[target], pred)), 4),
        "n_train": len(tr), "n_test": len(te),
        "target_mean": round(float(tr[target].mean()), 4),
    }
    print(f"\n--- مدل {name} ---")
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    coefs = dict(zip(features, pipe.named_steps["reg"].coef_.round(4)))
    top = sorted(coefs.items(), key=lambda x: abs(x[1]), reverse=True)[:8]
    print("  مهم‌ترین فیچرها:", ", ".join(f"{k}({v})" for k, v in top))

    final = reg_pipeline()
    final.fit(d[features], d[target])
    return final, metrics


def main():
    df = pd.read_csv(os.path.join(PROCESSED_DIR, "dataset.csv"), parse_dates=["snapshot_date"])

    print("=" * 60)
    print("توجه: مدل ML برای محور «وصول» ساخته نمی‌شود.")
    print("دلیل: تست کردیم و AUC = 0.537 شد (تقریباً تصادفی).")
    print("همبستگی تأخیر پرداخت گذشتهٔ هر مشتری با آیندهٔ خودش فقط 0.10 است.")
    print("این محور به‌جای مدل، با کارت امتیاز قاعده‌محور (scoring.py) محاسبه می‌شود.")
    print("=" * 60)

    m_ret, met_ret = train_classifier("حفظ مشتری (Retention)", df, RETENTION_FEATURES, "y_retention")
    m_loy, met_loy = train_regressor("وفاداری (Loyalty)", df, LOYALTY_FEATURES, "y_loyalty")

    joblib.dump(m_ret, os.path.join(MODEL_DIR, "model_retention.joblib"))
    joblib.dump(m_loy, os.path.join(MODEL_DIR, "model_loyalty.joblib"))

    # آمار نرمال‌سازی برای امتیازهای قاعده‌محور
    cash_stats = {
        "cash_ratio_p10": float(df["cash_ratio_365d"].quantile(0.10)),
        "cash_ratio_p90": float(df["cash_ratio_365d"].quantile(0.90)),
        "margin_pct_p10": float(df["avg_margin_pct"].quantile(0.10)),
        "margin_pct_p90": float(df["avg_margin_pct"].quantile(0.90)),
        "avg_txn_p10": float(df["avg_txn_size"].quantile(0.10)),
        "avg_txn_p90": float(df["avg_txn_size"].quantile(0.90)),
    }

    meta = {
        "retention": {"features": RETENTION_FEATURES, "metrics": met_ret,
                      "type": "LogisticRegression", "method": "ml_model"},
        "loyalty": {"features": LOYALTY_FEATURES, "metrics": met_loy,
                    "type": "Ridge", "method": "ml_model"},
        "collection": {"method": "rule_based_scorecard",
                       "reason": "AUC=0.537 در تست ML - دادهٔ پرداخت قابل پیش‌بینی نبود",
                       "features": ["avg_delay_days", "on_time_ratio", "bounced_check_rate",
                                    "max_delay_days", "crm_collection_pressure"]},
        "cash": {"method": "rule_based_scorecard",
                 "features": ["cash_ratio_365d", "cash_ratio_trend",
                              "avg_margin_pct", "avg_txn_size"]},
        "cash_stats": cash_stats,
        "dataset_rows": len(df),
        "default_weights": {"collection": 0.25, "retention": 0.25, "loyalty": 0.25, "cash": 0.25},
    }
    with open(os.path.join(MODEL_DIR, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print("\n[OK] دو مدل ML + meta.json در پوشهٔ model/ ذخیره شدند.")
    print("     محورهای وصول و نقدینگی از scoring.py محاسبه می‌شوند.")


if __name__ == "__main__":
    main()
