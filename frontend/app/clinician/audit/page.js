"use client";

import { useEffect, useState } from "react";
import Topbar from "../../../components/Topbar";
import { useRequireAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabaseClient";
import { fmtDate } from "../../../lib/format";

export default function ClinicianAuditPage() {
  const { loading, user } = useRequireAuth("clinician");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [{ data: cases }, { data: messages }, { data: notes }] = await Promise.all([
        supabase.from("cases").select("id,last_updated,created_by").eq("created_by", user.id).order("last_updated", { ascending: false }).limit(20),
        supabase.from("messages").select("id,case_id,created_at,sender_id").eq("sender_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("doctor_notes").select("id,case_id,created_at,author_id").eq("author_id", user.id).order("created_at", { ascending: false }).limit(20)
      ]);
      const merged = [
        ...(cases || []).map((c) => ({ id: c.id, action: "case_updated", case_id: c.id, at: c.last_updated })),
        ...(messages || []).map((m) => ({ id: m.id, action: "message_sent", case_id: m.case_id, at: m.created_at })),
        ...(notes || []).map((n) => ({ id: n.id, action: "note_created", case_id: n.case_id, at: n.created_at }))
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setRows(merged.slice(0, 50));
    }
    load();
  }, [user]);

  if (loading) return null;
  return (
    <div>
      <Topbar title="Audit Trail" subtitle="Approximate recent actions across cases, notes, and messaging." />
      <div className="card p-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-2 py-2 text-left">Time</th>
              <th className="px-2 py-2 text-left">Action</th>
              <th className="px-2 py-2 text-left">Case</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.action}-${r.id}`} className="border-b">
                <td className="px-2 py-2">{fmtDate(r.at)}</td>
                <td className="px-2 py-2">{r.action}</td>
                <td className="px-2 py-2">{r.case_id?.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
