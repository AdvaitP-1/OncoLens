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
