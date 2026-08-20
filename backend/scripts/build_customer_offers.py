"""Extract commercial offers from DATASET.xlsx (sheet آفرها)
into customer_offers.csv.

Usage (from backend/):
    python scripts/build_customer_offers.py

DATASET.xlsx is read-only; this script never modifies it.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SOURCE_XLSX = DATA_DIR / "DATASET.xlsx"
HEADER_CSV = DATA_DIR / "customer_header.csv"
OUTPUT_CSV = DATA_DIR / "customer_offers.csv"

SHEET_NAME = "آفرها"

OUTPUT_COLUMNS = [
    "offer_id",
    "customer_id",
    "offer_date",
    "available_at",
    "product_id",
    "product_family",
    "base_price_per_unit",
    "offered_price_per_unit",
    "offer_discount_pct",
    "offer_type",
    "validity_days",
    "offer_reason",
    "result",
    "decision_at",
    "decision_available_at",
    "source_system",
]

COLUMN_MAP = {
    "Offer_ID": "offer_id",
    "Customer_ID": "customer_id",
    "Offer_Date": "offer_date",
    "Available_At": "available_at",
    "Product_ID": "product_id",
    "گروه کالا": "product_family",
    "Base_Price_per_unit": "base_price_per_unit",
    "Offered_Price_per_unit": "offered_price_per_unit",
    "Offer_Discount_Pct": "offer_discount_pct",
    "Offer_Type": "offer_type",
    "Validity_Days": "validity_days",
    "Offer_Reason": "offer_reason",
    "Result": "result",
    "Decision_At": "decision_at",
    "Decision_Available_At": "decision_available_at",
    "Source_System": "source_system",
}


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


def _format_float(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    try:
        return str(float(value))
    except (TypeError, ValueError):
        return ""


def _format_int(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    try:
        return str(int(float(value)))
    except (TypeError, ValueError):
        return ""


def build_customer_offers() -> pd.DataFrame:
    if not SOURCE_XLSX.exists():
        raise FileNotFoundError(f"Source file not found: {SOURCE_XLSX}")

    df = pd.read_excel(SOURCE_XLSX, sheet_name=SHEET_NAME, engine="openpyxl")
    missing = [c for c in COLUMN_MAP if c not in df.columns]
    if missing:
        raise ValueError(
            f"Missing required columns in sheet '{SHEET_NAME}': {missing}. "
            f"Found: {list(df.columns)}"
        )

    out = pd.DataFrame({
        "offer_id": df["Offer_ID"].map(_clean_str),
        "customer_id": df["Customer_ID"].map(_clean_str),
        "offer_date": df["Offer_Date"].map(_format_date),
        "available_at": df["Available_At"].map(_format_date),
        "product_id": df["Product_ID"].map(_clean_str),
        "product_family": df["گروه کالا"].map(_clean_str),
        "base_price_per_unit": df["Base_Price_per_unit"].map(_format_float),
        "offered_price_per_unit": df["Offered_Price_per_unit"].map(_format_float),
        "offer_discount_pct": df["Offer_Discount_Pct"].map(_format_float),
        "offer_type": df["Offer_Type"].map(_clean_str),
        "validity_days": df["Validity_Days"].map(_format_int),
        "offer_reason": df["Offer_Reason"].map(_clean_str),
        "result": df["Result"].map(_clean_str),
        "decision_at": df["Decision_At"].map(_format_date),
        "decision_available_at": df["Decision_Available_At"].map(_format_date),
        "source_system": df["Source_System"].map(_clean_str),
    })
    return out[OUTPUT_COLUMNS]


def _load_header_ids() -> set[str]:
    if not HEADER_CSV.exists():
        return set()
    hdr = pd.read_csv(HEADER_CSV, dtype=str)
    if "customer_info" not in hdr.columns:
        return set()
    return {
        str(v).split(",", 1)[0].strip()
        for v in hdr["customer_info"].fillna("")
        if str(v).strip()
    }


def _print_qa(source_rows: int, output: pd.DataFrame) -> None:
    header_ids = _load_header_ids()
    offer_ids = set(output.loc[output["customer_id"] != "", "customer_id"])
    unmatched = sorted(offer_ids - header_ids) if header_ids else []

    print("--- customer_offers build report ---")
    print(f"Source: {SOURCE_XLSX} (sheet: {SHEET_NAME})")
    print(f"Total offers: {len(output)}")
    print(f"Source row count: {source_rows}")
    print(f"Unique customers: {len(offer_ids)}")
    print(f"Customer IDs not matching header: {len(unmatched)}")
    if unmatched[:5]:
        print(f"  sample unmatched: {unmatched[:5]}")
    print("Result distribution:")
    for val, cnt in output["result"].value_counts().items():
        print(f"  {val}: {cnt}")
    print("Offer type distribution:")
    for val, cnt in output["offer_type"].value_counts().items():
        print(f"  {val}: {cnt}")
    print(f"Output file: {OUTPUT_CSV}")
    print("--- end report ---")


def main() -> int:
    df_raw = pd.read_excel(SOURCE_XLSX, sheet_name=SHEET_NAME, engine="openpyxl")
    output = build_customer_offers()

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    output.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

    _print_qa(len(df_raw), output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
