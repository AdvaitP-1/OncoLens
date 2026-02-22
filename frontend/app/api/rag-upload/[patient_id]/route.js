import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    const { patient_id } = await params;
    const formData = await request.formData();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
    const res = await fetch(`${backendUrl}/patients/${patient_id}/documents`, {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) return NextResponse.json({ error: json.detail || "Upload failed." }, { status: res.status });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: err.message || "Unexpected error." }, { status: 500 });
  }
}
