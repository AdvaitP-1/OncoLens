#!/usr/bin/env python3
"""
Build HAM10000 index for OncoLens backend.
Uses kagglehub to download/cache the dataset, loads metadata,
scans for image files, and outputs backend/data/ham_index.json.
Does NOT copy images.
"""
import csv
import json
import os
import sys
from pathlib import Path

# Add project root for imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

try:
    import kagglehub
except ImportError:
    print("Error: kagglehub not installed. Run: pip install kagglehub")
    sys.exit(1)

# Config
HAM_DATASET_ID = os.environ.get("HAM_DATASET_ID", "kmader/skin-cancer-mnist-ham10000")
METADATA_PATH = PROJECT_ROOT / "HAM10000_metadata.csv"
OUTPUT_PATH = PROJECT_ROOT / "backend" / "data" / "ham_index.json"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}

# Binary: mel = 1, rest = 0
MELANOMA_CLASS = "mel"


def load_metadata():
    """Load HAM10000_metadata.csv and build image_id -> full metadata map."""
    if not METADATA_PATH.exists():
        print(f"Error: Metadata not found at {METADATA_PATH}")
        print("Ensure HAM10000_metadata.csv exists in project root.")
        sys.exit(1)

    image_to_meta = {}
    with open(METADATA_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            image_id = row.get("image_id", "").strip()
            dx = row.get("dx", "").strip().lower()
            if image_id and dx:
                image_to_meta[image_id] = {
                    "dx": dx,
                    "age": row.get("age", ""),
                    "sex": row.get("sex", ""),
                    "localization": row.get("localization", ""),
                }
    return image_to_meta


def find_image_paths(dataset_dir: Path) -> dict[str, Path]:
    """Scan dataset directory for images, return image_id -> filepath."""
    id_to_path = {}
    dataset_dir = Path(dataset_dir)

    for root, _, files in os.walk(dataset_dir):
        root_path = Path(root)
        for f in files:
            stem = Path(f).stem
            ext = Path(f).suffix.lower()
            if ext in IMAGE_EXTENSIONS:
                full_path = root_path / f
                # Use stem as image_id (handles ISIC_0027419.jpg -> ISIC_0027419)
                id_to_path[stem] = full_path

    return id_to_path


def main():
    print("Building HAM index...")
    print(f"Dataset: {HAM_DATASET_ID}")
    print(f"Metadata: {METADATA_PATH}")

    # Download/cache via kagglehub
    print("Downloading/caching dataset via kagglehub...")
    try:
        dataset_path = kagglehub.dataset_download(HAM_DATASET_ID)
    except Exception as e:
        print(f"Error downloading dataset: {e}")
        print("Ensure Kaggle is authenticated. See README for setup.")
        sys.exit(1)

    dataset_dir = Path(dataset_path)
    print(f"Dataset path: {dataset_dir}")

    # Load metadata
    image_to_meta = load_metadata()
    print(f"Loaded {len(image_to_meta)} metadata records")

    # Scan for images
    id_to_path = find_image_paths(dataset_dir)
    print(f"Found {len(id_to_path)} image files")

    # Build index: intersect metadata with found images
    index = []
    for image_id, meta in image_to_meta.items():
        if image_id in id_to_path:
            dx = meta["dx"]
            binary_label_mel = 1 if dx == MELANOMA_CLASS else 0
            index.append({
                "image_id": image_id,
                "dx": dx,
                "age": meta.get("age", ""),
                "sex": meta.get("sex", ""),
                "localization": meta.get("localization", ""),
                "filepath": str(id_to_path[image_id]),
                "binary_label_mel": binary_label_mel,
            })

    print(f"Index entries (metadata + image found): {len(index)}")

    # Ensure output dir exists
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)

    print(f"Wrote {OUTPUT_PATH}")

    # Summary by class
    by_dx = {}
    for entry in index:
        dx = entry["dx"]
        by_dx[dx] = by_dx.get(dx, 0) + 1
    print("Counts by dx:", by_dx)


if __name__ == "__main__":
    main()
