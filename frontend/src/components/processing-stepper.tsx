"use client";

import { useEffect, useState } from "react";
import { Activity, Scan, GitMerge, ShieldCheck, FileCheck } from "lucide-react";

const STEPS = [
  { id: "wearables", label: "Health data", icon: Activity },
  { id: "vision", label: "Image", icon: Scan },
  { id: "fusion", label: "Combining", icon: GitMerge },
  { id: "guardrails", label: "Safety check", icon: ShieldCheck },
  { id: "decision", label: "Recommendation", icon: FileCheck },
] as const;

const STEP_IDS = ["wearables", "vision", "fusion", "guardrails", "decision"] as const;

interface ProcessingStepperProps {
  running: boolean;
  completed: boolean;
  currentStepIndex: number;
}

export function ProcessingStepper({ running, completed, currentStepIndex }: ProcessingStepperProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3">
      {STEPS.map((step, i) => {
        const isActive = running && i === currentStepIndex;
        const isDone = completed || (running && i < currentStepIndex);
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex flex-1 items-center">
            <div
              className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
                isDone ? "opacity-100" : isActive ? "opacity-100" : "opacity-40"
              }`}
            >
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isDone
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                    : isActive
                      ? "border-cyan-500 bg-cyan-500/20 text-cyan-400 animate-pulse"
                      : "border-slate-600 bg-slate-800/50 text-slate-500"
                }`}
              >
                {isDone ? (
                  <span className="text-lg font-bold">✓</span>
                ) : (
                  <Icon size={18} />
                )}
                {isActive && (
                  <span className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500" />
                  </span>
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isDone ? "text-emerald-400" : isActive ? "text-cyan-400" : "text-slate-500"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 rounded transition-all duration-300 ${
                  isDone ? "bg-emerald-500/50" : i < currentStepIndex ? "bg-emerald-500/50" : "bg-slate-700"
                }`}
              >
                {running && i === currentStepIndex - 1 && (
                  <div className="h-full w-full animate-pulse rounded bg-cyan-500/50" />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function useProcessingStep(running: boolean, stepDurationMs: number = 2200) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!running) {
      setStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
    }, stepDurationMs);
    return () => clearInterval(interval);
  }, [running, stepDurationMs]);

  return stepIndex;
}

export { STEP_IDS };
