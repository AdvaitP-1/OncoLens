"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Topbar from "../../../components/Topbar";
import CaseStatusBadge from "../../../components/CaseStatusBadge";
import { fmtNumber, fmtDate } from "../../../lib/format";
import { supabase } from "../../../lib/supabaseClient";
import { useRequireAuth } from "../../../lib/auth";

// ─── Sparkline (7-day bar chart) ─────────────────────────────────────────────
function Sparkline({ data, accent }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-7 mt-3">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm"
          style={{
            height: `${Math.max(Math.round((v / max) * 100), 8)}%`,
            background: accent,
            opacity: 0.2 + (v / max) * 0.75,
          }}
        />
      ))}
    </div>
  );
}

// ─── Risk bar ─────────────────────────────────────────────────────────────────
function RiskBar({ value }) {
  if (typeof value !== "number") return <span className="text-slate-400 text-xs">—</span>;
  const pct   = Math.round(value * 100);
  const color = value >= 0.7 ? "#ef4444" : value >= 0.4 ? "#f59e0b" : "#10b981";
  const bg    = value >= 0.7 ? "#fef2f2" : value >= 0.4 ? "#fffbeb" : "#f0fdf4";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "#e2e8f0" }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums"
        style={{ color, background: bg, padding: "1px 5px", borderRadius: 4 }}>
        {pct}%
      </span>
    </div>
  );
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────
function KpiTile({ label, value, icon, accent, sub, sparkData }) {
  return (
    <div className="rounded-xl p-5 relative overflow-hidden"
      style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8"
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
        {sparkData && <Sparkline data={sparkData} accent={accent} />}
      </div>
    </div>
  );
}

