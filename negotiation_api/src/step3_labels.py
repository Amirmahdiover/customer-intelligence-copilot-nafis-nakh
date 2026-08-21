# -*- coding: utf-8 -*-
"""
مرحله ۳: ساخت Labelها برای سه مدل
------------------------------------------------------
۱. label وصول    : آیا فاکتورهای ۱۸۰ روز آینده با تأخیر بیش از حد آستانه وصول شدن؟
۲. label حفظ     : آیا مشتری در ۹۰ روز آینده خرید کرد؟
۳. label وفاداری : میانگین سهم سبد در ۹۰ روز آینده (متغیر پیوسته)

هر سه فقط از دادهٔ *بعد از* snapshot استفاده می‌کنن — این تنها جاییه که دیدن آینده مجازه.
"""
import numpy as np
import pandas as pd
from config import CHURN_WINDOW_DAYS, COLLECTION_WINDOW_DAYS, LATE_THRESHOLD_DAYS


def label_retention(snapshot_date, customer_ids, sales):
    """churn=1 اگر در ۹۰ روز آینده خریدی نبوده. retention_label = 1 - churn"""
    end = snapshot_date + pd.Timedelta(days=CHURN_WINDOW_DAYS)
    future = sales[(sales["sale_date"] > snapshot_date) & (sales["sale_date"] <= end)]
    active = set(future["customer_id"].unique())
    return pd.DataFrame({
        "customer_id": customer_ids,
        "y_retention": [1 if c in active else 0 for c in customer_ids],
    })


def label_collection(snapshot_date, customer_ids, collections):
    """
    y_collection = 1 اگر مشتری فاکتورهای ۱۸۰ روز آینده رو به‌موقع (تأخیر <= آستانه)
    و بدون چک برگشتی وصول کرده باشه.
    مشتری‌هایی که در این بازه هیچ فاکتوری ندارن، NaN می‌گیرن و از train حذف میشن.
    """
    end = snapshot_date + pd.Timedelta(days=COLLECTION_WINDOW_DAYS)
    fut = collections[(collections["invoice_date"] > snapshot_date) &
                      (collections["invoice_date"] <= end)]
    if fut.empty:
        return pd.DataFrame({"customer_id": customer_ids, "y_collection": np.nan})

    agg = fut.groupby("customer_id").agg(
        mean_delay=("delay_days", "mean"),
        any_bounce=("bounced_check", "max"),
    )
    agg["y_collection"] = (
        (agg["mean_delay"] <= LATE_THRESHOLD_DAYS) & (agg["any_bounce"] == 0)
    ).astype(int)

    out = pd.DataFrame({"customer_id": customer_ids})
    return out.merge(agg[["y_collection"]], left_on="customer_id", right_index=True, how="left")


def label_loyalty(snapshot_date, customer_ids, basket_share):
    """
    y_loyalty = میانگین سهم سبد در ۹۰ روز آیندهٔ snapshot (عدد پیوستهٔ ۰ تا ۱).
    مشتری‌های بدون دادهٔ سهم سبد در آینده، NaN می‌گیرن.
    """
    end = snapshot_date + pd.Timedelta(days=CHURN_WINDOW_DAYS)
    fut = basket_share[(basket_share["month_end"] > snapshot_date) &
                       (basket_share["month_end"] <= end)]
    if fut.empty:
        return pd.DataFrame({"customer_id": customer_ids, "y_loyalty": np.nan})

    agg = fut.groupby("customer_id")["wallet_share"].mean().rename("y_loyalty")
    out = pd.DataFrame({"customer_id": customer_ids})
    return out.merge(agg, left_on="customer_id", right_index=True, how="left")
