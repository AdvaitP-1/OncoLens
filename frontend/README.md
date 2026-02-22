# OncoLens Frontend (Next.js + Tailwind)

Next.js App Router frontend for oncology screening triage with LLM reasoning, RAG, and cancer prediction.

## Disclaimer

Research prototype only. The UI surfaces screening scores and triage suggestions, not diagnosis.

## Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
```

**Supabase:** Enable **Anonymous sign-in** in Authentication > Providers for hackathon mode (no login UI).

## Run

```bash
npm run dev
```

Open `http://localhost:3000`. Click "Go to Dashboard" to access the clinician flow directly.

## Included flows (hackathon)

- Anonymous auth (no login/signup UI)
- Clinician case creation: upload CSVs + image, run analysis
- LLM reasoning with RAG and cancer risk assessment
- Case detail with scores, recommendations, imaging heatmap

### Multi-CSV upload

Supported formats: `wearable_single`, `daily_vitals_single`, `daily_labs_single`, `medications_single`, `patient_profile_single`, `clinical_notes_single`, `imaging_single`.

## Main routes

- `/` — Home
- `/clinician/dashboard` — Case overview
- `/clinician/new-case` — Create case, upload CSV + image, run analysis
- `/clinician/cases/[id]` — Case detail with scores and LLM report
- `/clinician/imaging/[id]` — Imaging heatmap and quality
