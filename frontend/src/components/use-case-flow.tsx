"use client";

import { motion } from "framer-motion";
import { Activity, Scan, GitMerge, ShieldCheck, FileCheck, ArrowRight } from "lucide-react";
import { TransitionLink } from "./transition-link";

const STEPS = [
  {
    icon: Activity,
    title: "Health data",
    desc: "Patient uploads heart rate, oxygen levels, and activity from wearables (optional).",
    color: "from-cyan-500/20 to-cyan-600/5",
    border: "border-cyan-500/30",
  },
  {
    icon: Scan,
    title: "Skin image",
    desc: "Clinician captures or selects a dermatoscopic image of the skin lesion.",
    color: "from-emerald-500/20 to-emerald-600/5",
    border: "border-emerald-500/30",
  },
  {
    icon: GitMerge,
    title: "Combining scores",
    desc: "OncoLens combines health and image scores with ABCDE criteria and possible diagnoses.",
    color: "from-amber-500/20 to-amber-600/5",
    border: "border-amber-500/30",
  },
  {
    icon: ShieldCheck,
    title: "Safety check",
    desc: "Uncertain cases are flagged for human review instead of guessing.",
    color: "from-rose-500/20 to-rose-600/5",
    border: "border-rose-500/30",
  },
  {
    icon: FileCheck,
    title: "Recommendation",
    desc: "Referral, monitoring, or routine follow-up recommendations.",
    color: "from-violet-500/20 to-violet-600/5",
    border: "border-violet-500/30",
  },
];

export function UseCaseFlow() {
  return (
    <section className="relative w-full bg-slate-950 py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          className="mb-4 text-center text-3xl font-bold text-white md:text-4xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          How it works
        </motion.h2>
        <motion.p
          className="mx-auto mb-16 max-w-2xl text-center text-slate-400"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Health data and skin images flow through AI analysis to clinical recommendations.
        </motion.p>

        <div className="flex flex-col gap-8 md:flex-row md:items-stretch md:justify-between md:gap-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                className={`relative flex flex-1 flex-col items-center rounded-2xl border bg-gradient-to-b ${step.color} ${step.border} p-6 backdrop-blur-sm`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white/10">
                  <Icon size={28} className="text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-center text-sm text-slate-400">{step.desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 md:block">
                    <ArrowRight size={20} className="text-slate-500" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="mt-16 flex justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <TransitionLink
            href="/new-case"
            className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-cyan-500"
          >
            Try the demo <ArrowRight size={18} />
          </TransitionLink>
        </motion.div>
      </div>
    </section>
  );
}
