import asyncio
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.gemini.client import generate_gemini_reasoning
from app.gemini.parse import parse_gemini_reasoning
from app.settings import settings


def test_gemini_parser_validates_schema():
    mocked = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": """
{
  "clinician_rationale_markdown": "Screening-triage rationale.",
  "patient_summary": "Your screening score requires clinician review.",
  "image_quality_notes": ["Image quality adequate for triage support."],
  "wearable_signal_notes": ["Resting HR trend increased in recent days."],
  "followup_questions": ["Any new respiratory symptoms this week?"],
  "limitations": ["Prototype output is not diagnostic."],
  "safety_disclaimer": "This is a screening-triage tool, not a diagnosis.",
  "confidence_statement": "Moderate confidence due to uncertainty spread."
}
"""
                        }
                    ]
                }
            }
        ]
    }
    parsed = parse_gemini_reasoning(mocked)
    assert parsed.patient_summary
    assert len(parsed.image_quality_notes) == 1


def test_gemini_disabled_without_api_key(monkeypatch):
    old_key = settings.gemini_api_key
    monkeypatch.setattr(settings, "gemini_api_key", "")
    reasoning, meta = asyncio.run(generate_gemini_reasoning(case_context={"status": {"abstain": False}}))
    assert reasoning is None
    assert meta["ok"] is False
    assert "not configured" in (meta.get("error") or "").lower()
    monkeypatch.setattr(settings, "gemini_api_key", old_key)
