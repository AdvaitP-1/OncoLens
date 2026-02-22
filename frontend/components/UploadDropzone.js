"use client";

export default function UploadDropzone({ label, accept, onChange, multiple = false }) {
  return (
    <label className="card block cursor-pointer p-4">
      <p className="mb-2 text-sm font-medium">{label}</p>
      <input
        className="input"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          onChange(multiple ? files : files[0] || null);
        }}
      />
    </label>
  );
}
