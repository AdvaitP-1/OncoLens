# app/worker/tasks.py
# Background task workers for document ingestion and embedding generation
# Uses Celery for async task processing and Sentence Transformers for embeddings

import os
from celery import Celery
from supabase import create_client
from pathlib import Path
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

# Load environment variables from .env file in backend directory
# Calculate path: api -> app -> backend (2 levels up)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Initialize Celery worker with Redis as message broker
# Redis queues tasks and coordinates between web server and workers
celery = Celery(__name__, broker=os.environ["REDIS_URL"])

# Initialize Supabase client for database and storage operations
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

# ---- Embedding provider configuration (Sentence Transformers - FREE, local) ----
# Load the embedding model once when worker starts
EMBED_MODEL = SentenceTransformer('all-MiniLM-L6-v2')  # 384 dimensions, fast and efficient


def chunk_text(text: str, max_chars=1200, overlap=150):
    """
    Split text into overlapping chunks for embedding.
    
    Overlapping chunks ensure context isn't lost at chunk boundaries.
    This is critical for semantic search accuracy.
    
    Args:
        text: Full document text to chunk
        max_chars: Maximum characters per chunk (default: 1200)
        overlap: Number of characters to overlap between chunks (default: 150)
        
    Returns:
        List of text chunks with overlap
    """
    out, i = [], 0
    while i < len(text):
        # Extract chunk from current position to max_chars ahead
        out.append(text[i:i+max_chars])
        # Move forward by (max_chars - overlap) to create overlap
        i += max_chars - overlap
    return out


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Generate vector embeddings for a list of text chunks using Sentence Transformers.
    
    Each text is converted to a 384-dimensional vector that captures
    semantic meaning. Similar texts will have similar vectors.
    
    This runs locally and is completely free - no API keys needed!
    
    Args:
        texts: List of text strings to embed
        
    Returns:
        List of embedding vectors (each is a list of 384 floats)
    """
    # Encode all texts at once (batch processing is efficient)
    embeddings = EMBED_MODEL.encode(texts, show_progress_bar=False)
    # Convert numpy arrays to lists for JSON serialization
    return [emb.tolist() for emb in embeddings]


def extract_text(file_bytes: bytes, mime: str | None) -> tuple[str, str]:
    """
    Extract text content from uploaded file bytes.
    
    Currently handles plain text files. Can be extended to support
    PDF, DOCX, and other formats using libraries like PyPDF2 or python-docx.
    
    Args:
        file_bytes: Raw file content as bytes
        mime: MIME type of the file (currently unused)
        
    Returns:
        Tuple of (extracted_text, modality_type)
    """
    # Decode bytes to UTF-8 text, ignoring invalid characters
    # TODO: Add PDF/DOCX parsing for richer document support
    text = file_bytes.decode("utf-8", errors="ignore")
    modality = "text"
    return text, modality


@celery.task
def ingest_document(document_id: str):
    """
    Background task to process an uploaded document into searchable chunks.
    
    Pipeline:
    1. Fetch document metadata from database
    2. Download file from storage
    3. Extract text content
    4. Split into overlapping chunks
    5. Generate embeddings for each chunk
    6. Store chunks and embeddings in vector database
    
    Args:
        document_id: UUID of the document to process
        
    Returns:
        Dictionary with count of chunks inserted
    """
    # Fetch document metadata from rag_documents table
    doc = supabase.table("rag_documents").select("*").eq("id", document_id).single().execute().data

    # Download the actual file from Supabase storage
    bucket = "patient-docs"
    file_bytes = supabase.storage.from_(bucket).download(doc["storage_path"])

    # Extract text from file (currently supports plain text)
    # TODO: Pass mime_type from doc metadata for format detection
    text, modality = extract_text(file_bytes, None)

    # Split text into overlapping chunks for better context preservation
    chunks = chunk_text(text)
    
    # Generate vector embeddings for all chunks using Gemini
    vectors = embed_texts(chunks)

    # Prepare rows for insertion into rag_chunks table
    rows = []
    for idx, (content, vec) in enumerate(zip(chunks, vectors)):
        rows.append({
            "document_id": document_id,        # Link back to source document
            "patient_id": doc["patient_id"],   # For patient-specific filtering
            "chunk_index": idx,                # Order within document
            "content": content,                # The actual text chunk
            "embedding": vec,                  # 768-dim vector for similarity search
            "metadata": {                      # Additional context for retrieval
                "source": doc["source"],
                "modality": modality,
                "title": doc.get("title"),
                "storage_path": doc.get("storage_path"),
                "event_time": doc.get("event_time"),
            }
        })

    # Insert all chunks into the vector database
    # For large documents, consider batching (e.g., 100 rows at a time)
    supabase.table("rag_chunks").insert(rows).execute()

    # Update the source document with detected modality
    supabase.table("rag_documents").update({"modality": modality}).eq("id", document_id).execute()

    # Return success metrics
    return {"chunks_inserted": len(rows)}