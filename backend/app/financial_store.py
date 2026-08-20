"""In-memory store for customer financial CSVs — indexed by customer_id at startup."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import pandas as pd

from app.config import ANNUAL_FINANCING_RATE

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
STATUS_CSV = DATA_DIR / "customer_financial_status.csv"
NOT_DUE_CSV = DATA_DIR / "customer_not_due_invoices.csv"
RETURNED_CHECKS_CSV = DATA_DIR / "customer_returned_checks.csv"

_STATUS_COLUMNS = [
    "customer_id",
    "outstanding_balance",
    "not_due_invoice_count",
    "has_returned_check",
    "returned_check_count",
    "last_returned_check_date",
    "credit_limit",
    "credit_used_percent",
    "credit_remaining",
    "credit_status",
    "delay_cost",
]

_NOT_DUE_COLUMNS = [
    "customer_id",
    "invoice_id",
    "invoice_total",
    "amount_collected",
    "outstanding_balance",
    "due_date",
]

_RETURNED_COLUMNS = ["customer_id", "date"]


def _null_if_empty(value) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text if text and text.lower() != "nan" else None


def _to_float(value) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _to_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    return text in {"true", "1", "yes", "بله"}


def _default_status(customer_id: str) -> dict:
    return {
        "customer_id": customer_id,
        "outstanding_balance": 0.0,
        "not_due_invoice_count": 0,
        "has_returned_check": False,
        "returned_check_count": 0,
        "last_returned_check_date": None,
        "credit_limit": None,
        "credit_used_percent": None,
        "credit_remaining": None,
        "credit_status": "unknown",
        "delay_cost": 0.0,
        "annual_financing_rate": ANNUAL_FINANCING_RATE,
    }


class FinancialStore:
    def __init__(self) -> None:
        if not STATUS_CSV.exists():
            raise FileNotFoundError(
                f"{STATUS_CSV} not found — run scripts/build_customer_financial_status.py first."
            )

        status_df = pd.read_csv(STATUS_CSV, dtype=str, keep_default_na=False)
        missing = set(_STATUS_COLUMNS) - set(status_df.columns)
        if missing:
            raise ValueError(f"{STATUS_CSV} missing columns: {sorted(missing)}")

        self._status_by_id: dict[str, dict] = {}
        for row in status_df.to_dict(orient="records"):
            customer_id = str(row.get("customer_id", "")).strip()
            if not customer_id:
                continue
            self._status_by_id[customer_id] = {
                "customer_id": customer_id,
                "outstanding_balance": _to_float(row.get("outstanding_balance")) or 0.0,
                "not_due_invoice_count": int(float(row.get("not_due_invoice_count") or 0)),
                "has_returned_check": _to_bool(row.get("has_returned_check")),
                "returned_check_count": int(float(row.get("returned_check_count") or 0)),
                "last_returned_check_date": _null_if_empty(row.get("last_returned_check_date")),
                "credit_limit": _to_float(row.get("credit_limit")),
                "credit_used_percent": _to_float(row.get("credit_used_percent")),
                "credit_remaining": _to_float(row.get("credit_remaining")),
                "credit_status": _null_if_empty(row.get("credit_status")) or "unknown",
                "delay_cost": _to_float(row.get("delay_cost")) or 0.0,
                "annual_financing_rate": ANNUAL_FINANCING_RATE,
            }

        self._not_due_by_id: dict[str, list[dict]] = {}
        if NOT_DUE_CSV.exists():
            not_due_df = pd.read_csv(NOT_DUE_CSV, dtype=str, keep_default_na=False)
            for row in not_due_df.to_dict(orient="records"):
                customer_id = str(row.get("customer_id", "")).strip()
                if not customer_id:
                    continue
                record = {
                    "invoice_id": _null_if_empty(row.get("invoice_id")),
                    "invoice_total": _to_float(row.get("invoice_total")) or 0.0,
                    "amount_collected": _to_float(row.get("amount_collected")) or 0.0,
                    "outstanding_balance": _to_float(row.get("outstanding_balance")) or 0.0,
                    "due_date": _null_if_empty(row.get("due_date")),
                }
                self._not_due_by_id.setdefault(customer_id, []).append(record)
            for customer_id in self._not_due_by_id:
                self._not_due_by_id[customer_id].sort(
                    key=lambda r: r.get("due_date") or "",
                )

        self._returned_by_id: dict[str, list[dict]] = {}
        if RETURNED_CHECKS_CSV.exists():
            returned_df = pd.read_csv(RETURNED_CHECKS_CSV, dtype=str, keep_default_na=False)
            for row in returned_df.to_dict(orient="records"):
                customer_id = str(row.get("customer_id", "")).strip()
                if not customer_id:
                    continue
                record = {"date": _null_if_empty(row.get("date"))}
                self._returned_by_id.setdefault(customer_id, []).append(record)
            for customer_id in self._returned_by_id:
                self._returned_by_id[customer_id].sort(
                    key=lambda r: r.get("date") or "",
                    reverse=True,
                )

    def get_status(self, customer_id: str) -> dict:
        return dict(self._status_by_id.get(customer_id, _default_status(customer_id)))

    def list_not_due_invoices(self, customer_id: str) -> list[dict]:
        return list(self._not_due_by_id.get(customer_id, []))

    def list_returned_checks(self, customer_id: str) -> list[dict]:
        return list(self._returned_by_id.get(customer_id, []))

    def total_customers(self) -> int:
        return len(self._status_by_id)


@lru_cache(maxsize=1)
def get_financial_store() -> FinancialStore:
    return FinancialStore()


class _FinancialStoreProxy:
    def get_status(self, customer_id: str) -> dict:
        return get_financial_store().get_status(customer_id)

    def list_not_due_invoices(self, customer_id: str) -> list[dict]:
        return get_financial_store().list_not_due_invoices(customer_id)

    def list_returned_checks(self, customer_id: str) -> list[dict]:
        return get_financial_store().list_returned_checks(customer_id)

    def total_customers(self) -> int:
        return get_financial_store().total_customers()


financial_store = _FinancialStoreProxy()
