"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Topbar from "../../../components/Topbar";
import { useRequireAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabaseClient";
import { fmtDate } from "../../../lib/format";

export default function ClinicianMessagesPage() {
  const { loading, user } = useRequireAuth("clinician");
  const search  = useSearchParams();
  const [caseId,   setCaseId]   = useState(search.get("case") || "");
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState("");
  const [cases,    setCases]    = useState([]);
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    async function loadCases() {
      const { data } = await supabase
        .from("cases").select("id,patient_id,created_at,status")
        .eq("created_by", user.id).order("created_at", { ascending: false });
      setCases(data || []);
      if (!caseId && data?.[0]?.id) setCaseId(data[0].id);
    }
    loadCases();
  }, [user, caseId]);

  async function loadMessages(targetCaseId) {
    if (!targetCaseId) return;
    const { data } = await supabase.from("messages").select("*")
      .eq("case_id", targetCaseId).order("created_at", { ascending: true });
    setMessages(data || []);
  }

  useEffect(() => { if (caseId) loadMessages(caseId); }, [caseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!caseId) return;
    const channel = supabase
      .channel(`messages-case-${caseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `case_id=eq.${caseId}` }, () => {
        loadMessages(caseId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [caseId]);

  async function send() {
    if (!text.trim() || !caseId || sending) return;
    setSending(true);
    const selected = cases.find(c => c.id === caseId);
    const recipientId = selected?.patient_id;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ case_id: caseId, recipient_id: recipientId, body: text })
    });
    setText("");
    setSending(false);
  }

  async function markRead() {
    const unreadIds = messages.filter(m => !m.read_at && m.recipient_id === user.id).map(m => m.id);
    if (!unreadIds.length) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    await fetch("/api/messages/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message_ids: unreadIds })
    });
    loadMessages(caseId);
  }

  const threads = useMemo(() =>
    cases.map(c => ({
      case_id:   c.id,
      patient_id: c.patient_id,
      status:    c.status,
      last_body: c.id === caseId ? messages[messages.length - 1]?.body : "",
      last_at:   c.id === caseId ? messages[messages.length - 1]?.created_at : c.created_at,
      unread:    c.id === caseId ? messages.filter(m => !m.read_at && m.recipient_id === user?.id).length : 0,
    })),
    [cases, caseId, messages, user]
  );

  const unreadTotal  = messages.filter(m => !m.read_at && m.recipient_id === user?.id).length;
  const activeCase   = cases.find(c => c.id === caseId);
  const statusColor  = { high_priority:"#ef4444", running:"#0284c7", ready:"#10b981", deferred:"#64748b" };
  const statusLabel  = { high_priority:"High Priority", running:"Running", ready:"Ready", deferred:"Deferred" };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400 text-sm">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#0f766e" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        Loading messages...
      </div>
    </div>
  );

  return (
    <div className="space-y-4" style={{ height: "calc(100vh - 32px)", display: "flex", flexDirection: "column" }}>

      {/* Topbar */}
      <Topbar
        title="Patient Messages"
        subtitle="Secure case-linked communication with your patients."
        right={
          <div className="flex items-center gap-2">
            {unreadTotal > 0 && (
              <button onClick={markRead}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                style={{ background: "rgba(15,118,110,0.08)", color: "#0f766e", border: "1px solid rgba(15,118,110,0.2)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Mark {unreadTotal} as read
              </button>
            )}
            {caseId && (
              <Link href={`/clinician/cases/${caseId}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                style={{ background: "linear-gradient(135deg,#0f766e,#0c4a6e)", color: "white", boxShadow: "0 2px 6px rgba(15,118,110,0.3)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                View Case
              </Link>
            )}
          </div>
        }
      />

      {/* Chat layout */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Thread list */}
        <div className="w-72 shrink-0 rounded-xl overflow-hidden flex flex-col"
          style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", background: "white" }}>
          <div className="px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid #f1f5f9", background: "linear-gradient(to right,#f8fafc,#f0fdf9)" }}>
            <h3 className="text-sm font-semibold text-slate-700">Patient Threads</h3>
            <p className="text-xs text-slate-400 mt-0.5">{cases.length} case{cases.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="mb-2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p className="text-xs">No cases yet</p>
              </div>
            ) : threads.map(thread => {
              const active = caseId === thread.case_id;
              const sc = statusColor[thread.status] || "#94a3b8";
              const sl = statusLabel[thread.status] || thread.status;
              return (
                <button key={thread.case_id} onClick={() => setCaseId(thread.case_id)}
                  className="w-full rounded-lg p-3 text-left transition-all"
                  style={{
                    background: active ? "rgba(15,118,110,0.06)" : "transparent",
                    border: `1px solid ${active ? "rgba(15,118,110,0.2)" : "#f1f5f9"}`,
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: active ? "linear-gradient(135deg,#0f766e,#0284c7)" : "linear-gradient(135deg,#94a3b8,#64748b)" }}>
                        {(thread.patient_id || "P")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: active ? "#0f766e" : "#334155" }}>
                          {thread.case_id.slice(0, 8)}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="w-1 h-1 rounded-full" style={{ background: sc }}/>
                          <span className="text-xs" style={{ color: sc }}>{sl}</span>
                        </div>
                      </div>
                    </div>
                    {thread.unread > 0 && (
                      <span className="flex items-center justify-center w-4 h-4 rounded-full text-white font-bold"
                        style={{ background: "#ef4444", fontSize: 10 }}>{thread.unread}</span>
                    )}
                  </div>
                  {thread.last_body && (
                    <p className="text-xs text-slate-500 truncate pl-9 mt-0.5">{thread.last_body}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5 pl-9">{fmtDate(thread.last_at)}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0"
          style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", background: "white" }}>

          {/* Chat header */}
          {caseId && activeCase && (
            <div className="px-5 py-3 shrink-0 flex items-center justify-between"
              style={{ borderBottom: "1px solid #f1f5f9", background: "linear-gradient(to right,#f8fafc,#f0fdf9)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#94a3b8,#64748b)" }}>
                  {(activeCase.patient_id || "P")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Patient · <span className="font-mono text-xs text-slate-500">{(activeCase.patient_id || "").slice(0, 8)}</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full"
                      style={{ background: statusColor[activeCase.status] || "#94a3b8" }}/>
                    <p className="text-xs text-slate-400">Case {caseId.slice(0, 8)} · {statusLabel[activeCase.status] || activeCase.status}</p>
                  </div>
                </div>
              </div>
              <Link href={`/clinician/cases/${caseId}`}
                className="text-xs font-medium transition-all"
                style={{ color: "#0f766e" }}>
                Open case →
              </Link>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ background: "#f8fafc" }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="mb-3">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p className="text-sm font-medium text-slate-500">No messages yet</p>
                <p className="text-xs mt-1">Start the conversation with your patient</p>
              </div>
            ) : messages.map(m => {
              const mine = m.sender_id === user.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white mr-2 mt-1 shrink-0"
                      style={{ background: "linear-gradient(135deg,#94a3b8,#64748b)" }}>
                      {(activeCase?.patient_id || "P")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="max-w-[70%]">
                    <div className="rounded-2xl px-4 py-2.5 text-sm"
                      style={mine
                        ? { background: "linear-gradient(135deg,#0f766e,#0284c7)", color: "white", borderBottomRightRadius: 6 }
                        : { background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderBottomLeftRadius: 6 }
                      }>
                      <p className="leading-relaxed">{m.body}</p>
                    </div>
                    <p className={`text-xs text-slate-400 mt-1 ${mine ? "text-right" : "text-left"}`}>
                      {fmtDate(m.created_at)}
                      {mine && m.read_at && (
                        <span className="ml-1.5 text-teal-500">✓ Read</span>
                      )}
                    </p>
                  </div>
                  {mine && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ml-2 mt-1 shrink-0"
                      style={{ background: "rgba(15,118,110,0.12)", color: "#0f766e" }}>
                      {(user?.email?.[0] || "C").toUpperCase()}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 shrink-0 flex items-center gap-2"
            style={{ borderTop: "1px solid #f1f5f9", background: "white" }}>
            <div className="flex-1 flex items-center rounded-xl border gap-2 px-3 py-2"
              style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" className="shrink-0">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <input
                className="flex-1 text-sm outline-none bg-transparent"
                style={{ color: "#1e293b" }}
                placeholder="Write a clinical message to your patient..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              />
            </div>
            <button onClick={send} disabled={!text.trim() || sending}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#0f766e,#0284c7)", boxShadow: "0 2px 8px rgba(15,118,110,0.3)" }}>
              {sending ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
