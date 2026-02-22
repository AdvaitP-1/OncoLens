import type { RunResult, AbcdeScores, DifferentialDiagnosisItem } from "./api";

export interface DagNode {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  type: "source" | "process" | "transform" | "output";
  status: "active" | "idle" | "warning";
  details: {
    math: string;
    value: string;
    ci?: string;
    reason?: string;
    dependencies: string[];
    geminiReasoning: string;
    abcde?: AbcdeScores;
    differential_diagnosis?: DifferentialDiagnosisItem[];
  };
}

export interface DagEdge {
  from: string;
  to: string;
}

export function buildDagFromResult(
  result: RunResult,
  lambda: number,
  conservative: boolean
): { nodes: DagNode[]; edges: DagEdge[] } {
  const reasoning = result.node_reasoning || {};

  const nodes: DagNode[] = [
    {
      id: "wearables",
      label: "Wearables",
      description: "Analyzes patient wearables CSV (heart rate, SpO2) to estimate health-based risk.",
      x: 80,
      y: 60,
      type: "source",
      status: "active",
      details: {
        math: `p_health from CSV heuristics:\n• HR > 100: p = min(0.75, 0.5 + (HR-100)/200)\n• HR < 60: p = max(0.25, 0.5 - (60-HR)/200)\n• SpO2 < 95: p = min(0.8, 0.5 + (95-SpO2)/50)\n• CI = [p-0.15, p+0.15]`,
        value: result.p_health.toFixed(4),
        ci: `[${result.ci_health[0].toFixed(4)}, ${result.ci_health[1].toFixed(4)}]`,
        reason: "wearables_analyzed",
        dependencies: [],
        geminiReasoning: reasoning.wearables || "",
      },
    },
    {
      id: "vision",
      label: "Vision",
      description: "Dermatoscopic image analysis for lesion risk scoring with ABCDE criteria and differential diagnosis.",
      x: 80,
      y: 180,
      type: "source",
      status: "active",
      details: {
        math: `p_vision from Gemini vision model:\n• ABCDE: asymmetry, border, color, diameter, evolution\n• Differential diagnosis: mel, nv, bkl, bcc, ak, vasc, df\n• CI = [p_vision - δ, p_vision + δ]`,
        value: result.p_vision.toFixed(4),
        ci: `[${result.ci_vision[0].toFixed(4)}, ${result.ci_vision[1].toFixed(4)}]`,
        reason: result.vision_findings || undefined,
        dependencies: [],
        geminiReasoning: reasoning.vision || "",
        abcde: result.abcde,
        differential_diagnosis: result.differential_diagnosis,
      },
    },
    {
      id: "fusion",
      label: "Fusion",
      description: "Weighted combination of wearables and vision scores.",
      x: 340,
      y: 120,
      type: "transform",
      status: "active",
      details: {
        math: `p_fused = λ × p_health + (1 − λ) × p_vision\n\nWith λ = ${lambda.toFixed(2)}:\np_fused = ${lambda.toFixed(2)} × ${result.p_health.toFixed(4)} + ${(1 - lambda).toFixed(2)} × ${result.p_vision.toFixed(4)}\n     = ${result.p_fused.toFixed(4)}`,
        value: result.p_fused.toFixed(4),
        dependencies: ["Wearables", "Vision"],
        geminiReasoning: reasoning.fusion || "",
      },
    },
    {
      id: "guardrails",
      label: "Guardrails",
      description: "Safety checks: abstain if uncertain, flag risk levels.",
      x: 600,
      y: 120,
      type: "process",
      status: result.abstain ? "warning" : "active",
      details: {
        math: `If conservative ∧ 0.3 < p_fused < 0.7 → abstain\nElse:\n• p_fused < 0.1 → low_risk\n• p_fused > 0.9 → high_risk\n• else → moderate_risk\n\nResult: ${result.guardrail_reason}`,
        value: result.abstain ? "Abstain" : "Pass",
        reason: result.guardrail_reason,
        dependencies: ["Fusion"],
        geminiReasoning: reasoning.guardrails || "",
      },
    },
    {
      id: "decision",
      label: "Decision",
      description: "Recommended next steps based on fused score and guardrails.",
      x: 860,
      y: 120,
      type: "output",
      status: "active",
      details: {
        math: `If abstain → Manual review\nIf p_fused > 0.7 → Urgent referral\nIf p_fused > 0.4 → Schedule review\nElse → Routine monitoring`,
        value: result.next_steps?.[0] || "—",
        dependencies: ["Guardrails"],
        geminiReasoning: reasoning.decision || "",
      },
    },
  ];

  const edges: DagEdge[] = [
    { from: "wearables", to: "fusion" },
    { from: "vision", to: "fusion" },
    { from: "fusion", to: "guardrails" },
    { from: "guardrails", to: "decision" },
  ];

  return { nodes, edges };
}

/** Skeleton DAG for display during processing (no result yet). */
export function buildSkeletonDag(): { nodes: DagNode[]; edges: DagEdge[] } {
  const placeholder = (id: string, label: string, desc: string, type: DagNode["type"], x: number, y: number): DagNode =>
    ({
      id,
      label,
      description: desc,
      x,
      y,
      type,
      status: "active",
      details: {
        math: "",
        value: "…",
        dependencies: [],
        geminiReasoning: "",
      },
    });

  const nodes: DagNode[] = [
    placeholder("wearables", "Wearables", "Analyzing wearables data…", "source", 80, 60),
    placeholder("vision", "Vision", "Analyzing lesion image…", "source", 80, 180),
    placeholder("fusion", "Fusion", "Combining scores…", "transform", 340, 120),
    placeholder("guardrails", "Guardrails", "Applying safety checks…", "process", 600, 120),
    placeholder("decision", "Decision", "Generating recommendations…", "output", 860, 120),
  ];

  const edges: DagEdge[] = [
    { from: "wearables", to: "fusion" },
    { from: "vision", to: "fusion" },
    { from: "fusion", to: "guardrails" },
    { from: "guardrails", to: "decision" },
  ];

  return { nodes, edges };
}
