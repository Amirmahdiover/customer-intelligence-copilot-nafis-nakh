# -*- coding: utf-8 -*-
"""
مرحله ۱: استخراج و پاکسازی داده‌های خام
اجرا: python src/step1_extract.py
"""
import os
import pandas as pd
from config import RAW_DIR, PROCESSED_DIR, RAW_FILES


def read_raw(name):
    return pd.read_csv(os.path.join(RAW_DIR, RAW_FILES[name]), encoding="utf-8-sig", low_memory=False)


def to_number(series):
    """تبدیل رشته‌های عددی فارسی/انگلیسی با کاما و درصد به float"""
    return (
        series.astype(str)
        .str.replace(",", "", regex=False)
        .str.replace("%", "", regex=False)
        .replace({"nan": None, "None": None, "": None})
        .astype(float)
    )


def jalali_to_gregorian(jy, jm, jd):
    """تبدیل تاریخ شمسی به میلادی (الگوریتم استاندارد، بدون نیاز به کتابخانهٔ خارجی)"""
    jy += 1595
    days = -355668 + (365 * jy) + ((jy // 33) * 8) + (((jy % 33) + 3) // 4) + jd
    days += (jm - 1) * 31 if jm < 7 else ((jm - 7) * 30) + 186
    gy = 400 * (days // 146097)
    days %= 146097
    if days > 36524:
        days -= 1
        gy += 100 * (days // 36524)
        days %= 36524
        if days >= 365:
            days += 1
    gy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        gy += (days - 1) // 365
        days = (days - 1) % 365
    gd = days + 1
    months = [0, 31, 29 if (gy % 4 == 0 and gy % 100 != 0) or (gy % 400 == 0) else 28,
              31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    gm = 0
    for i in range(1, 13):
        if gd <= months[i]:
            gm = i
            break
        gd -= months[i]
    return f"{gy:04d}-{gm:02d}-{gd:02d}"


def parse_mixed_dates(series):
    """
    ستون‌هایی مثل Relationship_Start_Date هم تاریخ میلادی (2020-07-20) دارن
    و هم شمسی (1395/08/12). این تابع هر دو رو درست تبدیل می‌کنه.
    """
    def convert(v):
        s = str(v).strip()
        if s in ("nan", "None", "", "NaT"):
            return None
        if "/" in s:  # فرمت شمسی
            try:
                y, m, d = [int(x) for x in s.split("/")]
                return jalali_to_gregorian(y, m, d)
            except (ValueError, IndexError):
                return None
        return s
    return pd.to_datetime(series.map(convert), errors="coerce")


def extract_invoices():
    df = read_raw("invoices")[["شماره فاکتور", "تاریخ", "Customer_ID"]].copy()
    df.columns = ["invoice_no", "invoice_date", "customer_id"]
    df["invoice_date"] = pd.to_datetime(df["invoice_date"])
    return df.drop_duplicates()


def extract_sales():
    df = read_raw("sales")
    keep = ["Sales_Line_ID", "شماره فاکتور", "تاریخ", "Customer_ID", "Product_ID",
            "نوع پرداخت", "مقدار", "قیمت فی فروش", "مبلغ کل", "گروه کالا"]
    df = df[keep].copy()
    df.columns = ["sales_line_id", "invoice_no", "sale_date", "customer_id", "product_id",
                  "payment_type", "qty", "unit_price", "amount", "product_group"]
    df["sale_date"] = pd.to_datetime(df["sale_date"])
    for c in ["qty", "unit_price", "amount"]:
        df[c] = to_number(df[c])
    return df


def extract_offers():
    df = read_raw("offers")[["Customer_ID", "Offer_Date", "Offer_Discount_Pct", "Result",
                             "Offer_Type", "Offer_Reason", "Validity_Days"]].copy()
    df.columns = ["customer_id", "offer_date", "discount_pct", "result",
                  "offer_type", "offer_reason", "validity_days"]
    df["offer_date"] = pd.to_datetime(df["offer_date"])
    df["discount_pct"] = to_number(df["discount_pct"])
    return df


def extract_collections():
    df = read_raw("collections")[["Customer_ID", "شماره فاکتور", "تاریخ فاکتور",
                                  "تاریخ رویداد وصول", "مبلغ وصول", "روز تأخیر", "چک برگشتی"]].copy()
    df.columns = ["customer_id", "invoice_no", "invoice_date", "collection_date",
                  "collected_amount", "delay_days", "bounced_check"]
    df["invoice_date"] = pd.to_datetime(df["invoice_date"])
    df["collection_date"] = pd.to_datetime(df["collection_date"])
    df["collected_amount"] = to_number(df["collected_amount"])
    df["delay_days"] = to_number(df["delay_days"])
    df["bounced_check"] = (df["bounced_check"] == "بله").astype(int)
    return df


def extract_basket_share():
    df = read_raw("basket_share")[["Customer_ID", "Month_Key", "Estimated_Total_Purchase",
                                   "Nafis_Purchase", "Main_Competitor"]].copy()
    df.columns = ["customer_id", "month_key", "estimated_total", "our_purchase", "main_competitor"]
    df["estimated_total"] = to_number(df["estimated_total"])
    df["our_purchase"] = to_number(df["our_purchase"])
    df["wallet_share"] = (df["our_purchase"] / df["estimated_total"].replace(0, pd.NA)).clip(0, 1)
    df["month_end"] = pd.to_datetime(df["month_key"], format="%Y-%m") + pd.offsets.MonthEnd(0)
    return df


def extract_customers():
    df = read_raw("customers")[["Customer_ID", "Customer_Segment", "Relationship_Start_Date",
                                "Credit_Limit", "Payment_Terms_Days", "Customer_Status",
                                "Location_ID", "Sales_Rep_ID"]].copy()
    df.columns = ["customer_id", "segment", "relationship_start", "credit_limit",
                  "payment_terms_days", "status", "location_id", "sales_rep_id"]
    df["relationship_start"] = parse_mixed_dates(df["relationship_start"])
    df["credit_limit"] = to_number(df["credit_limit"])
    return df


def extract_crm():
    df = read_raw("crm")[["Customer_ID", "Event_Time", "Interaction_Type", "Next_Action"]].copy()
    df.columns = ["customer_id", "event_time", "interaction_type", "next_action"]
    df["event_time"] = pd.to_datetime(df["event_time"])
    return df


def extract_complaints():
    df = read_raw("complaints")[["Customer_ID", "Severity", "Created_At",
                                 "Complaint_Status", "Resolved_At"]].copy()
    df.columns = ["customer_id", "severity", "created_at", "status", "resolved_at"]
    df["created_at"] = pd.to_datetime(df["created_at"])
    df["resolved_at"] = pd.to_datetime(df["resolved_at"], errors="coerce")
    return df


def extract_dev_requests():
    df = read_raw("dev_requests")[["Customer_ID", "Created_At", "Request_Type", "Status"]].copy()
    df.columns = ["customer_id", "created_at", "request_type", "status"]
    df["created_at"] = pd.to_datetime(df["created_at"])
    return df


def extract_actual_cost():
    df = read_raw("actual_cost")[["Sales_Line_ID", "هزینه کل به ازای واحد",
                                  "مقدار برگشتی", "مبلغ برگشتی", "Cost_Close_Date"]].copy()
    df.columns = ["sales_line_id", "actual_unit_cost", "returned_qty", "returned_amount", "cost_close_date"]
    for c in ["actual_unit_cost", "returned_qty", "returned_amount"]:
        df[c] = to_number(df[c])
    df["cost_close_date"] = pd.to_datetime(df["cost_close_date"])
    return df


def main():
    outputs = {
        "invoices": extract_invoices(),
        "sales": extract_sales(),
        "offers": extract_offers(),
        "collections": extract_collections(),
        "basket_share": extract_basket_share(),
        "customers": extract_customers(),
        "crm": extract_crm(),
        "complaints": extract_complaints(),
        "dev_requests": extract_dev_requests(),
        "actual_cost": extract_actual_cost(),
    }
    for name, df in outputs.items():
        path = os.path.join(PROCESSED_DIR, f"{name}.csv")
        df.to_csv(path, index=False, encoding="utf-8-sig")
        print(f"[OK] {name}: {len(df):,} rows")


if __name__ == "__main__":
    main()
