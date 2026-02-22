"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function SignupPage() {
  const [form, setForm] = useState({ full_name: "", role: "patient", email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    const { data, error: signError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password
    });
    if (signError) {
      setError(signError.message);
      return;
    }
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: form.full_name,
        role: form.role
      });
      if (profileError) {
        setError(profileError.message);
        return;
      }
    }
    setMessage("Signup successful. Check your email for confirmation if enabled.");
    router.push("/login");
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold">Sign up</h1>
        <p className="mb-4 text-sm text-slate-500">Create a clinician or patient account.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="input"
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="patient">Patient</option>
            <option value="clinician">Clinician</option>
          </select>
          <input
            className="input"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          <button className="btn-primary w-full">Create account</button>
        </form>
        <p className="mt-4 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-primary">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
