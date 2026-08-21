# -*- coding: utf-8 -*-
"""
Negotiation Success Score API
==============================================================
امتیاز موفقیت مذاکره با مشتری، بر پایهٔ ۴ محور:
  ۱. سلامت وصول    (کارت امتیاز قاعده‌محور)
  ۲. حفظ مشتری     (مدل ML - Logistic Regression، AUC = 0.88)
  ۳. وفاداری       (مدل ML - Ridge Regression، R² = 0.40)
  ۴. نقدینگی/Cash  (کارت امتیاز قاعده‌محور)

اجرا:
    uvicorn app.main:app --host 0.0.0.0 --port 8000
مستندات تعاملی:
    http://localhost:8000/docs
"""
import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from typing import Optional, Dict, List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "model")
sys.path.insert(0, os.path.join(BASE_DIR, "src"))

from scoring import collection_health_score, cash_score  # noqa: E402

app = FastAPI(
    title="Negotiation Success Score API",
    description="امتیاز موفقیت مذاکره با مشتری بر پایهٔ وصول، حفظ مشتری، وفاداری و نقدینگی",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # در production به دامنهٔ سایت محدود کنید
    allow_methods=["*"],
    allow_headers=["*"],
)

STATE: Dict = {}


@app.on_event("startup")
def load_artifacts():
    STATE["model_retention"] = joblib.load(os.path.join(MODEL_DIR, "model_retention.joblib"))
    STATE["model_loyalty"] = joblib.load(os.path.join(MODEL_DIR, "model_loyalty.joblib"))
    with open(os.path.join(MODEL_DIR, "meta.json"), encoding="utf-8") as f:
        STATE["meta"] = json.load(f)
    profiles = pd.read_csv(os.path.join(MODEL_DIR, "customer_profiles.csv"))
    STATE["profiles"] = profiles.set_index("customer_id")
    print(f"[startup] {len(profiles)} پروفایل مشتری و ۲ مدل بارگذاری شد.")


# ==================== مدل‌های داده ====================

class Weights(BaseModel):
    collection: float = Field(0.25, ge=0, le=1)
    retention: float = Field(0.25, ge=0, le=1)
    loyalty: float = Field(0.25, ge=0, le=1)
    cash: float = Field(0.25, ge=0, le=1)


class PillarResult(BaseModel):
    score: float = Field(..., description="امتیاز ۰ تا ۱")
    weight: float
    contribution: float = Field(..., description="سهم این محور در امتیاز نهایی")
    method: str = Field(..., description="ml_model یا rule_based_scorecard")
    note: Optional[str] = None
    confidence: str = Field(..., description="high / medium / low")


class ScoreResponse(BaseModel):
    customer_id: str
    negotiation_score: float = Field(..., description="امتیاز نهایی ۰ تا ۱۰۰")
    recommendation: str
    pillars: Dict[str, PillarResult]
    customer_info: Dict
    key_drivers: List[str]
    warnings: List[str]


class ManualFeatures(BaseModel):
    """برای امتیازدهی مشتری‌ای که در پایگاه داده نیست"""
    # وصول
    avg_delay_days: Optional[float] = None
    max_delay_days: Optional[float] = None
    on_time_ratio: Optional[float] = None
    bounced_check_rate: Optional[float] = 0
    crm_collection_pressure: Optional[float] = 0
    # حفظ مشتری
    recency_days: float = 60
    tenure_days: float = 365
    relationship_days: float = 365
    freq_90d: float = 0
    freq_180d: float = 0
    freq_365d: float = 0
    freq_trend: float = 0
    monetary_90d: float = 0
    monetary_365d: float = 0
    avg_txn_size: float = 0
    gap_mean_days: Optional[float] = None
    gap_std_days: Optional[float] = None
    nunique_product_365d: float = 0
    nunique_group_365d: float = 0
    complaint_count_365d: float = 0
    critical_complaint_count: float = 0
    unresolved_complaints: float = 0
    crm_quality_issues: float = 0
    crm_interaction_count: float = 0
    dev_request_count: float = 0
    return_rate: float = 0
    # وفاداری
    wallet_share: Optional[float] = None
    wallet_share_trend: Optional[float] = None
    competitor_diversity: float = 0
    dev_approved_ratio: float = 0
    dev_rejected_ratio: float = 0
    crm_sample_requests: float = 0
    has_wallet_data: int = 0
    # نقدینگی
    cash_ratio_365d: Optional[float] = None
    cash_ratio_trend: float = 0
    avg_margin_pct: Optional[float] = None
    # مشخصات
    credit_limit: Optional[float] = None
    payment_terms_days: Optional[float] = None
    segment_A: int = 0
    segment_B: int = 0
    has_collection_history: int = 0


