"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UploadDropzone } from "@/components/UploadDropzone";
import { TranscodeModal } from "@/components/TranscodeModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Toaster, type ToastItem, type ToastType } from "@/components/Toaster";
import { slugify } from "@/lib/format";

type Movie = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  genres: string | null;
  year: number | null;
  durationSec: number | null;
  rating: number | null;
  posterUrl: string | null;
  originalUrl: string | null;
  hlsUrl: string | null;
  hlsStatus: string;
  hlsQualities: string | null;
};

type FormState = {
  title: string;
  slug: string;
  year: string;
  durationMin: string;
  rating: string;
  description: string;
  genres: string;
  posterUrl: string;
  originalUrl: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  year: "",
  durationMin: "",
  rating: "",
  description: "",
  genres: "",
  posterUrl: "",
  originalUrl: "",
};

const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-red-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-400";

export default function AdminPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugDirty, setSlugDirty] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [transcodeFor, setTranscodeFor] = useState<Movie | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Movie | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);

  const addToast = useCallback((type: ToastType, text: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-3), { id, type, text }]);
  }, []);

  const dismissToast = useCallback(
    (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    []
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/movies", { cache: "no-store" });
      const json = await res.json();
      setMovies(json.movies ?? []);
    } catch {
      /* biarkan data lama */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hasProcessing = movies.some((m) => m.hlsStatus === "processing");
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(() => void load(), 4000);
    return () => clearInterval(timer);
  }, [hasProcessing, load]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setTitle(value: string) {
    setForm((f) => ({
      ...f,
      title: value,
      ...(slugDirty ? {} : { slug: slugify(value) }),
    }));
  }

  function setSlug(value: string) {
    setSlugDirty(true);
    set("slug", value);
  }

  function startEdit(m: Movie) {
    setEditingId(m.id);
    setSlugDirty(true);
    setForm({
      title: m.title,
      slug: m.slug,
      year: m.year ? String(m.year) : "",
      durationMin: m.durationSec ? String(Math.round(m.durationSec / 60)) : "",
      rating: m.rating !== null && m.rating !== undefined ? String(m.rating) : "",
      description: m.description ?? "",
      genres: m.genres ?? "",
      posterUrl: m.posterUrl ?? "",
      originalUrl: m.originalUrl ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setSlugDirty(false);
    setForm(EMPTY_FORM);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      const body = {
        title: form.title,
        slug: form.slug,
        year: form.year,
        durationSec: form.durationMin
          ? Math.round(Number(form.durationMin) * 60)
          : "",
        rating: form.rating,
        description: form.description,
        genres: form.genres,
        posterUrl: form.posterUrl,
        originalUrl: form.originalUrl,
      };
      const res = await fetch(
        editingId ? `/api/movies/${editingId}` : "/api/movies",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      addToast(
        "ok",
        editingId
          ? `Perubahan "${json.movie.title}" tersimpan.`
          : `"${json.movie.title}" ditambahkan ke katalog.`
      );
      resetForm();
      await load();
    } catch (err) {
      addToast("err", err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/movies/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      addToast("ok", `"${deleteTarget.title}" dihapus.`);
      if (editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      await load();
    } catch (err) {
      addToast("err", err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Admin Studio</h1>
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          ← Lihat katalog
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* ---- Form ---- */}
        <form
          onSubmit={save}
          className="space-y-3 self-start rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
        >
          <h2 className="font-bold text-zinc-100">
            {editingId ? "Edit Film" : "Tambah Film Baru"}
          </h2>

          <UploadDropzone
            onComplete={(url) => {
              set("originalUrl", url);
              addToast("ok", "Upload selesai — URL video terisi otomatis.");
            }}
          />

          <div>
            <label className={labelCls}>Judul *</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Sintel"
              required
            />
          </div>

          <div>
            <label className={labelCls}>
              Slug{" "}
              {!slugDirty && form.slug && (
                <span className="text-zinc-600">(otomatis dari judul)</span>
              )}
            </label>
            <input
              className={inputCls}
              value={form.slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="sintel"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Tahun</label>
              <input
                className={inputCls}
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                placeholder="2010"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={labelCls}>Durasi (m)</label>
              <input
                className={inputCls}
                value={form.durationMin}
                onChange={(e) => set("durationMin", e.target.value)}
                placeholder="15"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={labelCls}>Rating</label>
              <input
                className={inputCls}
                value={form.rating}
                onChange={(e) => set("rating", e.target.value)}
                placeholder="8.5"
                inputMode="decimal"
                min={0}
                max={10}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Genre (pisah koma)</label>
            <input
              className={inputCls}
              value={form.genres}
              onChange={(e) => set("genres", e.target.value)}
              placeholder="Animation, Adventure"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className={labelCls}>URL Poster</label>
            </div>
            <input
              className={inputCls}
              value={form.posterUrl}
              onChange={(e) => set("posterUrl", e.target.value)}
              placeholder="https://..."
            />
            {form.posterUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={form.posterUrl}
                alt="Pratinjau poster"
                className="mt-2 h-28 w-20 rounded-md object-cover ring-1 ring-zinc-700"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>

          <div>
            <label className={labelCls}>
              URL Video (terisi otomatis setelah upload)
            </label>
            <input
              className={inputCls}
              value={form.originalUrl}
              onChange={(e) => set("originalUrl", e.target.value)}
              placeholder="https://bucket.endpoint/videos/original/..."
            />
          </div>

          <div>
            <label className={labelCls}>Sinopsis</label>
            <textarea
              className={`${inputCls} min-h-[80px] resize-y`}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Ringkasan cerita film..."
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving
                ? "Menyimpan..."
                : editingId
                  ? "Simpan Perubahan"
                  : "Tambahkan Film"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
              >
                Batal
              </button>
            )}
          </div>
        </form>

        {/* ---- Daftar film ---- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-zinc-100">Daftar Film</h2>
            {hasProcessing && (
              <span className="text-xs text-amber-300">
                ⟳ Ada transcode berjalan — status diperbarui otomatis...
              </span>
            )}
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-zinc-500">
              Memuat...
            </p>
          ) : movies.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
              Belum ada film. Tambahkan lewat form di samping.
            </p>
          ) : (
            movies.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row sm:items-center"
              >
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-900 ring-1 ring-zinc-800">
                  {m.posterUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.posterUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-lg opacity-40">
                      🎬
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/movie/${m.slug}`}
                      className="truncate font-semibold text-zinc-100 hover:text-red-400"
                    >
                      {m.title}
                    </Link>
                    {m.rating !== null && m.rating > 0 && (
                      <span className="shrink-0 text-xs font-bold text-amber-400">
                        ★ {m.rating.toFixed(1)}
                      </span>
                    )}
                    <StatusBadge status={m.hlsStatus} />
                  </div>
                  <p className="truncate text-xs text-zinc-500">
                    {[
                      m.year,
                      m.genres,
                      m.hlsStatus === "ready" && safeParse(m.hlsQualities)
                        ? `HLS: ${safeParse(m.hlsQualities)?.join(", ")}`
                        : null,
                      m.hlsStatus === "failed" && "transcode gagal",
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTranscodeFor(m)}
                    disabled={!m.originalUrl && !m.hlsUrl}
                    title={
                      !m.originalUrl && !m.hlsUrl
                        ? "Upload video terlebih dahulu"
                        : undefined
                    }
                    className="rounded-lg bg-zinc-800 px-3 py-1.5 font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Transcode HLS
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    className="rounded-lg bg-zinc-800 px-3 py-1.5 font-medium text-zinc-200 transition hover:bg-zinc-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(m)}
                    className="rounded-lg bg-red-950/70 px-3 py-1.5 font-medium text-red-300 transition hover:bg-red-900"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {transcodeFor && (
        <TranscodeModal
          movie={transcodeFor}
          onClose={() => setTranscodeFor(null)}
          onQueued={() => {
            setTranscodeFor(null);
            addToast(
              "ok",
              "Job transcode dimulai. Status akan diperbarui otomatis."
            );
            void load();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={`Hapus "${deleteTarget.title}"?`}
          description="Film akan dihapus dari katalog. File video di storage IS3 tidak ikut terhapus otomatis."
          busy={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <Toaster toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    none: "bg-zinc-800 text-zinc-400",
    processing: "animate-pulse bg-amber-900/60 text-amber-300",
    ready: "bg-emerald-900/60 text-emerald-300",
    failed: "bg-red-950 text-red-300",
  };
  const label: Record<string, string> = {
    none: "MP4",
    processing: "PROCESSING",
    ready: "HLS READY",
    failed: "GAGAL",
  };
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${map[status] ?? map.none}`}
    >
      {label[status] ?? status.toUpperCase()}
    </span>
  );
}

function safeParse(json: string | null): string[] | null {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) && v.length > 0 ? (v as string[]) : null;
  } catch {
    return null;
  }
}
