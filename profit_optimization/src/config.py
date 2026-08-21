"""
تنظیمات مرکزی پروژه.
هر عدد ثابت (نرخ، وزن، تاریخ) اینجا تعریف می‌شود، نه در کد پراکنده.
"""
from pathlib import Path
import pandas as pd

# ---------------------------------------------------------------------------
# مسیرها
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

PATH_SALES = DATA_DIR / "sales.csv"
PATH_COST_ACTUAL = DATA_DIR / "cost_actual.csv"
PATH_COST_ESTIMATE = DATA_DIR / "cost_estimate.csv"
PATH_COLLECTIONS = DATA_DIR / "collections.csv"
PATH_COMPLAINTS = DATA_DIR / "complaints.csv"
PATH_CUSTOMERS = DATA_DIR / "customers.csv"

# ---------------------------------------------------------------------------
# Snapshot: تاریخ مرجع محاسبات.
# داده واقعی جمعیت اصلی مشتریان (شناسه C_...) در بازه ۲۰۱۹-۱۲ تا ۲۰۲۲-۰۶ است.
# همه محاسبات به‌عنوان اینکه "امروز" این تاریخ است انجام می‌شوند.
# ---------------------------------------------------------------------------
SNAPSHOT_DATE = pd.Timestamp("2022-06-30")

# پیشوند شناسه مشتریانی که در تحلیل اصلی قرار می‌گیرند.
# (جمعیت دوم با پیشوند CUST- به عمد از این تحلیل کنار گذاشته می‌شود چون
#  تقریباً هیچ سابقه فروش ندارد و آمار آن گمراه‌کننده خواهد بود.)
CUSTOMER_ID_PREFIX = "C_"

# ---------------------------------------------------------------------------
# پارامترهای مالی
# ---------------------------------------------------------------------------
# نرخ سالانه فرضی برای محاسبه هزینه تأمین مالی ناشی از تأخیر پرداخت مشتری.
# این عدد باید توسط تیم مالی نفیس‌نخ تأیید/به‌روزرسانی شود.
FINANCING_ANNUAL_RATE = 0.36

# ---------------------------------------------------------------------------
# وزن‌های فرمول «ارزش ادامه همکاری»
# جمع باید ۱٫۰ شود. این اعداد باید با تیم فروش/مالی کالیبره شوند؛
# در حال حاضر بر پایه تحلیل داده و منطق کسب‌وکار تنظیم شده‌اند.
# ---------------------------------------------------------------------------
WEIGHT_PROFITABILITY = 0.30
WEIGHT_PAYMENT_BEHAVIOR = 0.25
WEIGHT_VOLUME_SHARE = 0.20
WEIGHT_SERVICE_COST = 0.15
WEIGHT_TREND = 0.10

RELATIONSHIP_VALUE_WEIGHTS = {
    "profitability": WEIGHT_PROFITABILITY,
    "payment_behavior": WEIGHT_PAYMENT_BEHAVIOR,
    "volume_share": WEIGHT_VOLUME_SHARE,
    "service_cost": WEIGHT_SERVICE_COST,
    "trend": WEIGHT_TREND,
}

assert abs(sum(RELATIONSHIP_VALUE_WEIGHTS.values()) - 1.0) < 1e-9, (
    "جمع وزن‌های فرمول ارزش ادامه همکاری باید دقیقاً ۱ باشد."
)

# بازه‌های زمانی مقایسه روند (به روز)
TREND_RECENT_WINDOW_DAYS = 365
TREND_PRIOR_WINDOW_DAYS = 365
