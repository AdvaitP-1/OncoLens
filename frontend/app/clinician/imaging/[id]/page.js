"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "../../../../components/Topbar";
import { useRequireAuth } from "../../../../lib/auth";
import { supabase } from "../../../../lib/supabaseClient";
import { fmtNumber, normalizeCase } from "../../../../lib/format";

export default function ImagingPage() {
  const { id } = useParams();
  const { loading } = useRequireAuth();
  const [imageUrl, setImageUrl] = useState("");
  const [evidenceGrid, setEvidenceGrid] = useState([]);
  const [imageQuality, setImageQuality] = useState(undefined);

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
      const { data: caseRow } = await supabase.from("cases").select("*").eq("id", id).single();
      const normalized = normalizeCase(caseRow);
      setEvidenceGrid(normalized?.scores?.evidence_grid || []);
      setImageQuality(normalized?.scores?.image_quality);
    }
    if (id) load();
  }, [id]);

  if (loading) return null;
  const flatGrid = Array.isArray(evidenceGrid) ? evidenceGrid.flat() : [];
  return (
    <div>
      <Topbar title={`Imaging View: ${id.slice(0, 8)}`} subtitle="Prototype viewer + evidence heatmap preview." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          {imageUrl ? <img src={imageUrl} alt="Case imaging asset" className="max-h-[500px] w-full rounded object-contain" /> : <p>No image found.</p>}
        </div>
        <div className="card p-4 space-y-4">
          {typeof imageQuality === "number" && (
            <div>
              <p className="mb-2 text-sm font-semibold">Image Quality</p>
              <p className="text-2xl font-bold text-slate-800">{fmtNumber(imageQuality, 4)}</p>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold">Heatmap Grid</p>
            {flatGrid.length > 0 ? (
              <div className="grid gap-0.5 max-w-full overflow-auto" style={{ gridTemplateColumns: "repeat(32, minmax(0, 1fr))" }}>
                {flatGrid.map((value, idx) => (
                  <div
                    key={idx}
                    className="h-3 w-3 min-w-[6px] rounded-sm"
                    style={{ backgroundColor: `rgba(15,118,110,${Math.min(1, Number(value) + 0.1)})` }}
                    title={fmtNumber(value, 3)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No heatmap data. Run analysis to generate.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
