"""Extract Customer_ID, Customer_Segment, Customer_Status from DATASET.xlsx (sheet مشتریان)
and write data/customer_header.csv with a single combined customer_info column.

Usage (from backend/backend/backend):
    python scripts/build_customer_header.py

DATASET.xlsx is read-only; this script never modifies it.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SOURCE_XLSX = DATA_DIR / "DATASET.xlsx"
OUTPUT_CSV = DATA_DIR / "customer_header.csv"

SHEET_NAME = "مشتریان"
COL_ID = "Customer_ID"
COL_SEGMENT = "Customer_Segment"
COL_STATUS = "Customer_Status"
REQUIRED_COLUMNS = [COL_ID, COL_SEGMENT, COL_STATUS]

EXPECTED_SEGMENTS = {"A", "B", "C"}
EXPECTED_STATUSES = {"فعال", "غیرفعال"}


def _clean_cell(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return str(value).strip()


def build_customer_header() -> pd.DataFrame:
    if not SOURCE_XLSX.exists():
        raise FileNotFoundError(f"Source file not found: {SOURCE_XLSX}")

    df = pd.read_excel(SOURCE_XLSX, sheet_name=SHEET_NAME, engine="openpyxl")
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(
            f"Missing required columns in sheet '{SHEET_NAME}': {missing}. "
            f"Found columns: {list(df.columns)}"
        )

    extracted = df[REQUIRED_COLUMNS].copy()
    for col in REQUIRED_COLUMNS:
        extracted[col] = extracted[col].map(_clean_cell)

    extracted["customer_info"] = (
        extracted[COL_ID] + "," + extracted[COL_SEGMENT] + "," + extracted[COL_STATUS]
    )

    return extracted[["customer_info"]]


def _report_anomalies(df_raw: pd.DataFrame) -> None:
    segments = df_raw[COL_SEGMENT].map(_clean_cell)
    statuses = df_raw[COL_STATUS].map(_clean_cell)

    bad_segments = segments[(segments != "") & (~segments.isin(EXPECTED_SEGMENTS))]
    bad_statuses = statuses[(statuses != "") & (~statuses.isin(EXPECTED_STATUSES))]

    if len(bad_segments):
        print(f"Anomaly: {len(bad_segments)} row(s) with unexpected Customer_Segment values:")
        for val, count in bad_segments.value_counts().items():
            print(f"  - {val!r}: {count}")

    if len(bad_statuses):
        print(f"Anomaly: {len(bad_statuses)} row(s) with unexpected Customer_Status values:")
        for val, count in bad_statuses.value_counts().items():
            print(f"  - {val!r}: {count}")


def _print_qa(source_rows: int, output: pd.DataFrame, df_raw: pd.DataFrame) -> None:
    null_id = df_raw[COL_ID].isna().sum() + (df_raw[COL_ID].map(_clean_cell) == "").sum()
    null_segment = df_raw[COL_SEGMENT].isna().sum() + (df_raw[COL_SEGMENT].map(_clean_cell) == "").sum()
    null_status = df_raw[COL_STATUS].isna().sum() + (df_raw[COL_STATUS].map(_clean_cell) == "").sum()

    print("--- customer_header build report ---")
    print(f"Source: {SOURCE_XLSX} (sheet: {SHEET_NAME})")
    print(f"Source columns used: {REQUIRED_COLUMNS}")
    print(f"Source row count: {source_rows}")
    print(f"Output row count: {len(output)}")
    print(f"Null/empty Customer_ID count: {null_id}")
    print(f"Null/empty Customer_Segment count: {null_segment}")
    print(f"Null/empty Customer_Status count: {null_status}")
    print(f"Output file: {OUTPUT_CSV}")
    print("Sample rows:")
    for row in output["customer_info"].head(5):
        print(f"  {row!r}")
    print("--- end report ---")


def main() -> int:
    df_raw = pd.read_excel(SOURCE_XLSX, sheet_name=SHEET_NAME, engine="openpyxl")
    source_rows = len(df_raw)

    _report_anomalies(df_raw)

    output = build_customer_header()
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    output.to_csv(OUTPUT_CSV, index=False)

    _print_qa(source_rows, output, df_raw)
    return 0


if __name__ == "__main__":
    sys.exit(main())
