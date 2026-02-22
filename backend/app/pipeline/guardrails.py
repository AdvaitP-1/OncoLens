def evaluate_guardrails(var_fused: float, data_quality: dict, image_quality: float, conservative: bool) -> dict:
    reasons = []
    var_threshold = 0.018 if conservative else 0.028
    if var_fused > var_threshold:
        reasons.append("high_model_uncertainty")
    if data_quality.get("missing_ratio", 1.0) > 0.25 or data_quality.get("days_covered", 0) < 21:
        reasons.append("data_quality_low")
    if image_quality < 0.30:
        reasons.append("image_quality_low")
    abstain = len(reasons) > 0
    return {"abstain": abstain, "abstain_reasons": reasons}
