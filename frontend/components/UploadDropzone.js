"use client";

export default function UploadDropzone({ label, accept, onChange }) {
  return (
    <label className="card block cursor-pointer p-4">
      <p className="mb-2 text-sm font-medium">{label}</p>
      <input className="input" type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] || null)} />
    </label>
  );
}
