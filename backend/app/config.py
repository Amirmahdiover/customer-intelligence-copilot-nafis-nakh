"""Financial feature configuration — thresholds and rates are not hard-coded in logic."""

ANNUAL_FINANCING_RATE = 0.36

# Upper bounds (exclusive) for credit status bands.
# < safe → "safe"; safe–warning → "warning"; warning–critical → "critical"; > critical → "over_limit"
CREDIT_STATUS_THRESHOLDS = {
    "safe": 60.0,
    "warning": 85.0,
    "critical": 100.0,
}
