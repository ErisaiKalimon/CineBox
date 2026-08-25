import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="text-6xl">🎞️</span>
      <h1 className="text-4xl font-black tracking-tight text-zinc-100">404</h1>
      <p className="text-base font-medium text-zinc-300">
        Scene yang Anda cari tidak ditemukan.
      </p>
      <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
        Film mungkin telah dihapus atau alamatnya salah. Silakan jelajahi
        katalog kami.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-500"
      >
        ← Kembali ke Katalog
      </Link>
    </div>
  );
}
