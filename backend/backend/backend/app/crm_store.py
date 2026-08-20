"""In-memory store for customer_crm_interactions.csv — indexed by customer_id."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CUSTOMER_CRM_CSV = DATA_DIR / "customer_crm_interactions.csv"

_CANONICAL_COLUMNS = [
    "customer_id",
    "interaction_type",
    "summary_text",
    "updated_at",
    "next_action",
    "urgency",
]


def _null_if_empty(value) -> str | None:
    text = str(value).strip() if value is not None else ""
    return text if text else None


class CrmStore:
    def __init__(self) -> None:
        if not CUSTOMER_CRM_CSV.exists():
            raise FileNotFoundError(
                f"{CUSTOMER_CRM_CSV} not found — run scripts/build_customer_crm_interactions.py first."
            )

        df = pd.read_csv(CUSTOMER_CRM_CSV, dtype=str, keep_default_na=False)
        df.columns = [str(c).strip().lstrip("\ufeff") for c in df.columns]
        missing = set(_CANONICAL_COLUMNS) - set(df.columns)
        if missing:
            raise ValueError(
                f"{CUSTOMER_CRM_CSV} missing columns: {sorted(missing)}. "
                f"Found: {list(df.columns)}"
            )

        self._by_customer: dict[str, list[dict[str, str | None]]] = {}

        for row in df.to_dict(orient="records"):
            customer_id = str(row.get("customer_id", "")).strip()
            if not customer_id:
                continue

            record = {
                "interaction_type": _null_if_empty(row.get("interaction_type")),
                "summary_text": _null_if_empty(row.get("summary_text")),
                "updated_at": _null_if_empty(row.get("updated_at")),
                "next_action": _null_if_empty(row.get("next_action")),
                "urgency": _null_if_empty(row.get("urgency")),
            }
            self._by_customer.setdefault(customer_id, []).append(record)

        for customer_id, items in self._by_customer.items():
            items.sort(key=lambda r: r.get("updated_at") or "", reverse=True)

    def list_interactions(self, customer_id: str) -> list[dict[str, str | None]]:
        return list(self._by_customer.get(customer_id, []))

    def get_latest(self, customer_id: str) -> dict[str, str | None] | None:
        items = self._by_customer.get(customer_id)
        if not items:
            return None
        return dict(items[0])

    def customers_with_interactions(self) -> set[str]:
        return set(self._by_customer.keys())

    def total_interactions(self) -> int:
        return sum(len(items) for items in self._by_customer.values())


@lru_cache(maxsize=1)
def get_crm_store() -> CrmStore:
    return CrmStore()


class _CrmStoreProxy:
    def list_interactions(self, customer_id: str) -> list[dict[str, str | None]]:
        return get_crm_store().list_interactions(customer_id)

    def get_latest(self, customer_id: str) -> dict[str, str | None] | None:
        return get_crm_store().get_latest(customer_id)

    def customers_with_interactions(self) -> set[str]:
        return get_crm_store().customers_with_interactions()

    def total_interactions(self) -> int:
        return get_crm_store().total_interactions()


crm_store = _CrmStoreProxy()
