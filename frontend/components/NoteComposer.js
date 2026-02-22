"use client";

import { useState } from "react";

export default function NoteComposer({ onSubmit }) {
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState("internal");

  async function submit() {
    if (!note.trim()) return;
    await onSubmit({ note, visibility });
    setNote("");
  }

  return (
    <div className="card p-4">
      <p className="mb-2 text-sm font-semibold">Add Note</p>
      <textarea className="input min-h-24" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="mt-2 flex items-center gap-2">
        <select className="input max-w-48" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          <option value="internal">Internal</option>
          <option value="patient_visible">Patient Visible</option>
        </select>
        <button className="btn-primary" onClick={submit}>
          Save Note
        </button>
      </div>
    </div>
  );
}
