# -*- coding: utf-8 -*-
"""تنظیمات پروژهٔ امتیاز موفقیت مذاکره"""
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
MODEL_DIR = os.path.join(BASE_DIR, "model")

os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

RAW_FILES = {
    "invoices": "فاکتورها-Table_1.csv",
    "sales": "فروش-Table_1.csv",
    "offers": "ا_فرها-Table_1.csv",
    "collections": "وصول-Table_1.csv",
    "basket_share": "سهم_سبد-Table_1.csv",
    "customers": "مشتریان-Table_1.csv",
    "crm": "تعاملات_CRM-Table_1.csv",
    "complaints": "شکایات-Table_1.csv",
    "dev_requests": "درخواست_توسعه-Table_1.csv",
    "actual_cost": "اجزای_هزینه_تحقق-Table_1.csv",
}

# افق پیش‌بینی
CHURN_WINDOW_DAYS = 90          # حفظ مشتری: خرید در ۹۰ روز آینده
COLLECTION_WINDOW_DAYS = 180    # وصول: رفتار پرداخت در ۱۸۰ روز آینده
LATE_THRESHOLD_DAYS = 30        # تأخیر بیش از این = «دیرکرد»

# snapshotها - محدود به قبل از شکاف دادهٔ ۲۰۲۳-۲۰۲۴
SNAPSHOT_START = "2020-06-01"
SNAPSHOT_END = "2022-03-01"

# وزن‌های پیش‌فرض امتیاز ترکیبی (قابل تغییر در API)
DEFAULT_WEIGHTS = {
    "collection": 0.25,
    "retention": 0.25,
    "loyalty": 0.25,
    "cash": 0.25,
}
