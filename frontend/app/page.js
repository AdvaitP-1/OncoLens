"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function routeUser() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      if (profile?.role === "clinician") {
        router.replace("/clinician/dashboard");
      } else if (profile?.role === "patient") {
        router.replace("/patient/dashboard");
      } else {
        router.replace("/login");
      }
    }
    routeUser();
  }, [router]);

  return <div className="p-8 text-sm text-slate-500">Loading OncoLens...</div>;
}
