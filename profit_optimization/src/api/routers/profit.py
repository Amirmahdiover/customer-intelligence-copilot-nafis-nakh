"""Endpointهای بخش «بهینه‌سازی سود، بررسی هزینه و فرصت»."""
from fastapi import APIRouter, HTTPException

from src.features.profit_optimization import (
    compute_customer_profit_table,
    get_customer_profit_row,
)
from src.api.schemas import CustomerProfitResponse, CustomerListItem, ErrorResponse

router = APIRouter(tags=["Profit Optimization"])


@router.get(
    "/customers/{customer_id}/profit-optimization",
    response_model=CustomerProfitResponse,
    responses={404: {"model": ErrorResponse}},
    summary="بخش بهینه‌سازی سود، هزینه و فرصت برای یک مشتری",
)
def get_profit_optimization(customer_id: str):
    result = get_customer_profit_row(customer_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"مشتری با شناسه {customer_id} یافت نشد")
    return result


@router.get(
    "/customers/profit-ranking",
    response_model=list[CustomerListItem],
    summary="فهرست همه مشتریان مرتب‌شده بر اساس ارزش ادامه همکاری",
)
def list_profit_ranking(limit: int = 50, ascending: bool = True):
    """
    ascending=True  -> پایین‌ترین امتیازها اول (نیازمند بررسی فوری)
    ascending=False -> بالاترین امتیازها اول (بهترین مشتریان)
    """
    table = compute_customer_profit_table()
    table = table.sort_values("relationship_value_score", ascending=ascending)
    table = table.head(limit)

    return [
        CustomerListItem(
            customer_id=row.Customer_ID,
            relationship_value_score=(
                None if pd_isna(row.relationship_value_score) else round(row.relationship_value_score, 1)
            ),
            revenue=None if pd_isna(row.revenue) else round(row.revenue, 0),
            margin_pct=None if pd_isna(row.margin_pct) else round(row.margin_pct, 2),
        )
        for row in table.itertuples()
    ]


def pd_isna(x) -> bool:
    import pandas as pd

    return pd.isna(x)
