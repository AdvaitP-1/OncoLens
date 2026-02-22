"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "../../../../components/Topbar";
import JsonDrawer from "../../../../components/JsonDrawer";
import { useRequireAuth } from "../../../../lib/auth";
import { supabase } from "../../../../lib/supabaseClient";
import { fmtNumber, fmtDate, titleCase, normalizeCase } from "../../../../lib/format";

// ─── Score gauge card ─────────────────────────────────────────────────────────
function ScoreCard({ label, p, ci, accent }) {
  if (typeof p !== "number") return (
    <div className="rounded-xl p-5 relative overflow-hidden"
      style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-bold text-slate-300">—</p>
    </div>
  );
  const pct   = Math.round(p * 100);
  const color = p >= 0.7 ? "#ef4444" : p >= 0.4 ? "#f59e0b" : "#10b981";
  const risk  = p >= 0.7 ? "High Risk" : p >= 0.4 ? "Moderate" : "Low Risk";
  const bg    = p >= 0.7 ? "#fef2f2" : p >= 0.4 ? "#fffbeb" : "#f0fdf4";
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="rounded-xl p-5 relative overflow-hidden"
      style={{ background: "white", border: `1px solid ${color}20`, boxShadow: `0 1px 4px ${color}10` }}>
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6"
        style={{ background: `${color}08` }} />
      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">{label}</p>
        <div className="flex items-center gap-4">
          {/* Circular gauge */}
          <div className="relative w-16 h-16 shrink-0">
            <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#f1f5f9" strokeWidth="5"/>
              <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="5"
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }}/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{fmtNumber(p, 4)}</p>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold mt-1"
              style={{ background: bg, color }}>
              {risk}
            </span>
            {ci && (
              <p className="text-xs text-slate-400 mt-1">CI: {fmtNumber(ci[0], 3)} – {fmtNumber(ci[1], 3)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Abstain banner ───────────────────────────────────────────────────────────
function AbstainBanner({ reasons }) {
  return (
    <div className="rounded-xl px-5 py-4 flex items-start gap-3"
      style={{ background: "#fef3c7", border: "1px solid #fcd34d" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="mt-0.5 shrink-0">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div>
        <p className="text-sm font-semibold text-amber-800">Abstain Guardrail Triggered</p>
        <p className="text-xs text-amber-700 mt-0.5">
          {(reasons || []).join(", ") || "Unspecified reason"} — requires manual clinician review before acting on scores.
        </p>
      </div>
    </div>
  );
}

// ─── Missing assets banner ────────────────────────────────────────────────────
function MissingAssetsBanner() {
  return (
    <div className="rounded-xl px-5 py-4 flex items-start gap-3"
      style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" className="mt-0.5 shrink-0">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div>
        <p className="text-sm font-semibold text-red-800">Missing required assets: wearables_csv and image</p>
        <p className="text-xs text-red-700 mt-0.5">
          Run analysis requires both wearables CSV and imaging. Create a new case with both assets via the New Case page.
        </p>
      </div>
    </div>
  );
}

// ─── Recommendations table ────────────────────────────────────────────────────
function RecommendationsTable({ rows }) {
  if (!rows?.length) return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="mb-2">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
      <p className="text-xs">No recommendations yet</p>
    </div>
  );
  const best = rows.reduce((a, b) => ((b.expected_utility ?? 0) > (a.expected_utility ?? 0) ? b : a), rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            {["Action", "Expected Utility", "Benefit", "Harm", "Cost"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isTop = r.action === best.action;
            return (
              <tr key={r.action}
                style={{
                  borderTop: "1px solid #f1f5f9",
                  background: isTop ? "rgba(15,118,110,0.03)" : "white",
                }}
                className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isTop && (
                      <span className="rounded-full px-1.5 py-0.5 text-xs font-semibold"
                        style={{ background: "#dcfce7", color: "#15803d" }}>Top</span>
                    )}
                    <span className="font-medium text-slate-700">{titleCase(r.action)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold" style={{ color: "#0f766e" }}>{fmtNumber(r.expected_utility, 4)}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{fmtNumber(r.benefit, 4)}</td>
                <td className="px-4 py-3 text-slate-600">{fmtNumber(r.harm, 4)}</td>
                <td className="px-4 py-3 text-slate-600">{fmtNumber(r.cost, 4)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Gemini reasoning panel ───────────────────────────────────────────────────
function GeminiReasoningPanel({ reasoning }) {
  const [open, setOpen] = useState(false);
  if (!reasoning || !reasoning.clinician_rationale_markdown) return null;

  function BulletList({ items, color = "#0f766e" }) {
    if (!items?.length) return <p className="text-xs text-slate-400 italic">None</p>;
    return (
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", background: "white" }}>
      <button className="w-full px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: open ? "1px solid #f1f5f9" : "none", background: "linear-gradient(to right,#f8fafc,#f0fdf9)" }}
        onClick={() => setOpen(v => !v)}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#7c3aed15" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div className="text-left">
            <h2 className="text-sm font-semibold text-slate-800">Gemini Clinical Reasoning</h2>
            <p className="text-xs text-slate-400 mt-0.5">AI-generated rationale — not a diagnosis</p>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="p-5 space-y-5">
          {/* Clinician rationale */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Clinician Rationale</p>
            <div className="rounded-lg p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              {reasoning.clinician_rationale_markdown}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Image quality notes */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Image Quality Notes</p>
              <BulletList items={reasoning.image_quality_notes} color="#0284c7" />
            </div>
            {/* Wearable signal notes */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Wearable Signal Notes</p>
              <BulletList items={reasoning.wearable_signal_notes} color="#0f766e" />
            </div>
            {/* Follow-up questions */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Follow-up Questions</p>
              <BulletList items={reasoning.followup_questions} color="#7c3aed" />
            </div>
            {/* Limitations */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Limitations</p>
              <BulletList items={reasoning.limitations} color="#f59e0b" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Confidence statement */}
            <div className="rounded-lg p-3" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <p className="text-xs font-semibold text-emerald-700 mb-1">Confidence Statement</p>
              <p className="text-sm text-emerald-800">{reasoning.confidence_statement}</p>
            </div>
            {/* Safety disclaimer */}
            <div className="rounded-lg p-3" style={{ background: "#fef3c7", border: "1px solid #fcd34d" }}>
              <p className="text-xs font-semibold text-amber-700 mb-1">Safety Disclaimer</p>
              <p className="text-sm text-amber-800">{reasoning.safety_disclaimer}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Note composer ────────────────────────────────────────────────────────────
function NoteComposer({ onSubmit }) {
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState("internal");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!note.trim()) return;
    setSaving(true);
    await onSubmit({ note, visibility });
    setNote("");
    setSaving(false);
  }

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", background: "white" }}>
      <div className="px-5 py-4 flex items-center gap-3"
        style={{ borderBottom: "1px solid #f1f5f9", background: "linear-gradient(to right,#f8fafc,#f0fdf9)" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#0f766e15" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-800">Add Clinical Note</h3>
      </div>
      <div className="p-4 space-y-3">
        <textarea
          className="w-full rounded-lg border text-sm p-3 outline-none resize-none transition-all"
          style={{ borderColor: "#e2e8f0", background: "#f8fafc", minHeight: 100, color: "#1e293b" }}
          placeholder="Enter clinical observations, follow-up instructions, or patient-visible notes..."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border text-xs px-3 py-2 outline-none"
            style={{ borderColor: "#e2e8f0", background: "white", color: "#475569" }}
            value={visibility}
            onChange={e => setVisibility(e.target.value)}>
            <option value="internal">Internal only</option>
            <option value="patient_visible">Visible to patient</option>
          </select>
          {visibility === "patient_visible" && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Patient will see this
            </span>
          )}
          <button onClick={submit} disabled={!note.trim() || saving}
            className="ml-auto flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#0f766e,#0284c7)", boxShadow: "0 2px 6px rgba(15,118,110,0.3)" }}>
            {saving ? (
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ClinicianCaseDetailPage() {
  const { id } = useParams();
  const { loading, user } = useRequireAuth();
  const [caseRow,      setCaseRow]      = useState(null);
  const [notes,        setNotes]        = useState([]);
  const [lambdaValue,  setLambdaValue]  = useState(0.6);
  const [conservative, setConservative] = useState(true);
  const [status,       setStatus]       = useState("");
  const [running,      setRunning]      = useState(false);
  const [runError,     setRunError]     = useState(null);

  async function load() {
    const { data: c } = await supabase.from("cases").select("*").eq("id", id).single();
    setCaseRow(normalizeCase(c) || null);
    const { data: n } = await supabase
      .from("doctor_notes").select("*").eq("case_id", id)
      .order("created_at", { ascending: false });
    setNotes(n || []);
  }

  useEffect(() => { if (id) load(); }, [id]);

  async function runAgain() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    setRunning(true);
    setStatus("Running pipeline…");
    setRunError(null);
    try {
      const res = await fetch("/api/cases/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ case_id: id, lambda: lambdaValue, conservative })
      });
      const json = await res.json();
      const errMsg = json.detail || json.error || "Failed to run.";
      const isMissingAssets = typeof errMsg === "string" && (
        errMsg.includes("Missing required assets") ||
        (errMsg.includes("wearables_csv") && errMsg.includes("image"))
      );
      if (res.ok) {
        setStatus("Analysis complete.");
        setRunError(null);
      } else {
        setStatus(errMsg);
        setRunError(isMissingAssets ? "missing_assets" : errMsg);
      }
    } finally {
      setRunning(false);
      await load();
    }
  }

  async function createNote({ note, visibility }) {
    await supabase.from("doctor_notes").insert({
      case_id: id, author_id: user.id, note, visibility
    });
    await load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400 text-sm">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#0f766e" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        Loading case...
      </div>
    </div>
  );
  if (!caseRow) return null;

  const scores = caseRow.scores || {};
  const statusColor = { high_priority:"#ef4444", running:"#0284c7", ready:"#10b981", deferred:"#64748b" };
  const statusLabel = { high_priority:"High Priority", running:"Running", ready:"Ready", deferred:"Deferred" };
  const sColor = statusColor[caseRow.status] || "#94a3b8";
  const sLabel = statusLabel[caseRow.status] || caseRow.status;
  const geminiMeta = caseRow.gemini_meta || null;

  return (
    <div className="space-y-5">

      {/* Topbar */}
      <Topbar
        title={`Case ${id.slice(0, 8)}`}
        subtitle="Screening score review — decision-support only, requires clinician review."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {caseRow.last_updated && (
              <span className="text-xs text-slate-500">
                Last updated: {fmtDate(caseRow.last_updated)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: `${sColor}12`, color: sColor, border: `1px solid ${sColor}25` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: sColor }}/>
              {sLabel}
            </span>
            {geminiMeta ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: geminiMeta.ok ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                  color: geminiMeta.ok ? "#059669" : "#dc2626",
                  border: `1px solid ${geminiMeta.ok ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                }}
                title={geminiMeta.error || ""}
              >
                Gemini {geminiMeta.ok ? "OK" : "Fallback"} • {geminiMeta.model || "n/a"} • {geminiMeta.latency_ms ?? 0}ms
              </span>
            ) : null}
            <Link href={`/clinician/messages?case=${id}`}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all"
              style={{ background: "rgba(15,118,110,0.08)", color: "#0f766e", border: "1px solid rgba(15,118,110,0.2)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Message Patient
            </Link>
          </div>
        }
      />

      {/* Missing assets banner */}
      {runError === "missing_assets" && <MissingAssetsBanner />}

      {/* Abstain banner */}
      {caseRow.abstain && <AbstainBanner reasons={caseRow.abstain_reasons} />}

      {/* Score cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <ScoreCard label="Vision Score (p_vision)" p={scores.p_vision} ci={scores.ci_vision} />
        <ScoreCard label="Health Score (p_health)" p={scores.p_health} ci={scores.ci_health} />
        <ScoreCard label="Fused Score (p_fused)"   p={scores.p_fused}  ci={scores.ci_fused}  />
      </div>

      {/* LLM Cancer Risk Assessment */}
      {caseRow.gemini_reasoning?.cancer_risk_tier && caseRow.gemini_reasoning.cancer_risk_tier !== "unknown" || caseRow.gemini_reasoning?.cancer_likelihood_rationale ? (
        <div className="rounded-xl overflow-hidden"
          style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", background: "white" }}>
          <div className="px-5 py-4 flex items-center gap-3"
            style={{ borderBottom: "1px solid #f1f5f9", background: "linear-gradient(to right,#f8fafc,#fef2f2)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#fef2f215" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-slate-800">LLM Cancer Risk Assessment</h2>
          </div>
          <div className="p-5 space-y-4">
            {caseRow.gemini_reasoning?.cancer_risk_tier && caseRow.gemini_reasoning.cancer_risk_tier !== "unknown" && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Risk Tier</p>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
                  style={{
                    background: caseRow.gemini_reasoning.cancer_risk_tier === "low" ? "rgba(16,185,129,0.12)" : caseRow.gemini_reasoning.cancer_risk_tier === "elevated" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                    color: caseRow.gemini_reasoning.cancer_risk_tier === "low" ? "#059669" : caseRow.gemini_reasoning.cancer_risk_tier === "elevated" ? "#d97706" : "#dc2626",
                    border: `1px solid ${caseRow.gemini_reasoning.cancer_risk_tier === "low" ? "rgba(16,185,129,0.25)" : caseRow.gemini_reasoning.cancer_risk_tier === "elevated" ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}`,
                  }}
                >
                  {titleCase(caseRow.gemini_reasoning.cancer_risk_tier)}
                </span>
              </div>
            )}
            {caseRow.gemini_reasoning?.cancer_likelihood_rationale && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Likelihood Rationale</p>
                <p className="text-sm text-slate-700 leading-relaxed">{caseRow.gemini_reasoning.cancer_likelihood_rationale}</p>
              </div>
            )}
            <div className="rounded-lg px-3 py-2 text-xs text-amber-800"
              style={{ background: "#fef3c7", border: "1px solid #fcd34d" }}>
              Screening triage support only. Not a diagnosis. Requires clinician review.
            </div>
          </div>
        </div>
      ) : null}

      {/* Decision engine controls */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", background: "white" }}>
        <div className="px-5 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid #f1f5f9", background: "linear-gradient(to right,#f8fafc,#f0fdf9)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#0284c715" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-slate-800">Decision Engine Controls</h2>
        </div>
        <div className="p-5">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Lambda slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600">Lambda weight</label>
                <span className="text-xs font-bold tabular-nums rounded-md px-2 py-0.5"
                  style={{ background: "#f0fdf9", color: "#0f766e" }}>{lambdaValue.toFixed(2)}</span>
              </div>
              <input type="range" min="0" max="1" step="0.01" value={lambdaValue}
                onChange={e => setLambdaValue(Number(e.target.value))}
                className="w-full accent-teal-600" />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Health-weighted</span><span>Vision-weighted</span>
              </div>
            </div>
            {/* Conservative toggle */}
            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative" onClick={() => setConservative(v => !v)}>
                  <div className="w-10 h-5 rounded-full transition-colors"
                    style={{ background: conservative ? "#0f766e" : "#e2e8f0" }} />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                    style={{ transform: conservative ? "translateX(20px)" : "translateX(0)" }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Conservative mode</p>
                  <p className="text-xs text-slate-400">{conservative ? "Lower threshold for referral" : "Standard threshold"}</p>
                </div>
              </label>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={runAgain} disabled={running}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#0f766e,#0c4a6e)", boxShadow: "0 2px 8px rgba(15,118,110,0.3)" }}>
              {running ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              )}
              {running ? "Running pipeline…" : "Re-run Analysis"}
            </button>
            {status && (
              <span className="flex items-center gap-1.5 text-xs font-medium"
                style={{ color: status.includes("complete") ? "#10b981" : status.includes("Failed") ? "#ef4444" : "#0284c7" }}>
                {status.includes("complete") && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                {status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", background: "white" }}>
        <div className="px-5 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid #f1f5f9", background: "linear-gradient(to right,#f8fafc,#f0fdf9)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#10b98115" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Recommendations</h2>
            <p className="text-xs text-slate-400 mt-0.5">{(caseRow.recommendations || []).length} action{(caseRow.recommendations || []).length !== 1 ? "s" : ""} ranked by expected utility</p>
          </div>
        </div>
        <RecommendationsTable rows={caseRow.recommendations} />
      </div>

      {/* Gemini reasoning */}
      <GeminiReasoningPanel reasoning={caseRow.gemini_reasoning} />

      {/* Notes row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <NoteComposer onSubmit={createNote} />

        {/* Notes list */}
        <div className="rounded-xl overflow-hidden"
          style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", background: "white" }}>
          <div className="px-5 py-4 flex items-center gap-3"
            style={{ borderBottom: "1px solid #f1f5f9", background: "linear-gradient(to right,#f8fafc,#f0fdf9)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#7c3aed15" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Clinical Notes</h3>
              <p className="text-xs text-slate-400 mt-0.5">{notes.length} note{notes.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
            {notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="mb-2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <p className="text-xs">No notes yet</p>
              </div>
            ) : notes.map(n => (
              <div key={n.id} className="rounded-lg p-3"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={n.visibility === "patient_visible"
                      ? { background: "#dbeafe", color: "#1d4ed8" }
                      : { background: "#f1f5f9", color: "#64748b" }}>
                    {n.visibility === "patient_visible" ? "Patient Visible" : "Internal"}
                  </span>
                  <span className="text-xs text-slate-400">{fmtDate(n.created_at)}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{n.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* JSON drawers */}
      <div className="grid gap-3 lg:grid-cols-2">
        <JsonDrawer title="Clinician Report" payload={{ clinician_report: caseRow.clinician_report }} />
        <JsonDrawer title="Data Quality & Scores" payload={{ data_quality: caseRow.data_quality, scores: caseRow.scores }} />
      </div>

    </div>
  );
}
