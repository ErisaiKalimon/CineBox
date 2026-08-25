import Link from "next/link";
import { formatDuration } from "@/lib/format";

type MovieCardProps = {
  movie: {
    title: string;
    slug: string;
    posterUrl: string | null;
    year: number | null;
    genres: string | null;
    durationSec: number | null;
    rating?: number | null;
    hlsStatus: string;
  };
};

export function MovieCard({ movie }: MovieCardProps) {
  const meta = [movie.year, formatDuration(movie.durationSec)]
    .filter((v) => v && v !== "-")
    .join(" • ");

  return (
    <article className="group">
      <Link
        href={`/movie/${movie.slug}`}
        className="block overflow-hidden rounded-lg ring-1 ring-zinc-800 transition focus:outline-none group-hover:ring-red-500/70"
      >
        <div className="relative aspect-[2/3] bg-zinc-900">
          {movie.posterUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={movie.posterUrl}
              alt={`Poster ${movie.title}`}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl opacity-40">
              🎬
            </div>
          )}
          {movie.hlsStatus === "ready" && (
            <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
              HLS
            </span>
          )}
          {movie.rating !== null && movie.rating !== undefined && movie.rating > 0 && (
            <span className="absolute right-2 top-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 backdrop-blur">
              ★ {movie.rating.toFixed(1)}
            </span>
          )}
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/90 via-transparent to-transparent p-3 opacity-0 transition duration-300 group-hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
              ▶ Putar
            </span>
          </div>
        </div>
      </Link>
      <div className="mt-2">
        <Link
          href={`/movie/${movie.slug}`}
          className="block truncate text-sm font-medium text-zinc-100 transition hover:text-red-400"
        >
          {movie.title}
        </Link>
        {meta && <p className="text-xs text-zinc-500">{meta}</p>}
      </div>
    </article>
  );
}
