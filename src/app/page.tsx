import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { MovieCard } from "@/components/MovieCard";
import { SearchBar } from "@/components/SearchBar";
import { GenreFilter } from "@/components/GenreFilter";
import { SortDropdown } from "@/components/SortDropdown";
import { HeroCarousel } from "@/components/HeroCarousel";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function resolveOrderBy(sort: string): Prisma.MovieOrderByWithRelationInput {
  switch (sort) {
    case "tahun":
      return { year: "desc" };
    case "judul":
      return { title: "asc" };
    default:
      return { createdAt: "desc" };
  }
}

export default async function Home({ searchParams }: HomeProps) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const genre = typeof sp.genre === "string" ? sp.genre.trim() : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "terbaru";

  const where: Record<string, unknown> = {};
  if (q) where.title = { contains: q };
  if (genre) where.genres = { contains: genre };

  const [movies, allMovies] = await Promise.all([
    db.movie.findMany({
      where,
      orderBy: resolveOrderBy(sort),
    }),
    db.movie.findMany({ select: { genres: true } }),
  ]);

  const genres = Array.from(
    new Set(
      allMovies.flatMap((m) =>
        m.genres ? m.genres.split(",").map((g) => g.trim()) : []
      )
    )
  )
    .filter(Boolean)
    .sort();

  const isBrowsing = !q && !genre;
  const featuredCount = isBrowsing ? Math.min(movies.length, 5) : 0;
  const featured = isBrowsing ? movies.slice(0, featuredCount) : [];
  const gridMovies = isBrowsing ? movies.slice(featuredCount) : movies;

  return (
    <div className="space-y-8">
      {isBrowsing && featured.length > 0 && <HeroCarousel slides={featured} />}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-zinc-100">
            {q
              ? `Hasil pencarian "${q}"`
              : genre
                ? `Kategori: ${genre}`
                : "Katalog Film"}
            <span className="ml-2 text-sm font-normal text-zinc-500">
              {movies.length} film
            </span>
          </h2>
          <div className="flex items-center gap-3">
            <SortDropdown active={sort} />
            <SearchBar initialQ={q} />
          </div>
        </div>

        <GenreFilter genres={genres} active={genre} />

        {movies.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {gridMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center">
      <p className="text-3xl">🍿</p>
      <p className="mt-3 font-medium text-zinc-300">
        Tidak ada film yang cocok.
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        Tambahkan film baru lewat{" "}
        <Link href="/admin" className="text-red-400 hover:underline">
          halaman Admin
        </Link>
        .
      </p>
    </div>
  );
}
