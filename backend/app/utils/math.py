import numpy as np
from typing import Any


def sigmoid(x: float) -> float:
    x = np.clip(x, -20.0, 20.0)
    return float(1.0 / (1.0 + np.exp(-x)))


def logit(p: float, eps: float = 1e-6) -> float:
    p = np.clip(p, eps, 1 - eps)
    return float(np.log(p / (1 - p)))


def ci_from_var(p: float, var: float, z: float = 1.0) -> tuple[float, float]:
    sd = float(np.sqrt(max(var, 0.0)))
    low = max(0.0, p - z * sd)
    high = min(1.0, p + z * sd)
    return float(low), float(high)


def round_floats(value: Any, ndigits: int = 6) -> Any:
    if isinstance(value, float):
        return float(f"{value:.{ndigits}f}")
    if isinstance(value, list):
        return [round_floats(item, ndigits) for item in value]
    if isinstance(value, dict):
        return {k: round_floats(v, ndigits) for k, v in value.items()}
    return value

