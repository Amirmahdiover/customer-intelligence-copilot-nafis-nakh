"""In-memory store for customer_header.csv — loaded once at startup."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CUSTOMER_HEADER_CSV = DATA_DIR / "customer_header.csv"


class CustomerHeaderStore:
    def __init__(self) -> None:
        if not CUSTOMER_HEADER_CSV.exists():
            raise FileNotFoundError(
                f"{CUSTOMER_HEADER_CSV} not found — run scripts/build_customer_header.py first."
            )

        df = pd.read_csv(CUSTOMER_HEADER_CSV, dtype=str)
        if "customer_info" not in df.columns:
            raise ValueError(
                f"{CUSTOMER_HEADER_CSV} must contain exactly one column named 'customer_info'."
            )

        self._records: list[dict[str, str]] = []
        self._by_id: dict[str, str] = {}

        for raw in df["customer_info"].fillna(""):
            customer_info = str(raw).strip()
            self._records.append({"customer_info": customer_info})
            if customer_info:
                customer_id = customer_info.split(",", 1)[0]
                if customer_id:
                    self._by_id[customer_id] = customer_info

    def list_customer_headers(self) -> list[dict[str, str]]:
        return list(self._records)

    def get_customer_header(self, customer_id: str) -> str | None:
        return self._by_id.get(customer_id)


@lru_cache(maxsize=1)
def get_customer_header_store() -> CustomerHeaderStore:
    return CustomerHeaderStore()


class _CustomerHeaderStoreProxy:
    def list_customer_headers(self) -> list[dict[str, str]]:
        return get_customer_header_store().list_customer_headers()

    def get_customer_header(self, customer_id: str) -> str | None:
        return get_customer_header_store().get_customer_header(customer_id)


customer_header_store = _CustomerHeaderStoreProxy()
