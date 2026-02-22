from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    time: datetime
    version: str


class RunRequest(BaseModel):
    lambda_: float = Field(0.6, alias="lambda", ge=0.0, le=1.0)
    conservative: bool = True


class ActionRecommendation(BaseModel):
    action: str
    expected_utility: float
    benefit: float
    harm: float
    cost: float


class RunResponse(BaseModel):
    case_id: str
    status: str
    data_quality: dict
    scores: dict
    recommendations: list[ActionRecommendation]
    abstain: bool
    abstain_reasons: list[str]
    clinician_report: str
    patient_summary: str
