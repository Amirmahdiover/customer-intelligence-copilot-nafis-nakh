"""Extract complaint records from DATASET.xlsx (sheet شکایات) into customer_complaints.csv.

Usage (from backend/backend/backend):
    python scripts/build_customer_complaints.py

DATASET.xlsx is read-only; this script never modifies it.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SOURCE_XLSX = DATA_DIR / "DATASET.xlsx"
OUTPUT_CSV = DATA_DIR / "customer_complaints.csv"

SHEET_NAME = "شکایات"

# Real source columns (verified from DATASET.xlsx header)
SRC_CUSTOMER_ID = "Customer_ID"
SRC_PRODUCT_ID = "Product_ID"
SRC_TEXT = "Complaint_Text"
SRC_SEVERITY = "Severity"
SRC_CREATED = "Created_At"
SRC_STATUS = "Complaint_Status"
SRC_RESOLUTION = "Resolution_Text"

OUTPUT_COLUMNS = [
    "customer_id",
    "Product_id",
    "complaint_text",
    "severity",
    "created_at",
    "complaint_status",
    "text_resolution",
]


def _clean_str(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return str(value).strip()


def _format_date(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    if isinstance(value, pd.Timestamp):
        if pd.isna(value):
            return ""
        return value.date().isoformat()
    text = str(value).strip()
    if not text:
        return ""
    parsed = pd.to_datetime(text, errors="coerce")
    if pd.isna(parsed):
        return text
    return parsed.date().isoformat()


def build_customer_complaints() -> pd.DataFrame:
    if not SOURCE_XLSX.exists():
        raise FileNotFoundError(f"Source file not found: {SOURCE_XLSX}")

    df = pd.read_excel(SOURCE_XLSX, sheet_name=SHEET_NAME, engine="openpyxl")
    required = [
        SRC_CUSTOMER_ID,
        SRC_PRODUCT_ID,
        SRC_TEXT,
        SRC_SEVERITY,
        SRC_CREATED,
        SRC_STATUS,
        SRC_RESOLUTION,
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(
            f"Missing required columns in sheet '{SHEET_NAME}': {missing}. "
            f"Found: {list(df.columns)}"
        )

    out = pd.DataFrame({
        "customer_id": df[SRC_CUSTOMER_ID].map(_clean_str),
        "Product_id": df[SRC_PRODUCT_ID].map(_clean_str),
        "complaint_text": df[SRC_TEXT].map(_clean_str),
        "severity": df[SRC_SEVERITY].map(_clean_str),
        "created_at": df[SRC_CREATED].map(_format_date),
        "complaint_status": df[SRC_STATUS].map(_clean_str),
        "text_resolution": df[SRC_RESOLUTION].map(_clean_str),
    })

    return out[OUTPUT_COLUMNS]


def _print_qa(source_rows: int, output: pd.DataFrame, problematic: pd.DataFrame) -> None:
    null_counts = {col: int((output[col] == "").sum()) for col in OUTPUT_COLUMNS}
    unique_customers = output.loc[output["customer_id"] != "", "customer_id"].nunique()
    severity_values = sorted(output.loc[output["severity"] != "", "severity"].unique().tolist())
    status_values = sorted(
        output.loc[output["complaint_status"] != "", "complaint_status"].unique().tolist()
    )

    print("--- customer_complaints build report ---")
    print(f"Source: {SOURCE_XLSX} (sheet: {SHEET_NAME})")
    print("Source column mapping:")
    print(f"  customer_id      <- {SRC_CUSTOMER_ID}")
    print(f"  Product_id       <- {SRC_PRODUCT_ID}")
    print(f"  complaint_text   <- {SRC_TEXT}")
    print(f"  severity         <- {SRC_SEVERITY}")
    print(f"  created_at       <- {SRC_CREATED}")
    print(f"  complaint_status <- {SRC_STATUS}")
    print(f"  text_resolution  <- {SRC_RESOLUTION}")
    print(f"Source row count: {source_rows}")
    print(f"Output row count: {len(output)}")
    print(f"Unique customers with complaints: {unique_customers}")
    print(f"Complaints without customer_id: {len(problematic)}")
    for col, count in null_counts.items():
        print(f"Null/empty {col}: {count}")
    print(f"Unique severity values: {severity_values}")
    print(f"Unique complaint status values: {status_values}")
    print(f"Output file: {OUTPUT_CSV}")
    print("Sample rows:")
    for row in output.head(3).to_dict(orient="records"):
        print(f"  {row}")
    print("--- end report ---")


def main() -> int:
    df_raw = pd.read_excel(SOURCE_XLSX, sheet_name=SHEET_NAME, engine="openpyxl")
    output = build_customer_complaints()

    problematic = output[output["customer_id"] == ""]
    if len(problematic):
        print(f"WARNING: {len(problematic)} complaint row(s) without customer_id (kept in output).")

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    output.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

    _print_qa(len(df_raw), output, problematic)
    return 0


if __name__ == "__main__":
    sys.exit(main())
