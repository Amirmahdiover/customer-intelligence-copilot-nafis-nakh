# -*- coding: utf-8 -*-
"""
مرحله ۴: ساخت Dataset نهایی روی همهٔ snapshotها
اجرا: python src/step4_build_dataset.py
"""
import os
import pandas as pd
from config import PROCESSED_DIR, SNAPSHOT_START, SNAPSHOT_END
from step2_features import compute_features
from step3_labels import label_retention, label_collection, label_loyalty


def load_data():
    p = lambda n: os.path.join(PROCESSED_DIR, f"{n}.csv")
    return {
        "sales": pd.read_csv(p("sales"), parse_dates=["sale_date"]),
        "collections": pd.read_csv(p("collections"), parse_dates=["invoice_date", "collection_date"]),
        "basket_share": pd.read_csv(p("basket_share"), parse_dates=["month_end"]),
        "customers": pd.read_csv(p("customers"), parse_dates=["relationship_start"]),
        "crm": pd.read_csv(p("crm"), parse_dates=["event_time"]),
        "complaints": pd.read_csv(p("complaints"), parse_dates=["created_at", "resolved_at"]),
        "dev_requests": pd.read_csv(p("dev_requests"), parse_dates=["created_at"]),
        "actual_cost": pd.read_csv(p("actual_cost"), parse_dates=["cost_close_date"]),
        "offers": pd.read_csv(p("offers"), parse_dates=["offer_date"]),
    }


def main():
    data = load_data()
    snapshots = pd.date_range(SNAPSHOT_START, SNAPSHOT_END, freq="MS")
    parts = []

    for snap in snapshots:
        feat = compute_features(snap, data)
        if feat.empty:
            continue

        # چک ضد leakage
        assert (feat["recency_days"] >= 0).all(), f"leakage در {snap}"

        ids = feat["customer_id"].unique()
        feat = feat.merge(label_retention(snap, ids, data["sales"]), on="customer_id", how="left")
        feat = feat.merge(label_collection(snap, ids, data["collections"]), on="customer_id", how="left")
        feat = feat.merge(label_loyalty(snap, ids, data["basket_share"]), on="customer_id", how="left")
        parts.append(feat)

        print(f"{snap.date()}: {len(feat):>4} مشتری | "
              f"retention={feat['y_retention'].mean():.1%} | "
              f"collection={feat['y_collection'].mean():.1%} (n={feat['y_collection'].notna().sum()}) | "
              f"loyalty n={feat['y_loyalty'].notna().sum()}")

    ds = pd.concat(parts, ignore_index=True)
    out = os.path.join(PROCESSED_DIR, "dataset.csv")
    ds.to_csv(out, index=False, encoding="utf-8-sig")
    print(f"\n[OK] dataset: {ds.shape[0]:,} ردیف × {ds.shape[1]} ستون")
    print(f"  y_retention موجود: {ds['y_retention'].notna().sum():,}")
    print(f"  y_collection موجود: {ds['y_collection'].notna().sum():,}")
    print(f"  y_loyalty موجود: {ds['y_loyalty'].notna().sum():,}")


if __name__ == "__main__":
    main()
