import os
import uuid
import pandas as pd
from supabase import create_client
from pathlib import Path
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

# --------------------
# Load environment variables from .env file
# --------------------
script_dir = Path(__file__).resolve().parent
backend_dir = script_dir.parent.parent
env_path = backend_dir / ".env"

print(f"Script location: {script_dir}")
print(f"Backend directory: {backend_dir}")
print(f"Looking for .env at: {env_path}")
print(f".env exists: {env_path.exists()}")

load_dotenv(dotenv_path=env_path)

# --------------------
# Initialize Sentence Transformer for embeddings (FREE, runs locally)
# --------------------
print("\n🔄 Loading embedding model (this may take a moment on first run)...")
EMBED_MODEL = SentenceTransformer('all-MiniLM-L6-v2')  # 384 dimensions
print("✓ Embedding model loaded successfully!")
print(f"  Model: all-MiniLM-L6-v2")
print(f"  Embedding dimension: 384")

# --------------------
# CONFIG
# --------------------
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL not found in environment variables")
if not SUPABASE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY not found in environment variables")

print(f"\n✓ Loaded SUPABASE_URL: {SUPABASE_URL[:30]}...")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

PATIENT_ID = str(uuid.uuid4())
print(f"\n✓ Generated Patient ID: {PATIENT_ID}")

# --------------------
# Load patient data from patient_one folder
# --------------------
project_root = backend_dir.parent
patient_data_dir = project_root / "patient_data" / "patient_one"

print(f"\n📁 Loading patient data from: {patient_data_dir}")

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
    
    try:
        df = pd.read_csv(csv_file)
        print(f"✓ Loaded {len(df)} rows, {len(df.columns)} columns")
        
        text_blob = df.to_string()
        print(f"✓ Generated text blob: {len(text_blob)} characters")
        
    except Exception as e:
        print(f"✗ Error reading {csv_file.name}: {e}")
        continue
    
    # Chunking
    def chunk_text(text, size=1200, overlap=200):
        chunks = []
        i = 0
        while i < len(text):
            chunks.append(text[i:i+size])
            i += size - overlap
        return chunks
    
    chunks = chunk_text(text_blob)
    print(f"✓ Created {len(chunks)} chunks")
    
    # Insert document row
    doc_id = str(uuid.uuid4())
    
    filename = csv_file.stem
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
    
    # Embed + Insert chunks
    successful_chunks = 0
    for idx, chunk in enumerate(chunks):
        try:
            # Generate embedding using Sentence Transformers (local, free)
            embedding = EMBED_MODEL.encode(chunk).tolist()
            
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
