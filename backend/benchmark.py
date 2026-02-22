"""
HAM10000 benchmark: evaluate pipeline on held-out images.
Reports accuracy, AUC, sensitivity, specificity for binary melanoma vs non-melanoma.
"""
import base64
import random
from pathlib import Path
from typing import Any

from backend.data_loader import load_ham_index
from backend.pipeline import run_vision_model


def compute_metrics(y_true: list[int], y_prob: list[float], threshold: float = 0.5) -> dict[str, float]:
    """
    Compute accuracy, sensitivity, specificity, AUC for binary classification.
    y_true: 0 or 1 (1 = melanoma)
    y_prob: predicted probability of melanoma
    """
    n = len(y_true)
    if n == 0:
        return {"accuracy": 0, "sensitivity": 0, "specificity": 0, "auc": 0}

    y_pred = [1 if p >= threshold else 0 for p in y_prob]
    tp = sum(1 for i in range(n) if y_true[i] == 1 and y_pred[i] == 1)
    tn = sum(1 for i in range(n) if y_true[i] == 0 and y_pred[i] == 0)
    fp = sum(1 for i in range(n) if y_true[i] == 0 and y_pred[i] == 1)
    fn = sum(1 for i in range(n) if y_true[i] == 1 and y_pred[i] == 0)

    accuracy = (tp + tn) / n if n else 0
    sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0

    # AUC: count concordant pairs (Mann-Whitney U statistic)
    pos_indices = [i for i in range(n) if y_true[i] == 1]
    neg_indices = [i for i in range(n) if y_true[i] == 0]
    n_pos = len(pos_indices)
    n_neg = len(neg_indices)
    if n_pos == 0 or n_neg == 0:
        auc = 0.5  # undefined, use chance
    else:
        concordant = 0
        for i in pos_indices:
            for j in neg_indices:
                if y_prob[i] > y_prob[j]:
                    concordant += 1
                elif y_prob[i] == y_prob[j]:
                    concordant += 0.5
        auc = concordant / (n_pos * n_neg)

    return {
        "accuracy": round(accuracy, 4),
        "sensitivity": round(sensitivity, 4),
        "specificity": round(specificity, 4),
        "auc": round(auc, 4),
        "n_samples": n,
        "n_melanoma": n_pos,
        "n_non_melanoma": n_neg,
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
    }


def run_ham_benchmark(
    n_sample: int = 30,
    lambda_: float = 0.0,
    seed: int | None = 42,
) -> dict[str, Any]:
    """
    Run vision pipeline on a random sample of HAM10000 images.
    lambda_=0 means vision-only (no wearables). Uses p_vision for prediction.
    """
    ham_index, error = load_ham_index()
    if error:
        return {"error": error, "metrics": None, "samples": []}

    # Stratified sample: half mel, half non-mel
    mel_entries = [e for e in ham_index if e.get("binary_label_mel") == 1]
    non_mel_entries = [e for e in ham_index if e.get("binary_label_mel") == 0]

    if not mel_entries or not non_mel_entries:
        return {"error": "Insufficient mel/non-mel samples in index", "metrics": None, "samples": []}

    rng = random.Random(seed)
    n_each = min(n_sample // 2, len(mel_entries), len(non_mel_entries))
    sample_entries = rng.sample(mel_entries, n_each) + rng.sample(non_mel_entries, n_each)
    rng.shuffle(sample_entries)

    y_true: list[int] = []
    y_prob: list[float] = []
    samples: list[dict] = []

    for entry in sample_entries:
        filepath = Path(entry.get("filepath", ""))
        if not filepath.exists():
            continue

        with open(filepath, "rb") as f:
            image_bytes = f.read()
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        patient_context = {
            "age": entry.get("age"),
            "sex": entry.get("sex"),
            "localization": entry.get("localization"),
        }

        try:
            vision_result = run_vision_model(image_base64, patient_context)
        except Exception as e:
            samples.append({
                "image_id": entry.get("image_id"),
                "dx": entry.get("dx"),
                "ground_truth": entry.get("binary_label_mel"),
                "p_vision": None,
                "error": str(e),
            })
            continue

        p_vision = vision_result.get("p_vision", 0.5)
        # With lambda_=0, p_fused = p_vision; with wearables missing, p_health=0.5 so p_fused = lambda_*0.5 + (1-lambda_)*p_vision
        p_fused = lambda_ * 0.5 + (1 - lambda_) * p_vision

        gt = entry.get("binary_label_mel", 0)
        y_true.append(gt)
        y_prob.append(p_fused)

        samples.append({
            "image_id": entry.get("image_id"),
            "dx": entry.get("dx"),
            "ground_truth": gt,
            "p_vision": round(p_vision, 4),
            "p_fused": round(p_fused, 4),
            "predicted": 1 if p_fused >= 0.5 else 0,
            "correct": (1 if p_fused >= 0.5 else 0) == gt,
        })

    metrics = compute_metrics(y_true, y_prob) if y_true else None

    return {
        "error": None,
        "metrics": metrics,
        "samples": samples,
        "n_requested": n_sample,
        "n_evaluated": len(y_true),
    }
