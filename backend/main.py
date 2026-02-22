"""
OncoLens Backend - FastAPI demo server.
"""
import base64
from pathlib import Path

# Load .env from backend/ or project root
_env_path = Path(__file__).resolve().parent / ".env"
if _env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_path)
import json
import os
import random
import uuid

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.data_loader import load_ham_index
from backend.pipeline import run_pipeline, call_gemini_chat, call_gemini_demo_explanation, call_gemini_pipeline_steps
from backend.benchmark import run_ham_benchmark

app = FastAPI(title="OncoLens Backend", version=os.environ.get("APP_VERSION", "0.1.0"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory case storage
cases: dict[str, dict] = {}

# HAM index (loaded on startup)
ham_index: list[dict] = []
ham_index_error: str | None = None


@app.on_event("startup")
def startup():
    global ham_index, ham_index_error
    ham_index, ham_index_error = load_ham_index()


# --- Models ---


class RunRequest(BaseModel):
    lambda_: float = 0.5
    conservative: bool = False


class ChatRequest(BaseModel):
    message: str


class BenchmarkRequest(BaseModel):
    n_sample: int = 30
    lambda_: float = 0.0
    seed: int | None = 42


class DemoExplainRequest(BaseModel):
    patient_name: str
    image_label: str  # mel or non-mel
    dx: str = ""


# --- HAM Dataset ---


@app.get("/dataset/ham/status")
def get_ham_status():
    """Return dataset status: index exists, counts by class, dataset_dir."""
    if ham_index_error:
        return {
            "index_exists": False,
            "error": ham_index_error,
            "dataset_dir": None,
            "counts_by_class": {},
        }
    counts = {}
    for entry in ham_index:
        dx = entry.get("dx", "unknown")
        counts[dx] = counts.get(dx, 0) + 1
    dataset_dir = None
    if ham_index:
        first_path = Path(ham_index[0].get("filepath", ""))
        if first_path.exists():
            dataset_dir = str(first_path.parent)
    return {
        "index_exists": True,
        "error": None,
        "dataset_dir": dataset_dir,
        "counts_by_class": counts,
        "total": len(ham_index),
    }


@app.get("/dataset/ham/random")
def get_random_ham_image(dx: str | None = None, label: str | None = None, binary_label: int | None = None):
    """
    Pick random image matching dx or binary label.
    dx: mel, nv, bkl, bcc, etc.
    label: mel or non-mel (alias for binary)
    binary_label: 0 or 1 (1=melanoma)
    """
    if ham_index_error:
        raise HTTPException(status_code=503, detail=ham_index_error)

    candidates = ham_index
    if dx:
        candidates = [e for e in ham_index if e.get("dx") == dx.lower()]
    elif label:
        if label.lower() == "mel":
            candidates = [e for e in ham_index if e.get("binary_label_mel") == 1]
        else:
            candidates = [e for e in ham_index if e.get("binary_label_mel") == 0]
    elif binary_label is not None:
        candidates = [e for e in ham_index if e.get("binary_label_mel") == int(binary_label)]

    if not candidates:
        raise HTTPException(status_code=404, detail="No matching images found")

    entry = random.choice(candidates)
    filepath = Path(entry.get("filepath", ""))
    if not filepath.exists():
        raise HTTPException(status_code=500, detail=f"Image file not found: {filepath}")

    with open(filepath, "rb") as f:
        image_bytes = f.read()

    if filepath.suffix.lower() in [".png"]:
        mime_type = "image/png"
    else:
        mime_type = "image/jpeg"

    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    return {
        "image_id": entry.get("image_id"),
        "dx": entry.get("dx"),
        "binary_label_mel": entry.get("binary_label_mel"),
        "age": entry.get("age"),
        "sex": entry.get("sex"),
        "localization": entry.get("localization"),
        "image_base64": image_base64,
        "mime_type": mime_type,
    }


# --- Cases ---


@app.post("/cases")
async def create_case(
    wearables_csv: UploadFile | None = File(None),
    image: UploadFile | None = File(None),
    dataset_image_id: str | None = Form(None),
):
    """Create a new case. Optional: wearables_csv, image, or dataset_image_id."""
    case_id = str(uuid.uuid4())

    case_data = {
        "id": case_id,
        "wearables_csv": None,
        "image_data": None,
        "dataset_image_id": None,
    }

    if wearables_csv and wearables_csv.filename:
        case_data["wearables_csv"] = (await wearables_csv.read()).decode("utf-8", errors="replace")

    if image and image.filename:
        case_data["image_data"] = base64.b64encode(await image.read()).decode("utf-8")
        case_data["image_mime"] = image.content_type or "image/jpeg"

    if dataset_image_id:
        if ham_index_error:
            raise HTTPException(status_code=503, detail=ham_index_error)
        for entry in ham_index:
            if entry.get("image_id") == dataset_image_id:
                filepath = Path(entry.get("filepath", ""))
                if filepath.exists():
                    with open(filepath, "rb") as f:
                        case_data["image_data"] = base64.b64encode(f.read()).decode("utf-8")
                    case_data["image_mime"] = "image/jpeg" if filepath.suffix.lower() in [".jpg", ".jpeg"] else "image/png"
                    case_data["dataset_image_id"] = dataset_image_id
                    case_data["dataset_metadata"] = {
                        "dx": entry.get("dx"),
                        "binary_label_mel": entry.get("binary_label_mel"),
                        "age": entry.get("age"),
                        "sex": entry.get("sex"),
                        "localization": entry.get("localization"),
                    }
                break
        if not case_data.get("image_data"):
            raise HTTPException(status_code=404, detail=f"Dataset image not found: {dataset_image_id}")

    cases[case_id] = case_data
    return {"case_id": case_id}


@app.get("/cases/{case_id}")
def get_case(case_id: str):
    """Get case details and run result if available."""
    if case_id not in cases:
        raise HTTPException(status_code=404, detail="Case not found")
    case = cases[case_id].copy()
    # Don't send full image base64 in response
    if "image_data" in case:
        case["has_image"] = True
        case.pop("image_data", None)
        case.pop("image_mime", None)
    return case


@app.post("/cases/{case_id}/run")
async def run_case(case_id: str, body: RunRequest):
    """Run full pipeline for the case."""
    if case_id not in cases:
        raise HTTPException(status_code=404, detail="Case not found")

    case = cases[case_id]
    if not case.get("image_data"):
        raise HTTPException(
            status_code=400,
            detail="Image is required for this demo. Please attach an image or pick a dataset image.",
        )

    try:
        result = run_pipeline(
            case=case,
            lambda_=body.lambda_,
            conservative=body.conservative,
        )
        case["result"] = result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cases/{case_id}/chat")
async def case_chat(case_id: str, body: ChatRequest):
    """Multi-turn chat: clinician asks follow-up questions about the case."""
    if case_id not in cases:
        raise HTTPException(status_code=404, detail="Case not found")
    case = cases[case_id]
    if not case.get("result"):
        raise HTTPException(
            status_code=400,
            detail="Run analysis first before asking questions.",
        )
    try:
        reply = call_gemini_chat(case, body.message)
        if "chat_history" not in case:
            case["chat_history"] = []
        case["chat_history"].append({"role": "user", "content": body.message})
        case["chat_history"].append({"role": "assistant", "content": reply})
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/pipeline/steps")
def get_pipeline_steps():
    """Return pipeline step descriptions from Gemini (id, label, description)."""
    try:
        steps = call_gemini_pipeline_steps()
        return {"steps": steps}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/demo/explain")
def demo_explain(body: DemoExplainRequest):
    """Generate Gemini explanation of what's happening in the mock demo."""
    try:
        explanation = call_gemini_demo_explanation(
            patient_name=body.patient_name,
            image_label=body.image_label,
            dx=body.dx,
        )
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/benchmark/ham/run")
def run_benchmark(body: BenchmarkRequest):
    """
    Run HAM10000 benchmark: evaluate vision pipeline on stratified sample.
    Returns accuracy, AUC, sensitivity, specificity.
    """
    try:
        result = run_ham_benchmark(
            n_sample=min(max(body.n_sample, 4), 100),
            lambda_=body.lambda_,
            seed=body.seed,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok", "version": os.environ.get("APP_VERSION", "0.1.0")}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
