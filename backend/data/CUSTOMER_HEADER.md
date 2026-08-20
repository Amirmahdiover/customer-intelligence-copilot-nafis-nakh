# Customer Header Pipeline

## Source

| Item | Value |
|------|-------|
| Source file | `data/DATASET.xlsx` |
| Sheet | `مشتریان` |
| Source columns | `Customer_ID`, `Customer_Segment`, `Customer_Status` |

The original Excel file is **never modified**.

## Output CSV

| Item | Value |
|------|-------|
| File | `data/customer_header.csv` |
| Columns | One column only: `customer_info` |
| Format | `Customer_ID,Customer_Segment,Customer_Status` |
| Row count | 644 (matches source sheet) |

Build command (from `backend/backend/backend`):

```bash
python scripts/build_customer_header.py
```

## Output Schema

Each row in `customer_header.csv`:

```
customer_info
C_010649,B,فعال
```

Field order is fixed: **customer_id → customer_segment → customer_status**, separated by `,`.

Null/empty values are stored as empty strings (no crash).

## API Endpoints

Base URL: `http://127.0.0.1:8000`  
Via Vite proxy: `/api/customers` → `http://127.0.0.1:8000/customers`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/customers` | All customers as `customer_info` |
| GET | `/customers/{customer_id}` | One customer by ID |

Data is loaded once at startup from `customer_header.csv` (in-memory list + ID index).

### Example: List all customers

**Request:** `GET /customers`

**Response:**

```json
{
  "customers": [
    { "customer_info": "C_009817,B,غیرفعال" },
    { "customer_info": "C_010119,C,غیرفعال" },
    { "customer_info": "C_010649,B,فعال" }
  ]
}
```

### Example: Single customer

**Request:** `GET /customers/C_010649`

**Response:**

```json
{
  "customer_info": "C_010649,B,فعال"
}
```

## Scope

This pipeline covers **customer identity header only**. Not included:

- Risk Score / Customer Health Score
- RFM / Machine Learning / Predictions
- Sales Analysis / CLV / Charts / Dashboard UI
- Frontend components / Status Scoring / Segment Analysis

Frontend must consume the API only — no CSV parsing or data cleaning in the browser.

## Files

| File | Role |
|------|------|
| `scripts/build_customer_header.py` | Extract 3 columns → write CSV |
| `data/customer_header.csv` | Derived output (644 rows) |
| `app/customer_header_store.py` | In-memory load + lookup |
| `app/main.py` | `GET /customers`, `GET /customers/{id}` |
