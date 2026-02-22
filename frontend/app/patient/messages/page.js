"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Topbar from "../../../components/Topbar";
import ChatThreadList from "../../../components/ChatThreadList";
import ChatWindow from "../../../components/ChatWindow";
import { useRequireAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabaseClient";

export default function PatientMessagesPage() {
  const { loading, user } = useRequireAuth("patient");
  const search = useSearchParams();
  const [caseId, setCaseId] = useState(search.get("case") || "");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [cases, setCases] = useState([]);

  useEffect(() => {
    if (!user) return;
    async function loadCases() {
      const { data } = await supabase
        .from("cases")
        .select("id,created_by,created_at")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });
      setCases(data || []);
      if (!caseId && data?.[0]?.id) setCaseId(data[0].id);
    }
    loadCases();
  }, [user, caseId]);

  async function loadMessages(targetCaseId) {
    if (!targetCaseId) return;
    const { data } = await supabase.from("messages").select("*").eq("case_id", targetCaseId).order("created_at", { ascending: true });
    setMessages(data || []);
  }

  useEffect(() => {
    if (caseId) loadMessages(caseId);
  }, [caseId]);

  useEffect(() => {
    if (!caseId) return;
    const channel = supabase
      .channel(`patient-messages-${caseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `case_id=eq.${caseId}` }, () => {
        loadMessages(caseId);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId]);

  async function send() {
    if (!text.trim() || !caseId) return;
    const selected = cases.find((c) => c.id === caseId);
    const recipientId = selected?.created_by;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ case_id: caseId, recipient_id: recipientId, body: text })
    });
    setText("");
  }

  async function markRead() {
    const unreadIds = messages.filter((m) => !m.read_at && m.recipient_id === user.id).map((m) => m.id);
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

  const threads = useMemo(
    () =>
      cases.map((c) => ({
        case_id: c.id,
        last_body: c.id === caseId ? messages[messages.length - 1]?.body : "",
        last_at: c.id === caseId ? messages[messages.length - 1]?.created_at : c.created_at
      })),
    [cases, caseId, messages]
  );

  if (loading) return null;
  return (
    <div>
      <Topbar title="Patient Messages" subtitle="Secure communication with your clinician." />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="card p-3">
          <ChatThreadList threads={threads} selectedCaseId={caseId} onSelect={setCaseId} />
        </div>
        <div className="card p-3">
          <ChatWindow messages={messages} myUserId={user.id} />
          <div className="mt-3 flex gap-2">
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write message..." />
            <button className="btn-primary" onClick={send}>
              Send
            </button>
            <button className="btn-secondary" onClick={markRead}>
              Mark read
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
