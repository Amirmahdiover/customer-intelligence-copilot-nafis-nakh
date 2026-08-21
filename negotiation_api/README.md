# Negotiation Success Score API

API محاسبهٔ «امتیاز موفقیت مذاکره» با هر مشتری، بر پایهٔ ۴ محور.
مدل‌ها از قبل train شده‌اند — برای اجرا فقط نصب و run کافیست.

---

## اجرای سریع

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

مستندات تعاملی (Swagger): `http://localhost:8000/docs`

### با Docker

```bash
docker build -t negotiation-api .
docker run -p 8000:8000 negotiation-api
```

---

## ساختار امتیاز

```
Negotiation_Score = (w₁·Collection + w₂·Retention + w₃·Loyalty + w₄·Cash) / Σw × 100
```

| محور | روش | کیفیت |
|---|---|---|
| **Retention** (حفظ مشتری) | مدل ML — Logistic Regression | **AUC = 0.882** ✅ قوی |
| **Loyalty** (وفاداری/سهم سبد) | مدل ML — Ridge Regression | **R² = 0.398** ⚠️ متوسط |
| **Collection** (سلامت وصول) | کارت امتیاز قاعده‌محور | ⚠️ توصیفی، نه پیش‌بینانه |
| **Cash** (نقدینگی) | کارت امتیاز قاعده‌محور | ⚠️ توصیفی |

وزن پیش‌فرض هر محور ۰.۲۵ است و **در هر درخواست قابل تغییر** است.

---

## Endpointها

### `GET /health`
بررسی سلامت سرویس.

### `GET /model-info`
معیارهای عملکرد مدل‌ها و فهرست محدودیت‌های شناخته‌شده.

### `GET /customers?limit=50&offset=0`
فهرست مشتریان موجود (۶۰۰ مشتری).

### `GET /score/{customer_id}`
امتیاز کامل یک مشتری با تفکیک محورها.

پارامترهای اختیاری وزن: `w_collection`, `w_retention`, `w_loyalty`, `w_cash`

```bash
curl "http://localhost:8000/score/C_551361"

# با وزن‌های سفارشی (اولویت نقدینگی)
curl "http://localhost:8000/score/C_551361?w_cash=0.7&w_retention=0.1&w_loyalty=0.1&w_collection=0.1"
```

**نمونهٔ خروجی:**
```json
{
  "customer_id": "C_551361",
  "negotiation_score": 69.41,
  "recommendation": "شانس موفقیت متوسط - نیازمند آماده‌سازی و امتیاز متقابل. ضعیف‌ترین محور: سلامت وصول (49%)",
  "pillars": {
    "collection": {"score": 0.49, "weight": 0.25, "contribution": 0.1225,
                   "method": "rule_based_scorecard", "note": "سابقهٔ پرداخت متوسط",
                   "confidence": "medium"},
    "retention":  {"score": 0.99, "weight": 0.25, "contribution": 0.2475,
                   "method": "ml_model", "note": "مدل Logistic Regression، AUC=0.8823",
                   "confidence": "high"},
    "loyalty":    {"score": 0.49, "...": "..."},
    "cash":       {"score": 0.80, "...": "..."}
  },
  "customer_info": {"segment": "A", "status": "فعال", "sales_rep_id": "REP-005",
                    "location_id": "LOC-003", "snapshot_date": "2022-03-01"},
  "key_drivers": [
    "✓ خرید اخیر (12 روز پیش) - رابطهٔ فعال",
    "✓ 85% خریدها نقدی"
  ],
  "warnings": []
}
```

### `GET /score/rank/top?limit=20`
رتبه‌بندی همهٔ مشتریان — مناسب برای جدول اولویت‌بندی داشبورد.
فیلتر اختیاری: `&segment=A`

### `POST /score/batch`
امتیازدهی گروهی.
```json
{
  "customer_ids": ["C_551361", "C_633661"],
  "weights": {"collection": 0.25, "retention": 0.25, "loyalty": 0.25, "cash": 0.25}
}
```

### `POST /score/manual`
امتیازدهی مشتری جدیدی که در پایگاه داده نیست (فیچرها را دستی می‌دهید).
```json
{
  "features": {"recency_days": 15, "freq_365d": 22, "avg_delay_days": 8,
               "wallet_share": 0.42, "cash_ratio_365d": 0.85, "has_collection_history": 1},
  "weights": {"collection": 0.25, "retention": 0.25, "loyalty": 0.25, "cash": 0.25}
}
```

---

## نمونهٔ فراخوانی از فرانت‌اند

