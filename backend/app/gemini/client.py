import base64
import time
from typing import Any

import httpx

from app.gemini.parse import parse_gemini_reasoning
from app.gemini.prompts import build_reasoning_prompt
from app.gemini.schema import GeminiReasoning
from app.settings import settings


def _empty_meta(error: str | None = None) -> dict[str, Any]:
    return {
        "enabled": bool(settings.gemini_api_key),
        "ok": False,
        "model": settings.gemini_model,
        "prompt_version": settings.gemini_prompt_version,
        "latency_ms": 0,
        "error": error,
    }


async def generate_gemini_reasoning(
    case_context: dict,
    image_bytes: bytes | None = None,
    image_mime_type: str | None = None,
) -> tuple[GeminiReasoning | None, dict]:
    if not settings.gemini_api_key:
        return None, _empty_meta("GEMINI_API_KEY not configured.")

    prompt = build_reasoning_prompt(case_context, settings.gemini_prompt_version)
    parts: list[dict] = [{"text": prompt}]
    if image_bytes:
        parts.append(
            {
                "inline_data": {
                    "mime_type": image_mime_type or "image/png",
                    "data": base64.b64encode(image_bytes).decode("utf-8"),
                }
            }
        )

    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"temperature": 0.1},
    }
    url = f"{settings.gemini_base_url.rstrip('/')}/models/{settings.gemini_model}:generateContent"
    headers = {
        "content-type": "application/json",
        "x-goog-api-key": settings.gemini_api_key,
    }

    t0 = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=settings.gemini_timeout_seconds) as client:
            resp = await client.post(url, headers=headers, json=body)
            latency_ms = int((time.perf_counter() - t0) * 1000)
            if resp.status_code >= 400:
                return None, {
                    **_empty_meta(f"Gemini HTTP {resp.status_code}: {resp.text[:200]}"),
                    "latency_ms": latency_ms,
                }
            parsed = parse_gemini_reasoning(resp.json())
            return parsed, {
                "enabled": True,
                "ok": True,
                "model": settings.gemini_model,
                "prompt_version": settings.gemini_prompt_version,
                "latency_ms": latency_ms,
                "error": None,
            }
    except httpx.TimeoutException:
        return None, _empty_meta("Gemini timeout.")
    except Exception as exc:
        return None, _empty_meta(f"Gemini parse/error: {exc}")
