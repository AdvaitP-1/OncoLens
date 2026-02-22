"use client";

import type { DagNode } from "@/lib/dag-data";
import type { AbcdeScores, DifferentialDiagnosisItem } from "@/lib/api";
import { X } from "lucide-react";

const TYPE_LABELS: Record<DagNode["type"], string> = {
  source: "Data input",
  process: "Processing",
  transform: "Combining",
  output: "Result",
};

const TYPE_COLORS: Record<DagNode["type"], string> = {
  source: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  process: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  transform: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  output: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const STATUS_LABELS: Record<
  DagNode["status"],
  { label: string; className: string }
> = {
  active: { label: "Active", className: "bg-cyan-500/15 text-cyan-400" },
  idle: { label: "Idle", className: "bg-slate-600/50 text-slate-400" },
  warning: { label: "Warning", className: "bg-amber-500/15 text-amber-400" },
};

interface NodeDetailPanelProps {
  node: DagNode | null;
  onClose: () => void;
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-slate-500"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">
          Select a step to view details and AI explanation
        </p>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[node.status];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-slate-700 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-200 truncate">
            {node.label}
          </h2>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${TYPE_COLORS[node.type]}`}
            >
              {TYPE_LABELS[node.type]}
            </span>
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusInfo.className}`}
            >
              {statusInfo.label}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-0.5 rounded-md p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-200"
          aria-label="Close detail panel"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <p className="text-sm text-slate-400 leading-relaxed">
          {node.description}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Result" value={node.details.value} />
          {node.details.ci && (
            <MetricCard label="Confidence range" value={node.details.ci} />
          )}
          {node.details.reason && (
            <MetricCard label="Reason" value={node.details.reason} />
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
            How it's calculated
          </h3>
          <pre className="rounded-lg bg-slate-800/80 p-3 text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto">
            {node.details.math}
          </pre>
        </div>

        {node.details.geminiReasoning && (
          <div>
            <h3 className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
              AI explanation
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {node.details.geminiReasoning}
            </p>
          </div>
        )}

        {node.id === "vision" && node.details.abcde && (
          <AbcdeSection abcde={node.details.abcde} />
        )}

        {node.id === "vision" && node.details.differential_diagnosis && node.details.differential_diagnosis.length > 0 && (
          <DifferentialSection items={node.details.differential_diagnosis} />
        )}

        {node.details.dependencies.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
              Uses data from
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {node.details.dependencies.map((dep) => (
                <span
                  key={dep}
                  className="inline-flex items-center rounded-md bg-slate-700 px-2.5 py-1 text-xs text-slate-300"
                >
                  {dep}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800/50 px-3 py-2.5">
      <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function AbcdeSection({ abcde }: { abcde: AbcdeScores }) {
  const items: { key: keyof AbcdeScores; label: string }[] = [
    { key: "asymmetry", label: "Asymmetry" },
    { key: "border", label: "Border" },
    { key: "color", label: "Color" },
    { key: "diameter", label: "Diameter" },
    { key: "evolution", label: "Evolution" },
  ];
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
        ABCDE Criteria
      </h3>
      <div className="space-y-2">
        {items.map(({ key, label }) => {
          const v = abcde[key];
          const pct = Math.round(v * 100);
          const concern = v >= 0.6 ? "high" : v >= 0.4 ? "moderate" : "low";
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-20 text-xs text-slate-400">{label}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    concern === "high" ? "bg-rose-500" : concern === "moderate" ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs text-slate-400">{pct}%</span>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500">
        Evolution: N/A for single image (placeholder)
      </p>
    </div>
  );
}

function DifferentialSection({ items }: { items: DifferentialDiagnosisItem[] }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
        Possible diagnoses
      </h3>
      <div className="space-y-2">
        {items.slice(0, 5).map((item, i) => (
          <div key={i} className="rounded-lg bg-slate-800/50 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">
                {item.name}
                <span className="ml-1.5 text-slate-500 font-normal">({item.dx})</span>
              </span>
              <span className="text-sm font-semibold text-cyan-400">
                {(item.probability * 100).toFixed(0)}%
              </span>
            </div>
            {item.rationale && (
              <p className="mt-1 text-xs text-slate-500">{item.rationale}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
