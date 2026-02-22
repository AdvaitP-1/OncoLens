from pydantic import BaseModel


class GeminiReasoning(BaseModel):
    clinician_rationale_markdown: str
    patient_summary: str
    image_quality_notes: list[str]
    wearable_signal_notes: list[str]
    followup_questions: list[str]
    limitations: list[str]
    safety_disclaimer: str
    confidence_statement: str
    cancer_risk_tier: str = "unknown"
    cancer_likelihood_rationale: str = ""
