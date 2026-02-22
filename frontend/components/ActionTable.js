import { fmtNumber, titleCase } from "../lib/format";

export default function ActionTable({ rows = [] }) {
  if (!rows.length) return <p className="text-sm text-slate-500">No recommendations yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="px-3 py-2 text-left">Action</th>
            <th className="px-3 py-2 text-left">Expected Utility</th>
            <th className="px-3 py-2 text-left">Benefit</th>
            <th className="px-3 py-2 text-left">Harm</th>
            <th className="px-3 py-2 text-left">Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.action} className="border-b">
              <td className="px-3 py-2">{titleCase(r.action)}</td>
              <td className="px-3 py-2">{fmtNumber(r.expected_utility, 4)}</td>
              <td className="px-3 py-2">{fmtNumber(r.benefit, 4)}</td>
              <td className="px-3 py-2">{fmtNumber(r.harm, 4)}</td>
              <td className="px-3 py-2">{fmtNumber(r.cost, 4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