# ==================== منطق امتیازدهی ====================

def _to_frame(features: dict, cols: List[str]) -> pd.DataFrame:
    row = {c: features.get(c, np.nan) for c in cols}
    return pd.DataFrame([row])


def compute_pillars(features: dict, weights: Weights):
    meta = STATE["meta"]
    warnings: List[str] = []

    # --- محور ۱: وصول (قاعده‌محور) ---
    coll_score, coll_note = collection_health_score(features)
    if not features.get("has_collection_history", 1):
        warnings.append("سابقهٔ وصول برای این مشتری موجود نیست - امتیاز محور وصول خنثی (۰.۵) در نظر گرفته شد")

    # --- محور ۲: حفظ مشتری (ML) ---
    ret_cols = meta["retention"]["features"]
    ret_score = float(STATE["model_retention"].predict_proba(_to_frame(features, ret_cols))[0, 1])

    # --- محور ۳: وفاداری (ML) ---
    loy_cols = meta["loyalty"]["features"]
    loy_raw = float(STATE["model_loyalty"].predict(_to_frame(features, loy_cols))[0])
    loy_score = float(np.clip(loy_raw, 0.0, 1.0))
    if not features.get("has_wallet_data", 1):
        warnings.append("دادهٔ سهم سبد موجود نیست - پیش‌بینی وفاداری با دقت کمتر")

    # --- محور ۴: نقدینگی (قاعده‌محور) ---
    cash_s, cash_note = cash_score(features, meta["cash_stats"])

    pillars = {
        "collection": PillarResult(
            score=round(coll_score, 4), weight=weights.collection,
            contribution=round(coll_score * weights.collection, 4),
            method="rule_based_scorecard", note=coll_note,
            confidence="medium",
        ),
        "retention": PillarResult(
            score=round(ret_score, 4), weight=weights.retention,
            contribution=round(ret_score * weights.retention, 4),
            method="ml_model",
            note=f"مدل Logistic Regression، AUC={meta['retention']['metrics']['auc']}",
            confidence="high",
        ),
        "loyalty": PillarResult(
            score=round(loy_score, 4), weight=weights.loyalty,
            contribution=round(loy_score * weights.loyalty, 4),
            method="ml_model",
            note=f"سهم سبد پیش‌بینی‌شده؛ مدل Ridge، R²={meta['loyalty']['metrics']['r2']}",
            confidence="medium",
        ),
        "cash": PillarResult(
            score=round(cash_s, 4), weight=weights.cash,
            contribution=round(cash_s * weights.cash, 4),
            method="rule_based_scorecard", note=cash_note,
            confidence="medium",
        ),
    }

    total_w = weights.collection + weights.retention + weights.loyalty + weights.cash
    if total_w == 0:
        raise HTTPException(400, "مجموع وزن‌ها نمی‌تواند صفر باشد")
    raw = sum(p.contribution for p in pillars.values()) / total_w
    return pillars, round(raw * 100, 2), warnings


def build_recommendation(score: float, pillars: Dict[str, PillarResult]) -> str:
    weakest = min(pillars.items(), key=lambda kv: kv[1].score)
    if score >= 70:
        base = "شانس موفقیت بالا - مذاکره را با اطمینان پیش ببرید"
    elif score >= 45:
        base = "شانس موفقیت متوسط - نیازمند آماده‌سازی و امتیاز متقابل"
    else:
        base = "شانس موفقیت پایین - قبل از مذاکره ریسک‌ها را برطرف کنید"
    labels = {"collection": "سلامت وصول", "retention": "حفظ مشتری",
              "loyalty": "وفاداری", "cash": "نقدینگی"}
    return f"{base}. ضعیف‌ترین محور: {labels[weakest[0]]} ({weakest[1].score:.0%})"


