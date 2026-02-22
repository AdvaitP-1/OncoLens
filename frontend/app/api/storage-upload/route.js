import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const storagePath = formData.get("path");

    if (!file || !storagePath) {
      return NextResponse.json({ error: "Missing file or path." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await admin.storage
      .from("case-assets")
      .upload(storagePath, buffer, {
        contentType: file.type || "text/csv",
        upsert: true,
      });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ path: storagePath });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Unexpected error." }, { status: 500 });
  }
}
