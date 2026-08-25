import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { normalizeGenres, parseRating, slugify } from "@/lib/format";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const genre = sp.get("genre")?.trim();

  const where: Record<string, unknown> = {};
  if (q) where.title = { contains: q };
  if (genre) where.genres = { contains: genre };

  const movies = await db.movie.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ movies });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return Response.json({ error: "Judul wajib diisi" }, { status: 400 });
  }

  const baseSlug =
    typeof body?.slug === "string" && body.slug.trim()
      ? slugify(body.slug)
      : slugify(title);
  let slug = baseSlug || `film-${Date.now()}`;
  let counter = 2;
  while (await db.movie.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const movie = await db.movie.create({
    data: {
      title,
      slug,
      description: strOrNull(body.description),
      genres: normalizeGenres(body.genres),
      year: intOrNull(body.year),
      durationSec: intOrNull(body.durationSec),
      rating: parseRating(body.rating),
      posterUrl: strOrNull(body.posterUrl),
      originalUrl: strOrNull(body.originalUrl),
    },
  });
  return Response.json({ movie }, { status: 201 });
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function intOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim()) {
    const n = Number.parseInt(v, 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
