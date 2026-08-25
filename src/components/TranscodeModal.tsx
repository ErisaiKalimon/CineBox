"use client";

import { useMemo, useState } from "react";
import { QUALITY_OPTIONS } from "@/lib/format";

type TranscodeModalProps = {
  movie: { id: string; title: string; hlsQualities: string | null };
  onClose: () => void;
  onQueued: () => void;
};

export function TranscodeModal({
  movie,
  onClose,
  onQueued,
}: TranscodeModalProps) {
  const initial = useMemo<string[]>(() => {
    try {
      const parsed: unknown = JSON.parse(movie.hlsQualities ?? "[]");
      if (Array.isArray(parsed)) {
        return parsed.filter((q): q is string =>
          (QUALITY_OPTIONS as readonly string[]).includes(String(q))
        );
      }
    } catch {
      /* abaikan */
    }
    return ["720p"];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggle(q: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0 || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/movies/${movie.id}/transcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qualities: Array.from(selected) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onQueued();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-zinc-100">
          Transcode ke HLS — {movie.title}
        </h3>
        <p className="mt-1 text-xs text-zinc-400">
          Pilih resolusi yang ingin dibuat. Proses berjalan di server dengan
          FFmpeg; status akan tampil otomatis di daftar film.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {QUALITY_OPTIONS.map((q) => (
            <label
              key={q}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                selected.has(q)
                  ? "border-red-500 bg-red-950/40 text-white"
                  : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(q)}
                onChange={() => toggle(q)}
                className="h-4 w-4 accent-red-600"
              />
              {q}
            </label>
          ))}
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-red-950/60 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={selected.size === 0 || submitting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Memulai..." : "Mulai Transcode"}
          </button>
        </div>
      </div>
    </div>
  );
}
