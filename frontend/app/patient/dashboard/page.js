"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Topbar from "../../../components/Topbar";
import CaseStatusBadge from "../../../components/CaseStatusBadge";
import { useRequireAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabaseClient";
import { fmtDate } from "../../../lib/format";

// ─── Risk indicator ───────────────────────────────────────────────────────────
function RiskPill({ value }) {
  if (typeof value !== "number") return null;
  const pct   = Math.round(value * 100);
  const color = value >= 0.7 ? "#ef4444" : value >= 0.4 ? "#f59e0b" : "#10b981";
  const bg    = value >= 0.7 ? "#fef2f2" : value >= 0.4 ? "#fffbeb" : "#f0fdf4";
  const label = value >= 0.7 ? "High"    : value >= 0.4 ? "Moderate" : "Low";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color, background: bg, border: `1px solid ${color}30` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label} · {pct}%
    </span>
  );
}

// ─── Status step bar ──────────────────────────────────────────────────────────
const STATUS_STEPS = ["running", "ready", "high_priority", "deferred"];
function CaseProgressBar({ status }) {
  const stepLabels = { running: "In Analysis", ready: "Results Ready", high_priority: "Urgent Review", deferred: "Deferred" };
  const colors     = { running: "#0284c7",    ready: "#10b981",        high_priority: "#ef4444",       deferred: "#64748b" };
  const color = colors[status] || "#94a3b8";
  const label = stepLabels[status] || status;
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent, sub }) {
  return (
    <div className="rounded-xl p-5 relative overflow-hidden"
      style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6"
        style={{ background: `${accent}10` }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}15` }}>
            {icon}
          </div>
        </div>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        <div className="mt-3 h-0.5 w-8 rounded-full" style={{ background: accent }} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PatientDashboardPage() {
  const { loading, user } = useRequireAuth("patient");
  const [cases,  setCases]  = useState([]);
  const [notes,  setNotes]  = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data: caseRows } = await supabase
        .from("cases").select("*").eq("patient_id", user.id)
        .order("created_at", { ascending: false });
      setCases(caseRows || []);
      const caseIds = (caseRows || []).map(c => c.id);
      if (caseIds.length) {
        const { data: noteRows } = await supabase
          .from("doctor_notes").select("*").in("case_id", caseIds)
          .eq("visibility", "patient_visible").order("created_at", { ascending: false });
        setNotes(noteRows || []);
      }
      const { data: msgRows } = await supabase
        .from("messages").select("id").eq("recipient_id", user.id).is("read_at", null);
      setUnread((msgRows || []).length);
    }
    load();
  }, [user]);

  const latestNotes = useMemo(() => notes.slice(0, 6), [notes]);

  const kpis = useMemo(() => {
    const active   = cases.filter(c => c.status === "running").length;
    const ready    = cases.filter(c => c.status === "ready").length;
    const urgent   = cases.filter(c => c.status === "high_priority").length;
    return { total: cases.length, active, ready, urgent };
  }, [cases]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400 text-sm">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
        </svg>
        Loading your health portal...
      </div>
    </div>
  );

  const patientName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Patient";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr  = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-5">

      {/* Topbar */}
      <Topbar
        title="Patient Portal"
        subtitle="Your screening triage updates and clinician communication."
        right={
          <Link href="/patient/messages"
            className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all"
            style={{ background: "rgba(15,118,110,0.08)", color: "#0f766e", border: "1px solid rgba(15,118,110,0.2)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Messages
            {unread > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold"
                style={{ background: "#ef4444" }}>{unread}</span>
            )}
          </Link>
        }
      />

      {/* Greeting banner */}
      <div className="rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0f766e 0%,#0c4a6e 100%)", boxShadow: "0 4px 20px rgba(15,118,110,0.25)" }}>
        {/* cross pattern overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.06 }}>
          <svg width="100%" height="100%">
            <defs>
              <pattern id="pp" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect x="9" y="5" width="2" height="10" fill="white"/>
                <rect x="5" y="9" width="10" height="2" fill="white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pp)"/>
          </svg>
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0"
            style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", color: "white" }}>
            {patientName[0].toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{greeting}, {patientName}</p>
            <p className="text-teal-200 text-xs mt-0.5">{dateStr}</p>
          </div>
        </div>
        {/* Research notice inline */}
        <div className="flex items-start gap-2.5 relative z-10 max-w-sm"
          style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.15)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fde68a" strokeWidth="2" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-teal-100 text-xs leading-relaxed">
            This platform provides decision-support only and is <span className="font-semibold text-yellow-200">not a diagnosis</span> or medical advice.
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Cases"
          value={kpis.total}
          accent="#0f766e"
          sub="Across all time"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        />
        <StatCard
          label="In Analysis"
          value={kpis.active}
          accent="#0284c7"
          sub="Currently being processed"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
        />
        <StatCard
          label="Results Ready"
          value={kpis.ready}
          accent="#10b981"
          sub="Awaiting your review"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
        />
        <StatCard
          label="Unread Messages"
          value={unread}
          accent="#7c3aed"
          sub="From your care team"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
        />
      </div>

      {/* Cases table card */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", background: "white" }}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid #f1f5f9", background: "linear-gradient(to right,#f8fafc,#f0fdf9)" }}>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Your Cases</h2>
            <p className="text-xs text-slate-400 mt-0.5">{cases.length} case{cases.length !== 1 ? "s" : ""} assigned to you</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Case ID", "Status", "Risk Level", "Summary", "Last Updated", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-slate-400 text-sm">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="mx-auto mb-2">
                      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    No cases assigned yet
                  </td>
                </tr>
              ) : cases.map((c, idx) => (
                <tr key={c.id}
                  style={{
                    borderTop: "1px solid #f1f5f9",
                    background: idx % 2 === 0 ? "white" : "#fafafa",
                  }}
                  className="group hover:bg-teal-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-slate-600"
                      style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                      {c.id.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CaseProgressBar status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    <RiskPill value={c.scores?.p_fused} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-xs">
                    <span className="line-clamp-2">{c.patient_summary || "Pending clinician review."}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {fmtDate(c.last_updated)}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/patient/cases/${c.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all group-hover:shadow-sm"
                      style={{ background: "rgba(15,118,110,0.08)", color: "#0f766e", border: "1px solid rgba(15,118,110,0.15)" }}>
                      View
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes + Wearables row */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Patient-visible notes */}
        <div className="rounded-xl overflow-hidden"
          style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", background: "white" }}>
          <div className="px-5 py-4 flex items-center gap-3"
            style={{ borderBottom: "1px solid #f1f5f9", background: "linear-gradient(to right,#f8fafc,#f0fdf9)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#0f766e15" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Notes from your care team</h3>
              <p className="text-xs text-slate-400 mt-0.5">{notes.length} note{notes.length !== 1 ? "s" : ""} shared with you</p>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {latestNotes.length ? latestNotes.map(n => (
              <div key={n.id} className="rounded-lg p-3 text-sm"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <p className="text-slate-700 leading-relaxed">{n.note}</p>
                {n.created_at && (
                  <p className="text-xs text-slate-400 mt-1.5">{fmtDate(n.created_at)}</p>
                )}
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="mb-2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <p className="text-xs">No notes shared yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Wearables stub */}
        <div className="rounded-xl overflow-hidden"
          style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", background: "white" }}>
          <div className="px-5 py-4 flex items-center gap-3"
            style={{ borderBottom: "1px solid #f1f5f9", background: "linear-gradient(to right,#f8fafc,#f0fdf9)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#0284c715" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Wearables & Monitoring</h3>
              <p className="text-xs text-slate-400 mt-0.5">Periodic health data integration</p>
            </div>
          </div>
          <div className="p-5">
            <div className="rounded-lg p-4 flex items-start gap-3"
              style={{ background: "linear-gradient(135deg,#eff6ff,#f0fdf4)", border: "1px solid #bfdbfe" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                <p className="text-sm font-medium text-slate-700">Integration coming soon</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Monthly CSV upload support for wearable device data will allow your care team to monitor periodic health trends.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {["Heart Rate", "Sleep Data", "Activity"].map(label => (
                <div key={label} className="rounded-lg p-2.5 text-center"
                  style={{ background: "#f8fafc", border: "1px dashed #e2e8f0" }}>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-xs font-semibold text-slate-300 mt-0.5">—</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
