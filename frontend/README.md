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
  - `cases/{case_id}/wearables.csv`
  - `cases/{case_id}/image.png|jpg`
- Triggering backend analysis via `/api/cases/run`
- Case detail with probabilities, recommendations, notes, and abstain banner
- Realtime messaging using Supabase Realtime subscriptions

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