// ─── Risk Distribution tile ───────────────────────────────────────────────────
function RiskDistribution({ cases }) {
  const low  = cases.filter(c => typeof c.scores?.p_fused === "number" && c.scores.p_fused < 0.4).length;
  const mid  = cases.filter(c => typeof c.scores?.p_fused === "number" && c.scores.p_fused >= 0.4 && c.scores.p_fused < 0.7).length;
  const high = cases.filter(c => typeof c.scores?.p_fused === "number" && c.scores.p_fused >= 0.7).length;
  const total = low + mid + high || 1;
  const segments = [
    { label: "Low",  count: low,  color: "#10b981", pct: Math.round(low  / total * 100) },
    { label: "Mod",  count: mid,  color: "#f59e0b", pct: Math.round(mid  / total * 100) },
    { label: "High", count: high, color: "#ef4444", pct: Math.round(high / total * 100) },
  ];
  return (
    <div className="rounded-xl p-5 relative overflow-hidden"
      style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8"
        style={{ background: "#7c3aed10" }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Risk Distribution</p>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#7c3aed15" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
          </div>
        </div>
        <p className="text-3xl font-bold text-slate-900">{low + mid + high}</p>
        <p className="mt-1 text-xs text-slate-400">Scored cases</p>
        <div className="mt-3 h-0.5 w-8 rounded-full" style={{ background: "#7c3aed" }} />
        <div className="flex rounded-full overflow-hidden h-2 mt-3 gap-0.5">
          {segments.map(s => (
            <div key={s.label} style={{ width: `${s.pct}%`, background: s.color, minWidth: s.count > 0 ? 4 : 0 }} />
          ))}
        </div>
        <div className="flex gap-3 mt-2">
          {segments.map(s => (
            <div key={s.label} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              <span className="text-xs text-slate-500">{s.label}</span>
              <span className="text-xs font-semibold text-slate-700">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
      <polyline points="6 9 12 4 18 9" /><polyline points="6 15 12 20 18 15" />
    </svg>
  );
  return sortDir === "asc" ? (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2.5">
      <polyline points="6 9 12 4 18 9" />
    </svg>
  ) : (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2.5">
      <polyline points="6 15 12 20 18 15" />
    </svg>
  );
}

// ─── Filter config ────────────────────────────────────────────────────────────
const FILTERS = [
  { key: "all",           label: "All Cases"     },
  { key: "high_priority", label: "High Priority" },
  { key: "running",       label: "Running"       },
  { key: "deferred",      label: "Deferred"      },
  { key: "ready",         label: "Ready"         },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ClinicianDashboardPage() {
  const { loading, user } = useRequireAuth("clinician");
  const [cases,   setCases]   = useState([]);
  const [unread,  setUnread]  = useState(0);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data: caseRows } = await supabase
        .from("cases").select("*").eq("created_by", user.id)
        .order("created_at", { ascending: false });
      setCases(caseRows || []);
      const { data: msgRows } = await supabase
        .from("messages").select("id").eq("recipient_id", user.id).is("read_at", null);
      setUnread((msgRows || []).length);
    }
    load();
  }, [user]);

  // 7-day sparkline (daily counts)
  const spark7 = useMemo(() => {
    const now = Date.now();
    return Array.from({ length: 7 }, (_, i) => {
      const dayStart = now - (6 - i) * 86400000;
      const dayEnd   = dayStart + 86400000;
      return cases.filter(c => {
        const t = new Date(c.created_at).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
    });
  }, [cases]);

  const kpis = useMemo(() => {
    const sevenDays   = cases.filter(c => Date.now() - new Date(c.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000);
    const high        = cases.filter(c => c.status === "high_priority").length;
    const deferred    = cases.filter(c => c.status === "deferred").length;
    const confidences = cases.map(c => c.scores?.p_fused).filter(v => typeof v === "number");
    const avgConf     = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
    return { sevenDays: sevenDays.length, high, deferred, avgConf };
  }, [cases]);

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  const visible = useMemo(() => {
    let list = filter === "all" ? cases : cases.filter(c => c.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.id.toLowerCase().includes(q) ||
        (c.patient_id || "").toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let va, vb;
      if (sortCol === "created_at")   { va = new Date(a.created_at).getTime(); vb = new Date(b.created_at).getTime(); }
      else if (sortCol === "p_fused") { va = a.scores?.p_fused ?? -1;          vb = b.scores?.p_fused ?? -1; }
      else                            { va = a.status ?? "";                    vb = b.status ?? ""; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1  : -1;
      return 0;
    });
    return list.slice(0, 15);
  }, [cases, filter, search, sortCol, sortDir]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400 text-sm">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
        </svg>
        Loading workspace...
      </div>
    </div>
  );

  const clinicianName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Clinician";
  const hour    = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr  = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const TABLE_COLS = [
    { label: "Case ID",    sort: null         },
    { label: "Patient",    sort: null         },
    { label: "Risk Score", sort: "p_fused"    },
    { label: "Status",     sort: "status"     },
    { label: "Created",    sort: "created_at" },
    { label: "Action",     sort: null         },
  ];

  return (
    <div className="space-y-5">

      {/* Topbar */}
      <Topbar
        title="Clinician Dashboard"
        subtitle="Screening triage overview and communication queue."
        right={
          <div className="flex items-center gap-2">
            <Link href="/clinician/messages"
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
            <Link href="/clinician/new-case"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg,#0f766e,#0c4a6e)", boxShadow: "0 2px 8px rgba(15,118,110,0.35)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Case
            </Link>
          </div>
        }
      />

      {/* Greeting / status banner */}
      <div className="rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0f766e 0%,#0c4a6e 100%)", boxShadow: "0 4px 20px rgba(15,118,110,0.25)" }}>
        {/* subtle cross pattern overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.06 }}>
          <svg width="100%" height="100%">
            <defs>
              <pattern id="bp" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect x="9" y="5" width="2" height="10" fill="white"/>
                <rect x="5" y="9" width="10" height="2" fill="white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bp)"/>
          </svg>
        </div>
        {/* Left: greeting */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0"
            style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", color: "white" }}>
            {clinicianName[0].toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{greeting}, {clinicianName}</p>
            <p className="text-teal-200 text-xs mt-0.5">{dateStr}</p>
          </div>
        </div>
        {/* Right: quick stats + status */}
        <div className="flex items-center gap-5 relative z-10">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
            <span className="text-teal-100 text-xs font-medium">Systems operational</span>
          </div>
          <div className="w-px h-8 bg-teal-700" />
          <div className="text-center">
            <p className="text-white text-lg font-bold leading-tight">{cases.length}</p>
            <p className="text-teal-300 text-xs">Total Cases</p>
          </div>
          <div className="w-px h-8 bg-teal-700" />
          <div className="text-center">
            <p className="text-white text-lg font-bold leading-tight">{kpis.high}</p>
            <p className="text-teal-300 text-xs">Urgent</p>
          </div>
          <div className="w-px h-8 bg-teal-700" />
          <div className="text-center">
            <p className="text-white text-lg font-bold leading-tight">{Math.round(kpis.avgConf * 100)}%</p>
            <p className="text-teal-300 text-xs">Avg Confidence</p>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile
          label="Cases (7 days)"
          value={kpis.sevenDays}
          accent="#0f766e"
          sub="Active in the last week"
          sparkData={spark7}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        />
        <KpiTile
          label="High Priority"
          value={kpis.high}
          accent="#ef4444"
          sub="Require immediate review"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        />
        <KpiTile
          label="Deferred"
          value={kpis.deferred}
          accent="#64748b"
          sub="Awaiting follow-up"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <KpiTile
          label="Avg Confidence"
          value={`${Math.round(kpis.avgConf * 100)}%`}
          accent="#0284c7"
          sub="Mean P(fused) across all cases"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
        />
        <RiskDistribution cases={cases} />
      </div>

      {/* Cases table card */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", background: "white" }}>

        {/* Table header */}
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ borderBottom: "1px solid #f1f5f9", background: "linear-gradient(to right,#f8fafc,#f0fdf9)" }}>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Recent Cases</h2>
            <p className="text-xs text-slate-400 mt-0.5">{cases.length} total · showing {visible.length}</p>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <input
              className="rounded-lg border text-sm py-1.5 pl-8 pr-3 outline-none"
              style={{ borderColor: "#e2e8f0", width: 210, background: "white" }}
              placeholder="Search case or patient ID"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-0 overflow-x-auto" style={{ borderBottom: "1px solid #f1f5f9" }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                color: filter === f.key ? "#0f766e" : "#94a3b8",
                borderBottom: filter === f.key ? "2px solid #0f766e" : "2px solid transparent",
                background: filter === f.key ? "rgba(15,118,110,0.04)" : "transparent",
              }}>
              {f.label}
              {f.key !== "all" && (
                <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-xs"
                  style={{
                    background: filter === f.key ? "rgba(15,118,110,0.1)" : "#f1f5f9",
                    color: filter === f.key ? "#0f766e" : "#94a3b8",
                  }}>
                  {cases.filter(c => c.status === f.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {TABLE_COLS.map(h => (
                  <th key={h.label}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 ${h.sort ? "cursor-pointer select-none hover:text-slate-600" : ""}`}
                    onClick={() => h.sort && toggleSort(h.sort)}>
                    <div className="flex items-center gap-1.5">
                      {h.label}
                      {h.sort && <SortIcon col={h.sort} sortCol={sortCol} sortDir={sortDir} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-slate-400 text-sm">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="mx-auto mb-2">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    No cases found
                  </td>
                </tr>
              ) : visible.map((c, idx) => {
                const isHigh = c.status === "high_priority";
                return (
                  <tr key={c.id}
                    style={{
                      borderTop: "1px solid #f1f5f9",
                      background: isHigh ? "rgba(239,68,68,0.025)" : idx % 2 === 0 ? "white" : "#fafafa",
                    }}
                    className="group hover:bg-teal-50 transition-colors">
                    {/* Case ID */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isHigh && (
                          <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: "#ef4444" }} />
                        )}
                        <span className="font-mono text-xs font-semibold text-slate-600"
                          style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                          {c.id.slice(0, 8)}
                        </span>
                      </div>
                    </td>
                    {/* Patient */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                          style={{ background: "linear-gradient(135deg,#0f766e,#0284c7)" }}>
                          {(c.patient_id || "?")[0].toUpperCase()}
                        </div>
                        <span className="font-mono text-xs text-slate-500">
                          {c.patient_id?.slice(0, 8) ?? "—"}
                        </span>
                      </div>
                    </td>
                    {/* Risk */}
                    <td className="px-4 py-3">
                      <RiskBar value={c.scores?.p_fused} />
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <CaseStatusBadge status={c.status} />
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {fmtDate(c.created_at)}
                    </td>
                    {/* Action */}
                    <td className="px-4 py-3">
                      <Link href={`/clinician/cases/${c.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all group-hover:shadow-sm"
                        style={{ background: "rgba(15,118,110,0.08)", color: "#0f766e", border: "1px solid rgba(15,118,110,0.15)" }}>
                        Open
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {cases.length > 15 && (
          <div className="px-5 py-3 text-xs text-slate-400 text-center"
            style={{ borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
            Showing 15 of {cases.length} cases
          </div>
        )}
      </div>

    </div>
  );
}
