"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Topbar from "../../../components/Topbar";
import CaseStatusBadge from "../../../components/CaseStatusBadge";
import WarningBanner from "../../../components/WarningBanner";
import { useRequireAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabaseClient";
import { fmtDate } from "../../../lib/format";

export default function PatientDashboardPage() {
  const { loading, user } = useRequireAuth("patient");
  const [cases, setCases] = useState([]);
  const [notes, setNotes] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data: caseRows } = await supabase
        .from("cases")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });
      setCases(caseRows || []);
      const caseIds = (caseRows || []).map((c) => c.id);
      if (caseIds.length) {
        const { data: noteRows } = await supabase
          .from("doctor_notes")
          .select("*")
          .in("case_id", caseIds)
          .eq("visibility", "patient_visible")
          .order("created_at", { ascending: false });
        setNotes(noteRows || []);
      }
      const { data: msgRows } = await supabase
        .from("messages")
        .select("id")
        .eq("recipient_id", user.id)
        .is("read_at", null);
      setUnread((msgRows || []).length);
    }
    load();
  }, [user]);

  const latestVisibleNotes = useMemo(() => notes.slice(0, 6), [notes]);

  if (loading) return null;
  return (
    <div>
      <Topbar title="Patient Dashboard" subtitle="Your screening triage updates and clinician communication." />
      <WarningBanner
        title="Research Prototype Notice"
        body="This platform provides screening triage decision-support and is not a diagnosis or medical advice."
      />
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Assigned Cases</h2>
          <Link className="btn-secondary" href="/patient/messages">
            Messages ({unread} unread)
          </Link>
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-2 py-2 text-left">Case</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-left">Summary</th>
              <th className="px-2 py-2 text-left">Updated</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="px-2 py-2">
                  <Link className="text-primary" href={`/patient/cases/${c.id}`}>
                    {c.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-2 py-2">
                  <CaseStatusBadge status={c.status} />
                </td>
                <td className="px-2 py-2">{c.patient_summary || "Pending clinician review."}</td>
                <td className="px-2 py-2">{fmtDate(c.last_updated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card mt-4 p-4">
        <h3 className="mb-2 text-sm font-semibold">Patient-visible notes</h3>
        {latestVisibleNotes.length ? (
          latestVisibleNotes.map((n) => (
            <div key={n.id} className="mb-2 rounded border border-slate-200 p-2 text-sm">
              <p>{n.note}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No visible notes yet.</p>
        )}
      </div>
      <div className="card mt-4 p-4">
        <h3 className="mb-1 text-sm font-semibold">Wearables Integration Stub</h3>
        <p className="text-sm text-slate-600">
          Optional monthly CSV upload flow can be added to support periodic monitoring updates.
        </p>
      </div>
    </div>
  );
}
