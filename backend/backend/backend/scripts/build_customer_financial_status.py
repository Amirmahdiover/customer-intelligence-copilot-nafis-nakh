"""Build customer financial status datasets from DATASET.xlsx (فروش, وصول, مشتریان).

Usage (from backend/backend/backend):
    python scripts/build_customer_financial_status.py

DATASET.xlsx is read-only; this script never modifies it.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SOURCE_XLSX = DATA_DIR / "DATASET.xlsx"

STATUS_CSV = DATA_DIR / "customer_financial_status.csv"
NOT_DUE_CSV = DATA_DIR / "customer_not_due_invoices.csv"
RETURNED_CHECKS_CSV = DATA_DIR / "customer_returned_checks.csv"
DOC_MD = DATA_DIR / "CUSTOMER_FINANCIAL.md"

SNAPSHOT_DATE = pd.Timestamp("2022-06-30")

SHEET_SALES = "فروش"
SHEET_COLLECTIONS = "وصول"
SHEET_CUSTOMERS = "مشتریان"

# Real source columns (verified from DATASET.xlsx)
COL_INVOICE = "شماره فاکتور"
COL_CUSTOMER = "Customer_ID"
COL_INVOICE_TOTAL = "مبلغ کل"
COL_SALE_DATE = "تاریخ"
COL_AVAILABLE = "Available_At"
COL_COLLECTED = "مبلغ وصول"
COL_DUE_DATE = "تاریخ سررسید"
COL_EVENT_DATE = "تاریخ رویداد وصول"
COL_RETURNED = "چک برگشتی"
COL_CREDIT_LIMIT = "Credit_Limit"
COL_PAYMENT_TERMS = "Payment_Terms_Days"

RETURNED_YES = "بله"

sys.path.insert(0, str(ROOT))
from app.config import ANNUAL_FINANCING_RATE, CREDIT_STATUS_THRESHOLDS  # noqa: E402


def _to_date(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce").dt.normalize()


def _filter_snapshot(df: pd.DataFrame, label: str) -> pd.DataFrame:
    available = _to_date(df[COL_AVAILABLE])
    filtered = df.loc[available <= SNAPSHOT_DATE].copy()
    print(f"  {label}: {len(filtered):,} / {len(df):,} rows after Available_At <= {SNAPSHOT_DATE.date()}")
    return filtered


def _credit_status(used_percent: float | None, credit_limit: float | None) -> str:
    if credit_limit is None or (isinstance(credit_limit, float) and np.isnan(credit_limit)):
        return "unknown"
    if used_percent is None or (isinstance(used_percent, float) and np.isnan(used_percent)):
        return "unknown"
    if used_percent > CREDIT_STATUS_THRESHOLDS["critical"]:
        return "over_limit"
    if used_percent >= CREDIT_STATUS_THRESHOLDS["warning"]:
        return "critical"
    if used_percent >= CREDIT_STATUS_THRESHOLDS["safe"]:
        return "warning"
    return "safe"


def _format_date(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    if isinstance(value, pd.Timestamp):
        if pd.isna(value):
            return ""
        return value.date().isoformat()
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return ""
    return parsed.date().isoformat()


def _print_section(title: str) -> None:
    print(f"\n{'=' * 60}\n{title}\n{'=' * 60}")


def build() -> dict:
    if not SOURCE_XLSX.exists():
        raise FileNotFoundError(f"Source file not found: {SOURCE_XLSX}")

    _print_section("Loading source sheets")
    sales_raw = pd.read_excel(SOURCE_XLSX, sheet_name=SHEET_SALES, engine="openpyxl")
    coll_raw = pd.read_excel(SOURCE_XLSX, sheet_name=SHEET_COLLECTIONS, engine="openpyxl")
    customers_raw = pd.read_excel(SOURCE_XLSX, sheet_name=SHEET_CUSTOMERS, engine="openpyxl")

    sales = _filter_snapshot(sales_raw, "Sales")
    coll = _filter_snapshot(coll_raw, "Collections")

    # --- Data Quality: Sales ---
    _print_section("Data Quality — Sales")
    print(f"Total invoices (raw rows): {len(sales):,}")
    print(f"Unique customers: {sales[COL_CUSTOMER].nunique():,}")
    print(f"Null Customer_ID: {sales[COL_CUSTOMER].isna().sum():,}")
    print(f"Null invoice number: {sales[COL_INVOICE].isna().sum():,}")
    print(f"Null invoice amount: {sales[COL_INVOICE_TOTAL].isna().sum():,}")
    dup_invoices = sales.groupby(COL_INVOICE).size()
    print(f"Duplicate invoice numbers (multi-line): {(dup_invoices > 1).sum():,}")

    # --- Data Quality: Collections ---
    _print_section("Data Quality — Collections")
    print(f"Total collection records: {len(coll):,}")
    print(f"Unique customers: {coll[COL_CUSTOMER].nunique():,}")
    print(f"Unique invoices: {coll[COL_INVOICE].nunique():,}")
    print(f"Null Customer_ID: {coll[COL_CUSTOMER].isna().sum():,}")
    print(f"Null invoice number: {coll[COL_INVOICE].isna().sum():,}")
    print(f"Null collection amount: {coll[COL_COLLECTED].isna().sum():,}")
    print(f"Null due dates: {coll[COL_DUE_DATE].isna().sum():,}")
    print(f"Null collection event dates: {coll[COL_EVENT_DATE].isna().sum():,}")
    print(f"Returned check records (بله): {(coll[COL_RETURNED] == RETURNED_YES).sum():,}")

    # --- Data Quality: Customers ---
    _print_section("Data Quality — Customers")
    print(f"Total customers: {len(customers_raw):,}")
    print(f"Null Customer_ID: {customers_raw[COL_CUSTOMER].isna().sum():,}")
    print(f"Duplicate Customer_ID: {customers_raw[COL_CUSTOMER].duplicated().sum():,}")
    print(f"Null Credit_Limit: {customers_raw[COL_CREDIT_LIMIT].isna().sum():,}")

    # --- Invoice-level aggregation ---
    _print_section("Invoice-level calculations")
    invoices = (
        sales.groupby([COL_INVOICE, COL_CUSTOMER], as_index=False)[COL_INVOICE_TOTAL]
        .sum()
        .rename(columns={COL_INVOICE: "invoice_id", COL_CUSTOMER: "customer_id", COL_INVOICE_TOTAL: "invoice_total"})
    )

    coll_agg = (
        coll.groupby(COL_INVOICE, as_index=False)
        .agg(
            amount_collected=(COL_COLLECTED, "sum"),
            due_date=(COL_DUE_DATE, "max"),
        )
        .rename(columns={COL_INVOICE: "invoice_id"})
    )
    coll_agg["due_date"] = _to_date(coll_agg["due_date"])

    merged = invoices.merge(coll_agg, on="invoice_id", how="left")
    merged["amount_collected"] = merged["amount_collected"].fillna(0.0)
    merged["raw_balance"] = merged["invoice_total"] - merged["amount_collected"]
    merged["outstanding_balance"] = merged["raw_balance"].clip(lower=0.0)

    overpay = merged[merged["amount_collected"] > merged["invoice_total"]]
    open_invoices = merged[merged["outstanding_balance"] > 0]
    past_due_open = open_invoices[
        open_invoices["due_date"].notna() & (open_invoices["due_date"] <= SNAPSHOT_DATE)
    ]
    not_due_open = open_invoices[
        open_invoices["due_date"].notna() & (open_invoices["due_date"] > SNAPSHOT_DATE)
    ]

    # --- Financial consistency ---
    _print_section("Financial Consistency Checks")
    sales_invoices = set(invoices["invoice_id"])
    coll_invoices = set(coll[COL_INVOICE].dropna())
    coll_without_sales = coll_invoices - sales_invoices
    print(f"Collections without matching Sales invoice: {len(coll_without_sales):,}")

    customer_ids = set(customers_raw[COL_CUSTOMER].dropna())
    sales_customers = set(sales[COL_CUSTOMER].dropna()) | set(coll[COL_CUSTOMER].dropna())
    customers_not_in_master = sales_customers - customer_ids
    print(f"Customer IDs in sales/collections not in Customer dataset: {len(customers_not_in_master):,}")

    multi_coll = coll.groupby(COL_INVOICE).size()
    print(f"Invoices with more than one collection record: {(multi_coll > 1).sum():,}")
    print(f"Overpayment invoices (collected > total): {len(overpay):,}")
    print(f"Negative raw invoice balance count: {(merged['raw_balance'] < 0).sum():,}")

    # --- Not-due invoice details ---
    not_due_details = not_due_open[
        ["customer_id", "invoice_id", "invoice_total", "amount_collected", "outstanding_balance", "due_date"]
    ].copy()
    not_due_details["due_date"] = not_due_details["due_date"].apply(_format_date)
    not_due_details = not_due_details.sort_values(["customer_id", "due_date"])

    # --- Returned checks ---
    returned = coll.loc[coll[COL_RETURNED] == RETURNED_YES, [COL_CUSTOMER, COL_EVENT_DATE]].copy()
    returned[COL_EVENT_DATE] = _to_date(returned[COL_EVENT_DATE])
    returned = returned.rename(columns={COL_CUSTOMER: "customer_id", COL_EVENT_DATE: "date"})
    returned["date"] = returned["date"].apply(_format_date)
    returned = returned.sort_values(["customer_id", "date"], ascending=[True, False])

    returned_agg = (
        returned.groupby("customer_id", as_index=False)
        .agg(
            returned_check_count=("date", "count"),
            last_returned_check_date=("date", "max"),
        )
    )
    returned_agg["has_returned_check"] = True

    # --- Delay cost per collection row ---
    coll_delay = coll.copy()
    coll_delay["_due"] = _to_date(coll_delay[COL_DUE_DATE])
    coll_delay["_event"] = _to_date(coll_delay[COL_EVENT_DATE])
    coll_delay["delay_days"] = (coll_delay["_event"] - coll_delay["_due"]).dt.days
    coll_delay["delay_cost"] = (
        coll_delay[COL_COLLECTED]
        * (ANNUAL_FINANCING_RATE / 365.0)
        * coll_delay["delay_days"].clip(lower=0)
    )
    delay_by_customer = (
        coll_delay.groupby(COL_CUSTOMER, as_index=False)["delay_cost"]
        .sum()
        .rename(columns={COL_CUSTOMER: "customer_id"})
    )

    delay_stats = {
        "early": int((coll_delay["delay_days"] < 0).sum()),
        "positive": int((coll_delay["delay_days"] > 0).sum()),
        "zero": int((coll_delay["delay_days"] == 0).sum()),
        "total_cost": float(coll_delay["delay_cost"].sum()),
    }

    # --- Customer-level aggregation ---
    outstanding_by_customer = (
        merged.groupby("customer_id", as_index=False)["outstanding_balance"].sum()
    )
    not_due_count = (
        not_due_open.groupby("customer_id", as_index=False)
        .size()
        .rename(columns={"size": "not_due_invoice_count"})
    )

    raw_outstanding = (
        merged.groupby("customer_id", as_index=False)["raw_balance"].sum()
        .rename(columns={"raw_balance": "raw_outstanding"})
    )

    customers = customers_raw[[COL_CUSTOMER, COL_CREDIT_LIMIT]].rename(
        columns={COL_CUSTOMER: "customer_id", COL_CREDIT_LIMIT: "credit_limit"}
    )

    status = customers.merge(outstanding_by_customer, on="customer_id", how="left")
    status["outstanding_balance"] = status["outstanding_balance"].fillna(0.0)
    status = status.merge(not_due_count, on="customer_id", how="left")
    status["not_due_invoice_count"] = status["not_due_invoice_count"].fillna(0).astype(int)
    status = status.merge(returned_agg, on="customer_id", how="left")
    status["has_returned_check"] = status["has_returned_check"].fillna(False).astype(bool)
    status["returned_check_count"] = status["returned_check_count"].fillna(0).astype(int)
    status["last_returned_check_date"] = status["last_returned_check_date"].fillna("")
    status = status.merge(delay_by_customer, on="customer_id", how="left")
    status["delay_cost"] = status["delay_cost"].fillna(0.0)
    status = status.merge(raw_outstanding, on="customer_id", how="left")
    status["raw_outstanding"] = status["raw_outstanding"].fillna(0.0)

    status["credit_used_percent"] = np.where(
        status["credit_limit"].notna() & (status["credit_limit"] > 0),
        status["outstanding_balance"] / status["credit_limit"] * 100.0,
        np.nan,
    )
    status["credit_remaining"] = np.where(
        status["credit_limit"].notna(),
        status["credit_limit"] - status["outstanding_balance"],
        np.nan,
    )
    status["credit_status"] = [
        _credit_status(u, l) for u, l in zip(status["credit_used_percent"], status["credit_limit"])
    ]

    # Drop internal QA column before export
    prepayment_customers = int((status["raw_outstanding"] < 0).sum())
    status_out = status.drop(columns=["raw_outstanding"]).copy()
    status_out["last_returned_check_date"] = status_out["last_returned_check_date"].replace("", np.nan)

    # --- Not-due card QA ---
    _print_section("Not-Due Invoice Data Quality")
    print(f"Total open invoices: {len(open_invoices):,}")
    print(f"Past-due open invoices: {len(past_due_open):,}")
    print(f"Not-due open invoices: {len(not_due_open):,}")
    customers_with_not_due = status_out.loc[status_out["not_due_invoice_count"] > 0, "customer_id"]
    customers_zero_not_due = status_out.loc[status_out["not_due_invoice_count"] == 0, "customer_id"]
    print(f"Customers with at least one not-due invoice: {len(customers_with_not_due):,}")
    print(f"Customers with zero not-due invoices: {len(customers_zero_not_due):,}")
    pct = len(customers_with_not_due) / len(status_out) * 100 if len(status_out) else 0
    print(f"Percentage of customers with not-due invoices: {pct:.2f}%")

    # --- Credit QA ---
    _print_section("Credit Utilization Data Quality")
    valid_util = status_out.loc[status_out["credit_used_percent"].notna(), "credit_used_percent"]
    print(f"Average credit utilization: {valid_util.mean():.2f}%" if len(valid_util) else "N/A")
    print(f"Median credit utilization: {valid_util.median():.2f}%" if len(valid_util) else "N/A")
    print(f"Maximum credit utilization: {valid_util.max():.2f}%" if len(valid_util) else "N/A")
    print(f"Customers above 100%: {(valid_util > 100).sum():,}")
    print(f"Customers above 85%: {(valid_util > 85).sum():,}")
    print(f"Customers with prepayment/negative raw outstanding: {prepayment_customers:,}")
    print(f"Customers without credit limit: {status_out['credit_limit'].isna().sum():,}")

    # --- Delay cost QA ---
    _print_section("Delay Cost Data Quality")
    delay_costs = status_out["delay_cost"]
    print(f"Total delay cost: {delay_costs.sum():,.2f}")
    print(f"Average delay cost per customer: {delay_costs.mean():,.2f}")
    print(f"Median delay cost per customer: {delay_costs.median():,.2f}")
    print(f"Maximum delay cost: {delay_costs.max():,.2f}")
    print(f"Total early-payment records (delay_days < 0): {delay_stats['early']:,}")
    print(f"Total positive-delay records: {delay_stats['positive']:,}")
    print(f"Total zero-delay records: {delay_stats['zero']:,}")

    # --- Write CSVs ---
    _print_section("Writing output files")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    status_out.to_csv(STATUS_CSV, index=False, encoding="utf-8-sig")
    not_due_details.to_csv(NOT_DUE_CSV, index=False, encoding="utf-8-sig")
    returned.to_csv(RETURNED_CHECKS_CSV, index=False, encoding="utf-8-sig")
    print(f"  {STATUS_CSV.name}: {len(status_out):,} rows")
    print(f"  {NOT_DUE_CSV.name}: {len(not_due_details):,} rows")
    print(f"  {RETURNED_CHECKS_CSV.name}: {len(returned):,} rows")

    return {
        "status": status_out,
        "not_due": not_due_details,
        "returned": returned,
        "qa": {
            "sales_rows": len(sales),
            "coll_rows": len(coll),
            "customers": len(customers_raw),
            "overpay_invoices": len(overpay),
            "coll_without_sales": len(coll_without_sales),
            "customers_not_in_master": len(customers_not_in_master),
            "open_invoices": len(open_invoices),
            "past_due_open": len(past_due_open),
            "not_due_open": len(not_due_open),
            "customers_with_not_due": len(customers_with_not_due),
            "customers_zero_not_due": len(customers_zero_not_due),
            "pct_not_due": pct,
            "prepayment_customers": prepayment_customers,
            "delay_stats": delay_stats,
        },
    }


def _write_docs(result: dict) -> None:
    status = result["status"]
    qa = result["qa"]

    sample_id = None
    sample_row = None
    for cid in ["C_021985", "C_050237", "C_703200"]:
        rows = status.loc[status["customer_id"] == cid]
        if len(rows):
            sample_id = cid
            sample_row = rows.iloc[0]
            break
    if sample_id is None and len(status):
        sample_row = status.iloc[0]
        sample_id = sample_row["customer_id"]

    sample_json = ""
    if sample_row is not None:
        limit = sample_row["credit_limit"]
        used = sample_row["credit_used_percent"]
        sample_json = f"""```json
{{
  "customer_id": "{sample_id}",
  "outstanding_balance": {sample_row["outstanding_balance"]:.2f},
  "not_due_invoices": {{ "count": {int(sample_row["not_due_invoice_count"])} }},
  "returned_checks": {{
    "has_returned_check": {str(sample_row["has_returned_check"]).lower()},
    "count": {int(sample_row["returned_check_count"])},
    "last_date": {repr(sample_row["last_returned_check_date"] if pd.notna(sample_row["last_returned_check_date"]) else None)}
  }},
  "credit": {{
    "limit": {limit if pd.notna(limit) else "null"},
    "used_percent": {used if pd.notna(used) else "null"},
    "remaining": {sample_row["credit_remaining"] if pd.notna(sample_row["credit_remaining"]) else "null"},
    "status": "{sample_row["credit_status"]}"
  }},
  "delay_cost": {{
    "amount": {sample_row["delay_cost"]:.2f},
    "annual_financing_rate": {ANNUAL_FINANCING_RATE}
  }}
}}
```"""

    doc = f"""# Customer Financial Status Pipeline

