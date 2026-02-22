"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMessage("If an account exists, a reset link has been sent.");
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          <button className="btn-primary w-full">Send reset link</button>
        </form>
      </div>
    </main>
  );
}
