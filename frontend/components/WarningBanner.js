export default function WarningBanner({ title, body }) {
  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
      <p className="font-semibold">{title}</p>
      <p className="text-sm">{body}</p>
    </div>
  );
}
