from __future__ import annotations

from io import BytesIO

import numpy as np
from PIL import Image

from app.utils.math import ci_from_var, sigmoid


def _to_gray_array(image_bytes: bytes) -> np.ndarray:
    img = Image.open(BytesIO(image_bytes)).convert("L")
    return np.asarray(img, dtype=np.float32)


def compute_vision_score(image_bytes: bytes, z: float = 1.0) -> dict:
    arr = _to_gray_array(image_bytes)
    h, w = arr.shape
    if h < 8 or w < 8:
        raise ValueError("Image resolution is too low for this prototype.")

    grad_y, grad_x = np.gradient(arr)
    grad_mag = np.sqrt(grad_x * grad_x + grad_y * grad_y)

    lap = (
        -4.0 * arr
        + np.roll(arr, 1, axis=0)
        + np.roll(arr, -1, axis=0)
        + np.roll(arr, 1, axis=1)
        + np.roll(arr, -1, axis=1)
    )
    lap_var = float(np.var(lap))
    quality_scaled = float(np.log1p(lap_var) / 8.0)

    a = 4.2
    b = 0.45
    v0 = 0.004
    v1 = 0.010
    eps = 1e-6
    quality_var_proxy = float(np.clip(v0 + (v1 / (quality_scaled + eps)), 0.002, 0.08))

    rng = np.random.default_rng(7)  # deterministic for demo reproducibility
    quality_samples = quality_scaled + rng.normal(0.0, np.sqrt(quality_var_proxy), size=20)
    p_samples = [sigmoid(a * (float(q) - b)) for q in quality_samples]
    p_vision = float(np.mean(p_samples))
    var_vision = float(np.var(p_samples))
    ci_vision = list(ci_from_var(p_vision, var_vision, z=z))

    grid = _heatmap_grid(grad_mag, n=32)
    return {
        "p_vision": p_vision,
        "var_vision": var_vision,
        "ci_vision": ci_vision,
        "image_quality": quality_scaled,
        "heatmap_32": grid,
        "shape": {"width": int(w), "height": int(h)},
    }


def _heatmap_grid(edge_strength: np.ndarray, n: int = 32) -> list[list[float]]:
    h, w = edge_strength.shape
    cell_h = max(1, h // n)
    cell_w = max(1, w // n)
    out: list[list[float]] = []
    norm = float(np.max(edge_strength) + 1e-6)
    for r in range(n):
        row: list[float] = []
        for c in range(n):
            y0 = r * cell_h
            y1 = h if r == n - 1 else (r + 1) * cell_h
            x0 = c * cell_w
            x1 = w if c == n - 1 else (c + 1) * cell_w
            region = edge_strength[y0:y1, x0:x1]
            score = float(np.mean(region) / norm)
            row.append(max(0.0, min(1.0, score)))
        out.append(row)
    return out