def build_drivers(features: dict, pillars: Dict[str, PillarResult]) -> List[str]:
    d = []
    rec = features.get("recency_days")
    if rec is not None and not pd.isna(rec):
        if rec > 180:
            d.append(f"⚠ {int(rec)} روز از آخرین خرید گذشته - ریسک بالای ریزش")
        elif rec < 30:
            d.append(f"✓ خرید اخیر ({int(rec)} روز پیش) - رابطهٔ فعال")

    delay = features.get("avg_delay_days")
    if delay is not None and not pd.isna(delay):
        if delay > 35:
            d.append(f"⚠ میانگین تأخیر پرداخت {int(delay)} روز")
        elif delay < 15:
            d.append(f"✓ پرداخت‌های نسبتاً به‌موقع (میانگین {int(delay)} روز)")

    b = features.get("bounced_check_count", 0)
    if b and b > 0:
        d.append(f"⚠ {int(b)} چک برگشتی در سابقه")

    ws = features.get("wallet_share")
    if ws is not None and not pd.isna(ws):
        if ws < 0.1:
            d.append(f"⚠ سهم سبد فقط {ws:.0%} - عمدتاً از رقبا می‌خرد")
        elif ws > 0.3:
            d.append(f"✓ سهم سبد {ws:.0%} - وابستگی خوب")

    cr = features.get("cash_ratio_365d")
    if cr is not None and not pd.isna(cr):
        if cr > 0.7:
            d.append(f"✓ {cr:.0%} خریدها نقدی")
        elif cr < 0.3:
            d.append(f"⚠ فقط {cr:.0%} خریدها نقدی - عمدتاً نسیه")

    cc = features.get("critical_complaint_count", 0)
    if cc and cc > 0:
        d.append(f"⚠ {int(cc)} شکایت جدی در یک سال اخیر")

    dev = features.get("dev_request_count", 0)
    if dev and dev > 2:
        d.append(f"✓ {int(dev)} درخواست توسعهٔ محصول - سرمایه‌گذاری روی رابطه")

    return d[:6]


# ==================== Endpointها ====================

@app.get("/")
def root():
    return {
        "service": "Negotiation Success Score API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": ["/health", "/customers", "/score/{customer_id}",
                      "/score/batch", "/score/manual", "/model-info"],
    }


@app.get("/health")
def health():
    return {"status": "healthy", "models_loaded": "model_retention" in STATE,
            "customers_available": len(STATE.get("profiles", []))}


@app.get("/model-info")
def model_info():
    """اطلاعات مدل‌ها، معیارهای عملکرد و محدودیت‌های شناخته‌شده"""
    m = STATE["meta"]
    return {
        "pillars": {
            "collection": m["collection"],
            "retention": {"method": m["retention"]["method"],
                          "type": m["retention"]["type"],
                          "metrics": m["retention"]["metrics"]},
            "loyalty": {"method": m["loyalty"]["method"],
                        "type": m["loyalty"]["type"],
                        "metrics": m["loyalty"]["metrics"]},
            "cash": m["cash"],
        },
        "default_weights": m["default_weights"],
        "dataset_rows": m["dataset_rows"],
        "known_limitations": [
            "دادهٔ تراکنش‌ها شکاف کامل در ۲۰۲۳-۲۰۲۴ دارد؛ مدل روی ۲۰۲۰-۰۶ تا ۲۰۲۲-۰۳ آموزش دیده.",
            "محور وصول مدل ML ندارد: تأخیر پرداخت در این داده قابل پیش‌بینی نبود (AUC=0.537).",
            "ستون Result در فایل آفرها سیگنال معناداری نداشت (AUC=0.50) و در مدل استفاده نشده.",
            "مدل وفاداری R²=0.40 دارد - برای رتبه‌بندی نسبی مناسب است، نه پیش‌بینی دقیق.",
        ],
    }


@app.get("/customers")
def list_customers(limit: int = Query(50, ge=1, le=1000), offset: int = 0):
    """فهرست مشتری‌های موجود در سیستم"""
    p = STATE["profiles"]
    subset = p.iloc[offset:offset + limit]
    return {
        "total": len(p),
        "limit": limit,
        "offset": offset,
        "customers": [
            {"customer_id": idx,
             "segment": r.get("segment"),
             "status": r.get("status"),
             "sales_rep_id": r.get("sales_rep_id")}
            for idx, r in subset.iterrows()
        ],
    }


