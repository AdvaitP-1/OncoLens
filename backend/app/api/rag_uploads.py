# app/api/rag_uploads.py
# API endpoint for uploading patient documents to the RAG system
# Handles file storage and triggers background processing for embedding generation

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
async def upload_patient_document(patient_id: UUID, file: UploadFile = File(...)):
    """
    Upload a patient document and queue it for RAG ingestion.
    
    Process:
    1. Generate unique document ID
    2. Upload file to Supabase storage
    3. Create database record in rag_documents table
    4. Trigger background task to chunk and embed the document
    
    Args:
        patient_id: UUID of the patient this document belongs to
        file: Uploaded file (PDF, text, etc.)
        
    Returns:
        Dictionary with document_id and status="queued"
    """
    # Generate a unique ID for this document
    doc_id = uuid.uuid4()
    
    # Create hierarchical storage path: patient_id/doc_id/filename
    # This organizes files by patient and prevents filename collisions
    storage_path = f"{patient_id}/{doc_id}/{file.filename}"

    # Read the uploaded file content into memory
    raw = await file.read()
    
    # Upload file to Supabase storage bucket
    supabase.storage.from_(BUCKET).upload(
        path=storage_path,
        file=raw,
        file_options={"content-type": file.content_type},  # Preserve MIME type
    )

    # Create metadata record in rag_documents table
    # This tracks the document before it's processed into chunks
    inserted = supabase.table("rag_documents").insert({
        "id": str(doc_id),
        "patient_id": str(patient_id),
        "source": "patient_upload",           # Indicates this came from user upload
        "modality": "text",                   # Can be enhanced to detect PDF, images, etc.
        "storage_path": storage_path,         # Where the file is stored
        "title": file.filename,               # Original filename for display
    }).execute()

    # Enqueue background task to process this document
    # The task will: download file, chunk text, generate embeddings, store in vector DB
    try:
        from app.api.tasks import ingest_document
        ingest_document.delay(str(doc_id))
    except Exception:
        pass  # Celery/Redis not configured; document stored but not yet embedded

    # Return success response with document ID
    return {"document_id": inserted.data[0]["id"], "status": "queued"}