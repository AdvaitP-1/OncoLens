from __future__ import annotations

from io import BytesIO
import numpy as np
import pandas as pd

from app.pipeline.constants import (
    HEALTH_BIAS_NOISE_STD,
    HEALTH_ENSEMBLE_SAMPLES,
    HEALTH_MODEL_BIAS,
    HEALTH_MODEL_WEIGHTS,
)
from app.utils.math import ci_from_var, sigmoid


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

DEFAULTS = {
    "steps": 6000.0,
    "sleep_hours": 6.8,
    "resting_hr": 70.0,
    "hrv_ms": 45.0,
    "spo2": 97.0,
    "temp_c": 36.8,
    "weight_kg": 70.0,
    "symptom_score": 2.0,
}


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename_map = {c: c.strip().lower() for c in df.columns}
    df = df.rename(columns=rename_map)
    return df


def build_unified_wearables(csv_payloads: list[tuple[str, bytes]]) -> tuple[pd.DataFrame, dict]:
    """Merge multiple patient CSV forms into canonical wearables schema."""
    daily_frames: list[pd.DataFrame] = []
    source_counts: dict[str, int] = {}

    for path, data in csv_payloads:
        lower_path = path.lower()
        source_counts[lower_path.split("/")[-1]] = source_counts.get(lower_path.split("/")[-1], 0) + 1
        frame = normalize_columns(pd.read_csv(BytesIO(data)))
        if "date" in frame.columns:
            frame["date"] = pd.to_datetime(frame["date"], errors="coerce")

        if {"date", "steps", "sleep_hours"}.issubset(frame.columns):
            mapped = pd.DataFrame(
                {
                    "date": frame["date"],
                    "steps": pd.to_numeric(frame.get("steps"), errors="coerce"),
                    "sleep_hours": pd.to_numeric(frame.get("sleep_hours"), errors="coerce"),
                    "resting_hr": pd.to_numeric(
                        frame.get("resting_hr", frame.get("resting_heart_rate")), errors="coerce"
                    ),
                }
            )
            daily_frames.append(mapped)
            continue

        if {"date", "heart_rate", "oxygen_saturation"}.issubset(frame.columns):
            mapped = pd.DataFrame(
                {
                    "date": frame["date"],
                    "resting_hr": pd.to_numeric(frame.get("heart_rate"), errors="coerce"),
                    "spo2": pd.to_numeric(frame.get("oxygen_saturation"), errors="coerce"),
                    "temp_c": pd.to_numeric(frame.get("temperature_c"), errors="coerce"),
                    "weight_kg": pd.to_numeric(frame.get("weight_kg"), errors="coerce"),
                }
            )
            daily_frames.append(mapped)
            continue

        if {"date", "lab_test", "value"}.issubset(frame.columns):
            labs = frame.copy()
            labs["value"] = pd.to_numeric(labs["value"], errors="coerce")
            pivot = labs.pivot_table(index="date", columns="lab_test", values="value", aggfunc="mean").reset_index()
            crp = pd.to_numeric(pivot.get("CRP"), errors="coerce")
            wbc = pd.to_numeric(pivot.get("WBC"), errors="coerce")
            mapped = pd.DataFrame(
                {
                    "date": pivot["date"],
                    "symptom_score": np.clip(crp / 2.0, 0.0, 10.0) if crp is not None else np.nan,
                    "hrv_ms": np.clip(85.0 - 4.0 * wbc, 10.0, 120.0) if wbc is not None else np.nan,
                }
            )
            daily_frames.append(mapped)

    if not daily_frames:
        raise ValueError("No usable daily patient CSV found. Include wearables, vitals, or labs CSV.")

    merged = pd.concat(daily_frames, ignore_index=True)
    merged = merged.groupby("date", as_index=False).mean(numeric_only=True)
    merged = normalize_columns(merged)
    for col in REQUIRED_COLUMNS:
        if col not in merged.columns:
            merged[col] = np.nan
    merged["date"] = pd.to_datetime(merged["date"], errors="coerce")
    merged = merged.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)
    for col, default in DEFAULTS.items():
        if col not in merged.columns:
            merged[col] = default
        merged[col] = pd.to_numeric(merged[col], errors="coerce")
        median = float(merged[col].median()) if merged[col].notna().any() else default
        merged[col] = merged[col].fillna(median if np.isfinite(median) else default)

    return merged[REQUIRED_COLUMNS], {"sources_ingested": source_counts}


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
    missing_ratio_by_column = {
        col: float(df[col].isna().mean()) for col in feature_cols
    }
    missing_ratio = float(np.mean(list(missing_ratio_by_column.values())))
    gaps_count = int((df["date"].diff().dt.days.fillna(1) > 1).sum())
    quality = {
        "missing_ratio": missing_ratio,
        "missing_ratio_by_column": missing_ratio_by_column,
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
            std = 0.0
            first_7 = 0.0
            last_7 = 0.0
            delta_7 = 0.0
            slope = 0.0
        else:
            mu = float(np.mean(clean))
            std = float(np.std(clean))
            first_slice = clean[: min(7, clean.size)]
            last_slice = clean[-min(7, clean.size) :]
            first_7 = float(np.mean(first_slice))
            last_7 = float(np.mean(last_slice))
            delta_7 = last_7 - first_7
            slope = _slope_formula(arr)

        feats[f"{col}_mean"] = mu
        feats[f"{col}_std"] = std
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
    n_samples: int = HEALTH_ENSEMBLE_SAMPLES,
    z: float = 1.0,
) -> dict:
    weights = np.array([HEALTH_MODEL_WEIGHTS[k] for k in feature_order], dtype=float)
    x = np.asarray(feature_vector, dtype=float)
    if x.shape[0] != weights.shape[0]:
        raise ValueError("Feature vector length does not match health model weights.")

    b = HEALTH_MODEL_BIAS
    rng = np.random.default_rng(42)  # deterministic for demo reproducibility
    probs = []
    sigma_w = 0.05 * np.abs(weights) + 0.01
    for _ in range(n_samples):
        sampled_w = weights + rng.normal(0.0, sigma_w)
        sampled_b = b + float(rng.normal(0.0, HEALTH_BIAS_NOISE_STD))
        sampled_score = float(sampled_b + np.dot(sampled_w, x))
        probs.append(sigmoid(sampled_score))

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
                "impact": impact,
            }
        )

    return {
        "p_health": p_health,
        "var_health": var_health,
        "ci_health": ci_health,
        "top_wearable_drivers": drivers,
    }
