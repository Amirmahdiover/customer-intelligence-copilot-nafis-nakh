# -*- coding: utf-8 -*-
"""
مرحله ۷: ساخت پروفایل نهایی هر مشتری
------------------------------------------------------
API باید بتونه با فقط یک customer_id امتیاز بده. برای این کار،
آخرین snapshot موجود هر مشتری رو به‌عنوان «وضعیت فعلی» ذخیره می‌کنیم.

اجرا: python src/step7_profiles.py
"""
import os
import pandas as pd
from config import PROCESSED_DIR, MODEL_DIR


def main():
    df = pd.read_csv(os.path.join(PROCESSED_DIR, "dataset.csv"), parse_dates=["snapshot_date"])
    customers = pd.read_csv(os.path.join(PROCESSED_DIR, "customers.csv"))

    # آخرین snapshot هر مشتری = وضعیت فعلی او
    latest = df.sort_values("snapshot_date").groupby("customer_id").tail(1).copy()
    latest = latest.drop(columns=["y_retention", "y_collection", "y_loyalty"], errors="ignore")

    # افزودن اطلاعات هویتی برای نمایش در خروجی API
    latest = latest.merge(
        customers[["customer_id", "segment", "status", "location_id", "sales_rep_id"]],
        on="customer_id", how="left",
    )

    out = os.path.join(MODEL_DIR, "customer_profiles.csv")
    latest.to_csv(out, index=False, encoding="utf-8-sig")
    print(f"[OK] پروفایل {len(latest)} مشتری ذخیره شد -> {out}")
    print(f"     تاریخ snapshotها: {latest['snapshot_date'].min().date()} تا {latest['snapshot_date'].max().date()}")


if __name__ == "__main__":
    main()
