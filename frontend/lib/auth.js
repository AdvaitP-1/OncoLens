"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

/**
 * Hackathon mode: anonymous auth, no login UI.
 * Ensures session exists (signs in anonymously if needed) and profile is created.
 * Returns { loading, user, profile } - no redirect to login.
 */
export function useRequireAuth() {
  const [state, setState] = useState({ loading: true, user: null, profile: null });

  useEffect(() => {
    async function ensureSession() {
      let { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        const { data: signInData, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.warn("[auth] Anonymous sign-in failed:", error);
          setState({ loading: false, user: null, profile: null });
          return;
        }
        userData = signInData;
      }
      const userId = userData.user.id;

      let { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (!profile) {
        const { error: insertErr } = await supabase.from("profiles").insert({
          id: userId,
          full_name: "Demo User",
          role: "clinician",
        });
        if (insertErr) {
          console.warn("[auth] Profile insert failed:", insertErr);
        }
        profile = { id: userId, full_name: "Demo User", role: "clinician" };
      }
      setState({ loading: false, user: userData.user, profile });
    }
    ensureSession();
  }, []);

  return state;
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/";
}