```javascript
const API = "http://localhost:8000";  // یا آدرس سرور production

// امتیاز یک مشتری
const res = await fetch(`${API}/score/C_551361`);
const data = await res.json();
console.log(data.negotiation_score, data.recommendation);

// با وزن‌های سفارشی
const params = new URLSearchParams({
  w_collection: 0.4, w_retention: 0.3, w_loyalty: 0.2, w_cash: 0.1
});
const res2 = await fetch(`${API}/score/C_551361?${params}`);

// جدول رتبه‌بندی
const res3 = await fetch(`${API}/score/rank/top?limit=20`);
const { results } = await res3.json();
```

---

## بازآموزی مدل با دادهٔ جدید

فایل‌های CSV جدید را در `data/raw/` بگذارید (با همان نام‌ها)، سپس:

```bash
cd src
python step1_extract.py        # استخراج و پاکسازی
python step4_build_dataset.py  # ساخت فیچر + label روی snapshotهای ماهانه
python step5_train.py          # آموزش و ارزیابی مدل‌ها
python step7_profiles.py       # ساخت پروفایل مشتریان برای API
```

فایل `src/config.py` تنظیمات کلیدی را دارد: بازهٔ snapshotها، پنجرهٔ churn، آستانهٔ تأخیر پرداخت.

---

## ⚠️ محدودیت‌های شناخته‌شده — مهم

این موارد در تحلیل دادهٔ واقعی کشف شدند و باید در تصمیم‌گیری لحاظ شوند:

1. **شکاف داده ۲۰۲۳-۲۰۲۴**: تراکنش‌ها در این دو سال کاملاً صفرند. مدل روی بازهٔ ۲۰۲۰-۰۶ تا ۲۰۲۲-۰۳ آموزش دیده و پروفایل مشتریان به تاریخ ۲۰۲۲-۰۳ است. برای استفادهٔ عملیاتی، داده باید به‌روز شود.

2. **محور وصول مدل ML ندارد**: تست شد و AUC = 0.537 (تقریباً تصادفی) به‌دست آمد. همبستگی تأخیر پرداخت گذشتهٔ هر مشتری با آیندهٔ خودش فقط **۰.۱۰** است — یعنی رفتار پرداخت در این دیتاست قابل پیش‌بینی نیست. به‌جای ادعای پیش‌بینی، این محور به‌صورت کارت امتیاز شفاف از رفتار *گذشته* ارائه می‌شود.

3. **ستون `Result` فایل آفرها استفاده نشده**: به‌عنوان label مستقیم «موفقیت مذاکره» تست شد و سیگنالی نداشت (LogReg AUC = 0.546، GBM AUC = 0.504). نرخ قبول در تمام برش‌ها (تخفیف، نوع پیشنهاد، سگمنت مشتری) تقریباً ثابت ۲۵٪ بود و همبستگی نرخ قبول گذشتهٔ مشتری با آیندهٔ خودش ۰.۰۳ بود.

4. **مدل وفاداری R² = 0.40**: برای **رتبه‌بندی نسبی** مشتریان مناسب است، اما برای پیش‌بینی عدد دقیق سهم سبد نه.

5. **دادهٔ ۲۰۲۵-۲۰۲۶ فرمت متفاوت دارد**: ۵۲ رکورد با شناسهٔ `CUST-003` به‌جای `C_050237` (احتمالاً ERP جدید). خارج از دامنهٔ آموزش است.

6. **تاریخ‌های شمسی**: ۲۰ مشتری `Relationship_Start_Date` شمسی داشتند (`1395/08/12`) که در `step1_extract.py` تبدیل می‌شوند.

7. **فایل‌های استفاده‌نشده**: `سیگنال_بازار` (بدون `Customer_ID`)، `کیفیت_لات` (۱۳۸۵۳ «قبول» در برابر ۱۲ «رد» — بدون واریانس)، `همبافت_لات`، `اتصال_شکایت` (جدول واسط).

---

## ساختار پروژه

```
negotiation_api/
├── app/main.py              # FastAPI - همهٔ endpointها
├── src/
│   ├── config.py            # تنظیمات
│   ├── step1_extract.py     # استخراج + تبدیل تاریخ شمسی
│   ├── step2_features.py    # فیچرسازی ۴ محور (ضد leakage)
│   ├── step3_labels.py      # ساخت labelها
│   ├── step4_build_dataset.py
│   ├── step5_train.py       # آموزش + ارزیابی
│   ├── step7_profiles.py    # پروفایل مشتریان
│   └── scoring.py           # کارت‌های امتیاز قاعده‌محور
├── model/                   # مدل‌های train شده + پروفایل‌ها
├── data/raw/                # CSVهای خام
├── data/processed/          # خروجی میانی
├── requirements.txt
└── Dockerfile
```
