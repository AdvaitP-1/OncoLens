"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "../../../../components/Topbar";
import ProbabilityCard from "../../../../components/ProbabilityCard";
import ActionTable from "../../../../components/ActionTable";
import WarningBanner from "../../../../components/WarningBanner";
import JsonDrawer from "../../../../components/JsonDrawer";
import NoteComposer from "../../../../components/NoteComposer";
import { useRequireAuth } from "../../../../lib/auth";
import { supabase } from "../../../../lib/supabaseClient";

export default function ClinicianCaseDetailPage() {
  const { id } = useParams();
  const { loading, user } = useRequireAuth("clinician");
  const [caseRow, setCaseRow] = useState(null);
  const [notes, setNotes] = useState([]);
  const [lambdaValue, setLambdaValue] = useState(0.6);
  const [conservative, setConservative] = useState(true);
  const [status, setStatus] = useState("");

  async function load() {
    const { data: c } = await supabase.from("cases").select("*").eq("id", id).single();
    setCaseRow(c || null);
    const { data: n } = await supabase
      .from("doctor_notes")
      .select("*")
      .eq("case_id", id)
      .order("created_at", { ascending: false });
    setNotes(n || []);
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function runAgain() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    setStatus("Running analysis...");
    const res = await fetch("/api/cases/run", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ case_id: id, lambda: lambdaValue, conservative })
    });
    const json = await res.json();
    if (!res.ok) {
      setStatus(json.error || "Failed to run.");
      return;
    }
    setStatus("Run completed.");
    await load();
  }

  async function createNote({ note, visibility }) {
    await supabase.from("doctor_notes").insert({
      case_id: id,
      author_id: user.id,
      note,
      visibility
    });
    await load();
  }

  if (loading) return null;
  if (!caseRow) return <div className="p-4 text-sm text-slate-500">Loading case...</div>;

  const scores = caseRow.scores || {};
  return (
    <div>
      <Topbar
        title={`Case ${id.slice(0, 8)}`}
        subtitle="Screening score review. Decision-support only, requires clinician review."
        right={
          <Link className="btn-secondary" href={`/clinician/messages?case=${id}`}>
            Message patient
          </Link>
        }
      />
      {caseRow.abstain ? (
        <WarningBanner
          title="Abstain Guardrail Triggered"
          body={`Reasons: ${(caseRow.abstain_reasons || []).join(", ") || "unspecified"}. Requires clinician review.`}
        />
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        <ProbabilityCard label="Vision score (p_vision)" p={scores.p_vision} ci={scores.ci_vision} />
        <ProbabilityCard label="Health score (p_health)" p={scores.p_health} ci={scores.ci_health} />
        <ProbabilityCard label="Fused score (p_fused)" p={scores.p_fused} ci={scores.ci_fused} />
      </div>
      <div className="card mt-4 p-4">
        <h2 className="mb-3 text-lg font-semibold">Decision Engine Controls</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Lambda ({lambdaValue.toFixed(2)})
            <input
              className="w-full"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={lambdaValue}
              onChange={(e) => setLambdaValue(Number(e.target.value))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={conservative} onChange={(e) => setConservative(e.target.checked)} />
            Conservative mode
          </label>
        </div>
        <button className="btn-primary mt-3" onClick={runAgain}>
          Re-run analysis
        </button>
        <p className="mt-2 text-sm text-slate-600">{status}</p>
      </div>
      <div className="card mt-4 p-4">
        <h2 className="mb-2 text-lg font-semibold">Recommendations</h2>
        <ActionTable rows={caseRow.recommendations || []} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <NoteComposer onSubmit={createNote} />
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold">Notes</h3>
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded border border-slate-200 p-2 text-sm">
                <p>{n.note}</p>
                <p className="text-xs text-slate-500">{n.visibility}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <JsonDrawer title="Clinician report" payload={{ clinician_report: caseRow.clinician_report }} />
        <JsonDrawer title="Data quality and scores" payload={{ data_quality: caseRow.data_quality, scores: caseRow.scores }} />
      </div>
    </div>
  );
}
