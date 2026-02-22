"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: authError, data } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    router.push(profile?.role === "clinician" ? "/clinician/dashboard" : "/patient/dashboard");
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="mb-4 text-sm text-slate-500">Access OncoLens triage and collaboration workspace.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link href="/signup" className="text-primary">
            Create account
          </Link>
          <Link href="/forgot-password" className="text-primary">
            Forgot password?
          </Link>
        </div>
      </div>
    </main>
  );
}
