from __future__ import annotations

import numpy as np
import pandas as pd

from app.utils.math import ci_from_var, safe_sigmoid


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


def validate_and_quality(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
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

    feature_cols = [c for c in REQUIRED_COLUMNS if c != "date"]
    missing_ratio = float(df[feature_cols].isna().mean().mean())
    gaps_count = int((df["date"].diff().dt.days.fillna(1) > 1).sum())
    quality = {
        "missing_ratio": missing_ratio,
        "gaps_count": gaps_count,
        "days_covered": days_covered,
        "rows": int(df.shape[0]),
    }
    return df, quality


def _slope_formula(y: np.ndarray) -> float:
    # beta = sum((t - t_bar)(s_t - mu))/sum((t - t_bar)^2), t in 1..T
    t = np.arange(1, len(y) + 1, dtype=float)
    mask = np.isfinite(y)
    if mask.sum() < 2:
        return 0.0
    t = t[mask]
    y = y[mask]
    mu = float(np.mean(y))
    t_bar = float((len(t) + 1) / 2.0)
    t_centered = t - t_bar
    denom = float(np.sum(t_centered**2))
    if denom <= 0:
        return 0.0
    numer = float(np.sum(t_centered * (y - mu)))
    return numer / denom


def compute_features(df: pd.DataFrame, data_quality: dict | None = None) -> dict:
    df = normalize_columns(df).sort_values("date")
    feature_cols = [c for c in REQUIRED_COLUMNS if c != "date"]
    feats: dict[str, float] = {}
    for col in feature_cols:
        arr = pd.to_numeric(df[col], errors="coerce").to_numpy(dtype=float)
        finite = np.isfinite(arr)
        clean = arr[finite]
        if clean.size == 0:
            mu = 0.0
            var = 0.0
            first_7 = 0.0
            last_7 = 0.0
            delta_7 = 0.0
            slope = 0.0
        else:
            mu = float(np.mean(clean))
            var = float(np.var(clean))
            first_slice = clean[: min(7, clean.size)]
            last_slice = clean[-min(7, clean.size) :]
            first_7 = float(np.mean(first_slice))
            last_7 = float(np.mean(last_slice))
            delta_7 = last_7 - first_7
            slope = _slope_formula(arr)

        feats[f"{col}_mean"] = mu
        feats[f"{col}_var"] = var
        feats[f"{col}_first_7d_mean"] = first_7
        feats[f"{col}_last_7d_mean"] = last_7
        feats[f"{col}_delta_7d"] = delta_7
        feats[f"{col}_slope"] = slope

    ordered_keys = _ordered_feature_keys()
    vector = [float(feats.get(k, 0.0)) for k in ordered_keys]
    return {
        "features": feats,
        "feature_order": ordered_keys,
        "feature_vector": vector,
        "missingness": data_quality or {},
    }


def _ordered_feature_keys() -> list[str]:
    return [
        "steps_mean",
        "sleep_hours_mean",
        "resting_hr_mean",
        "hrv_ms_mean",
        "spo2_mean",
        "temp_c_mean",
        "weight_kg_mean",
        "symptom_score_mean",
        "resting_hr_delta_7d",
        "hrv_ms_delta_7d",
        "symptom_score_delta_7d",
        "steps_slope",
        "resting_hr_slope",
        "hrv_ms_slope",
        "symptom_score_slope",
        "temp_c_slope",
        "weight_kg_slope",
    ]


def score_health_with_ensemble(
    feature_order: list[str],
    feature_vector: list[float],
    n_samples: int = 20,
    sigma_w: float = 0.03,
    z: float = 1.96,
) -> dict:
    weights = np.array(
        [
            -0.00008,  # steps_mean
            -0.10,  # sleep_hours_mean
            0.025,  # resting_hr_mean
            -0.035,  # hrv_ms_mean
            -0.050,  # spo2_mean
            0.280,  # temp_c_mean
            0.006,  # weight_kg_mean
            0.320,  # symptom_score_mean
            0.020,  # resting_hr_delta_7d
            -0.018,  # hrv_ms_delta_7d
            0.160,  # symptom_score_delta_7d
            -0.001,  # steps_slope
            0.120,  # resting_hr_slope
            -0.100,  # hrv_ms_slope
            0.220,  # symptom_score_slope
            0.090,  # temp_c_slope
            0.010,  # weight_kg_slope
        ],
        dtype=float,
    )
    x = np.asarray(feature_vector, dtype=float)
    if x.shape[0] != weights.shape[0]:
        raise ValueError("Feature vector length does not match health model weights.")

    b = -1.05
    linear_score = float(b + np.dot(weights, x))
    base_prob = safe_sigmoid(linear_score)

    rng = np.random.default_rng(42)
    probs = []
    for _ in range(n_samples):
        sampled_w = weights + rng.normal(0.0, sigma_w, size=weights.shape[0])
        sampled_score = float(b + np.dot(sampled_w, x))
        probs.append(safe_sigmoid(sampled_score))

    p_health = float(np.mean(probs))
    var_health = float(np.var(probs))
    ci_health = list(ci_from_var(p_health, var_health, z=z))

    contributions = weights * x
    top_idx = np.argsort(np.abs(contributions))[::-1][:5]
    drivers = []
    for idx in top_idx:
        impact = float(contributions[idx])
        drivers.append(
            {
                "name": feature_order[idx],
                "value": float(x[idx]),
                "impact_hint": "risk_up" if impact >= 0 else "risk_down",
            }
        )

    return {
        "p_health": p_health,
        "var_health": var_health,
        "ci_health": ci_health,
        "linear_score": linear_score,
        "base_prob": base_prob,
        "top_wearable_drivers": drivers,
    }
