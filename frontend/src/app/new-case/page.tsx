"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createCase,
  getRandomHamImage,
  getHamStatus,
  type HamImageResponse,
  type HamStatus,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";

export default function NewCasePage() {
  const router = useRouter();
  const [wearablesFile, setWearablesFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [useSampleCsv, setUseSampleCsv] = useState(false);
  const [hamStatus, setHamStatus] = useState<HamStatus | null>(null);
  const [selectedHamImage, setSelectedHamImage] = useState<HamImageResponse | null>(null);
  const [labelFilter, setLabelFilter] = useState("mel");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHamStatus = async () => {
    try {
      const s = await getHamStatus();
      setHamStatus(s);
    } catch (e) {
      setHamStatus({ index_exists: false, error: String(e), dataset_dir: null, counts_by_class: {} });
    }
  };

  useEffect(() => {
    loadHamStatus();
  }, []);

  const pickRandomHamImage = async () => {
    setError(null);
    try {
      const res = await getRandomHamImage(
        labelFilter === "mel" ? { label: "mel" } : { label: "non-mel" }
      );
      setSelectedHamImage(res);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const formData: Parameters<typeof createCase>[0] = {};
      if (useSampleCsv) {
        const sampleRes = await fetch("/sample_cases/patient_a_high_priority.csv");
        const csvText = await sampleRes.text();
        formData.wearables_csv = new File([csvText], "patient_a.csv", { type: "text/csv" });
      } else if (wearablesFile) {
        formData.wearables_csv = wearablesFile;
      }
      if (imageFile) {
        formData.image = imageFile;
      } else if (selectedHamImage) {
        formData.dataset_image_id = selectedHamImage.image_id;
      }
      const { case_id } = await createCase(formData);
      router.push(`/cases/${case_id}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold text-cyan-400">Start a new analysis</h1>
        <p className="mt-2 text-slate-400">Upload health data (optional) and choose a skin lesion image to analyze.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* Wearables CSV */}
          <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
            <h2 className="text-lg font-semibold text-slate-200">
              Health data from wearables <span className="text-slate-500 font-normal">(Optional)</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Heart rate, oxygen levels, and activity from wearables. Skip for image-only analysis.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={useSampleCsv}
                  onChange={(e) => setUseSampleCsv(e.target.checked)}
                  className="rounded"
                />
                <span>Use sample patient data</span>
              </label>
            </div>
            {!useSampleCsv && (
              <div className="mt-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setWearablesFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-400 file:mr-4 file:rounded file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-white"
                />
              </div>
            )}
          </section>

          {/* Pick Dataset Image */}
          <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
            <h2 className="text-lg font-semibold text-slate-200">
              Choose a skin lesion image <span className="text-amber-400 font-normal">(Required)</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pick from our library of skin images or upload your own below.
            </p>
            {hamStatus && (
              <div className="mt-4 rounded-md bg-slate-800 p-4 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">Image library status</span>
                  <button
                    type="button"
                    onClick={loadHamStatus}
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    Refresh
                  </button>
                </div>
                {hamStatus.index_exists ? (
                  <p className="text-green-400">
                    Ready. {hamStatus.total} images available.
                  </p>
                ) : (
                  <p className="text-amber-400">{hamStatus.error}</p>
                )}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-4">
              <div>
                <label className="block text-xs text-slate-500">Image type</label>
                <select
                  value={labelFilter}
                  onChange={(e) => setLabelFilter(e.target.value)}
                  className="mt-1 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
                >
                  <option value="mel">Melanoma (suspicious)</option>
                  <option value="non-mel">Other (benign)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={pickRandomHamImage}
                  className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
                >
                  Pick random image
                </button>
              </div>
            </div>
            {selectedHamImage && (
              <div className="mt-4">
                <p className="text-sm text-slate-400">
                  Selected: {selectedHamImage.image_id} (Type: {selectedHamImage.dx})
                </p>
                <img
                  src={`data:${selectedHamImage.mime_type};base64,${selectedHamImage.image_base64}`}
                  alt="Selected lesion"
                  className="mt-2 max-h-48 rounded-lg border border-slate-600 object-contain"
                />
              </div>
            )}
          </section>

          {/* Or upload image */}
          <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
            <h2 className="text-lg font-semibold text-slate-200">
              Or upload your own image <span className="text-amber-400 font-normal">(Required)</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Provide either an image from the library above or upload your own skin lesion photo.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setImageFile(e.target.files?.[0] ?? null);
                setSelectedHamImage(null);
              }}
              className="mt-4 block w-full text-sm text-slate-400 file:mr-4 file:rounded file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-white"
            />
          </section>

          {error && (
            <div className="rounded-lg bg-red-900/30 p-4 text-red-300">
              {getErrorMessage(error)}
            </div>
          )}

          {!imageFile && !selectedHamImage && (
            <p className="text-sm text-slate-500">
              Upload an image or pick one from the library above to continue.
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (!imageFile && !selectedHamImage)}
            className="rounded-lg bg-cyan-600 px-8 py-3 font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-500 disabled:hover:bg-cyan-600"
          >
            {loading ? "Creating..." : "Start analysis"}
          </button>
        </form>
      </div>
    </main>
  );
}
