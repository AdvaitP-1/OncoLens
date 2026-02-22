export function fmtNumber(value, digits = 4) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(digits);
}

/**
 * Normalizes a case object from backend/DB for frontend consumption.
 * Maps recommendation fields: eu->expected_utility, expected_benefit->benefit,
 * expected_harm->harm, cost_usd->cost. Returns empty array if recommendations missing.
 * Maps evidence: heatmap_32->evidence_grid, image_quality for Imaging page.
 */
export function normalizeCase(caseRow) {
  if (!caseRow) return caseRow;
  const recs = caseRow.recommendations;
  const normalized =
    Array.isArray(recs) && recs.length > 0
      ? recs.map((r) => ({
          action: r?.action ?? "",
          expected_utility: r?.eu ?? r?.expected_utility ?? 0,
          benefit: r?.expected_benefit ?? r?.benefit ?? 0,
          harm: r?.expected_harm ?? r?.harm ?? 0,
          cost: r?.cost_usd ?? r?.cost ?? 0,
        }))
      : [];

  const scores = caseRow.scores || {};
  const evidence = scores.evidence || caseRow.evidence || {};
  const evidenceGrid =
    evidence.heatmap_32 ?? scores.evidence_grid ?? caseRow.evidence_grid ?? [];
  const imageQuality =
    evidence.image_quality ?? scores.image_quality ?? caseRow.image_quality;

  return {
    ...caseRow,
    recommendations: normalized,
    scores: {
      ...scores,
      evidence_grid: Array.isArray(evidenceGrid) ? evidenceGrid : [],
      image_quality: typeof imageQuality === "number" ? imageQuality : undefined,
    },
  };
}

export function fmtDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function titleCase(value = "") {
  return value
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