Snapshot date: **{SNAPSHOT_DATE.date()}** (records filtered with `Available_At <= snapshot`).

## 1. Source Files

| Dataset | Sheet | File |
|---------|-------|------|
| Sales | `{SHEET_SALES}` | `DATASET.xlsx` |
| Collections | `{SHEET_COLLECTIONS}` | `DATASET.xlsx` |
| Customers | `{SHEET_CUSTOMERS}` | `DATASET.xlsx` |

## 2. Real Column Names

| Output concept | Sales column | Collections column | Customers column |
|----------------|--------------|--------------------|------------------|
| Invoice ID | `{COL_INVOICE}` | `{COL_INVOICE}` | — |
| Customer ID | `{COL_CUSTOMER}` | `{COL_CUSTOMER}` | `{COL_CUSTOMER}` |
| Invoice total | `{COL_INVOICE_TOTAL}` | — | — |
| Collected amount | — | `{COL_COLLECTED}` | — |
| Due date | — | `{COL_DUE_DATE}` | — |
| Collection event date | — | `{COL_EVENT_DATE}` | — |
| Returned check | — | `{COL_RETURNED}` | — |
| Snapshot filter | `{COL_AVAILABLE}` | `{COL_AVAILABLE}` | — |
| Credit limit | — | — | `{COL_CREDIT_LIMIT}` |
| Payment terms (not used for due date) | — | — | `{COL_PAYMENT_TERMS}` |

