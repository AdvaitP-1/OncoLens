# OncoLens Frontend (Next.js + Tailwind)

Next.js App Router frontend for clinician and patient collaboration on screening triage cases.

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

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Included flows

- Email/password auth (`/login`, `/signup`, `/forgot-password`)
- Role-based routing to clinician/patient dashboards
- Clinician case creation with storage upload:
  - multiple CSV files under `cases/{case_id}/csv/*.csv`
  - `cases/{case_id}/image.png|jpg`
- Triggering backend analysis via `/api/cases/run`
- Case detail with probabilities, recommendations, notes, and abstain banner
- Realtime messaging using Supabase Realtime subscriptions

### Multi-CSV patient upload

The clinician new-case flow accepts multiple patient CSVs in one case upload.  
Example formats that are supported in the backend merge step:

- `wearable_single.csv`
- `daily_vitals_single.csv`
- `daily_labs_single.csv`
- `medications_single.csv` (metadata-only)
- `patient_profile_single.csv` (metadata-only)
- `clinical_notes_single.csv` (metadata-only)
- `imaging_single.csv` (metadata-only)

## Main routes

- Clinician:
  - `/clinician/dashboard`
  - `/clinician/new-case`
  - `/clinician/cases/[id]`
  - `/clinician/imaging/[id]`
  - `/clinician/messages`
  - `/clinician/audit`
- Patient:
  - `/patient/dashboard`
  - `/patient/cases/[id]`
  - `/patient/messages`
