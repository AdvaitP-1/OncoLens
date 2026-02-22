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
    const { id, patient_id, wearables_paths, image_path } = body;
    if (!id || !patient_id || !Array.isArray(wearables_paths) || wearables_paths.length === 0 || !image_path) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const { error: caseError } = await supabase.from("cases").insert({
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
    const { error: assetError } = await supabase.from("case_assets").insert([
      ...csvAssets,
      { case_id: id, asset_type: "image", storage_path: image_path }
    ]);
    if (assetError) return NextResponse.json({ error: assetError.message }, { status: 400 });

    return NextResponse.json({ ok: true, case_id: id });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Unexpected error." }, { status: 500 });
  }
}
