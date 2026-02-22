import json

from app.gemini.schema import GeminiReasoning


def extract_text_from_gemini_response(payload: dict) -> str:
    candidates = payload.get("candidates", [])
    if not candidates:
        raise ValueError("Gemini response missing candidates.")
    parts = candidates[0].get("content", {}).get("parts", [])
    texts = [p.get("text", "") for p in parts if isinstance(p, dict) and p.get("text")]
    if not texts:
        raise ValueError("Gemini response contains no text parts.")
    return "\n".join(texts).strip()


def _extract_json_blob(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.replace("json", "", 1).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Gemini output does not contain valid JSON object.")
    return cleaned[start : end + 1]


def parse_gemini_reasoning(payload: dict) -> GeminiReasoning:
    text = extract_text_from_gemini_response(payload)
    blob = _extract_json_blob(text)
    data = json.loads(blob)
    return GeminiReasoning.model_validate(data)
