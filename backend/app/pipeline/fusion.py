from app.utils.math import ci_from_var, safe_logit, safe_sigmoid


def fuse_scores(p_health: float, var_health: float, p_vision: float, var_vision: float, lam: float) -> dict:
    lam = max(0.0, min(1.0, lam))
    fused_logit = lam * safe_logit(p_vision) + (1.0 - lam) * safe_logit(p_health)
    p_fused = safe_sigmoid(fused_logit)
    var_fused = (lam**2) * var_vision + ((1.0 - lam) ** 2) * var_health
    return {
        "p_fused": p_fused,
        "var_fused": var_fused,
        "ci_health": ci_from_var(p_health, var_health),
        "ci_vision": ci_from_var(p_vision, var_vision),
        "ci_fused": ci_from_var(p_fused, var_fused),
    }
