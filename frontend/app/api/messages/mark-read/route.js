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
    const ids = body.message_ids || [];
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "message_ids is required." }, { status: 400 });
    }
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids)
      .eq("recipient_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Unexpected error." }, { status: 500 });
  }
}
