from __future__ import annotations


ACTION_TABLE = [
    {"action": "monitor_2w", "cost_usd": 120.0, "u_pos": 0.42, "u_neg": -0.18},
    {"action": "repeat_imaging", "cost_usd": 350.0, "u_pos": 0.58, "u_neg": -0.24},
    {"action": "refer_specialist", "cost_usd": 780.0, "u_pos": 0.74, "u_neg": -0.36},
    {"action": "biopsy_consideration", "cost_usd": 1800.0, "u_pos": 0.86, "u_neg": -0.62},
]


def recommend_actions(p_fused: float, lambda_cost: float, abstain: bool) -> list[dict]:
    if abstain:
        return [
            {
                "action": "defer_to_clinician",
                "eu": 0.0,
                "expected_benefit": 0.0,
                "expected_harm": 0.0,
                "cost_usd": 0.0,
            }
        ]

    rows = []
    cost_scale = 1000.0
    for item in ACTION_TABLE:
        cost_scaled = item["cost_usd"] / cost_scale
        eu = p_fused * item["u_pos"] + (1.0 - p_fused) * item["u_neg"] - lambda_cost * cost_scaled
        expected_benefit = p_fused * item["u_pos"]
        expected_harm = (1.0 - p_fused) * abs(item["u_neg"])
        rows.append(
            {
                "action": item["action"],
                "eu": eu,
                "expected_benefit": expected_benefit,
                "expected_harm": expected_harm,
                "cost_usd": item["cost_usd"],
            }
        )
    rows.sort(key=lambda x: x["eu"], reverse=True)
    return rows[:3]


def status_from_score(p_fused: float, abstain: bool) -> str:
    if abstain:
        return "deferred"
    if p_fused >= 0.70:
        return "high_priority"
    if p_fused >= 0.40:
        return "needs_review"
    return "monitor"
