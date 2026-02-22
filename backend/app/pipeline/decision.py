from __future__ import annotations


def recommend_actions(p_fused: float, conservative: bool) -> list[dict]:
    actions = [
        {"action": "monitor_2w", "benefit_weight": 0.42, "harm_weight": 0.12, "cost_weight": 0.18},
        {"action": "repeat_imaging", "benefit_weight": 0.58, "harm_weight": 0.18, "cost_weight": 0.22},
        {"action": "refer_specialist", "benefit_weight": 0.72, "harm_weight": 0.24, "cost_weight": 0.35},
        {"action": "biopsy_consideration", "benefit_weight": 0.82, "harm_weight": 0.44, "cost_weight": 0.55},
    ]
    risk_aversion = 0.85 if conservative else 0.65
    rows = []
    for item in actions:
        benefit = item["benefit_weight"] * p_fused
        harm = item["harm_weight"] * (1 - p_fused)
        cost = item["cost_weight"]
        eu = benefit - risk_aversion * harm - 0.25 * cost
        rows.append(
            {
                "action": item["action"],
                "expected_utility": eu,
                "benefit": benefit,
                "harm": harm,
                "cost": cost,
            }
        )
    rows.sort(key=lambda x: x["expected_utility"], reverse=True)
    return rows[:3]


def status_from_score(p_fused: float, abstain: bool) -> str:
    if abstain:
        return "needs_review"
    if p_fused >= 0.78:
        return "high_priority"
    if p_fused >= 0.52:
        return "ready"
    if p_fused >= 0.32:
        return "monitor"
    return "deferred"
