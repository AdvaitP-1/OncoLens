def build_clinician_report(
    case_id: str, p_health: float, p_vision: float, p_fused: float, abstain: bool, reasons: list[str]
) -> str:
    lines = [
        f"OncoLens screening triage report for case {case_id}.",
        f"Health screening score: {p_health:.4f}. Vision screening score: {p_vision:.4f}. Fused screening score: {p_fused:.4f}.",
    ]
    if abstain:
        lines.append("Guardrails triggered abstention and this case requires clinician review before any action.")
        lines.append(f"Abstain reasons: {', '.join(reasons)}.")
    else:
        lines.append("Guardrails did not trigger abstention. Use as decision-support only and correlate with full clinical context.")
    lines.append("This output is not a diagnosis and should not be used as standalone medical advice.")
    return " ".join(lines)


def build_patient_summary(p_fused: float, status: str, abstain: bool) -> str:
    if abstain:
        return (
            "Your screening information needs additional clinician review before next steps are finalized. "
            "This result is part of a research triage workflow and is not a diagnosis."
        )
    return (
        f"Your current screening triage status is '{status}'. "
        f"The screening support score is {p_fused:.3f}. "
        "Your clinician will review this with your history and advise next steps. This is not a diagnosis."
    )
