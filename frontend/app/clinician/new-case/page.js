"use client";

import { useState } from "react";
import Topbar from "../../../components/Topbar";
import UploadDropzone from "../../../components/UploadDropzone";
import { supabase } from "../../../lib/supabaseClient";
import { useRequireAuth } from "../../../lib/auth";

export default function NewCasePage() {
  const { loading, user } = useRequireAuth();
  const [csvFiles, setCsvFiles] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [createdCaseId, setCreatedCaseId] = useState("");
  const [statusText, setStatusText] = useState("");

  const hasCsv = csvFiles.length > 0;
  const hasImage = !!imageFile;
  const canCreate = hasCsv && hasImage && user;
  const canRunAnalysis = !!createdCaseId;

  async function createCase() {
    if (!user || !canCreate) {
      setStatusText("Please upload CSVs and an image.");
      return;
    }
    if (!imageFile) {
      setStatusText("Please upload a diagnostic image (PNG or JPG).");
      return;
    }
    setStatusText("Creating case...");
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const caseId = crypto.randomUUID();
    const userId = user.id;

    const csvPaths = [];
    for (const file of csvFiles) {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_");
      const storagePath = `cases/${caseId}/csv/${safeName}`;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("path", storagePath);
      const uploadRes = await fetch("/api/storage-upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        setStatusText(uploadJson.error || "Failed to upload CSV.");
        return;
      }
      csvPaths.push(storagePath);
    }

    const ext = imageFile.name.toLowerCase().endsWith(".jpg") || imageFile.name.toLowerCase().endsWith(".jpeg")
      ? "jpg"
      : "png";
    const imagePath = `cases/${caseId}/image.${ext}`;
    const imageFd = new FormData();
    imageFd.append("file", imageFile);
    imageFd.append("path", imagePath);
    const imageUploadRes = await fetch("/api/storage-upload", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: imageFd,
    });
    const imageUploadJson = await imageUploadRes.json();
    if (!imageUploadRes.ok) {
      setStatusText(imageUploadJson.error || "Failed to upload image.");
      return;
    }

    const res = await fetch("/api/cases/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        id: caseId,
        created_by: userId,
        patient_id: userId,
        wearables_paths: csvPaths,
        image_path: imagePath,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatusText(json.error || "Failed to create case.");
      return;
    }
    setCreatedCaseId(caseId);
    setStatusText("Case created. Indexing documents...");
    for (const file of csvFiles) {
      const formData = new FormData();
      formData.append("file", file);
      await fetch(`/api/rag-upload/${userId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
    }
    setStatusText("Case created.");
  }

  async function runAnalysis() {
    if (!createdCaseId) return;
    setStatusText("Running analysis...");
    const res = await fetch("/api/cases/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: createdCaseId, lambda: 0.6, conservative: true }),
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
      <Topbar title="Create New Case" subtitle="Upload wearables CSVs and an image, then run the triage pipeline." />
      <UploadDropzone
        label="Patient Data CSVs (multiple)"
        accept=".csv,text/csv"
        onChange={setCsvFiles}
        multiple
      />
      <p className="mt-2 text-xs text-slate-500">
        Supported files: wearable_single, daily_vitals_single, daily_labs_single, medications_single,
        patient_profile_single, clinical_notes_single, imaging_single.
      </p>
      <div className="mt-4">
        <UploadDropzone
          label="Imaging (PNG or JPG, single file)"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          onChange={(f) => setImageFile(f || null)}
          multiple={false}
        />
        <p className="mt-2 text-xs text-slate-500">
          Analysis requires both wearables CSV and imaging. Upload one image per case.
        </p>
      </div>
      <div className="card mt-4 p-4">
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className={hasCsv ? "text-emerald-600" : "text-slate-400"}>
              {hasCsv ? "✓" : "○"} CSV
            </span>
            <span className={hasImage ? "text-emerald-600" : "text-slate-400"}>
              {hasImage ? "✓" : "○"} Image
            </span>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={createCase} disabled={!canCreate}>
            Create case
          </button>
          <button className="btn-secondary" onClick={runAnalysis} disabled={!canRunAnalysis}>
            Run analysis
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600">{statusText}</p>
        {createdCaseId ? <p className="text-xs text-slate-500">Case ID: {createdCaseId}</p> : null}
      </div>
    </div>
  );
}
