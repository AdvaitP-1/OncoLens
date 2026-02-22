"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Scan, GitMerge, ShieldCheck, FileCheck, Sparkles } from "lucide-react";
import { ProcessingStepper, useProcessingStep } from "./processing-stepper";
import type { PipelineStep } from "@/lib/api";

const STEP_ORDER = ["wearables", "vision", "fusion", "guardrails", "decision"] as const;
const STEP_ICONS = {
  wearables: Activity,
  vision: Scan,
  fusion: GitMerge,
  guardrails: ShieldCheck,
  decision: FileCheck,
} as const;

export interface MockProcessingOverlayProps {
  isOpen: boolean;
  patientName: string;
  imageLabel: string;
  dx: string;
  explanation: string | null;
  explanationLoading: boolean;
  pipelineSteps?: PipelineStep[];
}

export function MockProcessingOverlay({
  isOpen,
  patientName,
  imageLabel,
  dx,
  explanation,
  explanationLoading,
  pipelineSteps = [],
}: MockProcessingOverlayProps) {
  const processingStep = useProcessingStep(isOpen, 2200);
  const steps = pipelineSteps ?? [];
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mock-processing-title"
        aria-describedby="mock-processing-desc"
        tabIndex={-1}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md outline-none"
      >
        <div className="mx-auto max-w-2xl w-full px-6 space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h2 id="mock-processing-title" className="text-xl font-semibold text-cyan-400">Processing your demo case</h2>
            <p id="mock-processing-desc" className="mt-1 text-sm text-slate-500">
              {patientName} × {imageLabel === "mel" ? "Melanoma (suspicious)" : "Other (benign)"}
              {dx ? ` (${dx})` : ""}
            </p>
          </motion.div>

          {/* Processing stepper */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <ProcessingStepper
              running={true}
              completed={false}
              currentStepIndex={processingStep}
            />
          </motion.div>

          {/* Animated step cards (labels from Gemini pipeline steps) */}
          <div className="grid grid-cols-5 gap-2">
            {STEP_ORDER.map((id, i) => {
              const step = steps.find((s) => s.id === id);
              const isActive = i === processingStep;
              const isPast = i < processingStep;
              const Icon = STEP_ICONS[id] ?? Activity;
              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0.5, scale: 0.95 }}
                  animate={{
                    opacity: isActive ? 1 : isPast ? 0.8 : 0.4,
                    scale: isActive ? 1.02 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-xl border p-3 text-center transition-colors ${
                    isActive
                      ? "border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/20"
                      : isPast
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-slate-700 bg-slate-800/30"
                  }`}
                >
                  <div
                    className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${
                      isActive ? "bg-cyan-500/20" : isPast ? "bg-emerald-500/20" : "bg-slate-700/50"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={
                        isActive ? "text-cyan-400" : isPast ? "text-emerald-400" : "text-slate-500"
                      }
                    />
                  </div>
                  <p
                    className={`text-[10px] font-medium leading-tight ${
                      isActive ? "text-cyan-300" : isPast ? "text-emerald-400/80" : "text-slate-500"
                    }`}
                  >
                    {step?.label ?? id}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Step-specific explanation (from Gemini pipeline steps) */}
          <motion.div
            key={processingStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                Current step: {steps.find((s) => s.id === STEP_ORDER[processingStep])?.label ?? STEP_ORDER[processingStep]}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-300">
              {steps.find((s) => s.id === STEP_ORDER[processingStep])?.description ?? "Processing..."}
            </p>
          </motion.div>

          {/* AI explanation (supplementary) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-slate-700 bg-slate-900/80 p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-300">AI summary of this case</h3>
            </div>
            {explanationLoading ? (
              <div className="space-y-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-slate-700" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-700" style={{ animationDelay: "0.1s" }} />
                <div className="h-3 w-4/5 animate-pulse rounded bg-slate-700" style={{ animationDelay: "0.2s" }} />
              </div>
            ) : explanation ? (
              <motion.p
                className="text-sm leading-relaxed text-slate-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {explanation}
              </motion.p>
            ) : (
              <p className="text-sm text-slate-500">Preparing AI summary...</p>
            )}
          </motion.div>

          {/* Loading indicator */}
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-2 w-2 rounded-full bg-cyan-500"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
