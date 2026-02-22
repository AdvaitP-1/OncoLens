from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException

from app.gemini.client import generate_gemini_reasoning
from app.models.schemas import HealthResponse, RunRequest, RunResponse, ActionRecommendation
from app.pipeline.decision import recommend_actions, status_from_score
from app.pipeline.fusion import IdentityCalibrator, fuse_scores
from app.pipeline.guardrails import evaluate_guardrails
from app.pipeline.reporting import build_clinician_report, build_patient_summary
from app.pipeline.vision import compute_vision_score
from app.pipeline.wearables import (
    build_unified_wearables,
    validate_and_quality,
    compute_features,
    score_health_with_ensemble,
)
from app.settings import settings
from app.supabase_client import supabase_client
from app.utils.json_clean import round_floats
from app.api import rag_uploads

app = FastAPI(title="OncoLens API", version=settings.app_version)
app.include_router(rag_uploads.router)


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
        async with supabase_client() as sb:
            case = await sb.fetch_case(case_id)
            if not case:
                raise HTTPException(status_code=404, detail="Case not found.")

            assets = await sb.fetch_case_assets(case_id)
            if not assets:
                raise HTTPException(status_code=400, detail="No assets found for case.")

            wearables_assets = [a for a in assets if a.get("asset_type") == "wearables_csv"]
            image_asset = next((a for a in assets if a.get("asset_type") == "image"), None)
            if not wearables_assets or not image_asset:
                raise HTTPException(status_code=400, detail="Missing required assets: wearables_csv and image.")

            try:
                csv_payloads = []
                for asset in wearables_assets:
                    bytes_data = await sb.download_storage_object(asset["storage_path"])
                    csv_payloads.append((asset["storage_path"], bytes_data))
                image_bytes = await sb.download_storage_object(image_asset["storage_path"])
            except Exception as exc:
                raise HTTPException(status_code=400, detail=f"Failed to download assets from storage: {exc}") from exc

            try:
                unified_df, source_info = build_unified_wearables(csv_payloads)
                clean_df, data_quality = validate_and_quality(unified_df)
                data_quality["sources_ingested"] = source_info["sources_ingested"]
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

            image_mime = "image/png"
            storage_path_lower = image_asset.get("storage_path", "").lower()
            if storage_path_lower.endswith(".jpg") or storage_path_lower.endswith(".jpeg"):
                image_mime = "image/jpeg"

            case_context = {
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
                "status": {
                    "abstain": guardrails["abstain"],
                    "abstain_reasons": guardrails["abstain_reasons"],
                    "category": status_category,
                },
                "top_wearable_drivers": health["top_wearable_drivers"],
                "image_quality": vision["image_quality"],
                "recommendations": recs,
            }

            gemini_reasoning, gemini_meta = await generate_gemini_reasoning(
                case_context=case_context,
                image_bytes=image_bytes,
                image_mime_type=image_mime,
            )
            if gemini_reasoning:
                clinician_report = gemini_reasoning.clinician_rationale_markdown
                patient_summary = gemini_reasoning.patient_summary

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
                "gemini": gemini_meta,
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
                    "gemini_reasoning": gemini_reasoning.model_dump() if gemini_reasoning else {},
                    "gemini_meta": rounded_response["gemini"],
                    "clinician_visible_scores": True,
                    "last_updated": datetime.now(timezone.utc).isoformat(),
                }
            )
            await sb.update_case(case_id, update_payload)

            return RunResponse(
                case_id=rounded_response["case_id"],
                data_quality=rounded_response["data_quality"],
                scores=rounded_response["scores"],
                uncertainty=rounded_response["uncertainty"],
                evidence=rounded_response["evidence"],
                status=rounded_response["status"],
                recommendations=[ActionRecommendation(**r) for r in rounded_response["recommendations"]],
                reports=rounded_response["reports"],
                gemini=rounded_response["gemini"],
            )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

# ── List cases (optionally filtered by created_by) ──────────────────────────
@app.get("/cases")
async def list_cases(created_by: str | None = None):
    async with supabase_client() as sb:
        url = f"{settings.postgrest_url}/cases?select=*&order=last_updated.desc"
        if created_by:
            url += f"&created_by=eq.{created_by}"
        res = await sb._client.get(url, headers=sb._headers)
        res.raise_for_status()
        return res.json()

# ── Fetch a single case ─────────────────────────────────────────────────────
@app.get("/cases/{case_id}")
async def get_case(case_id: str):
    async with supabase_client() as sb:
        url = f"{settings.postgrest_url}/cases?id=eq.{case_id}&select=*"
        res = await sb._client.get(url, headers=sb._headers)
        res.raise_for_status()
        rows = res.json()
        if not rows:
            raise HTTPException(status_code=404, detail="Case not found.")
        return rows[0]

# ── Fetch scores/report for a case ─────────────────────────────────────────
@app.get("/cases/{case_id}/report")
async def get_case_report(case_id: str):
    async with supabase_client() as sb:
        url = f"{settings.postgrest_url}/cases?id=eq.{case_id}&select=scores"
        res = await sb._client.get(url, headers=sb._headers)
        res.raise_for_status()
        rows = res.json()
        if not rows:
            raise HTTPException(status_code=404, detail="Case not found.")
        return rows[0]

# ── Insert a doctor note ────────────────────────────────────────────────────
@app.post("/cases/{case_id}/notes")
async def add_doctor_note(case_id: str, body: dict):
    async with supabase_client() as sb:
        url = f"{settings.postgrest_url}/doctor_notes"
        res = await sb._client.post(url, headers=sb._headers, json={
            "case_id": case_id,
            "author_id": body["author_id"],
            "note": body["note"],
        })
        res.raise_for_status()
        return {"ok": True}