from app.pipeline.constants import FUSION_W0, FUSION_W1, FUSION_W2
from app.utils.math import ci_from_var, logit, sigmoid


class IdentityCalibrator:
    def calibrate(self, prob: float) -> float:
        return float(prob)


def fuse_scores(
    p_health: float,
    var_health: float,
    p_vision: float,
    var_vision: float,
    calibrator: IdentityCalibrator | None = None,
    w0: float = FUSION_W0,
    w1: float = FUSION_W1,
    w2: float = FUSION_W2,
    z: float = 1.0,
) -> dict:
    calibrator = calibrator or IdentityCalibrator()
    p_health_cal = calibrator.calibrate(p_health)
    p_vision_cal = calibrator.calibrate(p_vision)

    fused_logit = w0 + w1 * logit(p_vision_cal) + w2 * logit(p_health_cal)
    p_fused = sigmoid(fused_logit)
    var_fused = var_health + var_vision
    return {
        "p_fused": p_fused,
        "var_fused": var_fused,
        "ci_fused": list(ci_from_var(p_fused, var_fused, z=z)),
    }
