"""Load HAM index on startup."""
import json
from pathlib import Path

INDEX_PATH = Path(__file__).resolve().parent / "data" / "ham_index.json"
ERROR_MSG = "HAM index not built. Run: python tools/build_ham_index.py"


def load_ham_index() -> tuple[list[dict], str | None]:
    """
    Load ham_index.json. Returns (index_list, error_message).
    If error_message is not None, index is empty.
    """
    if not INDEX_PATH.exists():
        return [], ERROR_MSG
    try:
        with open(INDEX_PATH, encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            return [], f"Invalid ham_index.json: expected list. {ERROR_MSG}"
        return data, None
    except Exception as e:
        return [], f"Failed to load ham_index.json: {e}. {ERROR_MSG}"
