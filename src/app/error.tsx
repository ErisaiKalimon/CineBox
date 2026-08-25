"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="text-5xl">🎬</span>
      <h1 className="text-xl font-bold text-zinc-100">
        Terjadi gangguan pada proyektor
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-zinc-400">
        Maaf, terjadi kesalahan saat memuat halaman ini. Coba lagi, atau kembali
        ke katalog.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-zinc-600">Ref: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          Coba Lagi
        </button>
        <Link
          href="/"
          className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
        >
          Katalog Film
        </Link>
      </div>
    </div>
  );
}
