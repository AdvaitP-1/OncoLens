export default function KpiCard({ label, value, hint }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
