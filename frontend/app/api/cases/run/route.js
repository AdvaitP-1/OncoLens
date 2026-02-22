import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../lib/supabaseServer";

function getToken(request) {
  const auth = request.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

export async function POST(request) {
  try {
    const token = getToken(request);
    const supabase = createSupabaseServerClient(token);
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = await request.json();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
    const res = await fetch(`${backendUrl}/cases/${body.case_id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lambda: body.lambda ?? 0.6, conservative: body.conservative ?? true })
    });
    const json = await res.json();
    if (!res.ok) return NextResponse.json({ error: json.detail || json.error || "Backend request failed." }, { status: res.status });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: err.message || "Unexpected error." }, { status: 500 });
  }
}
