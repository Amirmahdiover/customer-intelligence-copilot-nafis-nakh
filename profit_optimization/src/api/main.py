"""
نقطه ورود API.
اجرا: uvicorn src.api.main:app --reload --port 8000
مستندات: http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routers import profit
from src import config

app = FastAPI(
    title="Nafis Nakh — Customer Intelligence API",
    description=(
        "بخش «بهینه‌سازی سود، بررسی هزینه و فرصت». "
        "تمام مقادیر Rule-based و قابل‌توضیح‌اند؛ هیچ مدل یادگیری ماشینی در این نسخه به کار نرفته. "
        f"تاریخ Snapshot محاسبات: {config.SNAPSHOT_DATE.date()}"
    ),
    version="1.0.0",
)

# اجازه دسترسی از فرانت در حال توسعه. در Production این را به دامنه واقعی محدود کنید.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profit.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "snapshot_date": str(config.SNAPSHOT_DATE.date()),
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
