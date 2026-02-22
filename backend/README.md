# OncoLens Backend (FastAPI)

FastAPI service for running a prototype screening triage pipeline on per-case assets stored in Supabase Storage.

## Disclaimer

This is a research prototype for screening triage decision-support only. It is **not** a diagnosis and not medical advice.

## Requirements

- Python 3.11+
- Supabase project with:
  - SQL schema from `../supabase_schema.sql`
  - Storage bucket `case-assets`

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=case-assets
APP_VERSION=0.1.0
```

## Run

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend auto-loads `backend/.env` at startup (without requiring `source .env`).

## Endpoints

- `GET /health`
- `POST /cases/{case_id}/run`

### Curl examples

```bash
curl http://127.0.0.1:8000/health
```

```bash
curl -X POST "http://127.0.0.1:8000/cases/{case_id}/run" \
  -H "Content-Type: application/json" \
  -d '{"lambda":0.6,"conservative":true}'
```

Response shape:

```json
{
  "case_id": "uuid",
  "data_quality": {"days_covered": 28, "gaps_count": 2, "missing_ratio": 0.04},
  "scores": {
    "p_health": 0.412345,
    "ci_health": [0.320000, 0.510000],
    "p_vision": 0.503210,
    "ci_vision": [0.410000, 0.590000],
    "p_fused": 0.457800,
    "ci_fused": [0.320000, 0.600000]
  },
  "uncertainty": {"var_health": 0.0032, "var_vision": 0.0121, "var_fused": 0.0153},
  "evidence": {"top_wearable_drivers": [], "image_quality": 0.41, "heatmap_32": [[0.0]]},
  "status": {"abstain": false, "abstain_reasons": [], "category": "needs_review"},
  "recommendations": [
    {"action": "repeat_imaging", "eu": 0.102, "expected_benefit": 0.266, "expected_harm": 0.130, "cost_usd": 350.0}
  ],
  "reports": {"clinician_report": "...", "patient_summary": "..."}
}
```

## Math -> Code Mapping

- Wearables featureization (mean/variance/7d delta/slope): `app/pipeline/wearables.py`
  - `validate_and_quality()`
  - `_slope_formula()`
  - `compute_features()`
- Health logistic model + Monte Carlo ensemble uncertainty: `app/pipeline/wearables.py`
  - `score_health_with_ensemble()`
- Vision quality scoring + 32x32 heatmap + variance heuristic: `app/pipeline/vision.py`
  - `compute_vision_score()`
  - `_heatmap_grid()`
- Calibration interface (no-op, swappable): `app/pipeline/fusion.py`
  - `IdentityCalibrator.calibrate()`
- Logit fusion + fused uncertainty: `app/pipeline/fusion.py`
  - `fuse_scores()`
- Guardrail abstention rules: `app/pipeline/guardrails.py`
  - `evaluate_guardrails()`
- Expected utility decision engine: `app/pipeline/decision.py`
  - `recommend_actions()`
  - `status_from_score()`
- Float rounding / JSON cleaning (no scientific notation): `app/utils/json_clean.py`
  - `round_floats()`
- Endpoint orchestration and Supabase writes: `app/main.py`
  - `run_case()`

See full formula appendix in `MATH.md`.

## Asset expectations

Each case must have two objects in Supabase Storage bucket `case-assets`:

- `cases/{case_id}/wearables.csv`
- `cases/{case_id}/image.png` (or `.jpg`)

## Wearables CSV schema (case-insensitive columns)

- `date`
- `steps`
- `sleep_hours`
- `resting_hr`
- `hrv_ms`
- `spo2`
- `temp_c`
- `weight_kg`
- `symptom_score`

At least 21 days of coverage is required.

### Example CSV content

```csv
date,steps,sleep_hours,resting_hr,hrv_ms,spo2,temp_c,weight_kg,symptom_score
2026-01-01,7200,7.1,67,52,98,36.7,71.2,1
2026-01-02,6800,6.8,69,50,97,36.8,71.2,1
2026-01-03,5400,6.2,72,45,97,37.0,71.3,2
...
```
