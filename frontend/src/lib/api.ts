/**
 * OncoLens Frontend API client.
 * Uses NEXT_PUBLIC_BACKEND_URL for all requests.
 */

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

async function fetchApi<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  const { params, ...init } = options || {};
  let url = `${BASE}${path}`;
  if (params && Object.keys(params).length > 0) {
    const search = new URLSearchParams(params).toString();
    url += (path.includes("?") ? "&" : "?") + search;
  }
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || String(err) || res.statusText);
  }
  return res.json();
}

export interface CreateCaseFormData {
  wearables_csv?: File | null;
  image?: File | null;
  dataset_image_id?: string | null;
}

export async function createCase(formData: CreateCaseFormData): Promise<{ case_id: string }> {
  const body = new FormData();
  if (formData.wearables_csv) body.append("wearables_csv", formData.wearables_csv);
  if (formData.image) body.append("image", formData.image);
  if (formData.dataset_image_id) body.append("dataset_image_id", formData.dataset_image_id);

  const res = await fetch(`${BASE}/cases`, {
    method: "POST",
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || String(err) || res.statusText);
  }
  return res.json();
}

export async function runCase(
  id: string,
  lambda: number = 0.5,
  conservative: boolean = false
): Promise<RunResult> {
  return fetchApi<RunResult>(`/cases/${id}/run`, {
    method: "POST",
    body: JSON.stringify({ lambda_: lambda, conservative }),
  });
}

export async function getCase(id: string): Promise<CaseData> {
  return fetchApi<CaseData>(`/cases/${id}`);
}

export async function postCaseChat(id: string, message: string): Promise<{ reply: string }> {
  return fetchApi<{ reply: string }>(`/cases/${id}/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export interface HamRandomParams {
  dx?: string;
  label?: string;
  binary_label?: number;
}

export interface HamImageResponse {
  image_id: string;
  dx: string;
  binary_label_mel: number;
  image_base64: string;
  mime_type: string;
}

export async function getRandomHamImage(params: HamRandomParams): Promise<HamImageResponse> {
  const search = new URLSearchParams();
  if (params.dx) search.set("dx", params.dx);
  if (params.label) search.set("label", params.label);
  if (params.binary_label !== undefined) search.set("binary_label", String(params.binary_label));
  const q = search.toString();
  return fetchApi<HamImageResponse>(`/dataset/ham/random${q ? `?${q}` : ""}`);
}

export async function getHamStatus(): Promise<HamStatus> {
  return fetchApi<HamStatus>("/dataset/ham/status");
}

export interface BenchmarkParams {
  n_sample?: number;
  lambda_?: number;
  seed?: number | null;
}

export interface BenchmarkMetrics {
  accuracy: number;
  sensitivity: number;
  specificity: number;
  auc: number;
  n_samples: number;
  n_melanoma: number;
  n_non_melanoma: number;
  tp: number;
  tn: number;
  fp: number;
  fn: number;
}

export interface BenchmarkSample {
  image_id: string;
  dx: string;
  ground_truth: number;
  p_vision?: number | null;
  p_fused?: number;
  predicted?: number;
  correct?: boolean;
  error?: string;
}

export interface BenchmarkResult {
  error: string | null;
  metrics: BenchmarkMetrics | null;
  samples: BenchmarkSample[];
  n_requested: number;
  n_evaluated: number;
}

export interface PipelineStep {
  id: string;
  label: string;
  description: string;
}

export async function getPipelineSteps(): Promise<{ steps: PipelineStep[] }> {
  return fetchApi<{ steps: PipelineStep[] }>("/pipeline/steps");
}

export async function getDemoExplanation(params: {
  patient_name: string;
  image_label: string;
  dx?: string;
}): Promise<{ explanation: string }> {
  return fetchApi<{ explanation: string }>("/demo/explain", {
    method: "POST",
    body: JSON.stringify({
      patient_name: params.patient_name,
      image_label: params.image_label,
      dx: params.dx ?? "",
    }),
  });
}

export async function runBenchmark(params: BenchmarkParams = {}): Promise<BenchmarkResult> {
  return fetchApi<BenchmarkResult>("/benchmark/ham/run", {
    method: "POST",
    body: JSON.stringify({
      n_sample: params.n_sample ?? 30,
      lambda_: params.lambda_ ?? 0,
      seed: params.seed ?? 42,
    }),
  });
}

export interface HamStatus {
  index_exists: boolean;
  error: string | null;
  dataset_dir: string | null;
  counts_by_class: Record<string, number>;
  total?: number;
}

export interface CaseData {
  id: string;
  wearables_csv?: string | null;
  has_image?: boolean;
  dataset_image_id?: string | null;
  dataset_metadata?: { dx: string; binary_label_mel: number; age?: string; sex?: string; localization?: string };
  result?: RunResult;
  chat_history?: { role: string; content: string }[];
}

export interface AbcdeScores {
  asymmetry: number;
  border: number;
  color: number;
  diameter: number;
  evolution: number;
}

export interface DifferentialDiagnosisItem {
  dx: string;
  name: string;
  probability: number;
  rationale: string;
}

export interface RunResult {
  p_health: number;
  var_health: number;
  ci_health: [number, number];
  p_vision: number;
  var_vision: number;
  ci_vision: [number, number];
  heatmap?: string;
  vision_findings?: string;
  abcde?: AbcdeScores;
  differential_diagnosis?: DifferentialDiagnosisItem[];
  p_fused: number;
  abstain: boolean;
  guardrail_reason: string;
  next_steps: string[];
  node_reasoning: Record<string, string>;
  clinician_report: string;
  patient_summary: string;
}
