"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCase, getCase, getRandomHamImage, postCaseChat, runCase, getDemoExplanation, getPipelineSteps, type CaseData, type RunResult, type PipelineStep } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { buildDagFromResult, buildSkeletonDag } from "@/lib/dag-data";
import { DagCanvas } from "@/components/dag-canvas";
import { NodeDetailPanel } from "@/components/node-detail-panel";
import { ProcessingStepper, useProcessingStep } from "@/components/processing-stepper";
import { MockProcessingOverlay } from "@/components/mock-processing-overlay";

type Tab = "dag" | "graphs" | "mock" | "chat";

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("dag");
  const [lambda, setLambda] = useState(0.5);
  const [conservative, setConservative] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);

  const loadCase = async () => {
    try {
      const c = await getCase(id);
      setCaseData(c);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [id]);

  useEffect(() => {
    getPipelineSteps()
      .then((res) => setPipelineSteps(res.steps))
      .catch(() => setPipelineSteps([]));
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      await runCase(id, lambda, conservative);
      await loadCase();
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400"
        aria-live="polite"
        aria-busy="true"
      >
        <span role="status">Loading case...</span>
      </main>
    );
  }

  if (error && !caseData) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-400 px-6">
        <p className="text-red-400 text-center">{getErrorMessage(error, "case")}</p>
        <Link href="/" className="text-cyan-400 hover:underline">
          Back to home
        </Link>
      </main>
    );
  }

  const result = caseData?.result;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">Case {id.slice(0, 8)}</h1>
            {caseData?.dataset_metadata && (
              <p className="mt-0.5 text-sm text-slate-500">
                {caseData.dataset_metadata.dx}
                {caseData.dataset_metadata.age ? ` · age ${caseData.dataset_metadata.age}` : ""}
                {caseData.dataset_metadata.sex ? ` · ${caseData.dataset_metadata.sex}` : ""}
                {caseData.dataset_metadata.localization ? ` · ${caseData.dataset_metadata.localization}` : ""}
              </p>
            )}
            {caseData?.dataset_image_id && !caseData?.dataset_metadata && (
              <p className="mt-0.5 text-sm text-slate-500">Image: {caseData.dataset_image_id}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/benchmark" className="text-sm text-slate-400 hover:text-cyan-400">
              Benchmark
            </Link>
            <Link href="/new-case" className="text-sm text-cyan-400 hover:underline">
              New Case
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b border-slate-700">
          {(
            [
              { id: "dag" as Tab, label: "Pipeline" },
              { id: "graphs" as Tab, label: "Metrics" },
              { id: "mock" as Tab, label: "Guided Demo" },
              { id: "chat" as Tab, label: "Q&A" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium ${
                tab === id ? "border-b-2 border-cyan-500 text-cyan-400" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab purpose */}
        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/30 px-4 py-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">What this tab does</p>
          <p className="text-sm text-slate-400 leading-relaxed">
            {tab === "dag" && (
              <>The <strong className="text-slate-300">Pipeline</strong> tab shows the visual flowchart of how we analyze each case. Run analysis, then <strong className="text-cyan-400">click any node</strong> to see Gemini&apos;s explanation of the math and reasoning for that step.</>
            )}
            {tab === "graphs" && (
              <>The <strong className="text-slate-300">Metrics</strong> tab shows the numerical results: health score, image score, combined score, ABCDE criteria (asymmetry, border, color, etc.), and possible diagnoses. Use this to understand the &quot;why&quot; behind the recommendation.</>
            )}
            {tab === "mock" && (
              <>The <strong className="text-slate-300">Guided Demo</strong> tab lets you try OncoLens with sample patient data and skin images—no real data needed. Load a sample patient, pick an image, and run to see the full pipeline in action.</>
            )}
            {tab === "chat" && (
              <>The <strong className="text-slate-300">Q&A</strong> tab lets you ask follow-up questions about this case. After running analysis, you can ask the AI to explain findings, compare options, or clarify recommendations.</>
            )}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/30 p-4 text-red-300">
            {getErrorMessage(error)}
          </div>
        )}

        {tab === "dag" && (
          <DagTab result={result} onRun={handleRun} running={running} lambda={lambda} setLambda={setLambda} conservative={conservative} setConservative={setConservative} pipelineSteps={pipelineSteps} />
        )}
        {tab === "graphs" && <GraphsTab result={result} />}
        {tab === "mock" && <MockPatientTab caseId={id} onRun={handleRun} running={running} pipelineSteps={pipelineSteps} />}
        {tab === "chat" && <ChatTab caseId={id} caseData={caseData} onMessage={loadCase} onRun={handleRun} running={running} />}
      </div>
    </main>
  );
}

const STEP_ORDER = ["wearables", "vision", "fusion", "guardrails", "decision"];

function DagTab({
  result,
  onRun,
  running,
  lambda,
  setLambda,
  conservative,
  setConservative,
  pipelineSteps,
}: {
  result?: RunResult | null;
  onRun: () => void;
  running: boolean;
  lambda: number;
  setLambda: (v: number) => void;
  conservative: boolean;
  setConservative: (v: boolean) => void;
  pipelineSteps: PipelineStep[];
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const processingStep = useProcessingStep(running, 2200);
  const { nodes, edges } = result
    ? buildDagFromResult(result, lambda, conservative)
    : buildSkeletonDag();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Step-by-step analysis — compact, uses node_reasoning when available */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-300">Pipeline steps</h3>
        <p className="mb-3 text-xs text-slate-500 leading-relaxed">
          Run analysis to see the flow. Click a node in the diagram for a detailed AI explanation of the math and reasoning.
        </p>
        <div className="space-y-3">
          {STEP_ORDER.map((id, i) => {
            const step = pipelineSteps.find((s) => s.id === id) ?? { id, label: `Step ${i + 1}`, description: "Loading..." };
            const isActive = running && i === processingStep;
            const isDone = (result && !running) || (running && i < processingStep);
            const desc = result?.node_reasoning?.[step.id] ?? step.description;
            return (
              <div
                key={step.id}
                className={`rounded-lg border px-4 py-3 transition-colors ${
                  isActive
                    ? "border-cyan-500/50 bg-cyan-500/10"
                    : isDone
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-slate-700 bg-slate-800/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isActive ? "bg-cyan-500/30 text-cyan-300" : isDone ? "bg-emerald-500/30 text-emerald-300" : "bg-slate-700 text-slate-500"
                    }`}
                  >
                    {isDone && !isActive ? "✓" : i + 1}
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${isActive ? "text-cyan-300" : isDone ? "text-emerald-300/90" : "text-slate-400"}`}>
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(running || result) && (
        <ProcessingStepper
          running={running}
          completed={!!result && !running}
          currentStepIndex={running ? processingStep : 4}
        />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={onRun}
            disabled={running}
            className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-500"
          >
            {running ? "Running..." : "Run Analysis"}
          </button>
          <label
            className="flex items-center gap-2 text-sm text-slate-400"
            title="How much to trust image vs health data (left = image only, right = health data only)"
          >
            <span className="text-xs">Blend:</span>
            <span className="text-xs text-slate-500">Image</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={lambda}
              onChange={(e) => setLambda(parseFloat(e.target.value))}
              className="w-24"
              aria-label="Blend: image only to health data only"
            />
            <span className="text-xs text-slate-500">Health</span>
            <span className="text-xs">{(lambda * 100).toFixed(0)}%</span>
          </label>
          <label
            className="flex items-center gap-2 text-sm text-slate-400"
            title="When unsure, recommend human review instead of guessing"
          >
            <input
              type="checkbox"
              checked={conservative}
              onChange={(e) => setConservative(e.target.checked)}
              aria-label="Ask for human review when unsure"
            />
            Ask for human review when unsure
          </label>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-500" /> Data
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Processing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Combining
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Result
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900/30 min-h-[450px]">
        <main className="flex-1 min-w-0 min-h-[300px] overflow-auto flex flex-col">
          <p className="px-4 py-2 text-xs text-slate-500 border-b border-slate-700/50 shrink-0">
            Click any node to see Gemini&apos;s explanation of the math and reasoning for that step
          </p>
          <div className="relative flex-1 min-h-[280px]">
            <DagCanvas
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              processingStep={running ? processingStep : -1}
              isProcessing={running}
            />
            {!result && !running && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/70 rounded-lg backdrop-blur-sm">
                <p className="text-slate-400 mb-4">Click &quot;Run Analysis&quot; to see how your case is evaluated</p>
                <button
                  onClick={onRun}
                  className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white hover:bg-cyan-500"
                >
                  Run Analysis
                </button>
              </div>
            )}
          </div>
        </main>
        <aside
          className={`border-t lg:border-t-0 lg:border-l border-slate-700 bg-slate-900/50 transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
            selectedNode ? "lg:w-80 w-full" : "lg:w-64 w-full"
          }`}
        >
          <NodeDetailPanel
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
          />
        </aside>
      </div>

      {result && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Clinician Report</p>
              <p className="text-slate-300 mt-1">{result.clinician_report}</p>
            </div>
            <div>
              <p className="text-slate-500">Patient Summary</p>
              <p className="text-slate-300 mt-1">{result.patient_summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GraphsTab({ result }: { result?: RunResult | null }) {
  if (!result) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-8 text-center text-slate-500">
        Run analysis to see scores and charts.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-200">Scores</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-800 p-4">
            <div className="text-sm text-slate-500">Health score</div>
            <div className="text-2xl font-bold text-cyan-400">{result.p_health.toFixed(4)}</div>
            <div className="text-xs text-slate-500">Confidence range: [{result.ci_health[0].toFixed(4)}, {result.ci_health[1].toFixed(4)}]</div>
          </div>
          <div className="rounded-lg bg-slate-800 p-4">
            <div className="text-sm text-slate-500">Image score</div>
            <div className="text-2xl font-bold text-cyan-400">{result.p_vision.toFixed(4)}</div>
            <div className="text-xs text-slate-500">Confidence range: [{result.ci_vision[0].toFixed(4)}, {result.ci_vision[1].toFixed(4)}]</div>
          </div>
          <div className="rounded-lg bg-slate-800 p-4">
            <div className="text-sm text-slate-500">Combined score</div>
            <div className="text-2xl font-bold text-cyan-400">{result.p_fused.toFixed(4)}</div>
          </div>
        </div>
      </div>

      {result.abcde && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">ABCDE Criteria</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {(["asymmetry", "border", "color", "diameter", "evolution"] as const).map((key) => {
              const v = result.abcde![key];
              const pct = Math.round(v * 100);
              const concern = v >= 0.6 ? "high" : v >= 0.4 ? "moderate" : "low";
              const labels: Record<string, string> = {
                asymmetry: "Asymmetry",
                border: "Border",
                color: "Color",
                diameter: "Diameter",
                evolution: "Evolution",
              };
              return (
                <div key={key} className="rounded-lg bg-slate-800 p-4">
                  <div className="text-sm text-slate-500 mb-2">{labels[key]}</div>
                  <div className="h-2 rounded-full bg-slate-700 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        concern === "high" ? "bg-rose-500" : concern === "moderate" ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-lg font-bold text-slate-200">{pct}%</div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">Evolution is N/A for single-image analysis.</p>
        </div>
      )}

      {result.differential_diagnosis && result.differential_diagnosis.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">Possible diagnoses</h2>
          <div className="space-y-3">
            {result.differential_diagnosis.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-4 rounded-lg bg-slate-800 p-4">
                <div>
                  <div className="font-medium text-slate-200">
                    {item.name}
                    <span className="ml-2 text-slate-500 font-normal">({item.dx})</span>
                  </div>
                  {item.rationale && (
                    <p className="mt-1 text-sm text-slate-500">{item.rationale}</p>
                  )}
                </div>
                <div className="text-xl font-bold text-cyan-400 shrink-0">
                  {(item.probability * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.heatmap && result.heatmap.length > 200 && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">Heatmap</h2>
          <img src={result.heatmap} alt="Heatmap" className="max-h-64 rounded-lg" />
        </div>
      )}
    </div>
  );
}

function MockPatientTab({
  caseId,
  onRun,
  running,
  pipelineSteps,
}: {
  caseId: string;
  onRun: () => void;
  running: boolean;
  pipelineSteps: PipelineStep[];
}) {
  const [loadedCsv, setLoadedCsv] = useState<File | null>(null);
  const [pickedImage, setPickedImage] = useState<{ image_id: string; dx: string; label: "mel" | "non-mel" } | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoExplanation, setDemoExplanation] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const router = useRouter();

  const loadPatient = async (name: string) => {
    setDemoError(null);
    try {
      const res = await fetch(`/sample_cases/${name}`);
      const text = await res.text();
      setLoadedCsv(new File([text], name, { type: "text/csv" }));
      setPickedImage(null);
    } catch (e) {
      setDemoError(String(e));
    }
  };

  const pickRandomImage = async (label: "mel" | "non-mel") => {
    setDemoError(null);
    try {
      const res = await getRandomHamImage({ label });
      setPickedImage({ image_id: res.image_id, dx: res.dx, label });
    } catch (e) {
      setDemoError(String(e));
    }
  };

  const createAndRun = async () => {
    if (!loadedCsv || !pickedImage) {
      setDemoError("Load patient data and pick a skin image first.");
      return;
    }
    setDemoLoading(true);
    setDemoError(null);
    setDemoExplanation(null);
    setExplanationLoading(true);

    // Fetch Gemini explanation in parallel
    getDemoExplanation({
      patient_name: loadedCsv.name,
      image_label: pickedImage.label,
      dx: pickedImage.dx,
    })
      .then((res) => {
        setDemoExplanation(res.explanation);
      })
      .catch(() => {
        setDemoExplanation(
          "We're analyzing the patient's wearables and the dermatoscopic image. " +
            "The vision model will assess ABCDE criteria and differential diagnosis, " +
            "then we'll fuse scores and apply guardrails for the final recommendation."
        );
      })
      .finally(() => setExplanationLoading(false));

    try {
      const { case_id } = await createCase({
        wearables_csv: loadedCsv,
        dataset_image_id: pickedImage.image_id,
      });
      await runCase(case_id, 0.5, false);
      router.push(`/cases/${case_id}`);
    } catch (e) {
      setDemoError(String(e));
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <MockProcessingOverlay
        isOpen={demoLoading}
        patientName={loadedCsv?.name ?? ""}
        imageLabel={pickedImage?.label ?? "non-mel"}
        dx={pickedImage?.dx ?? ""}
        explanation={demoExplanation}
        explanationLoading={explanationLoading}
        pipelineSteps={pipelineSteps}
      />
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
        <h2 className="mb-2 text-lg font-semibold text-slate-200">Guided Demo</h2>
        <div className="mb-6 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
          <h3 className="mb-2 text-sm font-semibold text-cyan-400">Why this demo?</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            The purpose of this demo is to let you <strong>try OncoLens without real patient data</strong>. You can see how the system combines health data from wearables with skin image analysis to support clinical decisions. Whether you&apos;re a clinician, researcher, or simply curious—this demo shows you the full pipeline in under a minute. No medical background required; we explain each step in plain language.
          </p>
        </div>
        <p className="mb-6 text-sm text-slate-400 leading-relaxed">
          Follow the steps below: load sample patient data, pick a skin image, and run the analysis. You&apos;ll see each stage of the pipeline as it runs.
        </p>
        <div className="space-y-8">
          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-5">
            <div className="mb-2 text-sm font-medium text-slate-300">Step 1: Load patient health data</div>
            <p className="mb-4 text-sm text-slate-400 leading-relaxed">
              This is data from wearable devices (like smartwatches or fitness trackers) that track heart rate, oxygen levels, and activity. In real clinics, doctors use this to understand a patient&apos;s overall health before looking at a skin lesion. We&apos;ve prepared 3 sample patients to show different scenarios:
            </p>
            <ul className="mb-4 list-disc list-inside text-sm text-slate-400 space-y-1">
              <li><strong className="text-slate-300">Patient A (high priority)</strong> — Has concerning signs (e.g., elevated heart rate, low oxygen) that may increase risk.</li>
              <li><strong className="text-slate-300">Patient B (needs review)</strong> — Mixed signals; the system will likely recommend a human doctor review.</li>
              <li><strong className="text-slate-300">Patient C (low priority)</strong> — Health data looks normal; lower urgency.</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadPatient("patient_a_high_priority.csv")}
                className="rounded-md bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-500"
              >
                Load Patient A (high priority)
              </button>
              <button
                onClick={() => loadPatient("patient_b_needs_review.csv")}
                className="rounded-md bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-500"
              >
                Load Patient B (needs review)
              </button>
              <button
                onClick={() => loadPatient("patient_c_deferred_low_quality.csv")}
                className="rounded-md bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-500"
              >
                Load Patient C (low priority)
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {loadedCsv ? `Loaded: ${loadedCsv.name.replace(/_/g, " ").replace(".csv", "")}` : "No data loaded yet"}
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-5">
            <div className="mb-2 text-sm font-medium text-slate-300">Step 2: Pick a skin image</div>
            <p className="mb-4 text-sm text-slate-400 leading-relaxed">
              This is a dermatoscopic image—a close-up photo of a skin lesion (mole or spot) taken with a special magnifying device. We use a library of real skin images. You can pick:
            </p>
            <ul className="mb-4 list-disc list-inside text-sm text-slate-400 space-y-1">
              <li><strong className="text-slate-300">Random Melanoma</strong> — An image that looks suspicious (possible skin cancer risk). The AI will assess how concerning it is.</li>
              <li><strong className="text-slate-300">Random Other (benign)</strong> — An image that looks harmless (not cancerous). The AI will typically recommend routine monitoring.</li>
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => pickRandomImage("mel")}
                className="rounded-md bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-500"
              >
                Random Melanoma
              </button>
              <button
                onClick={() => pickRandomImage("non-mel")}
                className="rounded-md bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-500"
              >
                Random Other (benign)
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {pickedImage ? `Picked: ${pickedImage.image_id} (${pickedImage.label === "mel" ? "Melanoma" : "Other"})` : "No image picked yet"}
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-5">
            <div className="mb-2 text-sm font-medium text-slate-300">Step 3: Run analysis</div>
            <p className="mb-4 text-sm text-slate-400 leading-relaxed">
              Click below to combine the patient&apos;s health data with the skin image analysis. Our AI will: (1) read the health data, (2) analyze the skin image using medical criteria, (3) combine both scores, (4) run a safety check, and (5) give a recommendation (e.g., urgent referral, schedule review, or routine monitoring). You&apos;ll see each step as it happens.
            </p>
            <button
              onClick={createAndRun}
              disabled={demoLoading || !loadedCsv || !pickedImage}
              className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white disabled:opacity-50 hover:bg-cyan-500"
            >
              {demoLoading ? "Creating & running..." : "Create & Run"}
            </button>
          </div>
        </div>
        {demoError && (
          <div className="mt-4 rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
            {getErrorMessage(demoError)}
          </div>
        )}
      </div>
      <hr className="border-slate-700" />
      <div>
        <p className="mb-2 text-sm text-slate-500">Or run analysis on the current case:</p>
        <button
          onClick={onRun}
          disabled={running}
          className="rounded-lg bg-slate-600 px-6 py-2 font-medium text-white disabled:opacity-50 hover:bg-slate-500"
        >
          {running ? "Running..." : "Run Analysis"}
        </button>
      </div>
    </div>
  );
}

function ChatTab({
  caseId,
  caseData,
  onMessage,
  onRun,
  running,
}: {
  caseId: string;
  caseData: CaseData | null;
  onMessage: () => void;
  onRun: () => void;
  running: boolean;
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatHistory = caseData?.chat_history || [];
  const hasResult = !!caseData?.result;

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || sending || !hasResult) return;
    setSending(true);
    setChatError(null);
    setInput("");
    try {
      await postCaseChat(caseId, msg);
      onMessage();
    } catch (e) {
      setChatError(String(e));
      setInput(msg);
    } finally {
      setSending(false);
    }
  };

  if (!hasResult) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-500 mb-4">
          Run analysis first to get AI insights, then ask follow-up questions about the case.
        </p>
        <button
          onClick={onRun}
          disabled={running}
          className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-500"
        >
          {running ? "Running..." : "Run Analysis"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-200">Clinician Q&A</h2>
        <p className="text-sm text-slate-500">Ask follow-up questions about this case. Gemini has full context.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
        {chatHistory.length === 0 ? (
          <p className="text-slate-500 text-sm">No messages yet. Ask a question below.</p>
        ) : (
          chatHistory.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-700 text-slate-200"
                }`}
              >
                <span className="text-xs opacity-75 block mb-1">
                  {m.role === "user" ? "You" : "Assistant"}
                </span>
                {m.content}
              </div>
            </div>
          ))
        )}
      </div>
      {chatError && (
        <div className="px-4 py-2 bg-red-900/30 text-red-300 text-sm">
          {getErrorMessage(chatError)}
        </div>
      )}
      <div className="p-4 border-t border-slate-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask a follow-up question..."
          className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white disabled:opacity-50 hover:bg-cyan-500"
        >
          {sending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
