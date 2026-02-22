import { fmtNumber } from "../lib/format";

export default function ProbabilityCard({ label, p, ci }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{fmtNumber(p, 4)}</p>
      {ci ? (
        <p className="text-xs text-slate-500">
          CI: {fmtNumber(ci?.[0], 4)} - {fmtNumber(ci?.[1], 4)}
        </p>
      ) : null}
    </div>
  );
}
