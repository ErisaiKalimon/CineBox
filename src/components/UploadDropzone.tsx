"use client";

import { useCallback, useRef, useState } from "react";
import { formatBytes } from "@/lib/format";

type Status = "idle" | "uploading" | "finishing" | "done" | "error" | "aborted";

type Session = {
  uploadId: string | null;
  key: string;
  simple?: boolean;
  url?: string;
};

const CHUNK_SIZE = 16 * 1024 * 1024; // 16 MB per part
const CONCURRENCY = 4;

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as T;
}

export function UploadDropzone({
  onComplete,
}: {
  onComplete: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef<Session | null>(null);
  const cancelledRef = useRef(false);

  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState("");
  const [uploaded, setUploaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [error, setError] = useState("");

  const busy = status === "uploading" || status === "finishing";
  const pct =
    total > 0 ? Math.min(100, Math.round((uploaded / total) * 100)) : 0;

  const handleFile = useCallback(
    async (file: File) => {
      cancelledRef.current = false;
      setError("");
      setFileName(file.name);
      setUploaded(0);
      setTotal(file.size);
      setSpeed(0);
      setStatus("uploading");

      try {
        const init = await postJSON<Session>("/api/upload/init", {
          fileName: file.name,
          contentType: file.type || undefined,
          fileSize: file.size,
        });
        sessionRef.current = init;

        let parts: { partNumber: number; etag: string }[] = [];

        if (init.simple && init.url) {
          setStatus("finishing");
          const res = await fetch(init.url, {
            method: "PUT",
            body: file,
          });
          if (!res.ok) throw new Error(`Upload gagal (${res.status})`);
        } else {
          const { uploadId, key } = init;
          if (!uploadId) throw new Error("Upload ID tidak diterima dari server");
          const totalParts = Math.max(
            1,
            Math.ceil(file.size / CHUNK_SIZE)
          );
          parts = [];
          let uploadedBytes = 0;
          const startedAt = Date.now();
          let nextPart = 1;

          const takeNext = () => (nextPart <= totalParts ? nextPart++ : -1);

          const uploadPart = async (partNumber: number) => {
            const startByte = (partNumber - 1) * CHUNK_SIZE;
            const blob = file.slice(
              startByte,
              Math.min(startByte + CHUNK_SIZE, file.size)
            );
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                if (cancelledRef.current) throw new Error("__CANCELLED__");
                const { url } = await postJSON<{ url: string }>(
                  "/api/upload/part-url",
                  { key, uploadId, partNumber }
                );
                const res = await fetch(url, {
                  method: "PUT",
                  body: blob,
                });
                if (!res.ok)
                  throw new Error(`Part ${partNumber} gagal (${res.status})`);
                const etag = res.headers.get("etag");
                if (!etag)
                  throw new Error(
                    "Header ETag tidak tersedia — pastikan CORS bucket IS3 men-expose header ETag"
                  );
                parts.push({
                  partNumber,
                  etag: etag.replace(/"/g, ""),
                });
                uploadedBytes += blob.size;
                setUploaded(Math.min(uploadedBytes, file.size));
                setSpeed(
                  uploadedBytes / Math.max(0.5, (Date.now() - startedAt) / 1000)
                );
                return;
              } catch (err) {
                if (
                  cancelledRef.current ||
                  attempt === 3 ||
                  (err instanceof Error && err.message.includes("ETag"))
                ) {
                  throw err;
                }
                await new Promise((r) => setTimeout(r, 1200 * attempt));
              }
            }
          };

          const worker = async () => {
            for (;;) {
              if (cancelledRef.current) throw new Error("__CANCELLED__");
              const pn = takeNext();
              if (pn === -1) return;
              await uploadPart(pn);
            }
          };

          await Promise.all(
            Array.from(
              { length: Math.min(CONCURRENCY, totalParts) },
              () => worker()
            )
          );

          setStatus("finishing");
          await postJSON("/api/upload/complete", {
            key,
            uploadId,
            parts: parts.sort((a, b) => a.partNumber - b.partNumber),
          });
        }

        const finalUrl = await resolvePublicUrl(init.key);
        setStatus("done");
        onComplete(finalUrl);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("__CANCELLED__") || cancelledRef.current) {
          setStatus("aborted");
          const s = sessionRef.current;
          if (s?.uploadId) {
            void postJSON("/api/upload/abort", {
              key: s.key,
              uploadId: s.uploadId,
            }).catch(() => undefined);
          }
        } else {
          setError(message);
          setStatus("error");
        }
      }
    },
    [onComplete]
  );

  function cancel() {
    cancelledRef.current = true;
    setStatus("aborted");
  }

  function reset() {
    setStatus("idle");
    setFileName("");
    setUploaded(0);
    setTotal(0);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 p-4">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      {status === "idle" && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1 rounded-md py-6 text-center transition hover:bg-zinc-800/60"
        >
          <span className="text-2xl">⬆</span>
          <span className="text-sm font-medium text-zinc-200">
            Pilih file video untuk diunggah ke IS3
          </span>
          <span className="text-xs text-zinc-500">
            MP4, MKV, MOV, WEBM • chunk 16MB paralel, tahan koneksi putus
          </span>
        </button>
      )}

      {(busy || status === "done" || status === "error" || status === "aborted") && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium text-zinc-200">{fileName}</span>
            <span className="shrink-0 text-zinc-400">
              {status === "done"
                ? "Selesai ✓"
                : status === "finishing"
                  ? "Menyelesaikan..."
                  : `${pct}%`}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all ${
                status === "error"
                  ? "bg-red-600"
                  : status === "done"
                    ? "bg-emerald-500"
                    : "bg-red-500"
              }`}
              style={{
                width:
                  status === "done"
                    ? "100%"
                    : status === "finishing"
                      ? "99%"
                      : `${pct}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>
              {formatBytes(uploaded)} / {formatBytes(total)}
              {busy && speed > 0 ? ` • ${formatBytes(speed)}/s` : ""}
            </span>
            {busy ? (
              <button
                type="button"
                onClick={cancel}
                className="font-medium text-red-400 hover:text-red-300"
              >
                Batalkan
              </button>
            ) : (
              <button
                type="button"
                onClick={reset}
                className="font-medium text-zinc-400 hover:text-white"
              >
                Upload lain
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-md bg-red-950/60 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

async function resolvePublicUrl(key: string): Promise<string> {
  const res = await fetch("/api/upload/public-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Gagal mendapatkan URL publik");
  return json.url as string;
}
