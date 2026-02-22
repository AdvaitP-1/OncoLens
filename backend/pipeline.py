"""
OncoLens pipeline: wearables -> health score, vision -> vision score,
fusion -> guardrails -> decision, with Gemini reasoning.
"""
import base64
import io
import json
import os
import re
from typing import Any

import pandas as pd

# Optional: google-generativeai
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


def round_float(x: float) -> float:
    """Round to 6 decimals, avoid scientific notation in display."""
    return round(float(x), 6)


def extract_wearable_features(csv_content: str | None) -> dict[str, Any]:
    """
    Parse wearables CSV and compute features.
    Returns p_health, var_health, ci_health, reason.
    """
    if not csv_content or not csv_content.strip():
        return {
            "p_health": 0.5,
            "var_health": 0.05,
            "ci_health": [0.2, 0.8],
            "reason": "wearables_missing",
            "features": {},
        }

    try:
        df = pd.read_csv(io.StringIO(csv_content))
    except Exception:
        return {
            "p_health": 0.5,
            "var_health": 0.05,
            "ci_health": [0.2, 0.8],
            "reason": "csv_parse_error",
            "features": {},
        }

    # Demo: simple heuristic from CSV columns
    # Look for heart rate, SpO2, activity-like columns
    p = 0.5
    var = 0.05
    cols = [c.lower() for c in df.columns]

    if "heart_rate" in cols or "hr" in cols or "bpm" in str(cols):
        col = next((c for c in df.columns if "heart" in c.lower() or c.lower() == "hr" or "bpm" in c.lower()), None)
        if col is not None:
            mean_val = df[col].mean()
            if mean_val > 100:
                p = min(0.75, 0.5 + (mean_val - 100) / 200)
            elif mean_val < 60:
                p = max(0.25, 0.5 - (60 - mean_val) / 200)
            var = 0.03

    if "spo2" in cols or "oxygen" in cols:
        col = next((c for c in df.columns if "spo2" in c.lower() or "oxygen" in c.lower()), None)
        if col is not None:
            mean_val = df[col].mean()
            if mean_val < 95:
                p = min(0.8, 0.5 + (95 - mean_val) / 50)
            var = min(var, 0.04)

    p = max(0.0, min(1.0, p))
    ci_low = max(0, p - 0.15)
    ci_high = min(1, p + 0.15)

    return {
        "p_health": round_float(p),
        "var_health": round_float(var),
        "ci_health": [round_float(ci_low), round_float(ci_high)],
        "reason": "wearables_analyzed",
        "features": {"rows": len(df), "columns": list(df.columns)},
    }


def run_vision_model(image_base64: str, patient_context: dict | None = None) -> dict[str, Any]:
    """
    Use Gemini vision to analyze skin lesion image. Returns p_vision, ci_vision.
    Falls back to mock if Gemini unavailable.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or not GEMINI_AVAILABLE:
        return _mock_vision_result()

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        context_str = ""
        if patient_context:
            parts = [f"{k}={v}" for k, v in patient_context.items() if v]
            if parts:
                context_str = f"\nPatient context (if from dataset): {', '.join(parts)}"

        prompt = f"""You are a dermatology AI assistant. Analyze this dermatoscopic skin lesion image.

Output a melanoma risk score from 0.0 (benign) to 1.0 (high suspicion of melanoma).
{context_str}

1. ABCDE CRITERIA - Score each 0.0 (reassuring) to 1.0 (concerning):
   - asymmetry: Lesion asymmetry (0= symmetric, 1= highly asymmetric)
   - border: Border irregularity (0= smooth, 1= very irregular/notched)
   - color: Color variation (0= uniform, 1= multiple colors/variegation)
   - diameter: Size concern (0= small/benign, 1= large/suspicious, e.g. >6mm)
   - evolution: N/A for single image - use 0.5 as placeholder

2. DIFFERENTIAL DIAGNOSIS - List top diagnoses with probability (sum to 1.0):
   Use HAM10000 classes: mel (melanoma), nv (nevus), bkl (benign keratosis), bcc (basal cell carcinoma), ak (actinic keratosis), vasc (vascular), df (dermatofibroma).
   Include brief rationale for top 2.

