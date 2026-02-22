"use client";

import { useState } from "react";

export default function JsonDrawer({ title, payload }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-3">
      <button className="text-sm font-semibold text-primary" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide" : "Show"} {title}
      </button>
      {open ? (
        <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
          {JSON.stringify(payload || {}, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
