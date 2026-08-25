import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { QUALITY_OPTIONS, isQualityOption } from "@/lib/format";
import { isTranscoding, startTranscode } from "@/lib/ffmpeg";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const movie = await db.movie.findUnique({ where: { id } });
  if (!movie) {
    return Response.json({ error: "Film tidak ditemukan" }, { status: 404 });
  }
  if (!movie.originalUrl && !movie.hlsUrl) {
    return Response.json(
      { error: "Film belum memiliki file video. Upload dulu di halaman admin." },
      { status: 400 }
    );
  }
  if (movie.hlsStatus === "processing" || isTranscoding(id)) {
    return Response.json(
      { error: "Transcode untuk film ini sedang berjalan" },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => null);
  const rawQualities: unknown = body?.qualities;
  const candidates: unknown[] = Array.isArray(rawQualities)
    ? rawQualities
    : [];
  const qualities = candidates.filter(isQualityOption);
  if (qualities.length === 0) {
    return Response.json(
      {
        error: `Pilih minimal satu resolusi yang valid (${QUALITY_OPTIONS.join(", ")})`,
      },
      { status: 400 }
    );
  }

  await startTranscode(id, qualities);
  return Response.json({ ok: true, qualities }, { status: 202 });
}

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
  return Response.json({
    hlsStatus: movie.hlsStatus,
    hlsQualities: movie.hlsQualities,
    latestJob: movie.jobs[0] ?? null,
    processing: isTranscoding(id),
  });
}
