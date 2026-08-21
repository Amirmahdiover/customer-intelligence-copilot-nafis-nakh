# Nafis Nakh — Customer Intelligence API
## بخش «بهینه‌سازی سود، بررسی هزینه و فرصت»

این API داده لازم برای کارت «بهینه‌سازی سود» در داشبورد مدیر فروش را فراهم می‌کند.
تمام محاسبات **Rule-based** هستند (تجمیع و فرمول‌های صریح) — هیچ مدل یادگیری ماشینی
در این نسخه استفاده نشده، پس همه اعداد قابل توضیح و ردیابی‌اند.

---

## ⚡ اجرای سریع (برای فرانت‌کار)

### روش ۱ — بدون Docker (سریع‌تر برای توسعه)

```bash
python3 -m venv .venv
source .venv/bin/activate        # ویندوز: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn src.api.main:app --reload --port 8000
```

سپس باز کنید: **http://localhost:8000/docs** (مستندات تعاملی Swagger)

### روش ۲ — با Docker

```bash
docker compose up --build
```

همان آدرس `http://localhost:8000/docs` در دسترس خواهد بود.

---

## 📍 Endpointها

### ۱. جزئیات کامل یک مشتری

```
GET /customers/{customer_id}/profit-optimization
```

مثال: `GET /customers/C_010649/profit-optimization`

<details>
<summary>نمونه پاسخ کامل (کلیک کنید)</summary>

```json
{
  "customer_id": "C_010649",
  "relationship_value_score": 75.4,
  "components": {
    "profitability": {
      "margin_pct": 18.48,
      "margin_abs": 2883618.0,
      "cost_confidence_pct": 14.0,
      "score": 90.7
    },
    "payment_behavior": {
      "avg_delay_days": 23.4,
      "score": 48.6
    },
    "volume_share": {
      "revenue_share_pct": 0.355,
      "revenue_total": 15602481.0,
      "score": 90.5
    },
    "service_cost": {
      "invoices_per_million_revenue": 1.5,
      "n_complaints": 0,
      "score": 92.9
    },
    "trend": {
      "growth_pct_yoy": 35.13,
      "score": 40.3
    }
  },
  "contribution_margin": {
    "margin_abs": 2883618.0,
    "margin_pct": 18.48,
    "cost_confidence_pct": 14.0
  },
  "revenue_vs_profit": {
    "revenue_rank_pct": 90.5,
    "profit_rank_pct": 94.2,
    "rank_gap": -3.7,
    "interpretation": "فروش و سود متناسب‌اند"
  }
}
```
</details>

### ۲. فهرست رتبه‌بندی همه مشتریان

```
GET /customers/profit-ranking?limit=50&ascending=true
```

- `ascending=true` → پایین‌ترین امتیازها اول (مشتریانی که نیازمند بررسی‌اند)
- `ascending=false` → بالاترین امتیازها اول (بهترین مشتریان)

```json
[
  {
    "customer_id": "C_682000",
    "relationship_value_score": 9.2,
    "revenue": 855.0,
    "margin_pct": 0.06
  }
]
```

---

## 🧭 راهنمای فیلدها برای طراحی UI

| فیلد JSON | معنی فارسی | نحوه نمایش پیشنهادی |
|---|---|---|
| `relationship_value_score` | امتیاز نهایی ارزش ادامه همکاری (۰-۱۰۰) | عدد بزرگ در بالای کارت + رنگ (قرمز<۴۰، زرد ۴۰-۷۰، سبز>۷۰) |
| `components.profitability.margin_pct` | درصد حاشیه سود | عدد با علامت ٪ |
| `components.profitability.margin_abs` | سود مطلق (ریال) | عدد فرمت‌شده با جداکننده هزار |
| `components.profitability.cost_confidence_pct` | چند درصد این عدد بر پایه هزینه واقعی است (نه برآوردی) | آیکون ⓘ با Tooltip — اگر زیر ۵۰٪ بود رنگ کم‌رنگ‌تر نشان بدهید |
| `components.payment_behavior.avg_delay_days` | میانگین روز تأخیر پرداخت | عدد + "روز"؛ منفی = پرداخت زودهنگام (خوب) |
| `components.volume_share.revenue_share_pct` | سهم این مشتری از کل فروش شرکت | درصد کوچک (اکثراً زیر ۱٪) |
| `components.service_cost.invoices_per_million_revenue` | تعداد فاکتور به ازای هر ۱ میلیون فروش | عدد — بالاتر = هزینه اداری بیشتر |
| `components.service_cost.n_complaints` | تعداد شکایت | عدد صحیح |
| `components.trend.growth_pct_yoy` | رشد فروش نسبت به سال قبل | ممکن است `null` باشد (وقتی داده کافی نیست) — در این حالت "نامشخص" نشان دهید |
| `contribution_margin.*` | همان اطلاعات سود، برای کارت جدا «حاشیه سود مشارکتی» | جدول یا کارت مستقل |
| `revenue_vs_profit.rank_gap` | فاصله رتبه فروش از رتبه سود | مثبت بزرگ = فروش بالا ولی سود پایین (هشدار) |
| `revenue_vs_profit.interpretation` | توضیح متنی آماده به فارسی | مستقیم زیر عدد نمایش بدهید |

