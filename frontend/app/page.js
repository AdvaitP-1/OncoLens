import Link from "next/link";

const features = [
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 12h6M12 9v6M3 12a9 9 0 1 0 18 0A9 9 0 0 0 3 12z"/></svg>,
    title: "Case Management",
    desc: "Upload wearables and imaging assets, track case status, and run screening analysis end-to-end.",
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    title: "Secure Messaging",
    desc: "Clinician–patient communication linked to cases for coordinated, auditable follow-up.",
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    title: "Decision Support",
    desc: "Screening scores and uncertainty guardrails to help clinicians prioritise and act confidently.",
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    title: "Imaging Analysis",
    desc: "Radiology reports and images analysed to surface structured, actionable findings.",
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
    title: "Wearable Vitals",
    desc: "Heart-rate, SpO₂, and activity streams fused with clinical labs for holistic risk scoring.",
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    title: "Audit Trail",
    desc: "Immutable log of every recommendation, clinician action, and patient interaction.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface">

      {/* ── NAV ── */}
      <nav className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between lg:px-12">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <span className="font-bold text-slate-900 tracking-tight">OncoLens</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-secondary text-sm px-4 py-2">Log in</Link>
          <Link href="/signup" className="btn-primary text-sm px-4 py-2">Sign up</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="px-6 py-20 text-center lg:px-12 lg:py-28">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Clinical decision support · Research prototype</p>
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl max-w-3xl mx-auto leading-tight">
          Oncology screening triage, built for clinical teams
        </h1>
        <p className="mt-5 max-w-xl mx-auto text-slate-500 text-base leading-relaxed">
          OncoLens brings together wearable data, imaging, and clinical notes in one place —
          giving clinicians the context they need to review and prioritise cases efficiently.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="btn-primary px-6 py-2.5 text-sm">Log in to dashboard</Link>
          <Link href="/signup" className="btn-secondary px-6 py-2.5 text-sm">Create an account</Link>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="border-t border-slate-200 bg-white px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-xl font-semibold text-slate-800 mb-8">Platform capabilities</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-surface p-5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-primary flex items-center justify-center mb-3">
                  {icon}
                </div>
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-xl font-semibold text-slate-800 mb-8">How it works</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: "1", title: "Upload data", desc: "Wearables, labs, imaging, and clinical notes are securely submitted by the patient or clinical team." },
              { n: "2", title: "Score & analyse", desc: "A multimodal pipeline fuses signals and generates a risk score with supporting evidence." },
              { n: "3", title: "Review & act", desc: "The clinician reviews ranked cases, reads the AI summary, and makes an informed decision." },
            ].map(({ n, title, desc }) => (
              <div key={n} className="card p-5">
                <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mb-3">{n}</div>
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DISCLAIMER ── */}
      <section className="border-t border-slate-200 bg-white px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex gap-3 items-start">
            <svg className="mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-900">Research prototype</p>
              <p className="mt-0.5 text-sm text-amber-800">
                OncoLens is not a substitute for medical diagnosis or clinical advice. All outputs must be reviewed by a qualified clinician.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 bg-surface px-6 py-6 text-center">
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} OncoLens · Research prototype · Not for clinical use</p>
      </footer>

    </div>
  );
}
