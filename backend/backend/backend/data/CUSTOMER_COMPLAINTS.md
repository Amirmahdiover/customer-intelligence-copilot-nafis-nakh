# Customer Complaints Pipeline

## Source

| Item | Value |
|------|-------|
| Source file | `data/DATASET.xlsx` |
| Sheet | `شکایات` |

### Real column mapping

| Output column | Source column |
|---------------|---------------|
| `customer_id` | `Customer_ID` |
| `Product_id` | `Product_ID` |
| `complaint_text` | `Complaint_Text` |
| `severity` | `Severity` |
| `created_at` | `Created_At` |
| `complaint_status` | `Complaint_Status` |
| `text_resolution` | `Resolution_Text` |

## Output CSV

| Item | Value |
|------|-------|
| File | `data/customer_complaints.csv` |
| Rows | 520 |
| Unique customers with complaints | 169 |
| Complaints without customer_id | 0 |

Build command:

```bash
cd backend/backend/backend
python scripts/build_customer_complaints.py
```

## Data quality

| Metric | Count |
|--------|-------|
| Null product IDs | 0 |
| Null complaint texts | 0 |
| Null severity | 0 |
| Null created dates | 0 |
| Null complaint statuses | 0 |
| Null resolution texts | 146 |

**Unique severity values:** `کم`, `متوسط`, `زیاد`, `بحرانی`

**Unique status values:** `پذیرفته‌شده`, `ردشده`, `نیازمند بررسی`, `درحال بررسی`, `بسته‌شده`

## Customer relationship

Each complaint row includes `customer_id`. The API indexes complaints as:

```
customer_id → [complaint, complaint, ...]
```

Example: `C_683666` has 37 complaints (computed from records, not hard-coded).

Customer existence is validated against `customer_header.csv` before returning data.

## API endpoints

Base URL: `http://127.0.0.1:8000` (via Vite proxy: `/api/...`)

### Count (dashboard card)

`GET /customers/{customer_id}/complaints/count`

```json
{
  "customer_id": "C_683666",
  "complaints_count": 37
}
```

### Details (table on click)

`GET /customers/{customer_id}/complaints`

```json
{
  "customer_id": "C_683666",
  "complaints_count": 37,
  "complaints": [
    {
      "Product_id": "P_RARE_Product_Family_03",
      "complaint_text": "در همبافت ...",
      "severity": "زیاد",
      "created_at": "2021-12-06",
      "complaint_status": "درحال بررسی",
      "text_resolution": null
    }
  ]
}
```

### Zero complaints (valid customer)

```json
{
  "customer_id": "C_010649",
  "complaints_count": 0,
  "complaints": []
}
```

### Invalid customer

`404 Not Found` — `{ "detail": "Customer 'X' not found" }`

## Frontend integration

For customer `C_683666`:

1. Initial card: `GET /api/customers/C_683666/complaints/count`
2. On expand/click: `GET /api/customers/C_683666/complaints`

Frontend must not read `customer_complaints.csv` directly.

## Files

| File | Role |
|------|------|
| `scripts/build_customer_complaints.py` | Extract + clean + write CSV |
| `data/customer_complaints.csv` | Derived output |
| `app/complaint_store.py` | In-memory index by customer_id |
| `app/main.py` | Count + list endpoints |
| `app/schemas.py` | Response models |
