"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabaseClient";

export function useRequireAuth(requiredRole) {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, user: null, profile: null });

  useEffect(() => {
    async function load() {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userData?.user) {
        console.warn("[auth] getUser failed:", userError);
        router.replace("/login");
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();

      if (!profile) {
        console.warn("[auth] profile not found for user:", userData.user.id, profileError);
        router.replace("/login");
        return;
      }
      if (requiredRole && profile.role !== requiredRole) {
        router.replace(profile.role === "clinician" ? "/clinician/dashboard" : "/patient/dashboard");
        return;
      }
      setState({ loading: false, user: userData.user, profile });
    }
    load();
  }, [requiredRole, router]);

  return state;
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}
