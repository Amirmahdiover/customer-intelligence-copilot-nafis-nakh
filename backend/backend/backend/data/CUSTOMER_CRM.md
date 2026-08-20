# Customer CRM Interactions Pipeline

## Source

| Item | Value |
|------|-------|
| Source file | `data/DATASET.xlsx` |
| Sheet | `تعاملات_CRM` |

### Real column mapping

| Output column | Source column |
|---------------|---------------|
| `customer_id` | `Customer_ID` |
| `interaction_type` | `Interaction_Type` |
| `summary_text` | `Summary_Text` |
| `updated_at` | `Updated_At` |
| `next_action` | `Next_Action` |
| `urgency` | Extracted from `Summary_Text` |

## Urgency extraction

Pattern (applied to `summary_text`, text is **not** rewritten):

```text
فوریت\s*[:：]\s*([^\s؛;،,\.]+)
```

Handles spacing variants such as `فوریت: مهم`, `فوریت : مهم`, `فوریت:مهم`.

Observed values: `عادی`, `مهم`, `فوری`. If no match → `null` / empty.

## Output CSV

| Item | Value |
|------|-------|
| File | `data/customer_crm_interactions.csv` |
| Rows | 4184 |
| Unique customers | 624 |
| Unmatched customer IDs | 0 |

Build command:

```bash
cd backend/backend/backend
python scripts/build_customer_crm_interactions.py
```

## Data quality (from last build)

| Metric | Count |
|--------|-------|
| Null customer_id | 0 |
| Null interaction_type | 0 |
| Null summary_text | 0 |
| Null updated_at | 0 |
| Null next_action | 0 |
| With urgency | 3600 |
| Without urgency | 584 |
| Header customers with 0 CRM | 20 |

**Unique interaction_type:** برنامه خرید، خدمات فنی، قیمت و تخفیف، نمونه محصول، وصول مطالبات، پیگیری سفارش، کیفیت محصول

## Latest interaction logic

For each `customer_id`, interactions are indexed and sorted by `updated_at` descending.
`GET /customers/{id}/crm` returns the first item (newest). Count is never hard-coded.

## API endpoints

Base URL: `http://127.0.0.1:8000` (Vite proxy: `/api/...`)

### Latest CRM (Next Action card)

`GET /customers/{customer_id}/crm`

```json
{
  "customer_id": "C_021985",
  "next_action": "پیگیری تلفنی",
  "interaction_type": "خدمات فنی",
  "summary_text": "نیاز به بازدید فنی و تنظیم پارامترهای مصرف مطرح شد. اقدام بعدی: پیگیری تلفنی؛ فوریت: مهم؛ کد پیگیری 0094.",
  "updated_at": "2022-01-17",
  "urgency": "مهم"
}
```

Customer with no CRM:

```json
{
  "customer_id": "CUST-001",
  "next_action": null,
  "interaction_type": null,
  "summary_text": null,
  "updated_at": null,
  "urgency": null
}
```

### All interactions

`GET /customers/{customer_id}/crm/interactions`

```json
{
  "customer_id": "C_021985",
  "interactions": [
    {
      "next_action": "پیگیری تلفنی",
      "interaction_type": "خدمات فنی",
      "summary_text": "نیاز به بازدید فنی و تنظیم پارامترهای مصرف مطرح شد. اقدام بعدی: پیگیری تلفنی؛ فوریت: مهم؛ کد پیگیری 0094.",
      "updated_at": "2022-01-17",
      "urgency": "مهم"
    }
  ]
}
```

Empty list if none: `{ "customer_id": "...", "interactions": [] }`

Invalid customer → `404` `{ "detail": "Customer 'X' not found" }`

## Frontend integration

For customer `C_021985`:

1. Next Action card: `GET /api/customers/C_021985/crm`
2. Expand / history: `GET /api/customers/C_021985/crm/interactions`

Frontend must not read the CSV, parse urgency, or pick the latest row.

## Scope

CRM interactions only. No Risk / RFM / ML / Complaints changes / Frontend UI.

## Files

| File | Role |
|------|------|
| `scripts/build_customer_crm_interactions.py` | Extract + urgency + CSV |
| `data/customer_crm_interactions.csv` | Derived output |
| `app/crm_store.py` | In-memory index by customer_id |
| `app/main.py` | `/crm` and `/crm/interactions` |
| `app/schemas.py` | Response models |
