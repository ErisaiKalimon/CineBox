import type { NextRequest } from "next/server";
import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getS3Client, isStorageConfigured } from "@/lib/s3";

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
  if (!key || !uploadId) {
    return Response.json({ error: "Parameter tidak valid" }, { status: 400 });
  }

  const s3 = getS3Client();
  try {
    await s3.send(
      new AbortMultipartUploadCommand({
        Bucket: process.env.IS3_BUCKET!,
        Key: key,
        UploadId: uploadId,
      })
    );
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Gagal membatalkan upload",
      },
      { status: 502 }
    );
  }
}
