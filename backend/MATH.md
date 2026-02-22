# OncoLens Math Appendix

This document maps the prototype screening-score math to backend implementation.

## 1) Wearables slope and featureization

For scalar series \( s_t \), \( t=1,\dots,T \):

- Mean: \( \mu = \frac{1}{T}\sum_{t=1}^{T} s_t \)
- Variance: \( \sigma^2 = \frac{1}{T}\sum_{t=1}^{T}(s_t-\mu)^2 \)
- First 7d mean: mean of first 7 valid points
- Last 7d mean: mean of last 7 valid points
- Delta: \( \Delta_{7d} = \text{last\_7d\_mean} - \text{first\_7d\_mean} \)
- Least-squares slope:
  \[
  \beta = \frac{\sum_t (t-\bar t)(s_t-\mu)}{\sum_t (t-\bar t)^2}, \quad \bar t = \frac{T+1}{2}
  \]

Implemented in:
- `app/pipeline/wearables.py`: `_slope_formula()`, `compute_features()`

## 2) Health-risk scoring + ensemble uncertainty

Linear model:
\[
\text{score} = b + \sum_k w_k x_k
\]
\[
p_{\text{health}} = \sigma(\text{score}), \quad \sigma(z)=\frac{1}{1+e^{-z}}
\]

Monte Carlo uncertainty (20 samples):
- Sample \( w_k^{(m)} = w_k + \epsilon_k^{(m)} \), \( \epsilon_k^{(m)} \sim \mathcal{N}(0,\sigma_w^2) \)
- Compute \( p^{(m)} \) each sample
- Return:
  \[
  \bar p = \frac{1}{M}\sum_m p^{(m)}, \quad
  \mathrm{Var}(p)=\frac{1}{M}\sum_m (p^{(m)}-\bar p)^2
  \]

CI heuristic:
\[
[\bar p - z\sqrt{\mathrm{Var}(p)},\ \bar p + z\sqrt{\mathrm{Var}(p)}] \cap [0,1]
\]

Implemented in:
- `app/pipeline/wearables.py`: `score_health_with_ensemble()`

## 3) Vision score and uncertainty

- Convert image to grayscale.
- Compute gradient magnitude map and Laplacian.
- Image quality proxy: Laplacian variance.
- Vision score:
  \[
  p_{\text{vision}} = \sigma(a(\text{quality}-b))
  \]
- Heatmap: downsample gradient magnitude to 32x32 and normalize to [0,1].
- Variance heuristic:
  \[
  \mathrm{Var}_{\text{vision}} = \mathrm{clip}\left(v_0 + \frac{v_1}{\text{quality}+\epsilon}\right)
  \]

Implemented in:
- `app/pipeline/vision.py`: `compute_vision_score()`, `_heatmap_grid()`

## 4) Calibration interface

Interface:
\[
\text{calibrate}(p)\to p'
\]

Current implementation is identity/no-op. Designed for future temperature scaling.

Temperature scaling (future):
\[
\text{logit}(p') = \frac{\text{logit}(p)}{\tau}
\]

Implemented in:
- `app/pipeline/fusion.py`: `IdentityCalibrator.calibrate()`

## 5) Logit fusion

\[
\text{logit}(p) = \log\left(\frac{p}{1-p}\right)
\]
with epsilon clipping near 0/1.

\[
\text{fused\_logit}=w_0+w_1\cdot \text{logit}(p_{\text{vision}})+w_2\cdot \text{logit}(p_{\text{health}})
\]
\[
p_{\text{fused}}=\sigma(\text{fused\_logit})
\]

Uncertainty:
\[
\mathrm{Var}_{\text{fused}}=\mathrm{Var}_{\text{health}}+\mathrm{Var}_{\text{vision}}
\]
\[
CI_{\text{fused}}=[p_{\text{fused}}-z\sqrt{\mathrm{Var}_{\text{fused}}},\ p_{\text{fused}}+z\sqrt{\mathrm{Var}_{\text{fused}}}]\cap[0,1]
\]

Implemented in:
- `app/pipeline/fusion.py`: `fuse_scores()`

## 6) Abstention guardrails

Flags:
- `data_quality_low`: `days_covered < 21` OR `gaps_count > 5`
- `high_uncertainty`: `var_fused > threshold`
- `image_quality_low`: `image_quality < threshold`

\[
\text{abstain}= \text{data\_quality\_low} \lor \text{high\_uncertainty} \lor \text{image\_quality\_low}
\]

If abstain, category is `deferred` and recommendations are replaced with `defer_to_clinician`.

Implemented in:
- `app/pipeline/guardrails.py`: `evaluate_guardrails()`
- `app/pipeline/decision.py`: `recommend_actions()` (abstain branch)

## 7) Expected utility decision engine

For action \(a\):
- \(U(a,1)\): benefit score
- \(U(a,0)\): harm (negative) score
- cost in USD with scaling `cost_usd_scaled = cost_usd / 1000`

\[
EU(a)=p_{\text{fused}}U(a,1)+(1-p_{\text{fused}})U(a,0)-\lambda\cdot cost\_usd\_scaled
\]

Return top-3 by EU when not abstaining.

Also return:
\[
\text{expected\_benefit}=p_{\text{fused}}U(a,1)
\]
\[
\text{expected\_harm}=(1-p_{\text{fused}})|U(a,0)|
\]

Implemented in:
- `app/pipeline/decision.py`: `recommend_actions()`

## 8) Numeric formatting

All floats are rounded to 6 decimals before:
- writing to Supabase
- returning API response

Implemented in:
- `app/utils/json_clean.py`: `round_floats()`
- `app/main.py`: applied to payload before persistence/response
