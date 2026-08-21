"""Company/customer liquidity: cash actually collected, not just booked revenue.

liquidity = Σ(cash/prepaid sales) + Σ(successful collections, non-bounced checks)

Reads فروش (sales) and وصول (collections) directly from DATASET.xlsx, at full
history — unlike the rest of the app this metric is not clipped to the
Available_At snapshot (2022-06-30), because the two source sheets already
extend close to the present day and a "last N days" window should be
meaningful against the real calendar, not a 2022 cutoff.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SOURCE_XLSX = DATA_DIR / "DATASET.xlsx"

SHEET_SALES = "فروش"
SHEET_COLLECTIONS = "وصول"

COL_CUSTOMER = "Customer_ID"
COL_SALE_DATE = "تاریخ"
COL_PAYMENT_TYPE = "نوع پرداخت"
COL_SALE_AMOUNT = "مبلغ کل"
COL_COLLECTION_DATE = "تاریخ رویداد وصول"
COL_RETURNED = "چک برگشتی"
COL_COLLECTED_AMOUNT = "مبلغ وصول"

PAYMENT_CASH = "cash_or_prepaid"
RETURNED_YES = "بله"


def _period_label(days: int | None) -> str:
    if not days:
        return "کل تاریخچه"
    return f"{days} روز اخیر"


class LiquidityStore:
    def __init__(self) -> None:
        if not SOURCE_XLSX.exists():
            raise FileNotFoundError(f"{SOURCE_XLSX} not found.")

        sales_raw = pd.read_excel(SOURCE_XLSX, sheet_name=SHEET_SALES, engine="openpyxl")
        coll_raw = pd.read_excel(SOURCE_XLSX, sheet_name=SHEET_COLLECTIONS, engine="openpyxl")

        self._sales = pd.DataFrame({
            "customer_id": sales_raw[COL_CUSTOMER],
            "date": pd.to_datetime(sales_raw[COL_SALE_DATE], errors="coerce"),
            "is_cash": sales_raw[COL_PAYMENT_TYPE] == PAYMENT_CASH,
            "amount": pd.to_numeric(sales_raw[COL_SALE_AMOUNT], errors="coerce").fillna(0.0),
        })
        self._collections = pd.DataFrame({
            "customer_id": coll_raw[COL_CUSTOMER],
            "date": pd.to_datetime(coll_raw[COL_COLLECTION_DATE], errors="coerce"),
            "is_returned": coll_raw[COL_RETURNED] == RETURNED_YES,
            "amount": pd.to_numeric(coll_raw[COL_COLLECTED_AMOUNT], errors="coerce").fillna(0.0),
        })

    @staticmethod
    def _filter(df: pd.DataFrame, customer_id: str | None, days: int | None) -> pd.DataFrame:
        out = df
        if customer_id:
            out = out[out["customer_id"] == customer_id]
        if days:
            cutoff = pd.Timestamp.now().normalize() - pd.Timedelta(days=days)
            out = out[out["date"] > cutoff]
        return out

    def compute(self, customer_id: str | None = None, days: int | None = None) -> dict:
        sales = self._filter(self._sales, customer_id, days)
        coll = self._filter(self._collections, customer_id, days)

        cash_sales = float(sales.loc[sales["is_cash"], "amount"].sum())
        collected = float(coll.loc[~coll["is_returned"], "amount"].sum())
        total_liquidity = cash_sales + collected

        total_sales = float(sales["amount"].sum())
        liquidity_ratio = round(total_liquidity / total_sales, 4) if total_sales > 0 else None

        return {
            "cash_sales": round(cash_sales, 2),
            "collected_amount": round(collected, 2),
            "total_liquidity": round(total_liquidity, 2),
            "liquidity_ratio": liquidity_ratio,
            "period": _period_label(days),
        }

    def total_customers(self) -> int:
        return int(
            pd.concat([self._sales["customer_id"], self._collections["customer_id"]])
            .nunique()
        )


@lru_cache(maxsize=1)
def get_liquidity_store() -> LiquidityStore:
    return LiquidityStore()


class _LiquidityStoreProxy:
    def compute(self, customer_id: str | None = None, days: int | None = None) -> dict:
        return get_liquidity_store().compute(customer_id, days)

    def total_customers(self) -> int:
        return get_liquidity_store().total_customers()


liquidity_store = _LiquidityStoreProxy()
