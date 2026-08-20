"""Extract CRM interactions from DATASET.xlsx (sheet تعاملات_CRM)
into customer_crm_interactions.csv, including urgency parsed from Summary_Text.

Usage (from backend/backend/backend):
    python scripts/build_customer_crm_interactions.py

DATASET.xlsx is read-only; this script never modifies it.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SOURCE_XLSX = DATA_DIR / "DATASET.xlsx"
HEADER_CSV = DATA_DIR / "customer_header.csv"
OUTPUT_CSV = DATA_DIR / "customer_crm_interactions.csv"

SHEET_NAME = "تعاملات_CRM"

SRC_CUSTOMER_ID = "Customer_ID"
SRC_INTERACTION_TYPE = "Interaction_Type"
SRC_SUMMARY = "Summary_Text"
SRC_UPDATED = "Updated_At"
SRC_NEXT_ACTION = "Next_Action"

OUTPUT_COLUMNS = [
    "customer_id",
    "interaction_type",
    "summary_text",
    "updated_at",
    "next_action",
    "urgency",
]

URGENCY_RE = re.compile(r"فوریت\s*[:：]\s*([^\s؛;،,\.]+)", re.UNICODE)


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


def extract_urgency(summary_text: str) -> str:
    if not summary_text:
        return ""
    match = URGENCY_RE.search(summary_text)
    return match.group(1).strip() if match else ""


def build_customer_crm_interactions() -> pd.DataFrame:
    if not SOURCE_XLSX.exists():
        raise FileNotFoundError(f"Source file not found: {SOURCE_XLSX}")

    df = pd.read_excel(SOURCE_XLSX, sheet_name=SHEET_NAME, engine="openpyxl")
    required = [
        SRC_CUSTOMER_ID,
        SRC_INTERACTION_TYPE,
        SRC_SUMMARY,
        SRC_UPDATED,
        SRC_NEXT_ACTION,
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(
            f"Missing required columns in sheet '{SHEET_NAME}': {missing}. "
            f"Found: {list(df.columns)}"
        )

    summary = df[SRC_SUMMARY].map(_clean_str)
    out = pd.DataFrame({
        "customer_id": df[SRC_CUSTOMER_ID].map(_clean_str),
        "interaction_type": df[SRC_INTERACTION_TYPE].map(_clean_str),
        "summary_text": summary,
        "updated_at": df[SRC_UPDATED].map(_format_date),
        "next_action": df[SRC_NEXT_ACTION].map(_clean_str),
        "urgency": summary.map(extract_urgency),
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
    crm_ids = set(output.loc[output["customer_id"] != "", "customer_id"])
    unmatched = sorted(crm_ids - header_ids) if header_ids else []

    null_counts = {col: int((output[col] == "").sum()) for col in OUTPUT_COLUMNS}
    with_urgency = int((output["urgency"] != "").sum())
    without_urgency = int((output["urgency"] == "").sum())
    urgency_values = sorted(output.loc[output["urgency"] != "", "urgency"].unique().tolist())
    type_values = sorted(
        output.loc[output["interaction_type"] != "", "interaction_type"].unique().tolist()
    )

    vc = output.loc[output["customer_id"] != "", "customer_id"].value_counts()
    customers_one = int((vc == 1).sum())
    customers_multi = int((vc > 1).sum())
    header_zero = len(header_ids - crm_ids) if header_ids else None

    print("--- customer_crm_interactions build report ---")
    print(f"Source: {SOURCE_XLSX} (sheet: {SHEET_NAME})")
    print("Source column mapping:")
    print(f"  customer_id      <- {SRC_CUSTOMER_ID}")
    print(f"  interaction_type <- {SRC_INTERACTION_TYPE}")
    print(f"  summary_text     <- {SRC_SUMMARY}")
    print(f"  updated_at       <- {SRC_UPDATED}")
    print(f"  next_action      <- {SRC_NEXT_ACTION}")
    print(f"  urgency          <- extracted from {SRC_SUMMARY}")
    print(f"Total CRM interactions: {len(output)}")
    print(f"Source row count: {source_rows}")
    print(f"Unique customers: {len(crm_ids)}")
    print(f"Interactions without customer_id: {null_counts['customer_id']}")
    print(f"Customer IDs not matching Customer Dataset: {len(unmatched)}")
    if unmatched[:5]:
        print(f"  sample unmatched: {unmatched[:5]}")
    for col in OUTPUT_COLUMNS:
        print(f"Null/empty {col}: {null_counts[col]}")
    print(f"Interactions with detected urgency: {with_urgency}")
    print(f"Interactions without detected urgency: {without_urgency}")
    print(f"Unique urgency values: {urgency_values}")
    print(f"Unique interaction_type values: {type_values}")
    print(f"Customers with 1 CRM interaction: {customers_one}")
    print(f"Customers with multiple CRM interactions: {customers_multi}")
    if header_zero is not None:
        print(f"Customers in header with 0 CRM interactions: {header_zero}")
    print(f"Output file: {OUTPUT_CSV}")
    print("Urgency extraction samples:")
    samples = output[output["urgency"] != ""].head(3)
    for row in samples.to_dict(orient="records"):
        print(f"  SUMMARY: {row['summary_text'][:120]}...")
        print(f"  EXTRACTED URGENCY: {row['urgency']}")
    print("--- end report ---")


def main() -> int:
    df_raw = pd.read_excel(SOURCE_XLSX, sheet_name=SHEET_NAME, engine="openpyxl")
    output = build_customer_crm_interactions()

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    output.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

    _print_qa(len(df_raw), output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
