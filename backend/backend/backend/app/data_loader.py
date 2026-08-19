"""Loads the derived customer analytics dataset and raw complaint records into memory once at startup.

DATASET.xlsx is never written to. Source of truth for customer-level KPIs is
data/customer_analytics_dataset.csv (built by the analytics pipeline, snapshot 2022-06-30).
Complaint detail records are read from the شکایات sheet of DATASET.xlsx.
"""
import math
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
ANALYTICS_CSV = DATA_DIR / "customer_analytics_dataset.csv"
SOURCE_XLSX = DATA_DIR / "DATASET.xlsx"

SNAPSHOT_DATE = "2022-06-30"

_DATE_COLUMNS = ["Last_Order_Date", "First_Order_Date", "Expected_Next_Order_Date"]
_COMPLAINT_DATE_COLUMNS = ["Created_At", "Available_At", "Resolved_At", "Resolution_Available_At"]


def _clean_value(v):
    if v is None or v is pd.NaT:
        return None
    if isinstance(v, pd.Timestamp):
        return None if pd.isna(v) else v.date().isoformat()
    if isinstance(v, np.integer):
        return int(v)
    if isinstance(v, np.floating):
        return None if np.isnan(v) else float(v)
    if isinstance(v, np.bool_):
        return bool(v)
    if isinstance(v, float) and math.isnan(v):
        return None
    return v


def _clean_record(record: dict) -> dict:
    return {k: _clean_value(v) for k, v in record.items()}


class Store:
    def __init__(self):
        if not ANALYTICS_CSV.exists():
            raise FileNotFoundError(
                f"{ANALYTICS_CSV} not found — run the analytics build before starting the API."
            )
        df = pd.read_csv(ANALYTICS_CSV, dtype={"RFM_Score": str, "Revenue_Share_As_Of_Month": str})
        for c in _DATE_COLUMNS:
            if c in df.columns:
                df[c] = pd.to_datetime(df[c], errors="coerce")
        self.customers = df.set_index("Customer_ID", drop=False)

        comp = pd.read_excel(SOURCE_XLSX, sheet_name="شکایات", engine="openpyxl")
        for c in _COMPLAINT_DATE_COLUMNS:
            if c in comp.columns:
                comp[c] = pd.to_datetime(comp[c], errors="coerce")
        self.complaints = comp

    def customer_ids(self) -> set:
        return set(self.customers.index)

    def get_customer_record(self, customer_id: str) -> dict | None:
        if customer_id not in self.customers.index:
            return None
        row = self.customers.loc[customer_id]
        return _clean_record(row.to_dict())

    def list_customers(self, filters: dict, skip: int, limit: int):
        df = self.customers
        if filters.get("customer_status"):
            df = df[df["Customer_Status"] == filters["customer_status"]]
        if filters.get("risk_level"):
            df = df[df["Risk_Level"] == filters["risk_level"]]
        if filters.get("rfm_segment"):
            df = df[df["RFM_Segment"] == filters["rfm_segment"]]
        if filters.get("customer_segment"):
            df = df[df["Customer_Segment"] == filters["customer_segment"]]
        total = len(df)
        page = df.iloc[skip: skip + limit]
        records = [_clean_record(r) for r in page.to_dict(orient="records")]
        return records, total

    def get_complaints_for_customer(self, customer_id: str):
        rows = self.complaints[self.complaints["Customer_ID"] == customer_id]
        return [_clean_record(r) for r in rows.to_dict(orient="records")]


store = Store()
