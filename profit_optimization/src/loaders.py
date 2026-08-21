"""
لایه بارگذاری و پاکسازی داده خام.
هیچ محاسبه کسب‌وکاری اینجا انجام نمی‌شود — فقط خواندن، تمیزکردن نوع داده،
و فیلتر جمعیت/زمان. منطق Feature در پوشه features/ است.
"""
from functools import lru_cache

import pandas as pd

from src import config


def to_num(series: pd.Series) -> pd.Series:
    """
    تبدیل ستون رشته‌ای شامل کاما و درصد به عدد.
    مثال: "2,210,661.82" -> 2210661.82
    ستون‌های مالی این دیتاست همگی به‌صورت رشته ذخیره شده‌اند.
    """
    return pd.to_numeric(
        series.astype(str).str.replace(",", "", regex=False).str.replace("%", "", regex=False),
        errors="coerce",
    )


def _filter_main_population(df: pd.DataFrame, id_col: str = "Customer_ID") -> pd.DataFrame:
    """فقط جمعیت اصلی مشتریان (شناسه C_...) را نگه می‌دارد."""
    return df[df[id_col].astype(str).str.startswith(config.CUSTOMER_ID_PREFIX)].copy()


def _filter_available_at(df: pd.DataFrame, snapshot: pd.Timestamp) -> pd.DataFrame:
    """
    فقط رکوردهایی را نگه می‌دارد که تا snapshot در دسترس بوده‌اند.
    این فیلتر ضد نشت داده (Data Leakage) است: هرگز نباید از اطلاعاتی
    استفاده کرد که در لحظه محاسبه هنوز در سیستم واقعی ثبت نشده بود.
    """
    if "Available_At" not in df.columns:
        return df
    avail = pd.to_datetime(df["Available_At"], errors="coerce")
    return df[avail <= snapshot].copy()


@lru_cache(maxsize=1)
def load_sales() -> pd.DataFrame:
    df = pd.read_csv(config.PATH_SALES, low_memory=False)
    df["تاریخ"] = pd.to_datetime(df["تاریخ"], errors="coerce")
    df["مبلغ کل"] = to_num(df["مبلغ کل"])
    df["مقدار"] = to_num(df["مقدار"])
    df["قیمت فی فروش"] = to_num(df["قیمت فی فروش"])
    df = _filter_main_population(df)
    df = _filter_available_at(df, config.SNAPSHOT_DATE)
    return df


@lru_cache(maxsize=1)
def load_cost_actual() -> pd.DataFrame:
    df = pd.read_csv(config.PATH_COST_ACTUAL, low_memory=False)
    df["هزینه کل به ازای واحد"] = to_num(df["هزینه کل به ازای واحد"])
    df = _filter_available_at(df, config.SNAPSHOT_DATE)
    return df


@lru_cache(maxsize=1)
def load_cost_estimate() -> pd.DataFrame:
    df = pd.read_csv(config.PATH_COST_ESTIMATE, low_memory=False)
    df["هزینه کل برآوردی به ازای واحد"] = to_num(df["هزینه کل برآوردی به ازای واحد"])
    return df


@lru_cache(maxsize=1)
def load_collections() -> pd.DataFrame:
    df = pd.read_csv(config.PATH_COLLECTIONS, low_memory=False)
    df["مبلغ وصول"] = to_num(df["مبلغ وصول"])
    df["تاریخ فاکتور"] = pd.to_datetime(df["تاریخ فاکتور"], errors="coerce")
    df["تاریخ سررسید"] = pd.to_datetime(df["تاریخ سررسید"], errors="coerce")
    df["تاریخ رویداد وصول"] = pd.to_datetime(df["تاریخ رویداد وصول"], errors="coerce")
    df = _filter_main_population(df)
    df = _filter_available_at(df, config.SNAPSHOT_DATE)
    # تأخیر واقعی همیشه از تاریخ‌ها بازسازی می‌شود، نه از ستون آماده «روز تأخیر»
    # چون آن ستون پرداخت‌های زودهنگام را در صفر قفل کرده (نگاه کنید به یادداشت‌های پروژه).
    df["delay_days"] = (df["تاریخ رویداد وصول"] - df["تاریخ سررسید"]).dt.days
    return df


@lru_cache(maxsize=1)
def load_complaints() -> pd.DataFrame:
    df = pd.read_csv(config.PATH_COMPLAINTS, low_memory=False)
    df["Created_At"] = pd.to_datetime(df["Created_At"], errors="coerce")
    df = _filter_main_population(df)
    df = _filter_available_at(df, config.SNAPSHOT_DATE)
    return df


@lru_cache(maxsize=1)
def load_customers() -> pd.DataFrame:
    df = pd.read_csv(config.PATH_CUSTOMERS, low_memory=False)
    if "Credit_Limit" in df.columns:
        df["Credit_Limit"] = to_num(df["Credit_Limit"])
    if "Payment_Terms_Days" in df.columns:
        df["Payment_Terms_Days"] = to_num(df["Payment_Terms_Days"])
    df = _filter_main_population(df)
    return df


def clear_cache() -> None:
    """پاک‌کردن کش بارگذاری — برای تست یا بارگذاری مجدد داده جدید."""
    load_sales.cache_clear()
    load_cost_actual.cache_clear()
    load_cost_estimate.cache_clear()
    load_collections.cache_clear()
    load_complaints.cache_clear()
    load_customers.cache_clear()
