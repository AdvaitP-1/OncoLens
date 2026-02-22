# OncoLens Monorepo

OncoLens is a modern screening triage + clinician↔patient collaboration prototype.

- Frontend: Next.js App Router + Tailwind + Supabase JS
- Backend: FastAPI + NumPy/Pandas/Pillow + Supabase REST/Storage
- Database/Auth/Storage: Supabase

## Important Disclaimer

This system is a **research prototype** and provides **screening triage decision-support only**.  
It does **not** provide diagnosis and is **not medical advice**. Outputs require clinician review.

## Repository structure

```text
frontend/   # Next.js app
backend/    # FastAPI service
supabase_schema.sql
```

## 1) Supabase setup

1. Create a Supabase project.
2. In SQL Editor, paste and run `supabase_schema.sql`.
3. In Storage, create bucket: `case-assets` (private).
4. Confirm path convention for case assets:
   - `cases/{case_id}/wearables.csv`
   - `cases/{case_id}/image.png` or `.jpg`

## 2) Environment variables

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
```

Set:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
```

### Backend

```bash
cd backend
cp .env.example .env
```

Set:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=case-assets
APP_VERSION=0.1.0
```

## 3) Run locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 4) Create users + profile roles

1. Open frontend at `http://localhost:3000`.
2. Use `/signup` to create:
   - one clinician account
   - one patient account
3. Signup automatically inserts a `profiles` row with `full_name` and `role`.

## 5) Create case and run analysis

1. Login as clinician.
2. Go to `/clinician/new-case`.
3. Upload:
   - wearables CSV
   - image PNG/JPG
4. Assign patient and click **Create case**.
5. Click **Run analysis** (calls backend).
6. Review outputs in `/clinician/cases/{id}` and `/clinician/imaging/{id}`.

## 6) Test backend with curl

```bash
curl http://127.0.0.1:8000/health
```

```bash
curl -X POST "http://127.0.0.1:8000/cases/{case_id}/run" \
  -H "Content-Type: application/json" \
  -d '{"lambda":0.6,"conservative":true}'
```

## Wearables CSV schema (example)

Required columns (case-insensitive):

- `date`
- `steps`
- `sleep_hours`
- `resting_hr`
- `hrv_ms`
- `spo2`
- `temp_c`
- `weight_kg`
- `symptom_score`

Example:

```csv
date,steps,sleep_hours,resting_hr,hrv_ms,spo2,temp_c,weight_kg,symptom_score
2026-01-01,7200,7.1,67,52,98,36.7,71.2,1
2026-01-02,6800,6.8,69,50,97,36.8,71.2,1
2026-01-03,5400,6.2,72,45,97,37.0,71.3,2
```
