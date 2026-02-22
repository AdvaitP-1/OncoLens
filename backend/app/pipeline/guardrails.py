def evaluate_guardrails(var_fused: float, data_quality: dict, image_quality: float, conservative: bool) -> dict:
    reasons: list[str] = []

    data_quality_low = data_quality.get("days_covered", 0) < 21 or data_quality.get("gaps_count", 0) > 5
    uncertainty_threshold = 0.03 if conservative else 0.05
    high_uncertainty = var_fused > uncertainty_threshold
    image_quality_threshold = 0.25 if conservative else 0.20
    image_quality_low = image_quality < image_quality_threshold

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
        "flags": {
            "data_quality_low": data_quality_low,
            "high_uncertainty": high_uncertainty,
            "image_quality_low": image_quality_low,
        },
    }
