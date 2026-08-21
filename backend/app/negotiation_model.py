"""Negotiation success score: two ML models + two rule-based scorecards.

Artifacts:
  models/model_retention.joblib
  models/model_loyalty.joblib
  models/negotiation_meta.json
Feature store:
  data/customer_negotiation_profiles.csv  (snapshot 2022-03-01)
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT / "models"
DATA_DIR = ROOT / "data"
RETENTION_PATH = MODELS_DIR / "model_retention.joblib"
LOYALTY_PATH = MODELS_DIR / "model_loyalty.joblib"
META_PATH = MODELS_DIR / "negotiation_meta.json"
PROFILES_CSV = DATA_DIR / "customer_negotiation_profiles.csv"

PILLAR_LABELS = {
    "collection": "سلامت وصول",
    "retention": "حفظ مشتری",
    "loyalty": "وفاداری",
    "cash": "نقدینگی",
}


class NegotiationModelUnavailable(RuntimeError):
    """Raised when negotiation artifacts cannot be loaded."""


class NegotiationProfileNotFound(LookupError):
    """Raised when a customer has no negotiation profile row."""


def _norm(value: Any, lo: float, hi: float, invert: bool = False) -> float | None:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    if hi == lo:
        return 0.5
    score = (float(value) - lo) / (hi - lo)
    score = max(0.0, min(1.0, score))
    return 1.0 - score if invert else score


def collection_health_score(features: dict[str, Any]) -> tuple[float, str]:
    parts: list[float] = []
    weights: list[float] = []

    score = _norm(features.get("avg_delay_days"), 0, 45, invert=True)
    if score is not None:
        parts.append(score)
        weights.append(0.35)

    score = _norm(features.get("on_time_ratio"), 0, 1)
    if score is not None:
        parts.append(score)
        weights.append(0.20)

    score = _norm(features.get("bounced_check_rate"), 0, 0.2, invert=True)
    if score is not None:
        parts.append(score)
        weights.append(0.25)

    score = _norm(features.get("max_delay_days"), 0, 56, invert=True)
    if score is not None:
        parts.append(score)
        weights.append(0.10)

    score = _norm(features.get("crm_collection_pressure"), 0, 5, invert=True)
    if score is not None:
        parts.append(score)
        weights.append(0.10)

    if not parts:
        return 0.5, "بدون سابقهٔ وصول - امتیاز خنثی"

    result = float(np.average(parts, weights=weights))
    if result >= 0.7:
        note = "سابقهٔ پرداخت خوب"
    elif result >= 0.45:
        note = "سابقهٔ پرداخت متوسط"
    else:
        note = "سابقهٔ پرداخت ضعیف - ریسک وصول"
    return result, note


def cash_score(features: dict[str, Any], stats: dict[str, Any]) -> tuple[float, str]:
    parts: list[float] = []
    weights: list[float] = []

    score = _norm(
        features.get("cash_ratio_365d"),
        stats.get("cash_ratio_p10", 0),
        stats.get("cash_ratio_p90", 1),
    )
    if score is not None:
        parts.append(score)
        weights.append(0.40)

    trend = features.get("cash_ratio_trend")
    if trend is not None and not (isinstance(trend, float) and np.isnan(trend)):
        parts.append(_norm(trend, -0.5, 0.5) or 0.5)
        weights.append(0.15)

    score = _norm(
        features.get("avg_margin_pct"),
        stats.get("margin_pct_p10", 0),
        stats.get("margin_pct_p90", 0.5),
    )
    if score is not None:
        parts.append(score)
        weights.append(0.25)

    score = _norm(
        features.get("avg_txn_size"),
        stats.get("avg_txn_p10", 0),
        stats.get("avg_txn_p90", 1e6),
    )
    if score is not None:
        parts.append(score)
        weights.append(0.20)

    if not parts:
        return 0.5, "دادهٔ کافی برای ارزیابی نقدینگی نیست"

    result = float(np.average(parts, weights=weights))
    if result >= 0.65:
        note = "مشتری نقدی و سودآور"
    elif result >= 0.4:
        note = "نقدینگی متوسط"
    else:
        note = "عمدتاً نسیه یا حاشیهٔ سود پایین"
    return result, note


@lru_cache(maxsize=1)
def _load_bundle() -> dict[str, Any]:
    missing = [
        path
        for path in (RETENTION_PATH, LOYALTY_PATH, META_PATH, PROFILES_CSV)
        if not path.exists()
    ]
    if missing:
        names = ", ".join(str(path.relative_to(ROOT)) for path in missing)
        raise NegotiationModelUnavailable(f"Negotiation artifacts missing: {names}")
    try:
        retention = joblib.load(RETENTION_PATH)
        loyalty = joblib.load(LOYALTY_PATH)
        meta = json.loads(META_PATH.read_text(encoding="utf-8"))
        profiles = pd.read_csv(PROFILES_CSV)
    except Exception as exc:  # noqa: BLE001
        raise NegotiationModelUnavailable(
            f"Failed to load negotiation assets: {exc}"
        ) from exc

    if "customer_id" not in profiles.columns:
        raise NegotiationModelUnavailable(
            "customer_negotiation_profiles.csv missing customer_id."
        )
    profiles = profiles.set_index("customer_id")
    return {
        "retention": retention,
        "loyalty": loyalty,
        "meta": meta,
        "profiles": profiles,
    }


def _to_frame(features: dict[str, Any], cols: list[str]) -> pd.DataFrame:
    return pd.DataFrame([{col: features.get(col, np.nan) for col in cols}])


def _finite(value: Any) -> Any:
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        return value
    return value


def _build_recommendation(score: float, pillars: dict[str, dict[str, Any]]) -> str:
    weakest = min(pillars.items(), key=lambda item: item[1]["score"])
    if score >= 70:
        base = "شانس موفقیت بالا - مذاکره را با اطمینان پیش ببرید"
    elif score >= 45:
        base = "شانس موفقیت متوسط - نیازمند آماده‌سازی و امتیاز متقابل"
    else:
        base = "شانس موفقیت پایین - قبل از مذاکره ریسک‌ها را برطرف کنید"
    weakest_label = PILLAR_LABELS[weakest[0]]
    return f"{base}. ضعیف‌ترین محور: {weakest_label} ({weakest[1]['score']:.0%})"


def _build_drivers(features: dict[str, Any]) -> list[str]:
    drivers: list[str] = []

    recency = _finite(features.get("recency_days"))
    if recency is not None:
        recency = int(recency)
        if recency > 180:
            drivers.append(f"⚠ {recency} روز از آخرین خرید گذشته - ریسک بالای ریزش")
        elif recency < 30:
            drivers.append(f"✓ خرید اخیر ({recency} روز پیش) - رابطهٔ فعال")

    delay = _finite(features.get("avg_delay_days"))
    if delay is not None:
        delay = int(delay)
        if delay > 35:
            drivers.append(f"⚠ میانگین تأخیر پرداخت {delay} روز")
        elif delay < 15:
            drivers.append(f"✓ پرداخت‌های نسبتاً به‌موقع (میانگین {delay} روز)")

    bounced = _finite(features.get("bounced_check_count")) or 0
    if bounced > 0:
        drivers.append(f"⚠ {int(bounced)} چک برگشتی در سابقه")

    wallet = _finite(features.get("wallet_share"))
    if wallet is not None:
        if wallet < 0.1:
            drivers.append(f"⚠ سهم سبد فقط {wallet:.0%} - عمدتاً از رقبا می‌خرد")
        elif wallet > 0.3:
            drivers.append(f"✓ سهم سبد {wallet:.0%} - وابستگی خوب")

    cash_ratio = _finite(features.get("cash_ratio_365d"))
    if cash_ratio is not None:
        if cash_ratio > 0.7:
            drivers.append(f"✓ {cash_ratio:.0%} خریدها نقدی")
        elif cash_ratio < 0.3:
            drivers.append(f"⚠ فقط {cash_ratio:.0%} خریدها نقدی - عمدتاً نسیه")

    critical = _finite(features.get("critical_complaint_count")) or 0
    if critical > 0:
        drivers.append(f"⚠ {int(critical)} شکایت جدی در یک سال اخیر")

    dev = _finite(features.get("dev_request_count")) or 0
    if dev > 2:
        drivers.append(f"✓ {int(dev)} درخواست توسعهٔ محصول - سرمایه‌گذاری روی رابطه")

    return drivers[:6]


def predict_negotiation_score(
    customer_id: str,
    *,
    w_collection: float = 0.25,
    w_retention: float = 0.25,
    w_loyalty: float = 0.25,
    w_cash: float = 0.25,
) -> dict[str, Any]:
    total_weight = w_collection + w_retention + w_loyalty + w_cash
    if total_weight <= 0:
        raise ValueError("مجموع وزن‌ها نمی‌تواند صفر باشد")

    try:
        bundle = _load_bundle()
    except NegotiationModelUnavailable:
        raise

    profiles: pd.DataFrame = bundle["profiles"]
    if customer_id not in profiles.index:
        raise NegotiationProfileNotFound(
            f"No negotiation profile for customer '{customer_id}'."
        )

    row = profiles.loc[customer_id]
    if isinstance(row, pd.DataFrame):
        row = row.iloc[0]
    features = {key: _finite(value) for key, value in row.to_dict().items()}

    warnings: list[str] = []
    meta = bundle["meta"]

    collection, collection_note = collection_health_score(features)
    if not features.get("has_collection_history", 1):
        warnings.append(
            "سابقهٔ وصول برای این مشتری موجود نیست - امتیاز محور وصول خنثی (۰.۵) در نظر گرفته شد"
        )

    try:
        retention_cols = meta["retention"]["features"]
        retention = float(
            bundle["retention"].predict_proba(_to_frame(features, retention_cols))[0, 1]
        )
        loyalty_cols = meta["loyalty"]["features"]
        loyalty_raw = float(
            bundle["loyalty"].predict(_to_frame(features, loyalty_cols))[0]
        )
        loyalty = float(np.clip(loyalty_raw, 0.0, 1.0))
    except Exception as exc:
        raise NegotiationModelUnavailable(
            f"Negotiation model inference is unavailable: {exc}"
        ) from exc

    if not features.get("has_wallet_data", 1):
        warnings.append("دادهٔ سهم سبد موجود نیست - پیش‌بینی وفاداری با دقت کمتر")

    cash, cash_note = cash_score(features, meta.get("cash_stats", {}))
    weights = {
        "collection": w_collection,
        "retention": w_retention,
        "loyalty": w_loyalty,
        "cash": w_cash,
    }
    pillars = {
        "collection": {
            "score": round(collection, 4),
            "weight": w_collection,
            "contribution": round(collection * w_collection, 4),
            "method": "rule_based_scorecard",
            "note": collection_note,
            "confidence": "medium",
        },
        "retention": {
            "score": round(retention, 4),
            "weight": w_retention,
            "contribution": round(retention * w_retention, 4),
            "method": "ml_model",
            "note": (
                "مدل Logistic Regression، "
                f"AUC={meta['retention']['metrics']['auc']}"
            ),
            "confidence": "high",
        },
        "loyalty": {
            "score": round(loyalty, 4),
            "weight": w_loyalty,
            "contribution": round(loyalty * w_loyalty, 4),
            "method": "ml_model",
            "note": (
                "سهم سبد پیش‌بینی‌شده؛ مدل Ridge، "
                f"R²={meta['loyalty']['metrics']['r2']}"
            ),
            "confidence": "medium",
        },
        "cash": {
            "score": round(cash, 4),
            "weight": w_cash,
            "contribution": round(cash * w_cash, 4),
            "method": "rule_based_scorecard",
            "note": cash_note,
            "confidence": "medium",
        },
    }

    raw = sum(pillar["contribution"] for pillar in pillars.values()) / total_weight
    score = round(raw * 100, 2)
    snapshot = features.get("snapshot_date")
    if snapshot is not None:
        snapshot = str(snapshot)[:10]

    return {
        "method": "negotiation_score",
        "negotiation_score": score,
        "recommendation": _build_recommendation(score, pillars),
        "pillars": pillars,
        "key_drivers": _build_drivers(features),
        "warnings": warnings,
        "snapshot_date": snapshot,
        "weights": weights,
    }
