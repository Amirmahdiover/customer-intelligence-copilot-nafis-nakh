"""
تست پایه برای اطمینان از صحت محاسبات.
اجرا: pytest tests/ -v
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient

from src.api.main import app
from src.features.profit_optimization import compute_customer_profit_table

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_profit_table_not_empty():
    table = compute_customer_profit_table()
    assert len(table) > 0
    assert "relationship_value_score" in table.columns


def test_profit_table_score_range():
    """امتیاز نهایی باید همیشه بین ۰ و ۱۰۰ باشد."""
    table = compute_customer_profit_table()
    valid = table["relationship_value_score"].dropna()
    assert (valid >= 0).all()
    assert (valid <= 100).all()


def test_known_customer_endpoint():
    table = compute_customer_profit_table()
    sample_id = table["Customer_ID"].iloc[0]
    r = client.get(f"/customers/{sample_id}/profit-optimization")
    assert r.status_code == 200
    body = r.json()
    assert body["customer_id"] == sample_id
    assert "components" in body
    assert "revenue_vs_profit" in body


def test_unknown_customer_returns_404():
    r = client.get("/customers/DOES_NOT_EXIST_XYZ/profit-optimization")
    assert r.status_code == 404


def test_ranking_endpoint_sorted_ascending():
    r = client.get("/customers/profit-ranking?limit=10&ascending=true")
    assert r.status_code == 200
    items = r.json()
    scores = [i["relationship_value_score"] for i in items if i["relationship_value_score"] is not None]
    assert scores == sorted(scores)


def test_no_data_leakage_in_sales():
    """هیچ ردیف فروش نباید Available_At بعد از Snapshot داشته باشد."""
    from src.loaders import load_sales
    from src import config

    sales = load_sales()
    avail = sales["Available_At"] if "Available_At" in sales.columns else None
    if avail is not None:
        import pandas as pd

        assert (pd.to_datetime(avail) <= config.SNAPSHOT_DATE).all()
