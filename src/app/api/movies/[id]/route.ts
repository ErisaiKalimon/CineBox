import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { normalizeGenres, parseRating, slugify } from "@/lib/format";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const movie = await db.movie.findUnique({
    where: { id },
    include: {
      jobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!movie) {
    return Response.json({ error: "Film tidak ditemukan" }, { status: 404 });
  }
  return Response.json({ movie });
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await db.movie.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Film tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) {
    data.title = body.title.trim();
  }
  if (body.slug !== undefined && typeof body.slug === "string" && body.slug.trim()) {
    const newSlug = slugify(body.slug);
    if (newSlug && newSlug !== existing.slug) {
      const clash = await db.movie.findUnique({ where: { slug: newSlug } });
      if (clash) {
        return Response.json(
          { error: "Slug sudah dipakai film lain" },
          { status: 409 }
        );
      }
      data.slug = newSlug;
    }
  }
  if ("description" in body) data.description = strOrNull(body.description);
  if ("genres" in body) data.genres = normalizeGenres(body.genres);
  if ("posterUrl" in body) data.posterUrl = strOrNull(body.posterUrl);
  if ("originalUrl" in body) data.originalUrl = strOrNull(body.originalUrl);
  if ("year" in body) data.year = intOrNull(body.year);
  if ("durationSec" in body) data.durationSec = intOrNull(body.durationSec);
  if ("rating" in body) data.rating = parseRating(body.rating);

  const movie = await db.movie.update({ where: { id }, data });
  return Response.json({ movie });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await db.movie.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Film tidak ditemukan" }, { status: 404 });
  }
  await db.movie.delete({ where: { id } });
  return Response.json({ ok: true });
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
