# Customer Financial Status Pipeline

Snapshot date: **2022-06-30** (records filtered with `Available_At <= snapshot`).

## 1. Source Files

| Dataset | Sheet | File |
|---------|-------|------|
| Sales | `فروش` | `DATASET.xlsx` |
| Collections | `وصول` | `DATASET.xlsx` |
| Customers | `مشتریان` | `DATASET.xlsx` |

## 2. Real Column Names

| Output concept | Sales column | Collections column | Customers column |
|----------------|--------------|--------------------|------------------|
| Invoice ID | `شماره فاکتور` | `شماره فاکتور` | — |
| Customer ID | `Customer_ID` | `Customer_ID` | `Customer_ID` |
| Invoice total | `مبلغ کل` | — | — |
| Collected amount | — | `مبلغ وصول` | — |
| Due date | — | `تاریخ سررسید` | — |
| Collection event date | — | `تاریخ رویداد وصول` | — |
| Returned check | — | `چک برگشتی` | — |
| Snapshot filter | `Available_At` | `Available_At` | — |
| Credit limit | — | — | `Credit_Limit` |
| Payment terms (not used for due date) | — | — | `Payment_Terms_Days` |

## 3. Customer Relationship

All financial rows join on `Customer_ID`. Final dataset is one row per customer from `مشتریان` with left-joins from invoice/collection aggregations.

## 4. Invoice Relationship

Sales lines are summed per `شماره فاکتور` → `invoice_total`. Collections are summed per `شماره فاکتور` → `amount_collected`. Join key: `invoice_id` = `شماره فاکتور`.

## 5. Outstanding Calculation

Per invoice: `invoice_balance = max(invoice_total - amount_collected, 0)`.

Per customer: `outstanding_balance = sum(invoice_balance)`.

Overpayments (`amount_collected > invoice_total`) are clipped to zero balance and reported in QA (905 invoices).

## 6. Not-Due Calculation

Due date is taken **directly from `تاریخ سررسید` in collections** (max per invoice). Never reconstructed from `Payment_Terms_Days`.

An invoice is not-due when: `outstanding_balance > 0` AND `due_date > snapshot`.

## 7. Returned Checks

Records where `چک برگشتی` = `بله`. Aggregated per customer: count and last event date (`تاریخ رویداد وصول`).

## 8. Credit Utilization

`credit_used_percent = outstanding_balance / credit_limit × 100`

Thresholds (from `app/config.py`):
- &lt; 60.0% → `safe`
- 60.0–85.0% → `warning`
- 85.0–100.0% → `critical`
- &gt; 100.0% → `over_limit`
- null limit → `unknown`

## 9. Delay Cost

Per collection row: `delay_days = event_date - due_date` (computed, not from `روز تأخیر`).

`delay_cost = amount × (ANNUAL_FINANCING_RATE / 365) × max(delay_days, 0)`

Early payments (`delay_days < 0`) contribute zero cost but are preserved in QA.

Default rate: `0.36` (configurable in `app/config.py`).

## 10. Output CSV

| File | Rows |
|------|------|
| `customer_financial_status.csv` | 644 |
| `customer_not_due_invoices.csv` | 0 |
| `customer_returned_checks.csv` | 93 |

## 11. Data Quality Summary

- Sales rows (post-filter): 52,935
- Collection rows (post-filter): 15,508
- Customers: 644
- Collections without matching sales invoice: 0
- Customer IDs not in master: 0
- Overpayment invoices: 905
- Open invoices: 3,884
- Past-due open: 2,428
- Not-due open: 0
- Customers with not-due invoices: 0 (0.00%)
- Customers with zero not-due: 644
- Prepayment customers (raw outstanding &lt; 0): 28
- Early-payment collection records: 427
- Positive-delay records: 14,084

## 12. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/customers/{customer_id}/financial` | Main financial status card data |
| GET | `/customers/{customer_id}/financial/not-due-invoices` | Not-due invoice details |
| GET | `/customers/{customer_id}/financial/returned-checks` | Returned check dates |

## 13. Sample Response

Customer `C_021985`:

```json
{
  "customer_id": "C_021985",
  "outstanding_balance": 3575.49,
  "not_due_invoices": { "count": 0 },
  "returned_checks": {
    "has_returned_check": false,
    "count": 0,
    "last_date": null
  },
  "credit": {
    "limit": 28000,
    "used_percent": 12.769607142857147,
    "remaining": 24424.51,
    "status": "safe"
  },
  "delay_cost": {
    "amount": 2308.37,
    "annual_financing_rate": 0.36
  }
}
```

## 14. Files

| File | Role |
|------|------|
| `scripts/build_customer_financial_status.py` | Build pipeline + QA |
| `app/config.py` | Rate and credit thresholds |
| `app/financial_store.py` | In-memory indexed store |
| `app/schemas.py` | Pydantic response models |
| `app/main.py` | FastAPI routes |

## 15. Frontend Integration

For customer `C_021985`:

```
GET /customers/C_021985/financial
GET /customers/C_021985/financial/not-due-invoices
GET /customers/C_021985/financial/returned-checks
```

(Vite proxy maps `/api` → backend root; direct backend paths omit `/api`.)
