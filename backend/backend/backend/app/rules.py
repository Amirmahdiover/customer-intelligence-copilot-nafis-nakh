"""Transparent, rule-based Risk scoring logic — mirrors the rules baked into
data/customer_analytics_dataset.csv (built by the analytics pipeline) so the
/risk endpoint can show *why* a customer got their score, not just the number.

No ML/statistical model is used anywhere in this dataset or API — every
figure here is a deterministic aggregation or an explicit if/then rule.
"""
import math


def _is_null(v):
    return v is None or (isinstance(v, float) and math.isnan(v))


def risk_breakdown(row: dict) -> list[dict]:
    """Returns the ordered list of rule checks applied to this customer,
    each with the factor inspected, its value, and the points it contributed.
    Mirrors the exact thresholds used when the dataset was built."""
    recency = row.get("Recency_Days")
    if _is_null(recency):
        return [{
            "factor": "Recency_Days",
            "value": None,
            "points": None,
            "rule": "Not scored — customer had no orders as of the analytics snapshot (2022-06-30)",
        }]

    factors = []

    if recency > 180:
        pts, rule = 2, "Recency_Days > 180 -> +2"
    elif recency > 90:
        pts, rule = 1, "90 < Recency_Days <= 180 -> +1"
    else:
        pts, rule = 0, "Recency_Days <= 90 -> +0"
    factors.append({"factor": "Recency_Days", "value": recency, "points": pts, "rule": rule})

    delay = row.get("Avg_Payment_Delay_Days")
    if _is_null(delay):
        factors.append({"factor": "Avg_Payment_Delay_Days", "value": None, "points": 0,
                         "rule": "No collections on record as of snapshot -> +0"})
    else:
        if delay > 30:
            pts, rule = 2, "Avg_Payment_Delay_Days > 30 -> +2"
        elif delay > 14:
            pts, rule = 1, "14 < Avg_Payment_Delay_Days <= 30 -> +1"
        else:
            pts, rule = 0, "Avg_Payment_Delay_Days <= 14 -> +0"
        factors.append({"factor": "Avg_Payment_Delay_Days", "value": delay, "points": pts, "rule": rule})

    recent_complaints = row.get("Recent_Complaints_12M") or 0
    if recent_complaints >= 3:
        pts, rule = 2, "Recent_Complaints_12M >= 3 -> +2"
    elif recent_complaints >= 1:
        pts, rule = 1, "Recent_Complaints_12M >= 1 -> +1"
    else:
        pts, rule = 0, "Recent_Complaints_12M == 0 -> +0"
    factors.append({"factor": "Recent_Complaints_12M", "value": recent_complaints, "points": pts, "rule": rule})

    status = row.get("Customer_Status")
    pts = 2 if status == "غیرفعال" else 0
    factors.append({"factor": "Customer_Status", "value": status, "points": pts,
                     "rule": "Customer_Status == 'غیرفعال' (inactive) -> +2" if pts else "Customer_Status == 'فعال' (active) -> +0"})

    share = row.get("Revenue_Share_Pct_Latest")
    if _is_null(share):
        factors.append({"factor": "Revenue_Share_Pct_Latest", "value": None, "points": 0,
                         "rule": "No wallet-share record available -> +0"})
    else:
        pts = 1 if share < 0.30 else 0
        factors.append({"factor": "Revenue_Share_Pct_Latest", "value": share, "points": pts,
                         "rule": "Revenue_Share_Pct_Latest < 0.30 -> +1" if pts else "Revenue_Share_Pct_Latest >= 0.30 -> +0"})

    return factors


def risk_bucket(points):
    if points is None:
        return "Not Yet Active"
    if points >= 6:
        return "Critical"
    if points >= 4:
        return "High"
    if points >= 2:
        return "Medium"
    return "Low"
