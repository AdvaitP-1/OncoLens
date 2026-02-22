HEALTH_MODEL_BIAS = -1.05
HEALTH_MODEL_WEIGHTS = {
    "steps_mean": -0.00008,
    "sleep_hours_mean": -0.10,
    "resting_hr_mean": 0.025,
    "hrv_ms_mean": -0.035,
    "spo2_mean": -0.050,
    "temp_c_mean": 0.280,
    "weight_kg_mean": 0.006,
    "symptom_score_mean": 0.320,
    "resting_hr_delta_7d": 0.020,
    "hrv_ms_delta_7d": -0.018,
    "symptom_score_delta_7d": 0.160,
    "steps_slope": -0.001,
    "resting_hr_slope": 0.120,
    "hrv_ms_slope": -0.100,
    "symptom_score_slope": 0.220,
    "temp_c_slope": 0.090,
    "weight_kg_slope": 0.010,
}

HEALTH_ENSEMBLE_SAMPLES = 20
HEALTH_BIAS_NOISE_STD = 0.02

FUSION_W0 = 0.0
FUSION_W1 = 0.5
FUSION_W2 = 0.5

VAR_FUSED_THRESHOLD = 0.01
IMG_QUALITY_THRESHOLD = 0.25
