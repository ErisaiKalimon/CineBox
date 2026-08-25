import type { NextRequest } from "next/server";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import {
  getS3Client,
  isStorageConfigured,
  publicObjectUrl,
} from "@/lib/s3";

export async function POST(request: NextRequest) {
  if (!isStorageConfigured()) {
    return Response.json(
      { error: "IS3 Storage belum dikonfigurasi." },
      { status: 501 }
    );
  }

  const body = await request.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key : "";
  const uploadId = typeof body?.uploadId === "string" ? body.uploadId : "";
  const rawParts = Array.isArray(body?.parts) ? body.parts : [];

  const parts = rawParts
    .map((p: { partNumber?: unknown; etag?: unknown }) => ({
      partNumber: Number(p.partNumber),
      etag: typeof p.etag === "string" ? p.etag.replace(/"/g, "") : "",
    }))
    .filter(
      (p: { partNumber: number; etag: string }) =>
        Number.isInteger(p.partNumber) &&
        p.partNumber >= 1 &&
        p.partNumber <= 10000 &&
        p.etag
    );

  if (!key || !uploadId || parts.length === 0) {
    return Response.json({ error: "Parameter tidak valid" }, { status: 400 });
  }
  parts.sort(
    (a: { partNumber: number }, b: { partNumber: number }) =>
      a.partNumber - b.partNumber
  );

  const s3 = getS3Client();
  try {
    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: process.env.IS3_BUCKET!,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map((p: { partNumber: number; etag: string }) => ({
            PartNumber: p.partNumber,
            ETag: p.etag,
          })),
        },
      })
    );
    return Response.json({ url: publicObjectUrl(key), key });
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal menyelesaikan upload",
      },
      { status: 502 }
    );
  }
}