Respond with a valid JSON object only, no markdown:
{{
  "p_vision": <number between 0 and 1>,
  "confidence": <number 0-1>,
  "brief_findings": "1-2 sentence description of key visual features",
  "abcde": {{
    "asymmetry": <0-1>,
    "border": <0-1>,
    "color": <0-1>,
    "diameter": <0-1>,
    "evolution": 0.5
  }},
  "differential_diagnosis": [
    {{ "dx": "mel", "name": "Melanoma", "probability": <0-1>, "rationale": "brief" }},
    {{ "dx": "nv", "name": "Nevus", "probability": <0-1>, "rationale": "brief" }}
  ]
}}"""

        img_data = base64.b64decode(image_base64)
        img = __import__("PIL.Image", fromlist=["Image"]).Image.open(io.BytesIO(img_data))

        response = model.generate_content([prompt, img])
        text = response.text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        data = json.loads(text)

        p_vision = max(0.0, min(1.0, float(data.get("p_vision", 0.35))))
        confidence = max(0.1, min(1.0, float(data.get("confidence", 0.7))))
        var_vision = round_float((1 - confidence) * 0.08 + 0.02)
        ci_half = 0.1 + (1 - confidence) * 0.08
        ci_low = max(0, p_vision - ci_half)
        ci_high = min(1, p_vision + ci_half)

        abcde_raw = data.get("abcde") or {}
        abcde = {
            "asymmetry": round_float(max(0, min(1, float(abcde_raw.get("asymmetry", 0.5))))),
            "border": round_float(max(0, min(1, float(abcde_raw.get("border", 0.5))))),
            "color": round_float(max(0, min(1, float(abcde_raw.get("color", 0.5))))),
            "diameter": round_float(max(0, min(1, float(abcde_raw.get("diameter", 0.5))))),
            "evolution": round_float(max(0, min(1, float(abcde_raw.get("evolution", 0.5))))),
        }

        diff_raw = data.get("differential_diagnosis") or []
        differential_diagnosis = []
        for item in diff_raw[:6] if isinstance(diff_raw, list) else []:
            if isinstance(item, dict) and item.get("dx"):
                differential_diagnosis.append({
                    "dx": str(item.get("dx", "")),
                    "name": str(item.get("name", item.get("dx", ""))),
                    "probability": round_float(max(0, min(1, float(item.get("probability", 0))))),
                    "rationale": str(item.get("rationale", "")),
                })

        return {
            "p_vision": round_float(p_vision),
            "var_vision": var_vision,
            "ci_vision": [round_float(ci_low), round_float(ci_high)],
            "vision_findings": data.get("brief_findings", ""),
            "abcde": abcde,
            "differential_diagnosis": differential_diagnosis,
            "heatmap": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        }
    except Exception:
        return _mock_vision_result()


def _mock_vision_result() -> dict[str, Any]:
    """Fallback when Gemini vision fails."""
    p_vision = 0.35
    var_vision = 0.04
    ci_low = max(0, p_vision - 0.12)
    ci_high = min(1, p_vision + 0.12)
    return {
        "p_vision": round_float(p_vision),
        "var_vision": round_float(var_vision),
        "ci_vision": [round_float(ci_low), round_float(ci_high)],
        "vision_findings": "",
        "abcde": {
            "asymmetry": 0.4,
            "border": 0.3,
            "color": 0.35,
            "diameter": 0.3,
            "evolution": 0.5,
        },
        "differential_diagnosis": [
            {"dx": "nv", "name": "Nevus", "probability": 0.5, "rationale": "Mock fallback"},
            {"dx": "bkl", "name": "Benign keratosis", "probability": 0.3, "rationale": "Mock fallback"},
        ],
        "heatmap": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    }


def fuse_scores(p_health: float, p_vision: float, lambda_: float) -> float:
    """Weighted fusion: lambda_ * p_health + (1 - lambda_) * p_vision."""
    return round_float(lambda_ * p_health + (1 - lambda_) * p_vision)


def guardrails(p_fused: float, conservative: bool) -> dict[str, Any]:
    """Apply guardrails, return abstain flag and reason."""
    abstain = False
    reason = ""
    if conservative and 0.3 < p_fused < 0.7:
        abstain = True
        reason = "conservative_abstain_mid_range"
    elif p_fused < 0.1:
        reason = "low_risk"
    elif p_fused > 0.9:
        reason = "high_risk"
    else:
        reason = "moderate_risk"
    return {"abstain": abstain, "reason": reason}


def call_gemini_for_reasoning(
    health_result: dict,
    vision_result: dict,
    p_fused: float,
    guardrail_result: dict,
    image_base64: str | None,
    patient_context: dict | None = None,
    lambda_: float = 0.5,
) -> dict[str, Any]:
    """
    Call Gemini for structured reasoning. Returns node_reasoning, clinician_report, patient_summary.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or not GEMINI_AVAILABLE:
        return _fallback_reasoning(health_result, vision_result, p_fused, guardrail_result)

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        context_str = ""
        if patient_context and any(patient_context.get(k) for k in ("age", "sex", "localization")):
            ctx_parts = [f"{k}={v}" for k, v in patient_context.items() if v]
            context_str = f"\nPatient/dataset context: {', '.join(ctx_parts)}"
        vision_findings = vision_result.get("vision_findings", "")
        if vision_findings:
            context_str += f"\nVision model findings: {vision_findings}"
        abcde = vision_result.get("abcde", {})
        if abcde:
            context_str += f"\nABCDE: asymmetry={abcde.get('asymmetry')}, border={abcde.get('border')}, color={abcde.get('color')}, diameter={abcde.get('diameter')}"
        diff = vision_result.get("differential_diagnosis", [])[:3]
        if diff:
            top = ", ".join(f"{d.get('name')}({d.get('probability', 0)*100:.0f}%)" for d in diff)
            context_str += f"\nTop differential: {top}"

        prompt = f"""You are a clinical decision support assistant. Analyze this pipeline output and provide structured reasoning.
{context_str}

Pipeline outputs:
- Wearables: p_health={health_result.get('p_health')}, reason={health_result.get('reason')}
- Vision: p_vision={vision_result.get('p_vision')}
- Fused score: {p_fused}
- Guardrails: abstain={guardrail_result.get('abstain')}, reason={guardrail_result.get('reason')}

Respond with a valid JSON object only, no markdown, with these exact keys:
{{
  "node_reasoning": {{
    "wearables": "2-3 sentences: (1) What this step does, (2) The math: how we derive p_health from heart rate, SpO2, etc. (3) Why this value makes sense for this case.",
    "vision": "2-3 sentences: (1) What this step does, (2) The math: how ABCDE criteria and differential diagnosis yield p_vision, (3) Key visual findings that drove the score.",
    "fusion": f"2-3 sentences: (1) What fusion does, (2) The exact formula: p_fused = λ × p_health + (1−λ) × p_vision with λ={lambda_}. Plug in the numbers. (3) Why we weight image vs health this way.",
    "guardrails": "2-3 sentences: (1) What guardrails do, (2) The logic: when do we abstain vs pass, (3) Why this case got this outcome.",
    "decision": "2-3 sentences: (1) What the decision step does, (2) How the fused score maps to recommendations, (3) The clinical rationale for this case."
  }},
  "clinician_report": "2-4 sentence summary for clinician",
  "patient_summary": "1-2 sentence plain-language summary for patient"
}}"""

        if image_base64:
            import PIL.Image
            img_data = base64.b64decode(image_base64)
            img = PIL.Image.open(io.BytesIO(img_data))
            response = model.generate_content([prompt, img])
        else:
            response = model.generate_content(prompt)

        text = response.text.strip()
        # Remove markdown code blocks if present
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        data = json.loads(text)

        node_reasoning = data.get("node_reasoning", {})
        clinician_report = data.get("clinician_report", "")
        patient_summary = data.get("patient_summary", "")

        return {
            "node_reasoning": node_reasoning,
            "clinician_report": clinician_report,
            "patient_summary": patient_summary,
        }
    except Exception as e:
        return _fallback_reasoning(health_result, vision_result, p_fused, guardrail_result, str(e))


