"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import KpiCard from "../../../components/KpiCard";
import Topbar from "../../../components/Topbar";
import CaseStatusBadge from "../../../components/CaseStatusBadge";
import { fmtNumber, fmtDate } from "../../../lib/format";
import { supabase } from "../../../lib/supabaseClient";
import { useRequireAuth } from "../../../lib/auth";

export default function ClinicianDashboardPage() {
  const { loading, user } = useRequireAuth("clinician");
  const [cases, setCases] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: caseRows } = await supabase
        .from("cases")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      setCases(caseRows || []);

      const { data: msgRows } = await supabase
        .from("messages")
        .select("id")
        .eq("recipient_id", user.id)
        .is("read_at", null);
      setUnread((msgRows || []).length);
      void since;
    }
    load();
  }, [user]);

  const kpis = useMemo(() => {
    const sevenDays = cases.filter((c) => Date.now() - new Date(c.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000);
    const high = cases.filter((c) => c.status === "high_priority").length;
    const deferred = cases.filter((c) => c.status === "deferred").length;
    const confidences = cases.map((c) => c.scores?.p_fused).filter((v) => typeof v === "number");
    const avgConfidence =
      confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / Math.max(confidences.length, 1) : 0;
    return {
      sevenDays: sevenDays.length,
      high,
      deferred,
      avgConfidence
    };
  }, [cases]);

  if (loading) return null;
  return (
    <div>
      <Topbar title="Clinician Dashboard" subtitle="Screening triage overview and communication queue." />
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <KpiCard label="Cases (7d)" value={kpis.sevenDays} />
        <KpiCard label="High Priority" value={kpis.high} />
        <KpiCard label="Deferred" value={kpis.deferred} />
        <KpiCard label="Avg Confidence" value={fmtNumber(kpis.avgConfidence, 4)} />
      </div>
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Cases</h2>
          <Link className="btn-secondary" href="/clinician/messages">
            Messages ({unread} unread)
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-2 text-left">Case</th>
                <th className="px-2 py-2 text-left">Patient</th>
                <th className="px-2 py-2 text-left">P(Fused)</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Created</th>
                <th className="px-2 py-2 text-left">Next Step</th>
              </tr>
            </thead>
            <tbody>
              {cases.slice(0, 12).map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="px-2 py-2">{c.id.slice(0, 8)}</td>
                  <td className="px-2 py-2">{c.patient_id?.slice(0, 8)}</td>
                  <td className="px-2 py-2">{fmtNumber(c.scores?.p_fused, 4)}</td>
                  <td className="px-2 py-2">
                    <CaseStatusBadge status={c.status} />
                  </td>
                  <td className="px-2 py-2">{fmtDate(c.created_at)}</td>
                  <td className="px-2 py-2">
                    <Link className="text-primary" href={`/clinician/cases/${c.id}`}>
                      Open case
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
