"""In-memory store for customer_header.csv — loaded once at startup."""
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


customer_header_store = CustomerHeaderStore()
