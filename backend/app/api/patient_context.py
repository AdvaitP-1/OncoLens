"""
Patient Context API endpoint.
Provides unified, structured patient representation by combining RAG retrieval
with LLM-based extraction.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import UnifiedPatientContext
from app.api.rag_query import RAGQuery, retrieve
from app.services.llm_extractor import LLMExtractor
from app.settings import settings
import os

router = APIRouter()

# Initialize LLM extractor (singleton pattern)
_llm_extractor = None


def get_llm_extractor() -> LLMExtractor:
    """Get or create the LLM extractor instance."""
    global _llm_extractor
    if _llm_extractor is None:
        _llm_extractor = LLMExtractor()
    return _llm_extractor


@router.get("/patient/{patient_id}/context", response_model=UnifiedPatientContext)
async def get_patient_context(
    patient_id: str,
    k: int = 15,
    modalities: str | None = None
) -> UnifiedPatientContext:
    """
    Get unified structured patient context.
    
    This endpoint:
    1. Retrieves relevant patient documents using RAG (vector search)
    2. Sends raw chunks to LLM for structured extraction
    3. Returns clean, structured clinical summary
    
    Args:
        patient_id: UUID of the patient
        k: Number of document chunks to retrieve (default: 15)
        modalities: Comma-separated list of modalities to filter (optional)
        
    Returns:
        UnifiedPatientContext with structured clinical data
        
    Raises:
        HTTPException: If patient not found or extraction fails
    """
    try:
        # Step 1: Retrieve relevant chunks using RAG
        modality_list = modalities.split(",") if modalities else None
        
        # Use a broad query to get comprehensive patient context
        rag_query = RAGQuery(
            patient_id=patient_id,
            question="Provide comprehensive patient medical history, diagnoses, treatments, lab results, imaging findings, and clinical notes",
            k=k,
            modalities=modality_list
        )
        
        # Call the existing RAG retrieve function
        rag_result = retrieve(rag_query)
        raw_chunks = rag_result.get("matches", [])
        
        if not raw_chunks:
            raise HTTPException(
                status_code=404,
                detail=f"No medical records found for patient {patient_id}"
            )
        
        # Step 2: Extract structured data using LLM
        extractor = get_llm_extractor()
        structured_data = extractor.extract_patient_context(raw_chunks, patient_id)
        
        # Step 3: Validate and return as Pydantic model
        return UnifiedPatientContext(**structured_data)
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM extraction error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate patient context: {str(e)}"
        )
