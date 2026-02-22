"use client";

import { fmtDate } from "../lib/format";

export default function ChatWindow({ messages, myUserId }) {
  if (!messages.length) {
    return <p className="text-sm text-slate-500">Select a thread to view messages.</p>;
  }
  return (
    <div className="h-96 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
      {messages.map((m) => {
        const mine = m.sender_id === myUserId;
        return (
          <div key={m.id} className={`max-w-[80%] rounded-lg p-2 text-sm ${mine ? "ml-auto bg-teal-100" : "bg-white"}`}>
            <p>{m.body}</p>
            <p className="mt-1 text-[10px] text-slate-500">{fmtDate(m.created_at)}</p>
          </div>
        );
      })}
    </div>
  );
}
