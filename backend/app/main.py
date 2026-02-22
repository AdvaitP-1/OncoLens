from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO

import pandas as pd
from fastapi import FastAPI, HTTPException

from app.models.schemas import HealthResponse, RunRequest, RunResponse, ActionRecommendation
from app.pipeline.decision import recommend_actions, status_from_score
from app.pipeline.fusion import fuse_scores
from app.pipeline.guardrails import evaluate_guardrails
from app.pipeline.reporting import build_clinician_report, build_patient_summary
from app.pipeline.vision import compute_vision_score
from app.pipeline.wearables import validate_and_quality, compute_features, score_health
from app.settings import settings
from app.supabase_client import SupabaseClient
from app.utils.json_clean import round_floats

app = FastAPI(title="OncoLens API", version=settings.app_version)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", time=datetime.now(timezone.utc), version=settings.app_version)


@app.post("/cases/{case_id}/run", response_model=RunResponse)
async def run_case(case_id: str, body: RunRequest) -> RunResponse:
    sb = SupabaseClient()
    case = await sb.fetch_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    assets = await sb.fetch_case_assets(case_id)
    if not assets:
        raise HTTPException(status_code=400, detail="No assets found for case.")

    wearables_asset = next((a for a in assets if a.get("asset_type") == "wearables_csv"), None)
    image_asset = next((a for a in assets if a.get("asset_type") == "image"), None)
    if not wearables_asset or not image_asset:
        raise HTTPException(status_code=400, detail="Missing required assets: wearables_csv and image.")

    try:
        csv_bytes = await sb.download_storage_object(wearables_asset["storage_path"])
        image_bytes = await sb.download_storage_object(image_asset["storage_path"])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to download assets from storage: {exc}") from exc

    try:
        df = pd.read_csv(BytesIO(csv_bytes))
        data_quality = validate_and_quality(df)
        features = compute_features(df)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid wearables CSV: {exc}") from exc

    p_health, var_health = score_health(features)

    try:
        vision = compute_vision_score(image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image asset: {exc}") from exc

    p_vision = vision["p_vision"]
    var_vision = vision["var_vision"]
    fusion = fuse_scores(p_health, var_health, p_vision, var_vision, body.lambda_)
    guardrails = evaluate_guardrails(
        var_fused=fusion["var_fused"],
        data_quality=data_quality,
        image_quality=vision["image_quality"],
        conservative=body.conservative,
    )

    recs = recommend_actions(fusion["p_fused"], body.conservative)
    status = status_from_score(fusion["p_fused"], guardrails["abstain"])
    clinician_report = build_clinician_report(
        case_id=case_id,
        p_health=p_health,
        p_vision=p_vision,
        p_fused=fusion["p_fused"],
        abstain=guardrails["abstain"],
        reasons=guardrails["abstain_reasons"],
    )
    patient_summary = build_patient_summary(
        p_fused=fusion["p_fused"], status=status, abstain=guardrails["abstain"]
    )

    scores = {
        "p_health": p_health,
        "p_vision": p_vision,
        "p_fused": fusion["p_fused"],
        "var_health": var_health,
        "var_vision": var_vision,
        "var_fused": fusion["var_fused"],
        "ci_health": list(fusion["ci_health"]),
        "ci_vision": list(fusion["ci_vision"]),
        "ci_fused": list(fusion["ci_fused"]),
        "evidence_grid": vision["evidence_grid"],
        "image_shape": vision["shape"],
        "image_quality": vision["image_quality"],
    }

    update_payload = round_floats(
        {
            "status": status,
            "data_quality": data_quality,
            "scores": scores,
            "recommendations": recs,
            "abstain": guardrails["abstain"],
            "abstain_reasons": guardrails["abstain_reasons"],
            "clinician_report": clinician_report,
            "patient_summary": patient_summary,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
    )
    await sb.update_case(case_id, update_payload)

    response = RunResponse(
        case_id=case_id,
        status=status,
        data_quality=round_floats(data_quality),
        scores=round_floats(scores),
        recommendations=[ActionRecommendation(**round_floats(r)) for r in recs],
        abstain=guardrails["abstain"],
        abstain_reasons=guardrails["abstain_reasons"],
        clinician_report=clinician_report,
        patient_summary=patient_summary,
    )
    return response
