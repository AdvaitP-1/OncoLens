import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <section className="card p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">OncoLens</p>
        <h1 className="text-4xl font-bold text-slate-900">Screening triage + clinician-patient collaboration</h1>
        <p className="mt-4 max-w-3xl text-slate-600">
          OncoLens helps teams coordinate case review, share secure messages, and run a research prototype
          screening-score pipeline for clinician decision-support.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login" className="btn-primary">
            Login
          </Link>
          <Link href="/signup" className="btn-secondary">
            Create account
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <h2 className="text-lg font-semibold">Case Management</h2>
          <p className="mt-2 text-sm text-slate-600">
            Upload wearables + imaging assets, track case status, and run backend screening analysis.
          </p>
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-semibold">Secure Messaging</h2>
          <p className="mt-2 text-sm text-slate-600">
            Realtime clinician↔patient communication linked to cases for coordinated follow-up.
          </p>
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-semibold">Decision Support</h2>
          <p className="mt-2 text-sm text-slate-600">
            Multimodal screening scores, uncertainty guardrails, and expected-utility recommendations.
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <p className="font-semibold">Research prototype disclaimer</p>
        <p className="text-sm">
          OncoLens provides screening triage support and is not a diagnosis or medical advice. Final decisions require
          clinician review.
        </p>
      </section>
    </main>
  );
}
