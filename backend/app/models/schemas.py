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
    eu: float
    expected_benefit: float
    expected_harm: float
    cost_usd: float


class RunResponse(BaseModel):
    case_id: str
    data_quality: dict
    scores: dict
    uncertainty: dict
    evidence: dict
    status: dict
    recommendations: list[ActionRecommendation]
    reports: dict
