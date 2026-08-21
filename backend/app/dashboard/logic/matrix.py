"""Strategic customer matrix: economic value × relationship health."""
from __future__ import annotations

import math
from statistics import median
from typing import Any, Literal

QuadrantKey = Literal[
    "golden_loyal",
    "growth_potential",
    "high_risk_moneymaker",
    "marginal",
]

WEIGHTING_NOTE = "وزن‌دهی: ۴ واحد ارزش فروش به واحد سلامت"

QUADRANTS: dict[QuadrantKey, dict[str, str]] = {
    "golden_loyal": {
        "label": "مشتریان طلایی (وفادار)",
        "action": "حفظ رابطه فعلی، تمدید همکاری و پیشنهاد محصولات مکمل",
    },
    "growth_potential": {
        "label": "مشتریان با پتانسیل رشد",
        "action": "توسعه حساب با افزایش سهم سبد و فروش متقابل",
    },
    "high_risk_moneymaker": {
        "label": "مشتریان پرخطر (پول‌ساز ولی ترسناک)",
        "action": "پیش از هر فروش جدید، ریسک چک و مطالبات را مدیریت کنید",
    },
    "marginal": {
        "label": "مشتریان حاشیه‌ای (بدون ارزش)",
        "action": "بازنگری در زمان فروش اختصاص‌یافته یا خروج تدریجی از حساب",
    },
}

SALES_WEIGHT = 0.8
PROFIT_WEIGHT = 0.2
HEALTH_WEIGHTS = {
    "risk": 0.35,
    "delay": 0.30,
    "bounce": 0.20,
    "recency": 0.15,
}


def _optional_number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number):
        return None
    return number


def _percentile_ranks(values: list[float]) -> list[float]:
    """Average percentile rank in (0, 1], matching pandas rank(pct=True)."""
    count = len(values)
    if count == 0:
        return []

    order = sorted(range(count), key=lambda index: values[index])
    ranks = [0.0] * count
    start = 0
    while start < count:
        end = start
        while end + 1 < count and values[order[end + 1]] == values[order[start]]:
            end += 1
        average_rank = (start + 1 + end + 1) / 2.0
        percentile = average_rank / count
        for position in range(start, end + 1):
            ranks[order[position]] = percentile
        start = end + 1
    return ranks


def _filled(values: list[float | None], missing: float) -> list[float]:
    return [missing if value is None else value for value in values]


def _invert(ranks: list[float]) -> list[float]:
    return [1.0 - rank for rank in ranks]


def _assign_quadrant(economic: float, health: float, economic_median: float, health_median: float) -> QuadrantKey:
    high_value = economic >= economic_median
    high_health = health >= health_median
    if high_value and high_health:
        return "golden_loyal"
    if not high_value and high_health:
        return "growth_potential"
    if high_value and not high_health:
        return "high_risk_moneymaker"
    return "marginal"


def build_strategic_matrix(records: list[dict[str, Any]]) -> dict[str, Any]:
    """Score the full portfolio and return quadrant counts plus split thresholds."""
    sales = [_optional_number(record.get("Annual_Sales_Trailing12M")) for record in records]
    profit = [_optional_number(record.get("Margin_Total_Lifetime")) for record in records]
    risk = [_optional_number(record.get("Risk_Score")) for record in records]
    delay = [_optional_number(record.get("Avg_Payment_Delay_Days")) for record in records]
    bounce = [_optional_number(record.get("Bounced_Check_Rate")) for record in records]
    recency = [_optional_number(record.get("Recency_Days")) for record in records]

    max_risk = max((value for value in risk if value is not None), default=0.0)
    max_recency = max((value for value in recency if value is not None), default=0.0)

    sales_ranks = _percentile_ranks(_filled(sales, 0.0))
    profit_ranks = _percentile_ranks(_filled(profit, 0.0))
    risk_health = _invert(_percentile_ranks(_filled(risk, max_risk + 1.0)))
    delay_health = _invert(_percentile_ranks(_filled(delay, 0.0)))
    bounce_health = _invert(_percentile_ranks(_filled(bounce, 0.0)))
    recency_health = _invert(_percentile_ranks(_filled(recency, max_recency + 1.0)))

    economic_scores = [
        100.0 * (SALES_WEIGHT * sales_rank + PROFIT_WEIGHT * profit_rank)
        for sales_rank, profit_rank in zip(sales_ranks, profit_ranks)
    ]
    health_scores = [
        100.0
        * (
            HEALTH_WEIGHTS["risk"] * risk_value
            + HEALTH_WEIGHTS["delay"] * delay_value
            + HEALTH_WEIGHTS["bounce"] * bounce_value
            + HEALTH_WEIGHTS["recency"] * recency_value
        )
        for risk_value, delay_value, bounce_value, recency_value in zip(
            risk_health, delay_health, bounce_health, recency_health
        )
    ]

    economic_median = float(median(economic_scores)) if economic_scores else 0.0
    health_median = float(median(health_scores)) if health_scores else 0.0

    counts: dict[QuadrantKey, int] = {
        "golden_loyal": 0,
        "growth_potential": 0,
        "high_risk_moneymaker": 0,
        "marginal": 0,
    }
    for economic, health in zip(economic_scores, health_scores):
        counts[_assign_quadrant(economic, health, economic_median, health_median)] += 1

    return {
        "weighting_note": WEIGHTING_NOTE,
        "thresholds": {
            "economic_median": round(economic_median, 4),
            "health_median": round(health_median, 4),
        },
        "quadrants": [
            {
                "key": key,
                "label": meta["label"],
                "action": meta["action"],
                "count": counts[key],
            }
            for key, meta in QUADRANTS.items()
        ],
    }
