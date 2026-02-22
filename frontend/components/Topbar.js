"use client";

import { logout } from "../lib/auth";

export default function Topbar({ title, subtitle, right }) {
  return (
    <div className="card mb-4 flex items-center justify-between p-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {right}
        <button className="btn-secondary" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}
