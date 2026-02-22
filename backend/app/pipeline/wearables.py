from __future__ import annotations

import numpy as np
import pandas as pd


REQUIRED_COLUMNS = [
    "date",
    "steps",
    "sleep_hours",
    "resting_hr",
    "hrv_ms",
    "spo2",
    "temp_c",
    "weight_kg",
    "symptom_score",
]


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename_map = {c: c.strip().lower() for c in df.columns}
    df = df.rename(columns=rename_map)
    return df


def validate_and_quality(df: pd.DataFrame) -> dict:
    df = normalize_columns(df)
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.sort_values("date")
    if df["date"].isna().all():
        raise ValueError("All date values are invalid in wearables CSV.")

    date_min = df["date"].min()
    date_max = df["date"].max()
    days_covered = int((date_max - date_min).days + 1)
    if days_covered < 21:
        raise ValueError("Wearables CSV must cover at least 21 days.")

    feature_cols = [c for c in REQUIRED_COLUMNS if c != "date"]
    missing_ratio = float(df[feature_cols].isna().mean().mean())
    gaps_count = int((df["date"].diff().dt.days.fillna(1) > 1).sum())
    return {
        "missing_ratio": missing_ratio,
        "gaps_count": gaps_count,
        "days_covered": days_covered,
        "rows": int(df.shape[0]),
    }


def _slope(y: np.ndarray) -> float:
    x = np.arange(len(y), dtype=float)
    mask = np.isfinite(y)
    if mask.sum() < 2:
        return 0.0
    x = x[mask]
    y = y[mask]
    x_centered = x - x.mean()
    denom = np.dot(x_centered, x_centered)
    if denom <= 0:
        return 0.0
    return float(np.dot(x_centered, y - y.mean()) / denom)


def compute_features(df: pd.DataFrame) -> dict:
    df = normalize_columns(df).sort_values("date")
    feature_cols = [c for c in REQUIRED_COLUMNS if c != "date"]
    feats: dict[str, float] = {}
    for col in feature_cols:
        arr = pd.to_numeric(df[col], errors="coerce").to_numpy(dtype=float)
        feats[f"{col}_mean"] = float(np.nanmean(arr)) if np.isfinite(arr).any() else 0.0
        feats[f"{col}_std"] = float(np.nanstd(arr)) if np.isfinite(arr).any() else 0.0
        window = arr[-7:] if len(arr) >= 7 else arr
        first = float(np.nanmean(window[: max(1, len(window) // 2)]))
        last = float(np.nanmean(window[max(1, len(window) // 2) :]))
        feats[f"{col}_7d_delta"] = last - first
        feats[f"{col}_slope"] = _slope(arr)
    return feats


def score_health(features: dict) -> tuple[float, float]:
    z = 0.0
    z += 0.02 * features.get("resting_hr_mean", 0) - 1.2
    z -= 0.04 * features.get("hrv_ms_mean", 0)
    z -= 0.01 * features.get("spo2_mean", 0) + 1.0
    z += 0.20 * features.get("symptom_score_mean", 0)
    z += 0.03 * features.get("temp_c_mean", 0) - 1.0
    z += 0.01 * features.get("resting_hr_7d_delta", 0)
    z -= 0.0003 * features.get("steps_mean", 0)
    p = float(1.0 / (1.0 + np.exp(-np.clip(z, -8, 8))))
    variance = float(0.01 + 0.015 * min(1.0, abs(features.get("symptom_score_std", 0)) / 3.0))
    return p, variance
