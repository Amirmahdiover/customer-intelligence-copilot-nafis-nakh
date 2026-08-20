"""ML offer-acceptance inference: score candidate offers for a customer.

Artifact produced by scripts/train_offer_model.py:
  models/offer_accept.joblib
  models/offer_model_meta.json
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODELS_DIR / "offer_accept.joblib"
META_PATH = MODELS_DIR / "offer_model_meta.json"


class OfferModelUnavailable(RuntimeError):
    """Raised when the trained offer model artifact is missing or unloadable."""


@lru_cache(maxsize=1)
def _load_artifact() -> dict[str, Any]:
    if not MODEL_PATH.exists() or not META_PATH.exists():
        raise OfferModelUnavailable(
            "Offer model not trained. Run: python scripts/train_offer_model.py"
        )
    try:
        artifact = joblib.load(MODEL_PATH)
        meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001 — surface as unavailable to API
        raise OfferModelUnavailable(f"Failed to load offer model: {exc}") from exc
    if "model" not in artifact or "feature_cols" not in artifact:
        raise OfferModelUnavailable("Offer model artifact is incomplete.")
    return {"artifact": artifact, "meta": meta}


def model_ready() -> bool:
    try:
        _load_artifact()
        return True
    except OfferModelUnavailable:
        return False


def _customer_feature_row(customer: dict[str, Any], meta: dict[str, Any]) -> dict[str, Any]:
    row: dict[str, Any] = {}
    for col in meta["customer_numeric"]:
        val = customer.get(col)
        row[col] = None if val is None else val
    for col in meta["customer_categorical"]:
        val = customer.get(col)
        row[col] = "UNKNOWN" if val is None or val == "" else str(val)
    return row


def _build_candidates(meta: dict[str, Any]) -> list[dict[str, Any]]:
    grid = meta["candidate_grid"]
    candidates: list[dict[str, Any]] = []
    for offer_type in grid["offer_types"]:
        for reason in grid["offer_reasons"]:
            for family in grid["product_families"]:
                for discount in grid["discount_bins"]:
                    for validity in grid["validity_days"]:
                        candidates.append({
                            "offer_type": offer_type,
                            "offer_reason": reason,
                            "product_family": family,
                            "offer_discount_pct": float(discount),
                            "validity_days": int(validity),
                        })
    return candidates


def predict_best_offer(
    customer: dict[str, Any],
    *,
    top_n: int = 3,
) -> dict[str, Any]:
    """Score the candidate offer grid for one customer and return best + alternatives."""
    loaded = _load_artifact()
    artifact = loaded["artifact"]
    meta = loaded["meta"]
    model = artifact["model"]
    feature_cols: list[str] = artifact["feature_cols"]

    base = _customer_feature_row(customer, meta)
    candidates = _build_candidates(meta)
    if not candidates:
        raise OfferModelUnavailable("Candidate offer grid is empty.")

    rows = []
    for cand in candidates:
        row = {**base, **cand}
        rows.append(row)

    frame = pd.DataFrame(rows)
    # Ensure column order / types expected by the pipeline
    for col in artifact["num_cols"]:
        frame[col] = pd.to_numeric(frame[col], errors="coerce")
    for col in artifact["cat_cols"]:
        frame[col] = frame[col].fillna("UNKNOWN").astype(str)

    X = frame[feature_cols]
    proba = model.predict_proba(X)[:, 1]

    scored: list[dict[str, Any]] = []
    for cand, p in zip(candidates, proba):
        discount = float(cand["offer_discount_pct"])
        p_accept = float(p)
        business_score = p_accept * (1.0 - discount)
        scored.append({
            "Offer_Type": cand["offer_type"],
            "Offer_Reason": cand["offer_reason"],
            "Product_Family": cand["product_family"],
            "Offer_Discount_Pct": round(discount, 4),
            "Validity_Days": int(cand["validity_days"]),
            "accept_probability": round(p_accept, 4),
            "business_score": round(business_score, 4),
        })

    scored.sort(key=lambda x: (x["business_score"], x["accept_probability"]), reverse=True)

    # Deduplicate near-identical top rows by (type, reason, discount) keeping best validity
    unique: list[dict[str, Any]] = []
    seen: set[tuple] = set()
    for item in scored:
        key = (item["Offer_Type"], item["Offer_Reason"], item["Offer_Discount_Pct"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
        if len(unique) >= top_n:
            break

    best = unique[0]
    alternatives = unique[1:]

    return {
        "method": meta.get("method", "ml_offer_accept"),
        "best_offer": best,
        "alternatives": alternatives,
        "metrics": meta.get("metrics"),
    }