## 3. Customer Relationship

All financial rows join on `{COL_CUSTOMER}`. Final dataset is one row per customer from `{SHEET_CUSTOMERS}` with left-joins from invoice/collection aggregations.

## 4. Invoice Relationship

Sales lines are summed per `{COL_INVOICE}` → `invoice_total`. Collections are summed per `{COL_INVOICE}` → `amount_collected`. Join key: `invoice_id` = `{COL_INVOICE}`.

## 5. Outstanding Calculation

Per invoice: `invoice_balance = max(invoice_total - amount_collected, 0)`.

Per customer: `outstanding_balance = sum(invoice_balance)`.

Overpayments (`amount_collected > invoice_total`) are clipped to zero balance and reported in QA ({qa["overpay_invoices"]} invoices).

## 6. Not-Due Calculation

Due date is taken **directly from `{COL_DUE_DATE}` in collections** (max per invoice). Never reconstructed from `{COL_PAYMENT_TERMS}`.

An invoice is not-due when: `outstanding_balance > 0` AND `due_date > snapshot`.

## 7. Returned Checks

Records where `{COL_RETURNED}` = `{RETURNED_YES}`. Aggregated per customer: count and last event date (`{COL_EVENT_DATE}`).

## 8. Credit Utilization

`credit_used_percent = outstanding_balance / credit_limit × 100`

