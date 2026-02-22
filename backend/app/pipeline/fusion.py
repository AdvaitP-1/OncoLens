from app.utils.math import ci_from_var, safe_logit, safe_sigmoid


class IdentityCalibrator:
    def calibrate(self, prob: float) -> float:
        return float(prob)


def fuse_scores(
    p_health: float,
    var_health: float,
    p_vision: float,
    var_vision: float,
    calibrator: IdentityCalibrator | None = None,
    w0: float = 0.0,
    w1: float = 0.5,
    w2: float = 0.5,
    z: float = 1.96,
) -> dict:
    calibrator = calibrator or IdentityCalibrator()
    p_health_cal = calibrator.calibrate(p_health)
    p_vision_cal = calibrator.calibrate(p_vision)

    fused_logit = w0 + w1 * safe_logit(p_vision_cal) + w2 * safe_logit(p_health_cal)
    p_fused = safe_sigmoid(fused_logit)
    var_fused = var_health + var_vision
    return {
        "p_fused": p_fused,
        "var_fused": var_fused,
        "ci_fused": list(ci_from_var(p_fused, var_fused, z=z)),
        "p_health_calibrated": p_health_cal,
        "p_vision_calibrated": p_vision_cal,
    }
