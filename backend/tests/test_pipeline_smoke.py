from io import BytesIO
from pathlib import Path
import sys

import numpy as np
import pandas as pd
from PIL import Image

# Ensure imports work when running pytest from backend/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.pipeline.fusion import fuse_scores
from app.pipeline.wearables import compute_features, score_health_with_ensemble, validate_and_quality
from app.pipeline.vision import compute_vision_score


def test_pipeline_probabilities_and_ci_bounds():
    rows = []
    for i in range(30):
        rows.append(
            {
                "date": f"2026-01-{i + 1:02d}",
                "steps": 6500 + (i % 6) * 140,
                "sleep_hours": 7.2 - (i % 4) * 0.15,
                "resting_hr": 66 + (i % 5),
                "hrv_ms": 49 - (i % 4),
                "spo2": 98 - (i % 2),
                "temp_c": 36.6 + (i % 3) * 0.08,
                "weight_kg": 70.9 + (i % 5) * 0.1,
                "symptom_score": 1 + (i % 3),
            }
        )
    df = pd.DataFrame(rows)
    clean_df, quality = validate_and_quality(df)
    wear = compute_features(clean_df, data_quality=quality)
    health = score_health_with_ensemble(wear["feature_order"], wear["feature_vector"])

    image_array = np.tile(np.linspace(0, 255, 160, dtype=np.uint8), (160, 1))
    image = Image.fromarray(image_array)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    vision = compute_vision_score(buffer.getvalue())

    fusion = fuse_scores(
        p_health=health["p_health"],
        var_health=health["var_health"],
        p_vision=vision["p_vision"],
        var_vision=vision["var_vision"],
    )

    assert 0.0 <= health["p_health"] <= 1.0
    assert 0.0 <= vision["p_vision"] <= 1.0
    assert 0.0 <= fusion["p_fused"] <= 1.0

    for lo, hi in [health["ci_health"], vision["ci_vision"], fusion["ci_fused"]]:
        assert 0.0 <= lo <= hi <= 1.0