Thresholds (from `app/config.py`):
- &lt; {CREDIT_STATUS_THRESHOLDS["safe"]}% → `safe`
- {CREDIT_STATUS_THRESHOLDS["safe"]}–{CREDIT_STATUS_THRESHOLDS["warning"]}% → `warning`
- {CREDIT_STATUS_THRESHOLDS["warning"]}–{CREDIT_STATUS_THRESHOLDS["critical"]}% → `critical`
- &gt; {CREDIT_STATUS_THRESHOLDS["critical"]}% → `over_limit`
- null limit → `unknown`

## 9. Delay Cost

Per collection row: `delay_days = event_date - due_date` (computed, not from `روز تأخیر`).

`delay_cost = amount × (ANNUAL_FINANCING_RATE / 365) × max(delay_days, 0)`

Early payments (`delay_days < 0`) contribute zero cost but are preserved in QA.

Default rate: `{ANNUAL_FINANCING_RATE}` (configurable in `app/config.py`).

## 10. Output CSV

| File | Rows |
|------|------|
| `customer_financial_status.csv` | {len(status):,} |
| `customer_not_due_invoices.csv` | {len(result["not_due"]):,} |
| `customer_returned_checks.csv` | {len(result["returned"]):,} |

## 11. Data Quality Summary

- Sales rows (post-filter): {qa["sales_rows"]:,}
- Collection rows (post-filter): {qa["coll_rows"]:,}
- Customers: {qa["customers"]:,}
- Collections without matching sales invoice: {qa["coll_without_sales"]:,}
- Customer IDs not in master: {qa["customers_not_in_master"]:,}
- Overpayment invoices: {qa["overpay_invoices"]:,}
- Open invoices: {qa["open_invoices"]:,}
- Past-due open: {qa["past_due_open"]:,}
- Not-due open: {qa["not_due_open"]:,}
- Customers with not-due invoices: {qa["customers_with_not_due"]:,} ({qa["pct_not_due"]:.2f}%)
- Customers with zero not-due: {qa["customers_zero_not_due"]:,}
- Prepayment customers (raw outstanding &lt; 0): {qa["prepayment_customers"]:,}
- Early-payment collection records: {qa["delay_stats"]["early"]:,}
- Positive-delay records: {qa["delay_stats"]["positive"]:,}

## 12. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/customers/{{customer_id}}/financial` | Main financial status card data |
| GET | `/customers/{{customer_id}}/financial/not-due-invoices` | Not-due invoice details |
| GET | `/customers/{{customer_id}}/financial/returned-checks` | Returned check dates |

## 13. Sample Response

Customer `{sample_id}`:

{sample_json}

## 14. Files

| File | Role |
|------|------|
| `scripts/build_customer_financial_status.py` | Build pipeline + QA |
| `app/config.py` | Rate and credit thresholds |
| `app/financial_store.py` | In-memory indexed store |
| `app/schemas.py` | Pydantic response models |
| `app/main.py` | FastAPI routes |

## 15. Frontend Integration

For customer `{sample_id}`:

```
GET /customers/{sample_id}/financial
GET /customers/{sample_id}/financial/not-due-invoices
GET /customers/{sample_id}/financial/returned-checks
```

(Vite proxy maps `/api` → backend root; direct backend paths omit `/api`.)
"""
    DOC_MD.write_text(doc, encoding="utf-8")
    print(f"  {DOC_MD.name} written")


def main() -> None:
    result = build()
    _write_docs(result)
    print("\nDone.")


if __name__ == "__main__":
    main()
