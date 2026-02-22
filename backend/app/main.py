from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO

import pandas as pd
from fastapi import FastAPI, HTTPException

from app.models.schemas import HealthResponse, RunRequest, RunResponse, ActionRecommendation
from app.pipeline.decision import recommend_actions, status_from_score
from app.pipeline.fusion import IdentityCalibrator, fuse_scores
from app.pipeline.guardrails import evaluate_guardrails
from app.pipeline.reporting import build_clinician_report, build_patient_summary
from app.pipeline.vision import compute_vision_score
from app.pipeline.wearables import validate_and_quality, compute_features, score_health_with_ensemble
from app.settings import settings
from app.supabase_client import SupabaseClient
from app.utils.json_clean import round_floats

app = FastAPI(title="OncoLens API", version=settings.app_version)


@app.on_event("startup")
async def startup_validate_config() -> None:
    # Fail fast so config mistakes are caught immediately at boot.
    settings.validate_runtime_config()


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", time=datetime.now(timezone.utc), version=settings.app_version)


@app.post("/cases/{case_id}/run", response_model=RunResponse)
async def run_case(case_id: str, body: RunRequest) -> RunResponse:
    try:
        sb = SupabaseClient()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
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
        clean_df, data_quality = validate_and_quality(df)
        wearables = compute_features(clean_df, data_quality=data_quality)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid wearables CSV: {exc}") from exc

    health = score_health_with_ensemble(
        feature_order=wearables["feature_order"],
        feature_vector=wearables["feature_vector"],
    )

    try:
        vision = compute_vision_score(image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image asset: {exc}") from exc

    p_vision = vision["p_vision"]
    var_vision = vision["var_vision"]
    fusion = fuse_scores(
        p_health=health["p_health"],
        var_health=health["var_health"],
        p_vision=p_vision,
        var_vision=var_vision,
        calibrator=IdentityCalibrator(),
    )
    guardrails = evaluate_guardrails(
        var_fused=fusion["var_fused"],
        data_quality=data_quality,
        image_quality=vision["image_quality"],
        conservative=body.conservative,
    )

    status_category = status_from_score(fusion["p_fused"], guardrails["abstain"])
    recs = recommend_actions(
        p_fused=fusion["p_fused"], lambda_cost=body.lambda_, abstain=guardrails["abstain"]
    )

    clinician_report = build_clinician_report(
        case_id=case_id,
        p_health=health["p_health"],
        p_vision=p_vision,
        p_fused=fusion["p_fused"],
        abstain=guardrails["abstain"],
        reasons=guardrails["abstain_reasons"],
    )
    patient_summary = build_patient_summary(
        p_fused=fusion["p_fused"], status=status_category, abstain=guardrails["abstain"]
    )

    response_payload = {
        "case_id": case_id,
        "data_quality": {
            "days_covered": data_quality.get("days_covered", 0),
            "gaps_count": data_quality.get("gaps_count", 0),
            "missing_ratio": data_quality.get("missing_ratio", 1.0),
        },
        "scores": {
            "p_health": health["p_health"],
            "ci_health": health["ci_health"],
            "p_vision": p_vision,
            "ci_vision": vision["ci_vision"],
            "p_fused": fusion["p_fused"],
            "ci_fused": fusion["ci_fused"],
        },
        "uncertainty": {
            "var_health": health["var_health"],
            "var_vision": var_vision,
            "var_fused": fusion["var_fused"],
        },
        "evidence": {
            "top_wearable_drivers": health["top_wearable_drivers"],
            "image_quality": vision["image_quality"],
            "heatmap_32": vision["heatmap_32"],
        },
        "status": {
            "abstain": guardrails["abstain"],
            "abstain_reasons": guardrails["abstain_reasons"],
            "category": status_category,
        },
        "recommendations": recs,
        "reports": {
            "clinician_report": clinician_report,
            "patient_summary": patient_summary,
        },
    }
    rounded_response = round_floats(response_payload)

    update_payload = round_floats(
        {
            "status": status_category,
            "data_quality": rounded_response["data_quality"],
            "scores": {
                "scores": rounded_response["scores"],
                "uncertainty": rounded_response["uncertainty"],
                "evidence": rounded_response["evidence"],
            },
            "recommendations": rounded_response["recommendations"],
            "abstain": rounded_response["status"]["abstain"],
            "abstain_reasons": rounded_response["status"]["abstain_reasons"],
            "clinician_report": rounded_response["reports"]["clinician_report"],
            "patient_summary": rounded_response["reports"]["patient_summary"],
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
    )
    await sb.update_case(case_id, update_payload)

    response = RunResponse(
        case_id=rounded_response["case_id"],
        data_quality=rounded_response["data_quality"],
        scores=rounded_response["scores"],
        uncertainty=rounded_response["uncertainty"],
        evidence=rounded_response["evidence"],
        status=rounded_response["status"],
        recommendations=[ActionRecommendation(**r) for r in rounded_response["recommendations"]],
        reports=rounded_response["reports"],
    )
    return response
