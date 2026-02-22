import numpy as np


def safe_sigmoid(x: float) -> float:
    x = np.clip(x, -20.0, 20.0)
    return float(1.0 / (1.0 + np.exp(-x)))


def safe_logit(p: float) -> float:
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return float(np.log(p / (1 - p)))


def ci_from_var(p: float, var: float, z: float = 1.96) -> tuple[float, float]:
    sd = float(np.sqrt(max(var, 0.0)))
    low = max(0.0, p - z * sd)
    high = min(1.0, p + z * sd)
    return float(low), float(high)
