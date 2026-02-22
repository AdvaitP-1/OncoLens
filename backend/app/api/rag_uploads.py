# app/api/rag_uploads.py
# API endpoint for uploading patient documents to the RAG system
# Handles file storage and triggers background processing for embedding generation

from typing import Optional
from fastapi import APIRouter, UploadFile, File
from uuid import UUID
import os, uuid
from pathlib import Path
from dotenv import load_dotenv

from supabase import create_client

# Load environment variables from .env file in backend directory
# Calculate path: api -> app -> backend (2 levels up)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Create FastAPI router for document upload endpoints
router = APIRouter()

# Initialize Supabase client with service role key for admin-level access
supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],  # server-side only - has full permissions
)

# Supabase storage bucket name for patient documents
BUCKET = "patient-docs"


@router.post("/patients/{patient_id}/documents")
async def upload_patient_document(patient_id: UUID, file: Optional[UploadFile] = File(None)):
    if file is None:
        return {"patient_id": str(patient_id), "status": "ok"}

    doc_id = uuid.uuid4()
    storage_path = f"{patient_id}/{doc_id}/{file.filename}"
    raw = await file.read()

    supabase.storage.from_(BUCKET).upload(
        path=storage_path,
        file=raw,
        file_options={"content-type": file.content_type},
    )

    inserted = supabase.table("rag_documents").insert({
        "id": str(doc_id),
        "patient_id": str(patient_id),
        "source": "patient_upload",
        "modality": "text",
        "storage_path": storage_path,
        "title": file.filename,
    }).execute()

    try:
        from app.api.tasks import ingest_document
        ingest_document.delay(str(doc_id))
    except Exception:
        pass

    return {"document_id": inserted.data[0]["id"], "status": "queued"}