# -*- coding: utf-8 -*-
"""
مرحله ۶: امتیازهای قاعده‌محور (Collection Health و Cash)
------------------------------------------------------
چرا این دو محور مدل ML ندارن؟

روی این دیتاست تست کردیم و مشخص شد رفتار پرداخت مشتری «قابل پیش‌بینی» نیست:
همبستگی تأخیر پرداخت گذشتهٔ هر مشتری با تأخیر آیندهٔ خودش فقط ۰.۱۰ بود
و مدل Logistic Regression روی این label به AUC = 0.537 رسید (تقریباً تصادفی).

اما این یعنی «نمی‌شه پیش‌بینی کرد»، نه «بی‌ارزشه». برای یک مذاکره‌کننده،
دانستن اینکه «این مشتری تاریخاً ۴۰ روز دیرکرد و ۲ چک برگشتی داشته» اطلاعات
مهمیه. پس این محور رو به‌صورت یک کارت امتیاز شفاف و قاعده‌محور ارائه می‌کنیم
که وضعیت *گذشته* رو خلاصه می‌کنه، نه اینکه ادعای پیش‌بینی آینده داشته باشه.
"""
import numpy as np


def _norm(value, lo, hi, invert=False):
    """نرمال‌سازی خطی به بازهٔ ۰-۱ با clip"""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    if hi == lo:
        return 0.5
    s = (value - lo) / (hi - lo)
    s = max(0.0, min(1.0, s))
    return 1.0 - s if invert else s


def collection_health_score(f):
    """
    امتیاز سلامت وصول (۰ تا ۱) بر پایهٔ رفتار پرداخت تاریخی.
    f: dict فیچرها

    اجزا (با وزن):
      - میانگین تأخیر پرداخت      ۳۵٪  (کمتر = بهتر)
      - نسبت پرداخت به‌موقع        ۲۰٪  (بیشتر = بهتر)
      - نرخ چک برگشتی             ۲۵٪  (کمتر = بهتر)
      - بیشترین تأخیر تاریخی       ۱۰٪  (کمتر = بهتر)
      - فشار پیگیری وصول در CRM   ۱۰٪  (کمتر = بهتر)
    """
    parts, weights = [], []

    s = _norm(f.get("avg_delay_days"), 0, 45, invert=True)
    if s is not None:
        parts.append(s); weights.append(0.35)

    s = _norm(f.get("on_time_ratio"), 0, 1)
    if s is not None:
        parts.append(s); weights.append(0.20)

    s = _norm(f.get("bounced_check_rate"), 0, 0.2, invert=True)
    if s is not None:
        parts.append(s); weights.append(0.25)

    s = _norm(f.get("max_delay_days"), 0, 56, invert=True)
    if s is not None:
        parts.append(s); weights.append(0.10)

    s = _norm(f.get("crm_collection_pressure"), 0, 5, invert=True)
    if s is not None:
        parts.append(s); weights.append(0.10)

    if not parts:
        return 0.5, "بدون سابقهٔ وصول - امتیاز خنثی"

    score = float(np.average(parts, weights=weights))

    if score >= 0.7:
        note = "سابقهٔ پرداخت خوب"
    elif score >= 0.45:
        note = "سابقهٔ پرداخت متوسط"
    else:
        note = "سابقهٔ پرداخت ضعیف - ریسک وصول"
    return score, note


def cash_score(f, stats):
    """
    امتیاز نقدینگی/ارزش نقدی مشتری (۰ تا ۱).
    stats: دیکشنری صدک‌ها از meta.json برای نرمال‌سازی واقع‌گرایانه

    اجزا:
      - نسبت خرید نقدی            ۴۰٪
      - روند نقدی (نقدی -> نسیه)  ۱۵٪
      - حاشیهٔ سود واقعی           ۲۵٪
      - میانگین اندازهٔ تراکنش      ۲۰٪
    """
    parts, weights = [], []

    s = _norm(f.get("cash_ratio_365d"),
              stats.get("cash_ratio_p10", 0), stats.get("cash_ratio_p90", 1))
    if s is not None:
        parts.append(s); weights.append(0.40)

    trend = f.get("cash_ratio_trend")
    if trend is not None and not (isinstance(trend, float) and np.isnan(trend)):
        parts.append(_norm(trend, -0.5, 0.5)); weights.append(0.15)

    s = _norm(f.get("avg_margin_pct"),
              stats.get("margin_pct_p10", 0), stats.get("margin_pct_p90", 0.5))
    if s is not None:
        parts.append(s); weights.append(0.25)

    s = _norm(f.get("avg_txn_size"),
              stats.get("avg_txn_p10", 0), stats.get("avg_txn_p90", 1e6))
    if s is not None:
        parts.append(s); weights.append(0.20)

    if not parts:
        return 0.5, "دادهٔ کافی برای ارزیابی نقدینگی نیست"

    score = float(np.average(parts, weights=weights))

    if score >= 0.65:
        note = "مشتری نقدی و سودآور"
    elif score >= 0.4:
        note = "نقدینگی متوسط"
    else:
        note = "عمدتاً نسیه یا حاشیهٔ سود پایین"
    return score, note