def call_gemini_pipeline_steps() -> list[dict[str, str]]:
    """
    Ask Gemini to describe the 5 pipeline steps. Returns list of {id, label, description}.
    Used for step-by-step UI without hardcoding.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or not GEMINI_AVAILABLE:
        return _fallback_pipeline_steps()

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = """You are a clinical decision support assistant for OncoLens, a skin lesion analysis app that combines wearables data with AI vision.

Our pipeline has exactly 5 steps in order:
1. wearables - reads patient health data (heart rate, SpO2, activity) from wearables CSV
2. vision - analyzes dermatoscopic skin lesion image with AI (ABCDE criteria, differential diagnosis)
3. fusion - combines health and image scores with a configurable weight (blend)
4. guardrails - safety check; recommends human review when uncertain
5. decision - outputs final recommendation (urgent referral, schedule review, routine monitoring)

Respond with a valid JSON array only, no markdown. Each element must have exactly: "id", "label", "description".
- id: one of wearables, vision, fusion, guardrails, decision (in that order)
- label: short human-readable step title (e.g. "1. Health data")
- description: 1-2 sentences in plain language explaining what this step does for non-experts

Example format:
[{"id":"wearables","label":"1. Health data","description":"..."},{"id":"vision","label":"2. Image analysis","description":"..."},...]"""

        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        data = json.loads(text)
        if isinstance(data, list) and len(data) >= 5:
            return data[:5]
        return _fallback_pipeline_steps()
    except Exception:
        return _fallback_pipeline_steps()


def _fallback_pipeline_steps() -> list[dict[str, str]]:
    """Fallback when Gemini is unavailable."""
    return [
        {"id": "wearables", "label": "1. Health data", "description": "Read patient health data (heart rate, oxygen, activity) from wearables and compute a health risk score."},
        {"id": "vision", "label": "2. Image analysis", "description": "Analyze the skin lesion image using AI (ABCDE criteria, possible diagnoses) to get an image risk score."},
        {"id": "fusion", "label": "3. Combining scores", "description": "Combine health and image scores into one score, weighted by the Blend slider (image vs health)."},
        {"id": "guardrails", "label": "4. Safety check", "description": "If the score is in a gray zone, recommend human review instead of guessing. Protects patients when the AI is unsure."},
        {"id": "decision", "label": "5. Recommendation", "description": "Output the final recommendation: urgent referral, schedule review, or routine monitoring."},
    ]


def call_gemini_demo_explanation(patient_name: str, image_label: str, dx: str = "") -> str:
    """
    Generate a brief Gemini explanation of what's happening in the mock demo.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or not GEMINI_AVAILABLE:
        return (
            "We're loading the patient's wearables data (heart rate, SpO2, activity) and analyzing "
            "the dermatoscopic image with our vision model. Next, we'll fuse the scores, apply "
            "guardrails, and generate clinical recommendations."
        )

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        patient_desc = {
            "patient_a_high_priority": "elevated heart rate, declining SpO2, and high activity — suggesting physiological stress",
            "patient_b_needs_review": "moderate vitals with some variability — warrants careful review",
            "patient_c_deferred_low_quality": "relatively stable vitals — lower acuity but still important to document",
        }.get(patient_name.lower().replace(".csv", ""), "wearables data")

        prompt = f"""You are a clinical decision support assistant. A clinician is running a guided demo of OncoLens.

Context:
- Patient: {patient_name} — {patient_desc}
- Lesion image: {image_label} ({"melanoma" if image_label == "mel" else "non-melanoma"}){" — " + dx if dx else ""}

The pipeline will: (1) extract wearables features → p_health, (2) run vision model on the image → p_vision with ABCDE and differential, (3) fuse scores, (4) apply guardrails, (5) output clinical decision.

Write 2-3 concise sentences explaining what is happening right now in this demo, in present tense. Use plain language. Address the clinician directly. Be specific about this patient and image."""

        response = model.generate_content(prompt)
        return response.text.strip() or "Processing patient data and lesion image..."
    except Exception:
        return (
            "We're analyzing the patient's wearables and the dermatoscopic image. "
            "The vision model will assess ABCDE criteria and differential diagnosis, "
            "then we'll fuse scores and apply guardrails for the final recommendation."
        )


