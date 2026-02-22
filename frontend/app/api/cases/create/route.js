import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../../../../lib/supabaseServer";

function getToken(request) {
  const auth = request.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

export async function POST(request) {
  try {
    // Verify the requester is an authenticated user
    const token = getToken(request);
    const supabase = createSupabaseServerClient(token);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = await request.json();
    const { id, patient_id, wearables_paths, image_path } = body;
    if (!id || !patient_id || !Array.isArray(wearables_paths) || wearables_paths.length === 0) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Use service role key to bypass RLS for writes
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error: caseError } = await admin.from("cases").insert({
      id,
      created_by: user.id,
      patient_id,
      status: "new"
    });
    if (caseError) return NextResponse.json({ error: caseError.message }, { status: 400 });

    const csvAssets = wearables_paths.map((p) => ({
      case_id: id,
      asset_type: "wearables_csv",
      storage_path: p
    }));
    const assets = image_path
      ? [...csvAssets, { case_id: id, asset_type: "image", storage_path: image_path }]
      : csvAssets;
    const { error: assetError } = await admin.from("case_assets").insert(assets);
    if (assetError) return NextResponse.json({ error: assetError.message }, { status: 400 });

    return NextResponse.json({ ok: true, case_id: id });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Unexpected error." }, { status: 500 });
  }
}
