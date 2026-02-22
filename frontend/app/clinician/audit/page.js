"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "../../../components/Topbar";
import { useRequireAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabaseClient";
import { fmtDate } from "../../../lib/format";

const ACTION_META = {
  case_updated:  { label: "Case Updated",   icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2",  bg: "rgba(14,165,233,0.10)", color: "#0284c7" },
  message_sent:  { label: "Message Sent",   icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",                                                                                      bg: "rgba(15,118,110,0.10)", color: "#0f766e" },
  note_created:  { label: "Note Created",   icon: "M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 0 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z",               bg: "rgba(139,92,246,0.10)", color: "#7c3aed" },
};

const FILTERS = ["all", "case_updated", "message_sent", "note_created"];

function ActionBadge({ action }) {
  const m = ACTION_META[action] || { label: action, bg: "#f1f5f9", color: "#64748b", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: m.bg, color: m.color }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={m.icon}/>
      </svg>
      {m.label}
    </span>
  );
}

function StatTile({ label, value, sub, color }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1"
      style={{ border: "1px solid #e2e8f0", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function ClinicianAuditPage() {
  const { loading, user } = useRequireAuth("clinician");
  const [rows, setRows]       = useState([]);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setFetching(true);
      const [{ data: cases }, { data: messages }, { data: notes }] = await Promise.all([
        supabase.from("cases").select("id,last_updated,created_by").eq("created_by", user.id).order("last_updated", { ascending: false }).limit(20),
        supabase.from("messages").select("id,case_id,created_at,sender_id").eq("sender_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("doctor_notes").select("id,case_id,created_at,author_id").eq("author_id", user.id).order("created_at", { ascending: false }).limit(20)
      ]);
      const merged = [
        ...(cases    || []).map((c) => ({ id: c.id,  action: "case_updated",  case_id: c.id,       at: c.last_updated })),
        ...(messages || []).map((m) => ({ id: m.id,  action: "message_sent",  case_id: m.case_id,  at: m.created_at   })),
        ...(notes    || []).map((n) => ({ id: n.id,  action: "note_created",  case_id: n.case_id,  at: n.created_at   })),
      ].sort((a, b) => new Date(b.at) - new Date(a.at));
      setRows(merged.slice(0, 50));
      setFetching(false);
    }
    load();
  }, [user]);

  const stats = useMemo(() => ({
    total:    rows.length,
    cases:    rows.filter(r => r.action === "case_updated").length,
    messages: rows.filter(r => r.action === "message_sent").length,
    notes:    rows.filter(r => r.action === "note_created").length,
  }), [rows]);

  const filtered = useMemo(() => {
    let r = filter === "all" ? rows : rows.filter(x => x.action === filter);
    if (search.trim()) r = r.filter(x => x.case_id?.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [rows, filter, search]);

  // Group by date label
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const d = new Date(r.at);
      const today = new Date();
      const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
      let label;
      if (d.toDateString() === today.toDateString()) label = "Today";
      else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
      else label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      if (!map[label]) map[label] = [];
      map[label].push(r);
    });
    return Object.entries(map);
  }, [filtered]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400 text-sm">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#0f766e" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        Loading audit trail...
      </div>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden px-7 py-6"
        style={{ background: "linear-gradient(135deg,#0f766e 0%,#0284c7 100%)", boxShadow: "0 4px 24px rgba(15,118,110,0.25)" }}>
        <svg style={{ position:"absolute",top:0,left:0,width:"100%",height:"100%",opacity:0.07,pointerEvents:"none" }} aria-hidden>
          <defs>
            <pattern id="ap" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="white"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ap)"/>
        </svg>
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Compliance & Activity</p>
            <h2 className="text-2xl font-bold text-white">Audit Trail</h2>
            <p className="text-white/70 text-sm mt-1">Your recent actions across cases, notes, and messages.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-white/60 text-xs">Total Events</p>
            </div>
            <div className="w-px h-10 bg-white/20"/>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.cases}</p>
              <p className="text-white/60 text-xs">Cases</p>
            </div>
            <div className="w-px h-10 bg-white/20"/>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.messages}</p>
              <p className="text-white/60 text-xs">Messages</p>
            </div>
            <div className="w-px h-10 bg-white/20"/>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.notes}</p>
              <p className="text-white/60 text-xs">Notes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Total Events"   value={stats.total}    sub="last 50 actions"  color="#0f766e"/>
        <StatTile label="Case Updates"   value={stats.cases}    sub="cases modified"   color="#0284c7"/>
        <StatTile label="Messages Sent"  value={stats.messages} sub="to patients"      color="#0f766e"/>
        <StatTile label="Notes Created"  value={stats.notes}    sub="across all cases" color="#7c3aed"/>
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
          {FILTERS.map(f => {
            const labels = { all: "All", case_updated: "Case Updates", message_sent: "Messages", note_created: "Notes" };
            return (
              <button key={f} onClick={() => setFilter(f)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                style={filter === f
                  ? { background: "white", color: "#0f766e", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                  : { color: "#64748b" }}>
                {labels[f]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 max-w-64"
          style={{ border: "1px solid #e2e8f0", background: "white" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="flex-1 text-xs outline-none bg-transparent text-slate-700 placeholder-slate-400"
            placeholder="Search by case ID…"
            value={search} onChange={e => setSearch(e.target.value)}/>
          {search && (
            <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {fetching && (
          <svg className="animate-spin text-teal-600" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        )}

        <p className="ml-auto text-xs text-slate-400">{filtered.length} event{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="rounded-xl flex flex-col items-center justify-center py-16 text-slate-400"
          style={{ border: "1px solid #e2e8f0", background: "white" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="mb-3">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2"/>
          </svg>
          <p className="text-sm font-medium text-slate-500">No audit events found</p>
          <p className="text-xs mt-1">Try adjusting the filter or search</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ border: "1px solid #e2e8f0", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {grouped.map(([dateLabel, items], gi) => (
            <div key={dateLabel}>
              {/* Date separator */}
              <div className="px-5 py-2 flex items-center gap-3"
                style={{ background: "linear-gradient(to right,#f8fafc,#f0fdf9)", borderBottom: "1px solid #f1f5f9", borderTop: gi > 0 ? "1px solid #f1f5f9" : undefined }}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{dateLabel}</p>
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-teal-700"
                  style={{ background: "rgba(15,118,110,0.08)" }}>{items.length}</span>
              </div>

              {/* Rows */}
              {items.map((r, i) => {
                const m = ACTION_META[r.action] || {};
                return (
                  <div key={`${r.action}-${r.id}`}
                    className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-50"
                    style={{ borderBottom: i < items.length - 1 ? "1px solid #f8fafc" : undefined }}>

                    {/* Icon bubble */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: m.bg || "#f1f5f9" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.color || "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={m.icon || "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"}/>
                      </svg>
                    </div>

                    {/* Action badge */}
                    <div className="w-36 shrink-0">
                      <ActionBadge action={r.action}/>
                    </div>

                    {/* Case ID */}
                    <div className="flex-1">
                      {r.case_id ? (
                        <a href={`/clinician/cases/${r.case_id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold rounded-lg px-2.5 py-1 transition-colors hover:bg-teal-50"
                          style={{ color: "#0f766e", background: "rgba(15,118,110,0.06)" }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                          {r.case_id.slice(0, 8)}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>

                    {/* Timestamp */}
                    <p className="text-xs text-slate-400 shrink-0 tabular-nums">{fmtDate(r.at)}</p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
