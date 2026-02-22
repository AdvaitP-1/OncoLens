"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { runBenchmark, type BenchmarkResult } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";

const EST_SECONDS_PER_IMAGE = 2.5;

export default function BenchmarkPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nSample, setNSample] = useState(20);
  const [showSamples, setShowSamples] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!running) {
      setProgress(0);
      return;
    }
    const estimatedMs = nSample * EST_SECONDS_PER_IMAGE * 1000;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(95, (elapsed / estimatedMs) * 100);
      setProgress(pct);
    }, 200);
    return () => clearInterval(interval);
  }, [running, nSample]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setProgress(0);
    try {
      const res = await runBenchmark({ n_sample: nSample, lambda_: 0, seed: 42 });
      setResult(res);
      setProgress(100);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-cyan-400">HAM10000 Benchmark</h1>
          <Link href="/" className="text-sm text-cyan-400 hover:underline">
            Home
          </Link>
        </div>

        <p className="mb-6 text-slate-400">
          Evaluate the vision pipeline on a stratified sample of HAM10000 images (melanoma vs non-melanoma).
          Reports accuracy, AUC, sensitivity, and specificity.
        </p>

        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-900/50 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-500">Sample size</label>
              <select
                value={nSample}
                onChange={(e) => setNSample(parseInt(e.target.value, 10))}
                className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-200"
              >
                {[10, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} images
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleRun}
                disabled={running}
                className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white disabled:opacity-50 hover:bg-cyan-500"
              >
                {running ? "Running..." : "Run Benchmark"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Uses vision-only (λ=0). Each run uses Gemini API calls — expect ~30–60 seconds for 20 images.
          </p>
          {running && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                <span>Processing {nSample} images...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-900/30 p-4 text-red-300">
            {getErrorMessage(error)}
          </div>
        )}

        {result?.error && (
          <div className="mb-6 rounded-lg bg-amber-900/30 p-4 text-amber-300">
            {getErrorMessage(result.error)}
          </div>
        )}

        {result?.metrics && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-200">Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Accuracy"
                  value={(result.metrics.accuracy * 100).toFixed(1)}
                  suffix="%"
                />
                <MetricCard
                  label="AUC"
                  value={result.metrics.auc.toFixed(3)}
                />
                <MetricCard
                  label="Sensitivity"
                  value={(result.metrics.sensitivity * 100).toFixed(1)}
                  suffix="%"
                />
                <MetricCard
                  label="Specificity"
                  value={(result.metrics.specificity * 100).toFixed(1)}
                  suffix="%"
                />
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Evaluated on {result.metrics.n_samples} images ({result.metrics.n_melanoma} melanoma, {result.metrics.n_non_melanoma} non-melanoma).
                TP={result.metrics.tp} TN={result.metrics.tn} FP={result.metrics.fp} FN={result.metrics.fn}
              </p>
            </div>

            <div>
              <button
                onClick={() => setShowSamples(!showSamples)}
                className="text-sm text-cyan-400 hover:underline"
              >
                {showSamples ? "Hide" : "Show"} sample results
              </button>
              {showSamples && result.samples.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800/50">
                        <th className="px-4 py-3 text-left text-slate-400">Image</th>
                        <th className="px-4 py-3 text-left text-slate-400">dx</th>
                        <th className="px-4 py-3 text-left text-slate-400">Ground truth</th>
                        <th className="px-4 py-3 text-left text-slate-400">p_vision</th>
                        <th className="px-4 py-3 text-left text-slate-400">Predicted</th>
                        <th className="px-4 py-3 text-left text-slate-400">Correct</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.samples.map((s, i) => (
                        <tr key={i} className="border-b border-slate-700/50">
                          <td className="px-4 py-2 font-mono text-xs">{s.image_id}</td>
                          <td className="px-4 py-2">{s.dx}</td>
                          <td className="px-4 py-2">{s.ground_truth === 1 ? "mel" : "non-mel"}</td>
                          <td className="px-4 py-2">{s.p_vision != null ? s.p_vision.toFixed(3) : "—"}</td>
                          <td className="px-4 py-2">{s.predicted !== undefined ? (s.predicted === 1 ? "mel" : "non-mel") : "—"}</td>
                          <td className="px-4 py-2">
                            {s.correct !== undefined ? (
                              s.correct ? (
                                <span className="text-emerald-400">✓</span>
                              ) : (
                                <span className="text-rose-400">✗</span>
                              )
                            ) : s.error ? (
                              <span className="text-amber-400">err</span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-800 p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-cyan-400">
        {value}{suffix}
      </div>
    </div>
  );
}
