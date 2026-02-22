import { titleCase } from "../lib/format";

const styles = {
  new: "bg-slate-100 text-slate-700",
  running: "bg-blue-100 text-blue-700",
  ready: "bg-emerald-100 text-emerald-700",
  high_priority: "bg-red-100 text-red-700",
  needs_review: "bg-amber-100 text-amber-700",
  monitor: "bg-cyan-100 text-cyan-700",
  deferred: "bg-zinc-100 text-zinc-700"
};

export default function CaseStatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles[status] || styles.new}`}>
      {titleCase(status || "new")}
    </span>
  );
}
