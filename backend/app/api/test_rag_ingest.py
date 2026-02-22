import os
import uuid
import pandas as pd
from supabase import create_client
from pathlib import Path
from dotenv import load_dotenv

# --------------------
# Load environment variables from .env file
# --------------------
# Get the directory where this script is located
script_dir = Path(__file__).resolve().parent
# Navigate to backend directory (2 levels up: api -> app -> backend)
backend_dir = script_dir.parent.parent
env_path = backend_dir / ".env"

print(f"Script location: {script_dir}")
print(f"Backend directory: {backend_dir}")
print(f"Looking for .env at: {env_path}")
print(f".env exists: {env_path.exists()}")

# Load the .env file
load_dotenv(dotenv_path=env_path)

# Import and configure Google Gemini (using new package)
try:
    from google import genai
    from google.genai import types
    print("Using google.genai (new package)")
    # Configure client with API key
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    USE_NEW_API = True
    EMBED_MODEL = "text-embedding-004"  # New API uses model name without "models/" prefix
except ImportError:
    import google.generativeai as genai
    print("Using google.generativeai (deprecated package)")
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
    USE_NEW_API = False
    EMBED_MODEL = "models/text-embedding-004"  # Old API uses full model path

# --------------------
# CONFIG
# --------------------
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Validate that all required env vars are loaded
if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL not found in environment variables")
if not SUPABASE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY not found in environment variables")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

print(f"✓ Loaded SUPABASE_URL: {SUPABASE_URL[:30]}...")
print(f"✓ Loaded GEMINI_API_KEY: {GEMINI_API_KEY[:20]}...")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Generate a patient ID for this test
PATIENT_ID = str(uuid.uuid4())
print(f"\n✓ Generated Patient ID: {PATIENT_ID}")

# --------------------
# Load patient data from patient_one folder
# --------------------
# Navigate to patient_data/patient_one folder
project_root = backend_dir.parent  # Go up from backend to OncoLens
patient_data_dir = project_root / "patient_data" / "patient_one"

print(f"\n📁 Loading patient data from: {patient_data_dir}")

# Get all CSV files in the patient_one directory
csv_files = list(patient_data_dir.glob("*.csv"))
print(f"Found {len(csv_files)} CSV files:")
for csv_file in csv_files:
    print(f"  - {csv_file.name}")

# --------------------
# Process each CSV file
# --------------------
for csv_file in csv_files:
    print(f"\n{'='*60}")
    print(f"Processing: {csv_file.name}")
    print(f"{'='*60}")
    
    # Read the CSV file
    try:
        df = pd.read_csv(csv_file)
        print(f"✓ Loaded {len(df)} rows, {len(df.columns)} columns")
        
        # Convert dataframe to text representation
        text_blob = df.to_string()
        print(f"✓ Generated text blob: {len(text_blob)} characters")
        
    except Exception as e:
        print(f"✗ Error reading {csv_file.name}: {e}")
        continue
    
    # --------------------
    # Chunking
    # --------------------
    def chunk_text(text, size=1200, overlap=200):
        """Split text into overlapping chunks"""
        chunks = []
        i = 0
        while i < len(text):
            chunks.append(text[i:i+size])
            i += size - overlap
        return chunks
    
    chunks = chunk_text(text_blob)
    print(f"✓ Created {len(chunks)} chunks")
    
    # --------------------
    # Insert document row
    # --------------------
    doc_id = str(uuid.uuid4())
    
    # Determine modality based on filename
    filename = csv_file.stem  # Get filename without extension
    if "clinical_notes" in filename:
        modality = "clinical_notes"
    elif "labs" in filename:
        modality = "lab"
    elif "vitals" in filename:
        modality = "vitals"
    elif "imaging" in filename:
        modality = "imaging_report"
    elif "medications" in filename:
        modality = "medications"
    elif "profile" in filename:
        modality = "patient_profile"
    elif "wearable" in filename:
        modality = "wearable"
    else:
        modality = "text"
    
    try:
        supabase.table("rag_documents").insert({
            "id": doc_id,
            "patient_id": PATIENT_ID,
            "source": "patient_one_data",
            "modality": modality,
            "title": csv_file.name
        }).execute()
        print(f"✓ Created document record (ID: {doc_id}, modality: {modality})")
    except Exception as e:
        print(f"✗ Error creating document record: {e}")
        continue
    
    # --------------------
    # Embed + Insert chunks
    # --------------------
    # Embed + Insert chunks
    # --------------------
    successful_chunks = 0
    for idx, chunk in enumerate(chunks):
        try:
            # Generate embedding using Gemini API with proper task type
            if USE_NEW_API:
                # New google.genai API
                response = client.models.embed_content(
                    model=EMBED_MODEL,
                    contents=[chunk]  # Must be a list for new API
                )
                embedding = list(response.embeddings[0].values)
            else:
                # Old google.generativeai API
                response = genai.embed_content(
                    model=EMBED_MODEL,
                    content=chunk,
                    task_type="retrieval_document"
                )
                embedding = response["embedding"]
            
            # Insert chunk with embedding into database
            supabase.table("rag_chunks").insert({
                "document_id": doc_id,
                "patient_id": PATIENT_ID,
                "chunk_index": idx,
                "content": chunk,
                "embedding": embedding,
                "metadata": {
                    "modality": modality,
                    "source": "patient_one_data",
                    "filename": csv_file.name
                }
            }).execute()
            
            successful_chunks += 1
            print(f"  Chunk {idx+1}/{len(chunks)} embedded and stored (embedding dim: {len(embedding)})")
            
        except Exception as e:
            print(f"  ✗ Error processing chunk {idx+1}: {e}")
            continue
    
    print(f"✓ Successfully processed {successful_chunks}/{len(chunks)} chunks for {csv_file.name}")

# --------------------
# Summary
# --------------------
print(f"\n{'='*60}")
print(f"✅ INGESTION COMPLETE!")
print(f"{'='*60}")
print(f"Patient ID: {PATIENT_ID}")
print(f"Files processed: {len(csv_files)}")
print(f"\nYou can now query this patient's data using the RAG API with patient_id: {PATIENT_ID}")