def call_gemini_chat(case: dict, message: str) -> str:
    """
    Multi-turn chat: clinician asks follow-up questions. Uses case result + chat history.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or not GEMINI_AVAILABLE:
        return "Chat is unavailable. Please ensure GEMINI_API_KEY is set."

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        result = case.get("result", {})
        context = f"""Case analysis summary:
- p_health: {result.get('p_health')}, p_vision: {result.get('p_vision')}, p_fused: {result.get('p_fused')}
- Guardrails: {result.get('guardrail_reason')}
- Next steps: {result.get('next_steps', [])}
- Clinician report: {result.get('clinician_report', '')}
- Patient summary: {result.get('patient_summary', '')}
- Vision findings: {result.get('vision_findings', '')}
"""
        abcde = result.get("abcde", {})
        if abcde:
            context += f"- ABCDE: asymmetry={abcde.get('asymmetry')}, border={abcde.get('border')}, color={abcde.get('color')}, diameter={abcde.get('diameter')}\n"
        diff = result.get("differential_diagnosis", [])[:5]
        if diff:
            context += "- Differential diagnosis: " + ", ".join(f"{d.get('name')}({d.get('probability', 0)*100:.0f}%)" for d in diff) + "\n"
        patient_ctx = case.get("dataset_metadata") or {}
        if patient_ctx:
            context += f"\nPatient/dataset context: age={patient_ctx.get('age')}, sex={patient_ctx.get('sex')}, localization={patient_ctx.get('localization')}"

        chat_history = case.get("chat_history", [])
        history_text = "\n".join(
            f"{'Clinician' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
            for m in chat_history[-10:]
        )
        if history_text:
            context += f"\n\nRecent conversation:\n{history_text}"

        prompt = f"""You are a clinical decision support assistant. A clinician is asking a follow-up question about this case.