@app.get("/score/{customer_id}", response_model=ScoreResponse)
def score_customer(
    customer_id: str,
    w_collection: float = Query(0.25, ge=0, le=1),
    w_retention: float = Query(0.25, ge=0, le=1),
    w_loyalty: float = Query(0.25, ge=0, le=1),
    w_cash: float = Query(0.25, ge=0, le=1),
):
    """امتیاز موفقیت مذاکره برای یک مشتری موجود. وزن‌ها قابل تنظیم‌اند."""
    profiles = STATE["profiles"]
    if customer_id not in profiles.index:
        raise HTTPException(404, f"مشتری {customer_id} یافت نشد")

    features = profiles.loc[customer_id].to_dict()
    weights = Weights(collection=w_collection, retention=w_retention,
                      loyalty=w_loyalty, cash=w_cash)
    pillars, score, warnings = compute_pillars(features, weights)

    return ScoreResponse(
        customer_id=customer_id,
        negotiation_score=score,
        recommendation=build_recommendation(score, pillars),
        pillars=pillars,
        customer_info={
            "segment": features.get("segment"),
            "status": features.get("status"),
            "sales_rep_id": features.get("sales_rep_id"),
            "location_id": features.get("location_id"),
            "snapshot_date": str(features.get("snapshot_date"))[:10],
        },
        key_drivers=build_drivers(features, pillars),
        warnings=warnings,
    )


class BatchRequest(BaseModel):
    customer_ids: List[str]
    weights: Weights = Weights()


@app.post("/score/batch")
def score_batch(req: BatchRequest):
    """امتیازدهی گروهی - برای ساخت جدول اولویت‌بندی مشتریان"""
    profiles = STATE["profiles"]
    results, not_found = [], []

    for cid in req.customer_ids:
        if cid not in profiles.index:
            not_found.append(cid)
            continue
        features = profiles.loc[cid].to_dict()
        pillars, score, _ = compute_pillars(features, req.weights)
        results.append({
            "customer_id": cid,
            "negotiation_score": score,
            "collection": pillars["collection"].score,
            "retention": pillars["retention"].score,
            "loyalty": pillars["loyalty"].score,
            "cash": pillars["cash"].score,
            "segment": features.get("segment"),
        })

    results.sort(key=lambda x: x["negotiation_score"], reverse=True)
    return {"count": len(results), "not_found": not_found, "results": results}


@app.get("/score/rank/top")
def rank_all(
    limit: int = Query(20, ge=1, le=600),
    w_collection: float = 0.25, w_retention: float = 0.25,
    w_loyalty: float = 0.25, w_cash: float = 0.25,
    segment: Optional[str] = None,
):
    """رتبه‌بندی همهٔ مشتریان بر اساس امتیاز مذاکره"""
    profiles = STATE["profiles"]
    if segment:
        profiles = profiles[profiles["segment"] == segment]

    weights = Weights(collection=w_collection, retention=w_retention,
                      loyalty=w_loyalty, cash=w_cash)
    rows = []
    for cid, r in profiles.iterrows():
        f = r.to_dict()
        pillars, score, _ = compute_pillars(f, weights)
        rows.append({
            "customer_id": cid,
            "negotiation_score": score,
            "collection": pillars["collection"].score,
            "retention": pillars["retention"].score,
            "loyalty": pillars["loyalty"].score,
            "cash": pillars["cash"].score,
            "segment": f.get("segment"),
            "status": f.get("status"),
        })
    rows.sort(key=lambda x: x["negotiation_score"], reverse=True)
    return {"total_scored": len(rows), "results": rows[:limit]}


@app.post("/score/manual", response_model=ScoreResponse)
def score_manual(features: ManualFeatures, weights: Weights = Weights()):
    """امتیازدهی با فیچرهای دستی - برای مشتری جدیدی که در پایگاه داده نیست"""
    f = features.model_dump()
    pillars, score, warnings = compute_pillars(f, weights)
    return ScoreResponse(
        customer_id="MANUAL",
        negotiation_score=score,
        recommendation=build_recommendation(score, pillars),
        pillars=pillars,
        customer_info={"source": "manual_input"},
        key_drivers=build_drivers(f, pillars),
        warnings=warnings,
    )
