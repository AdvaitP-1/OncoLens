# OncoLens

Clinical decision support demo for skin lesion analysis. Full-stack app with wearables + vision fusion, Gemini reasoning, and HAM10000 dataset integration.

## Structure

- **`/frontend`** – Next.js App Router + Tailwind
- **`/backend`** – FastAPI
- **`/sample_cases`** – Demo CSV files (wearables)
- **`/tools`** – Scripts (e.g. `build_ham_index.py`)

## Prerequisites

- Python 3.10+
- Node.js 18+
- Kaggle account (for HAM10000 dataset)

## 1. KaggleHub Setup

The HAM10000 dataset is downloaded via [kagglehub](https://github.com/Kaggle/kagglehub).

### Authentication

1. Install kagglehub: `pip install kagglehub`
2. Create a Kaggle API token:
   - Go to [Kaggle Account](https://www.kaggle.com/settings) → API → Create New Token
   - This downloads `kaggle.json`
3. Place `kaggle.json` in `~/.kaggle/` (or set `KAGGLE_USERNAME` and `KAGGLE_KEY` env vars)
4. **Do not commit** `kaggle.json` or any tokens to the repo

### Alternative: `kagglehub.login()`

Run `python -c "import kagglehub; kagglehub.login()"` and follow the prompts.

## 2. Build HAM Index

Before running the backend, build the image index:

```bash
pip install kagglehub
python tools/build_ham_index.py
```

This will:

1. Download/cache the HAM10000 dataset via kagglehub
2. Load `HAM10000_metadata.csv` from the project root (includes age, sex, localization)
3. Scan the dataset directory for image files
4. Output `backend/data/ham_index.json` with metadata for richer Gemini reasoning

If the index is missing, the backend returns: *"HAM index not built. Run: python tools/build_ham_index.py"*

**Note:** If you already built the index, rebuild it to get age/sex/localization: `python tools/build_ham_index.py`

## 3. Environment Variables

### Backend

Create `backend/.env` or set:

```bash
export GEMINI_API_KEY=your_gemini_api_key
export HAM_DATASET_ID=kmader/skin-cancer-mnist-ham10000
export APP_VERSION=0.1.0
```

### Frontend

Create `frontend/.env.local`:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## 4. Run Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Or from project root:

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## 5. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Flow

1. **New Case** (`/new-case`):
   - Upload wearables CSV **or** choose "Use sample CSV"
   - In "Pick Dataset Image": select class/label and click "Random sample"
   - Or upload your own image
   - Click "Create Case"

2. **Case Analysis** (`/cases/[id]`):
   - **DAG tab**: Pipeline nodes + right-side reasoning panel (Gemini per-node reasoning)
   - **Graphs tab**: Scores, CIs, heatmap
   - **Mock Patient tab**: Load Patient A/B/C CSV, pick random mel/non-mel image, Create & Run

3. **Run Analysis**: Click "Run Analysis" to execute the pipeline (wearables → vision → fusion → guardrails → Gemini reasoning).

## Datasets Policy

- **No images in git.** The HAM10000 dataset (~6GB) is downloaded/cached locally via kagglehub.
- The app works on the developer machine where the dataset is cached.
- `ham_index.json` is generated locally and should not be committed (paths are machine-specific).

## Security

- Never hardcode secrets.
- `GEMINI_API_KEY` is backend-only.
- Kaggle tokens: use `~/.kaggle/kaggle.json` or env vars; do not embed in the repo.
