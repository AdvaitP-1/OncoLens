"use client";

import { fmtDate } from "../lib/format";

export default function ChatThreadList({ threads, selectedCaseId, onSelect }) {
  if (!threads.length) return <p className="text-sm text-slate-500">No threads yet.</p>;
  return (
    <div className="space-y-2">
      {threads.map((thread) => {
        const active = selectedCaseId === thread.case_id;
        return (
          <button
            key={thread.case_id}
            className={`w-full rounded-lg border p-3 text-left ${active ? "border-primary bg-teal-50" : "border-slate-200 bg-white"}`}
            onClick={() => onSelect(thread.case_id)}
          >
            <p className="text-sm font-semibold">Case {thread.case_id.slice(0, 8)}</p>
            <p className="text-xs text-slate-500">{thread.last_body || "No messages"}</p>
            <p className="mt-1 text-xs text-slate-400">{fmtDate(thread.last_at)}</p>
          </button>
        );
      })}
    </div>
  );
}
