# app/api/rag_query.py
# API endpoint for RAG (Retrieval-Augmented Generation) query operations
# Handles semantic search over patient documents using vector embeddings

from fastapi import APIRouter
from pydantic import BaseModel
from supabase import create_client
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file in backend directory
env_path = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(dotenv_path=env_path)

# Import and configure Google Gemini API for generating embeddings
import google.generativeai as genai
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

# Gemini embedding model - generates 768-dimensional vectors for semantic search
EMBED_MODEL = "models/text-embedding-004"

# Initialize Supabase client for database operations
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

# Create FastAPI router for RAG endpoints
router = APIRouter()


class RAGQuery(BaseModel):
    """
    Request model for RAG retrieval queries.
    
    Attributes:
        patient_id: UUID of the patient whose documents to search
        question: Natural language query to search for
        k: Number of top matching chunks to return (default: 8)
        modalities: Optional filter for document types (e.g. ["text", "imaging_report"])
    """
    patient_id: str
    question: str
    k: int = 8
    modalities: list[str] | None = None  # e.g. ["text","imaging_report"]


@router.post("/rag/retrieve")
def retrieve(q: RAGQuery):
    """
    Retrieve relevant document chunks for a patient query using semantic search.
    
    Process:
    1. Convert the question into a vector embedding using Gemini
    2. Search the vector database for similar document chunks
    3. Return the top-k most relevant chunks
    
    Args:
        q: RAGQuery containing patient_id, question, and search parameters
        
    Returns:
        Dictionary with 'matches' key containing list of relevant document chunks
        Each match includes content, metadata, and similarity score
    """
    # Generate embedding vector for the query using Gemini API
    # task_type="retrieval_query" optimizes the embedding for search queries
    result = genai.embed_content(
        model=EMBED_MODEL,
        content=q.question,
        task_type="retrieval_query"
    )
    qvec = result['embedding']
    
    # Call Supabase RPC function to perform vector similarity search
    # This uses pgvector extension to find nearest neighbors in embedding space
    res = supabase.rpc("match_rag_chunks", {
        "query_embedding": qvec,           # The query vector to match against
        "match_count": q.k,                # Number of results to return
        "filter_patient_id": q.patient_id, # Only search this patient's documents
        "filter_modalities": q.modalities  # Optional filter by document type
    }).execute()
    
    # Return the matched document chunks
    return {"matches": res.data}