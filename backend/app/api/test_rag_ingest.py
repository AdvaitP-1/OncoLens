import os
import uuid
import pandas as pd
import google.generativeai as genai
from supabase import create_client
from pathlib import Path
from dotenv import load_dotenv

# --------------------
# Load environment variables from .env file
# --------------------
# Navigate up to backend directory where .env is located
env_path = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(dotenv_path=env_path)

# --------------------
# CONFIG
# --------------------
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]

genai.configure(api_key=GEMINI_API_KEY)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Use the correct Gemini embedding model
EMBED_MODEL = "models/text-embedding-004"  # Gemini embedding model (768 dimensions)

PATIENT_ID = str(uuid.uuid4())  # mock patient

# --------------------
# Load CSV
# --------------------
df = pd.read_csv("mock_data.csv")

text_blob = df.to_string()

# --------------------
# Chunking
# --------------------
def chunk_text(text, size=1200, overlap=200):
    chunks = []
    i = 0
    while i < len(text):
        chunks.append(text[i:i+size])
        i += size - overlap
    return chunks

chunks = chunk_text(text_blob)

# --------------------
# Insert document row
# --------------------
doc_id = str(uuid.uuid4())

supabase.table("rag_documents").insert({
    "id": doc_id,
    "patient_id": PATIENT_ID,
    "source": "test_csv",
    "modality": "lab",
    "title": "mock_data.csv"
}).execute()

# --------------------
# Embed + Insert chunks
# --------------------
for idx, chunk in enumerate(chunks):
    # Generate embedding using Gemini API with proper task type
    response = genai.embed_content(
        model=EMBED_MODEL,
        content=chunk,
        task_type="retrieval_document"  # Optimize for document indexing
    )

    embedding = response["embedding"]

    print(f"Chunk {idx+1}/{len(chunks)} - Embedding length:", len(embedding))  # should be 768

    # Insert chunk with embedding into database
    supabase.table("rag_chunks").insert({
        "document_id": doc_id,
        "patient_id": PATIENT_ID,
        "chunk_index": idx,
        "content": chunk,
        "embedding": embedding,
        "metadata": {
            "modality": "lab",
            "source": "test_csv"
        }
    }).execute()

print(f"\nDONE! Inserted {len(chunks)} chunks for document {doc_id}")