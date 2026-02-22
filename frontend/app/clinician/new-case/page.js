"use client";

import { useEffect, useState } from "react";
import Topbar from "../../../components/Topbar";
import UploadDropzone from "../../../components/UploadDropzone";
import { supabase } from "../../../lib/supabaseClient";
import { useRequireAuth } from "../../../lib/auth";

export default function NewCasePage() {
  const { loading, user } = useRequireAuth("clinician");
  const [csvFiles, setCsvFiles] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [createdCaseId, setCreatedCaseId] = useState("");
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    async function loadPatients() {
      const { data } = await supabase.from("profiles").select("id, full_name, role").eq("role", "patient");
      setPatients(data || []);
      if (data?.[0]?.id) setPatientId(data[0].id);
    }
    loadPatients();
  }, []);

  async function createCase() {
    if (!user || !patientId || csvFiles.length === 0 || !imageFile) {
      setStatusText("Please provide patient, one or more CSV files, and an image.");
      return;
    }
    setStatusText("Creating case...");
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const caseId = crypto.randomUUID();

    const csvPaths = [];
    for (const file of csvFiles) {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_");
      const storagePath = `cases/${caseId}/csv/${safeName}`;
      const uploadCsv = await supabase.storage.from("case-assets").upload(storagePath, file, { upsert: true });
      if (uploadCsv.error) {
        setStatusText(uploadCsv.error.message);
        return;
      }
      csvPaths.push(storagePath);
    }

    const imageExt = imageFile.name.toLowerCase().endsWith(".jpg") || imageFile.name.toLowerCase().endsWith(".jpeg") ? "jpg" : "png";
    const imagePath = `cases/${caseId}/image.${imageExt}`;

    const uploadImg = await supabase.storage.from("case-assets").upload(imagePath, imageFile, { upsert: true });
    if (uploadImg.error) {
      setStatusText(uploadImg.error.message);
      return;
    }

    const res = await fetch("/api/cases/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: caseId,
        patient_id: patientId,
        wearables_paths: csvPaths,
        image_path: imagePath
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setStatusText(json.error || "Failed to create case.");
      return;
    }
    setCreatedCaseId(caseId);
    setStatusText("Case created.");
  }

  async function runAnalysis() {
    if (!createdCaseId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    setStatusText("Running analysis...");
    const res = await fetch("/api/cases/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ case_id: createdCaseId, lambda: 0.6, conservative: true })
    });
    const json = await res.json();
    if (!res.ok) {
      setStatusText(json.error || "Analysis failed.");
      return;
    }
    setStatusText("Analysis completed. Open case detail page.");
  }

  if (loading) return null;
  return (
    <div>
      <Topbar title="Create New Case" subtitle="Upload wearables + imaging assets, assign patient, run triage pipeline." />
      <div className="grid gap-4 lg:grid-cols-2">
        <UploadDropzone
          label="Patient Data CSVs (multiple)"
          accept=".csv,text/csv"
          onChange={setCsvFiles}
          multiple
        />
        <UploadDropzone label="Image (.png/.jpg)" accept=".png,.jpg,.jpeg,image/*" onChange={setImageFile} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Supported examples: wearable_single, daily_vitals_single, daily_labs_single, medications_single,
        patient_profile_single, clinical_notes_single, imaging_single.
      </p>
      <div className="card mt-4 p-4">
        <p className="mb-2 text-sm font-semibold">Assign patient</p>
        <select className="input max-w-lg" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name || p.id} ({p.id.slice(0, 8)})
            </option>
          ))}
        </select>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={createCase}>
            Create case
          </button>
          <button className="btn-secondary" onClick={runAnalysis} disabled={!createdCaseId}>
            Run analysis
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600">{statusText}</p>
        {createdCaseId ? <p className="text-xs text-slate-500">Case ID: {createdCaseId}</p> : null}
      </div>
    </div>
  );
}
