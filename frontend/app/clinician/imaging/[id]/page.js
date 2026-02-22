"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "../../../../components/Topbar";
import { useRequireAuth } from "../../../../lib/auth";
import { supabase } from "../../../../lib/supabaseClient";
import { fmtNumber } from "../../../../lib/format";

export default function ImagingPage() {
  const { id } = useParams();
  const { loading } = useRequireAuth("clinician");
  const [imageUrl, setImageUrl] = useState("");
  const [grid, setGrid] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: asset } = await supabase
        .from("case_assets")
        .select("*")
        .eq("case_id", id)
        .eq("asset_type", "image")
        .single();
      if (asset?.storage_path) {
        const { data } = await supabase.storage.from("case-assets").createSignedUrl(asset.storage_path, 3600);
        setImageUrl(data?.signedUrl || "");
      }
      const { data: caseRow } = await supabase.from("cases").select("scores").eq("id", id).single();
      setGrid(caseRow?.scores?.evidence_grid || []);
    }
    if (id) load();
  }, [id]);

  if (loading) return null;
  return (
    <div>
      <Topbar title={`Imaging View: ${id.slice(0, 8)}`} subtitle="Prototype viewer + evidence heatmap preview." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          {imageUrl ? <img src={imageUrl} alt="Case imaging asset" className="max-h-[500px] w-full rounded object-contain" /> : <p>No image found.</p>}
        </div>
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold">Heatmap Grid (placeholder)</p>
          <div className="grid grid-cols-8 gap-1">
            {(grid || []).flat().map((value, idx) => (
              <div
                key={idx}
                className="h-8 rounded"
                style={{ backgroundColor: `rgba(15,118,110,${Math.min(1, Number(value) + 0.1)})` }}
                title={fmtNumber(value, 3)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
