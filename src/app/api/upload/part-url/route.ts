import type { NextRequest } from "next/server";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
  const partNumber = Number(body?.partNumber);
  if (!key || !uploadId || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
    return Response.json({ error: "Parameter tidak valid" }, { status: 400 });
  }

  const s3 = getS3Client();
  const url = await getSignedUrl(
    s3,
    new UploadPartCommand({
      Bucket: process.env.IS3_BUCKET!,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    }),
    { expiresIn: 6 * 3600 }
  );
  return Response.json({ url });
}
