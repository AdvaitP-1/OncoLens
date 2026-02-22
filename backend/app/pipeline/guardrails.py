from app.pipeline.constants import IMG_QUALITY_THRESHOLD, VAR_FUSED_THRESHOLD


def evaluate_guardrails(var_fused: float, data_quality: dict, image_quality: float) -> dict:
    reasons: list[str] = []

    data_quality_low = data_quality.get("days_covered", 0) < 21 or data_quality.get("gaps_count", 0) > 5
    high_uncertainty = var_fused > VAR_FUSED_THRESHOLD
    image_quality_low = image_quality < IMG_QUALITY_THRESHOLD

    if data_quality_low:
        reasons.append("data_quality_low")
    if high_uncertainty:
        reasons.append("high_uncertainty")
    if image_quality_low:
        reasons.append("image_quality_low")

    abstain = data_quality_low or high_uncertainty or image_quality_low
    return {
        "abstain": abstain,
        "abstain_reasons": reasons,
        "category": "deferred" if abstain else None,
        "flags": {
            "data_quality_low": data_quality_low,
            "high_uncertainty": high_uncertainty,
            "image_quality_low": image_quality_low,
        },
    }
