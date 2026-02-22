from __future__ import annotations

from io import BytesIO

import numpy as np
from PIL import Image, ImageFilter


def _to_gray_array(image_bytes: bytes) -> np.ndarray:
    img = Image.open(BytesIO(image_bytes)).convert("L")
    return np.asarray(img, dtype=np.float32)


def compute_vision_score(image_bytes: bytes) -> dict:
    arr = _to_gray_array(image_bytes)
    h, w = arr.shape
    if h < 8 or w < 8:
        raise ValueError("Image resolution is too low for this prototype.")

    gx = np.gradient(arr, axis=1)
    gy = np.gradient(arr, axis=0)
    edge_strength = np.sqrt(gx * gx + gy * gy)
    sobel_like = float(np.mean(edge_strength))

    pil = Image.fromarray(arr.astype(np.uint8))
    lap = pil.filter(ImageFilter.FIND_EDGES)
    lap_arr = np.asarray(lap, dtype=np.float32)
    focus_proxy = float(np.var(lap_arr) / (np.var(arr) + 1e-6))

    normalized_texture = min(1.0, sobel_like / 35.0)
    normalized_focus = min(1.0, focus_proxy / 2.5)
    p_vision = float(0.25 + 0.55 * normalized_texture + 0.20 * normalized_focus)
    p_vision = max(0.0, min(1.0, p_vision))

    quality = min(1.0, (normalized_texture + normalized_focus) / 2.0)
    variance = float(0.012 + 0.02 * (1.0 - quality))

    grid = _heatmap_grid(edge_strength)
    return {
        "p_vision": p_vision,
        "var_vision": variance,
        "image_quality": quality,
        "evidence_grid": grid,
        "shape": {"width": int(w), "height": int(h)},
    }


def _heatmap_grid(edge_strength: np.ndarray, n: int = 8) -> list[list[float]]:
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
