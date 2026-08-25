import type { NextRequest } from "next/server";
import { isStorageConfigured, publicObjectUrl } from "@/lib/s3";

export async function POST(request: NextRequest) {
  if (!isStorageConfigured()) {
    return Response.json(
      { error: "IS3 Storage belum dikonfigurasi." },
      { status: 501 }
    );
  }

  const body = await request.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key : "";
  if (!key || !key.startsWith("videos/")) {
    return Response.json({ error: "Key tidak valid" }, { status: 400 });
  }

  try {
    return Response.json({ url: publicObjectUrl(key) });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Gagal membentuk URL" },
      { status: 500 }
    );
  }
}
