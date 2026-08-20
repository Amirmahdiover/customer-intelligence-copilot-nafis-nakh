"""ML churn inference from precomputed features + trained LogisticRegression.

Artifacts:
  models/churn_model.joblib
  models/churn_model_meta.json
Feature store:
  data/customer_churn_features.csv  (latest snapshot per customer)
"""
from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

import joblib
import pandas as pd

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT / "models"
DATA_DIR = ROOT / "data"
MODEL_PATH = MODELS_DIR / "churn_model.joblib"
META_PATH = MODELS_DIR / "churn_model_meta.json"
FEATURES_CSV = DATA_DIR / "customer_churn_features.csv"


class ChurnModelUnavailable(RuntimeError):
    """Raised when the churn model artifact or feature store is missing."""


class ChurnFeaturesNotFound(LookupError):
    """Raised when a customer has no precomputed churn features."""


@lru_cache(maxsize=1)
def _load_bundle() -> dict[str, Any]:
    if not MODEL_PATH.exists() or not META_PATH.exists():
        raise ChurnModelUnavailable(
            "Churn model not found. Expected models/churn_model.joblib and churn_model_meta.json."
        )
    if not FEATURES_CSV.exists():
        raise ChurnModelUnavailable(
            "Churn feature store missing: data/customer_churn_features.csv"
        )
    try:
        model = joblib.load(MODEL_PATH)
        meta = json.loads(META_PATH.read_text(encoding="utf-8"))
        features_df = pd.read_csv(FEATURES_CSV)
    except Exception as exc:  # noqa: BLE001
        raise ChurnModelUnavailable(f"Failed to load churn assets: {exc}") from exc

    feature_columns = meta.get("feature_columns")
    if not feature_columns:
        raise ChurnModelUnavailable("churn_model_meta.json missing feature_columns.")

    missing = [c for c in feature_columns if c not in features_df.columns]
    if missing:
        raise ChurnModelUnavailable(f"Feature store missing columns: {missing}")

    features_df = features_df.set_index("customer_id", drop=False)
    return {
        "model": model,
        "meta": meta,
        "feature_columns": feature_columns,
        "features": features_df,
    }


def _risk_level(proba: float) -> str:
    if proba >= 0.7:
        return "بالا"
    if proba >= 0.4:
        return "متوسط"
    return "پایین"


def predict_churn(customer_id: str) -> dict[str, Any]:
    """Score churn probability for one customer from the feature store."""
    bundle = _load_bundle()
    features_df: pd.DataFrame = bundle["features"]
    if customer_id not in features_df.index:
        raise ChurnFeaturesNotFound(
            f"No churn features for customer '{customer_id}'."
        )

    row = features_df.loc[customer_id]
    if isinstance(row, pd.DataFrame):
        row = row.iloc[0]

    feature_columns: list[str] = bundle["feature_columns"]
    X = pd.DataFrame([{c: row.get(c) for c in feature_columns}])[feature_columns]

    model = bundle["model"]
    proba = float(model.predict_proba(X)[0, 1])
    pred = int(proba >= 0.5)
    snapshot = row.get("snapshot_date")
    if hasattr(snapshot, "isoformat"):
        snapshot = snapshot.isoformat()
    elif snapshot is not None and not isinstance(snapshot, str):
        snapshot = str(snapshot)

    return {
        "method": bundle["meta"].get("method", "ml_churn"),
        "churn_probability": round(proba, 4),
        "churn_prediction": pred,
        "risk_level": _risk_level(proba),
        "snapshot_date": snapshot,
    }
