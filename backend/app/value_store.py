"""In-memory store for customer_value_scores.csv — loaded once at startup."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
VALUE_CSV = DATA_DIR / "customer_value_scores.csv"
# Reloads when this module is imported; scores use percentile-rank normalization.

FEATURE_FIELDS = (
    "monetary",
    "sow",
    "margin",
    "on_time",
    "check_quality",
    "frequency",
    "recency",
    "trend",
    "offer_accept",
    "growth_capacity",
)


def _to_float(value) -> float | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _clean_record(row: dict) -> dict:
    record = {
        "customer_id": str(row.get("customer_id") or "").strip(),
        "score": _to_float(row.get("score")) or 0.0,
        "value_tier": str(row.get("value_tier") or "").strip(),
    }
    for field in FEATURE_FIELDS:
        record[field] = _to_float(row.get(field))
    return record


class CustomerValueStore:
    def __init__(self) -> None:
        if not VALUE_CSV.exists():
            raise FileNotFoundError(
                f"{VALUE_CSV} not found — run scripts/build_customer_value.py first."
            )
        df = pd.read_csv(VALUE_CSV)
        self._by_id: dict[str, dict] = {}
        self._records: list[dict] = []
        for row in df.to_dict(orient="records"):
            record = _clean_record(row)
            if not record["customer_id"]:
                continue
            self._records.append(record)
            self._by_id[record["customer_id"]] = record

    def list_scores(self) -> list[dict]:
        return list(self._records)

    def get_score(self, customer_id: str) -> dict | None:
        return self._by_id.get(customer_id)

    def total_customers(self) -> int:
        return len(self._records)


@lru_cache(maxsize=1)
def get_customer_value_store() -> CustomerValueStore:
    return CustomerValueStore()


class _CustomerValueStoreProxy:
    def list_scores(self) -> list[dict]:
        return get_customer_value_store().list_scores()

    def get_score(self, customer_id: str) -> dict | None:
        return get_customer_value_store().get_score(customer_id)

    def total_customers(self) -> int:
        return get_customer_value_store().total_customers()


customer_value_store = _CustomerValueStoreProxy()