### نکات مهم برای پیاده‌سازی فرانت

1. **هر مقداری که `null` برگردد یعنی داده کافی برای محاسبه نبوده** — لطفاً به‌جای نمایش `0` یا خالی، متن «داده کافی نیست» نشان دهید. مخصوصاً `trend.growth_pct_yoy` برای مشتریان تازه اغلب `null` است.

2. **`cost_confidence_pct` را جدی بگیرید.** اگر زیر ۵۰٪ بود، بهتر است کنار عدد سود یک نشانه بصری (مثلاً حاشیه نقطه‌چین یا آیکون هشدار) بگذارید — چون یعنی بیشتر آن عدد برآوردی است نه واقعی.

3. **طبق تصمیم پروژه، این بخش هیچ کارت «هشدار» یا «اقدام پیشنهادی» ندارد** — فقط اعداد خام نمایش داده می‌شوند. تصمیم‌گیری با مدیر فروش است.

---

## ⚙️ نکات فنی مهم

- **تاریخ Snapshot:** تمام محاسبات نسبت به `2022-06-30` انجام می‌شود (نه تاریخ امروز سیستم) — چون داده واقعی مشتریان تا همین تاریخ موجود است. این تاریخ در `src/config.py` قابل تغییر است.
- **بدون پایگاه‌داده:** در این نسخه، داده از فایل‌های CSV در پوشه `data/` خوانده می‌شود. برای اتصال به ERP واقعی، فقط لایه `src/loaders.py` باید عوض شود؛ بقیه کد دست‌نخورده می‌ماند.
- **کش:** داده‌ها یک‌بار در حافظه بارگذاری و کش می‌شوند (`lru_cache`). برای بارگذاری مجدد بعد از تغییر فایل CSV، سرور را ری‌استارت کنید.

---

## 📁 ساختار پروژه

```
app/
├── data/                          # فایل‌های CSV منبع
├── src/
│   ├── config.py                  # تاریخ Snapshot، وزن‌ها، نرخ‌ها
│   ├── loaders.py                 # خواندن و پاکسازی CSV
│   ├── features/
│   │   └── profit_optimization.py # همه محاسبات این بخش
│   └── api/
│       ├── main.py                # اپلیکیشن FastAPI
│       ├── schemas.py             # مدل‌های Pydantic (شکل JSON)
│       └── routers/
│           └── profit.py          # تعریف Endpointها
├── tests/
│   └── test_profit_optimization.py
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

## 🧮 فرمول امتیاز نهایی (برای کنجکاوهای فنی)

```
ارزش ادامه همکاری = (۳۰٪ × امتیاز سودآوری)
                   + (۲۵٪ × امتیاز خوش‌حسابی)
                   + (۲۰٪ × امتیاز حجم/سهم فروش)
                   + (۱۵٪ × امتیاز هزینه سرویس‌دهی — معکوس)
                   + (۱۰٪ × امتیاز روند)
```

هر مؤلفه با رتبه صدکی (Percentile Rank) بین مشتریان به عدد ۰ تا ۱۰۰ تبدیل می‌شود.
وزن‌ها در `src/config.py` قابل تغییر و کالیبراسیون‌اند.

⚠️ این وزن‌ها باید نهایتاً توسط تیم فروش/مالی نفیس‌نخ تأیید شوند — مقادیر فعلی
بر پایه تحلیل داده و منطق کسب‌وکار تنظیم شده‌اند، نه یک استاندارد ثابت.
