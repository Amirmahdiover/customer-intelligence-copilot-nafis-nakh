"""In-memory store for customer_complaints.csv — indexed by customer_id at startup."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CUSTOMER_COMPLAINTS_CSV = DATA_DIR / "customer_complaints.csv"

_CANONICAL_COLUMNS = [
    "customer_id",
    "Product_id",
    "complaint_text",
    "severity",
    "created_at",
    "complaint_status",
    "text_resolution",
]

_COLUMN_ALIASES = {
    "id_product": "Product_id",
    "text_complaint": "complaint_text",
    "at_created": "created_at",
    "status_complaint": "complaint_status",
    "resolution_text": "text_resolution",
}


def _null_if_empty(value: str) -> str | None:
    text = str(value).strip() if value is not None else ""
    return text if text else None


def _normalize_complaints_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip().lstrip("\ufeff") for c in df.columns]
    rename = {col: _COLUMN_ALIASES[col] for col in df.columns if col in _COLUMN_ALIASES}
    if rename:
        df = df.rename(columns=rename)
    return df


class ComplaintStore:
    def __init__(self) -> None:
        if not CUSTOMER_COMPLAINTS_CSV.exists():
            raise FileNotFoundError(
                f"{CUSTOMER_COMPLAINTS_CSV} not found — run scripts/build_customer_complaints.py first."
            )

        df = _normalize_complaints_df(
            pd.read_csv(CUSTOMER_COMPLAINTS_CSV, dtype=str, keep_default_na=False)
        )
        missing = set(_CANONICAL_COLUMNS) - set(df.columns)
        if missing:
            raise ValueError(
                f"{CUSTOMER_COMPLAINTS_CSV} missing columns: {sorted(missing)}. "
                f"Found: {list(df.columns)}"
            )

        self._by_customer: dict[str, list[dict[str, str | None]]] = {}
        self._customer_ids_with_complaints: set[str] = set()

        for row in df.to_dict(orient="records"):
            customer_id = str(row.get("customer_id", "")).strip()
            if not customer_id:
                continue

            record = {
                "Product_id": _null_if_empty(row.get("Product_id")),
                "complaint_text": _null_if_empty(row.get("complaint_text")),
                "severity": _null_if_empty(row.get("severity")),
                "created_at": _null_if_empty(row.get("created_at")),
                "complaint_status": _null_if_empty(row.get("complaint_status")),
                "text_resolution": _null_if_empty(row.get("text_resolution")),
            }
            self._by_customer.setdefault(customer_id, []).append(record)
            self._customer_ids_with_complaints.add(customer_id)

    def count_for_customer(self, customer_id: str) -> int:
        return len(self._by_customer.get(customer_id, []))

    def list_for_customer(self, customer_id: str) -> list[dict[str, str | None]]:
        return list(self._by_customer.get(customer_id, []))

    def customers_with_complaints(self) -> set[str]:
        return set(self._customer_ids_with_complaints)


@lru_cache(maxsize=1)
def get_complaint_store() -> ComplaintStore:
    return ComplaintStore()


class _ComplaintStoreProxy:
    def count_for_customer(self, customer_id: str) -> int:
        return get_complaint_store().count_for_customer(customer_id)

    def list_for_customer(self, customer_id: str) -> list[dict[str, str | None]]:
        return get_complaint_store().list_for_customer(customer_id)

    def customers_with_complaints(self) -> set[str]:
        return get_complaint_store().customers_with_complaints()


complaint_store = _ComplaintStoreProxy()
