import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { VideoPlayer } from "@/components/VideoPlayer";
import { MovieCard } from "@/components/MovieCard";
import { ShareButton } from "@/components/ShareButton";
import { formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

type DetailProps = { params: Promise<{ slug: string }> };

async function getMovie(slug: string) {
  return db.movie.findUnique({ where: { slug } });
}

export async function generateMetadata({
  params,
}: DetailProps): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getMovie(slug);
  return { title: movie ? movie.title : "Film tidak ditemukan" };
}

export default async function MovieDetailPage({ params }: DetailProps) {
  const { slug } = await params;
  const movie = await getMovie(slug);
  if (!movie) notFound();

  const hlsReady =
    movie.hlsStatus === "ready" && !!movie.hlsUrl ? movie.hlsUrl : null;
  const genreList = movie.genres
    ? movie.genres.split(",").map((g) => g.trim())
    : [];

  const related = genreList.length
    ? await db.movie.findMany({
        where: {
          id: { not: movie.id },
          OR: genreList.map((g) => ({ genres: { contains: g } })),
        },
        take: 6,
      })
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 transition hover:text-white"
      >
        ← Kembali ke katalog
      </Link>

      <VideoPlayer
        slug={movie.slug}
        hlsUrl={hlsReady}
        mp4Url={movie.originalUrl}
        poster={movie.posterUrl}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {hlsReady && (
            <span className="rounded bg-emerald-900/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
              HLS Multi-Kualitas
            </span>
          )}
          {!hlsReady && movie.originalUrl && (
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
              MP4 Progresif
            </span>
          )}
          {movie.hlsStatus === "processing" && (
            <span className="animate-pulse rounded bg-amber-900/60 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
              Sedang ditranscode...
            </span>
          )}
        </div>

        <h1 className="text-3xl font-black text-white">{movie.title}</h1>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-400">
          {movie.rating !== null && movie.rating > 0 && (
            <span className="font-bold text-amber-400">
              ★ {movie.rating.toFixed(1)}
              <span className="text-zinc-600">/10</span>
            </span>
          )}
          {movie.year && <span>{movie.year}</span>}
          {movie.durationSec && movie.durationSec > 0 && (
            <span>{formatDuration(movie.durationSec)}</span>
          )}
          {genreList.map((g) => (
            <Link
              key={g}
              href={`/?genre=${encodeURIComponent(g)}`}
              className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-300 transition hover:border-red-500 hover:text-red-400"
            >
              {g}
            </Link>
          ))}
        </div>

        {movie.description && (
          <p className="max-w-3xl leading-relaxed text-zinc-300">
            {movie.description}
          </p>
        )}

        <ShareButton title={movie.title} />
      </div>

      {related.length > 0 && (
        <section className="space-y-4 border-t border-zinc-800/80 pt-6">
          <h2 className="text-lg font-bold text-zinc-100">Film Serupa</h2>
          <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-6">
            {related.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
