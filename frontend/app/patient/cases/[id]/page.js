"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "../../../../components/Topbar";
import WarningBanner from "../../../../components/WarningBanner";
import ActionTable from "../../../../components/ActionTable";
import { useRequireAuth } from "../../../../lib/auth";
import { supabase } from "../../../../lib/supabaseClient";

export default function PatientCasePage() {
  const { id } = useParams();
  const { loading } = useRequireAuth("patient");
  const [caseRow, setCaseRow] = useState(null);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase.from("cases").select("*").eq("id", id).single();
      setCaseRow(c || null);
      const { data: n } = await supabase
        .from("doctor_notes")
        .select("*")
        .eq("case_id", id)
        .eq("visibility", "patient_visible")
        .order("created_at", { ascending: false });
      setNotes(n || []);
    }
    if (id) load();
  }, [id]);

  if (loading) return null;
  if (!caseRow) return <div className="p-4 text-sm text-slate-500">Loading case...</div>;
  return (
    <div>
      <Topbar
        title={`Case ${id.slice(0, 8)}`}
        subtitle="Patient-safe triage summary. Your clinician determines final interpretation."
        right={
          <Link className="btn-secondary" href={`/patient/messages?case=${id}`}>
            Message clinician
          </Link>
        }
      />
      <WarningBanner
        title="Important Disclaimer"
        body="This is a screening triage support result and not a diagnosis. Please follow your clinician guidance."
      />
      <div className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">Patient Summary</h2>
        <p className="text-sm">{caseRow.patient_summary || "Your clinician is preparing a summary."}</p>
      </div>
      <div className="card mt-4 p-4">
        <h3 className="mb-2 text-sm font-semibold">Next steps</h3>
        <ActionTable rows={caseRow.recommendations || []} />
      </div>
      <div className="card mt-4 p-4">
        <h3 className="mb-2 text-sm font-semibold">Clinician Notes Shared With You</h3>
        {notes.length ? notes.map((n) => <p key={n.id} className="mb-2 rounded border p-2 text-sm">{n.note}</p>) : <p className="text-sm text-slate-500">No shared notes yet.</p>}
      </div>
    </div>
  );
}