{context}

Clinician question: {message}

Provide a helpful, concise answer (2-4 sentences). Be clinically appropriate. If unsure, recommend consulting the full report or a specialist."""

        response = model.generate_content(prompt)
        return response.text.strip() or "I couldn't generate a response. Please try rephrasing."
    except Exception as e:
        return f"Error: {str(e)}"


def _fallback_reasoning(
    health_result: dict,
    vision_result: dict,
    p_fused: float,
    guardrail_result: dict,
    error: str | None = None,
) -> dict[str, Any]:
    """Fallback when Gemini fails or is unavailable."""
    return {
        "node_reasoning": {
            "wearables": f"Wearables analysis: {health_result.get('reason', 'N/A')}.",
            "vision": f"Vision analysis yielded p_vision={vision_result.get('p_vision')}.",
            "fusion": f"Fused score {p_fused} combines wearables and vision.",
            "guardrails": f"Guardrails: {guardrail_result.get('reason', 'N/A')}.",
            "decision": "Review recommended based on fused score." + (f" ({error})" if error else ""),
        },
        "clinician_report": f"Fused risk score: {p_fused}. Guardrails: {guardrail_result.get('reason')}. Review recommended.",
        "patient_summary": "Your results have been analyzed. Please discuss with your care team.",
    }


def run_pipeline(case: dict, lambda_: float = 0.5, conservative: bool = False) -> dict[str, Any]:
    """
    Run full pipeline: wearables -> health, vision -> vision, fusion -> guardrails -> decision -> Gemini.
    """
    # 1. Wearables
    health_result = extract_wearable_features(case.get("wearables_csv"))

    # 2. Vision (required)
    image_base64 = case.get("image_data")
    if not image_base64:
        raise ValueError("Image is required for this demo.")
    patient_context = case.get("dataset_metadata") or {}
    vision_result = run_vision_model(image_base64, patient_context)

    # 3. Fusion
    p_fused = fuse_scores(health_result["p_health"], vision_result["p_vision"], lambda_)

    # 4. Guardrails
    guardrail_result = guardrails(p_fused, conservative)

    # 5. Decision (next steps)
    if guardrail_result["abstain"]:
        next_steps = ["Abstain from automated decision", "Manual review required"]
    elif p_fused > 0.7:
        next_steps = ["Urgent dermatology referral", "Document findings", "Schedule follow-up"]
    elif p_fused > 0.4:
        next_steps = ["Schedule dermatology review", "Monitor lesion", "Document baseline"]
    else:
        next_steps = ["Routine monitoring", "Patient education", "Document in chart"]

    # 6. Gemini reasoning
    gemini_result = call_gemini_for_reasoning(
        health_result, vision_result, p_fused, guardrail_result, image_base64, patient_context, lambda_
    )

    return {
        "p_health": health_result["p_health"],
        "var_health": health_result["var_health"],
        "ci_health": health_result["ci_health"],
        "p_vision": vision_result["p_vision"],
        "var_vision": vision_result["var_vision"],
        "ci_vision": vision_result["ci_vision"],
        "heatmap": vision_result.get("heatmap"),
        "vision_findings": vision_result.get("vision_findings", ""),
        "abcde": vision_result.get("abcde", {}),
        "differential_diagnosis": vision_result.get("differential_diagnosis", []),
        "p_fused": round_float(p_fused),
        "abstain": guardrail_result["abstain"],
        "guardrail_reason": guardrail_result["reason"],
        "next_steps": next_steps,
        "node_reasoning": gemini_result["node_reasoning"],
        "clinician_report": gemini_result["clinician_report"],
        "patient_summary": gemini_result["patient_summary"],
    }
