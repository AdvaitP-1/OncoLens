import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabaseServer";

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
    const { case_id, recipient_id, body: text } = body;
    if (!case_id || !recipient_id || !text) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }
    const { error } = await supabase.from("messages").insert({
      case_id,
      sender_id: user.id,
      recipient_id,
      body: text
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Unexpected error." }, { status: 500 });
  }
}
