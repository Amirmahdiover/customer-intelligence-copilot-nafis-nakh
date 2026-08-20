"""Train offer-acceptance model from customer_offers.csv + analytics features.

Usage (from backend/):
    python scripts/train_offer_model.py

Outputs:
    models/offer_accept.joblib
    models/offer_model_meta.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score, log_loss, brier_score_loss
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"
OFFERS_CSV = DATA_DIR / "customer_offers.csv"
ANALYTICS_CSV = DATA_DIR / "customer_analytics_dataset.csv"
MODEL_PATH = MODELS_DIR / "offer_accept.joblib"
META_PATH = MODELS_DIR / "offer_model_meta.json"

ACCEPT_LABEL = "قبول"
REJECT_LABEL = "رد"

CUSTOMER_NUMERIC = [
    "Recency_Days",
    "Days_Since_Last_Order",
    "Frequency_Orders",
    "Monetary_Total_Revenue",
    "R_Score",
    "F_Score",
    "M_Score",
    "Avg_Order_Interval_Days",
    "Avg_Payment_Delay_Days",
    "Bounced_Check_Rate",
    "Lifetime_Years",
    "Annual_Sales_Trailing12M",
    "Margin_Pct",
    "LTV",
    "Revenue_Share_Pct_Latest",
    "Revenue_Share_Pct_Avg",
    "Lifetime_Complaints",
    "Recent_Complaints_12M",
    "Risk_Score",
    "Days_Until_Expected_Next_Order",
    "Credit_Limit",
    "Payment_Terms_Days",
]

CUSTOMER_CATEGORICAL = [
    "Customer_Segment",
    "Customer_Status",
    "RFM_Segment",
    "Risk_Level",
]

OFFER_NUMERIC = [
    "offer_discount_pct",
    "validity_days",
]

OFFER_CATEGORICAL = [
    "offer_type",
    "offer_reason",
    "product_family",
]


def _load_labeled_offers() -> pd.DataFrame:
    offers = pd.read_csv(OFFERS_CSV, dtype=str)
    offers = offers[offers["result"].isin([ACCEPT_LABEL, REJECT_LABEL])].copy()
    offers["y"] = (offers["result"] == ACCEPT_LABEL).astype(int)
    offers["offer_date"] = pd.to_datetime(offers["offer_date"], errors="coerce")
    offers["offer_discount_pct"] = pd.to_numeric(offers["offer_discount_pct"], errors="coerce")
    offers["validity_days"] = pd.to_numeric(offers["validity_days"], errors="coerce")
    offers = offers.dropna(subset=["offer_date", "customer_id"])
    return offers


def _load_analytics() -> pd.DataFrame:
    analytics = pd.read_csv(ANALYTICS_CSV)
    keep = ["Customer_ID"] + CUSTOMER_NUMERIC + CUSTOMER_CATEGORICAL
    missing = [c for c in keep if c not in analytics.columns]
    if missing:
        raise ValueError(f"Missing analytics columns: {missing}")
    return analytics[keep].copy()


def _build_frame() -> pd.DataFrame:
    offers = _load_labeled_offers()
    analytics = _load_analytics()
    merged = offers.merge(analytics, left_on="customer_id", right_on="Customer_ID", how="inner")
    return merged.sort_values("offer_date").reset_index(drop=True)


def _feature_matrix(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str], list[str]]:
    num_cols = OFFER_NUMERIC + CUSTOMER_NUMERIC
    cat_cols = OFFER_CATEGORICAL + CUSTOMER_CATEGORICAL
    X = df[num_cols + cat_cols].copy()
    for c in num_cols:
        X[c] = pd.to_numeric(X[c], errors="coerce")
    for c in cat_cols:
        X[c] = X[c].fillna("UNKNOWN").astype(str)
    return X, num_cols, cat_cols


def _time_split(df: pd.DataFrame, test_frac: float = 0.25):
    n = len(df)
    cut = max(1, int(n * (1 - test_frac)))
    return df.iloc[:cut].copy(), df.iloc[cut:].copy()


def _candidate_grid(offers: pd.DataFrame) -> dict:
    discount = pd.to_numeric(offers["offer_discount_pct"], errors="coerce").dropna()
    validity = pd.to_numeric(offers["validity_days"], errors="coerce").dropna()
    discount_bins = sorted({
        float(round(x, 4))
        for x in np.quantile(discount, [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9])
    })
    validity_days = sorted({
        int(x)
        for x in np.quantile(validity, [0.25, 0.5, 0.75]).tolist()
    })
    offer_types = sorted(offers["offer_type"].dropna().astype(str).unique().tolist())
    # Top reasons by frequency
    reasons = (
        offers["offer_reason"]
        .dropna()
        .astype(str)
        .value_counts()
        .head(5)
        .index.tolist()
    )
    families = (
        offers["product_family"]
        .dropna()
        .astype(str)
        .value_counts()
        .head(4)
        .index.tolist()
    )
    return {
        "offer_types": offer_types,
        "offer_reasons": reasons,
        "product_families": families,
        "discount_bins": discount_bins,
        "validity_days": validity_days,
    }


def train() -> dict:
    if not OFFERS_CSV.exists():
        raise FileNotFoundError(
            f"{OFFERS_CSV} not found — run scripts/build_customer_offers.py first."
        )
    if not ANALYTICS_CSV.exists():
        raise FileNotFoundError(f"{ANALYTICS_CSV} not found.")

    df = _build_frame()
    train_df, test_df = _time_split(df)

    X_train, num_cols, cat_cols = _feature_matrix(train_df)
    y_train = train_df["y"].to_numpy()
    X_test, _, _ = _feature_matrix(test_df)
    y_test = test_df["y"].to_numpy()

    # OrdinalEncoder for categoricals so HistGradientBoosting can use native categorical support via pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", num_cols),
            (
                "cat",
                OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1),
                cat_cols,
            ),
        ]
    )

    base = HistGradientBoostingClassifier(
        max_depth=4,
        learning_rate=0.08,
        max_iter=200,
        min_samples_leaf=20,
        random_state=42,
    )

    pipe = Pipeline([
        ("prep", preprocessor),
        ("clf", base),
    ])

    # Calibrate on time-ordered train fold using sigmoid when enough samples
    if len(train_df) >= 80 and y_train.sum() > 5 and (len(y_train) - y_train.sum()) > 5:
        model = CalibratedClassifierCV(pipe, method="sigmoid", cv=3)
    else:
        model = pipe

    model.fit(X_train, y_train)

    metrics: dict = {
        "n_train": int(len(train_df)),
        "n_test": int(len(test_df)),
        "accept_rate_train": float(y_train.mean()),
        "accept_rate_test": float(y_test.mean()) if len(y_test) else None,
    }

    if len(test_df) >= 10 and len(np.unique(y_test)) > 1:
        proba = model.predict_proba(X_test)[:, 1]
        metrics["auc"] = float(roc_auc_score(y_test, proba))
        metrics["log_loss"] = float(log_loss(y_test, proba))
        metrics["brier"] = float(brier_score_loss(y_test, proba))
    else:
        metrics["auc"] = None
        metrics["log_loss"] = None
        metrics["brier"] = None

    grid = _candidate_grid(df)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    artifact = {
        "model": model,
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "feature_cols": num_cols + cat_cols,
    }
    joblib.dump(artifact, MODEL_PATH)

    meta = {
        "model_path": str(MODEL_PATH.name),
        "method": "ml_offer_accept",
        "label_positive": ACCEPT_LABEL,
        "label_negative": REJECT_LABEL,
        "customer_numeric": CUSTOMER_NUMERIC,
        "customer_categorical": CUSTOMER_CATEGORICAL,
        "offer_numeric": OFFER_NUMERIC,
        "offer_categorical": OFFER_CATEGORICAL,
        "candidate_grid": grid,
        "metrics": metrics,
        "train_date_min": train_df["offer_date"].min().date().isoformat(),
        "train_date_max": train_df["offer_date"].max().date().isoformat(),
        "test_date_min": test_df["offer_date"].min().date().isoformat() if len(test_df) else None,
        "test_date_max": test_df["offer_date"].max().date().isoformat() if len(test_df) else None,
    }
    META_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print("--- offer model train report ---")
    print(f"Labeled offers: {len(df)}")
    print(f"Train: {metrics['n_train']}  Test: {metrics['n_test']}")
    print(f"AUC: {metrics['auc']}")
    print(f"Log loss: {metrics['log_loss']}")
    print(f"Brier: {metrics['brier']}")
    print(f"Model: {MODEL_PATH}")
    print(f"Meta: {META_PATH}")
    print("--- end report ---")
    return meta


def main() -> int:
    train()
    return 0


if __name__ == "__main__":
    sys.exit(main())
