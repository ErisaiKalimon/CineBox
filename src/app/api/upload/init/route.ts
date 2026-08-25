import type { NextRequest } from "next/server";
import {
  CreateMultipartUploadCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  getS3Client,
  isStorageConfigured,
  sanitizeFileName,
  VIDEO_EXTENSIONS,
} from "@/lib/s3";

export async function POST(request: NextRequest) {
  if (!isStorageConfigured()) {
    return Response.json(
      {
        error:
          "IS3 Storage belum dikonfigurasi. Isi variabel IS3_* di file .env",
      },
      { status: 501 }
    );
  }

  const body = await request.json().catch(() => null);
  const fileName = typeof body?.fileName === "string" ? body.fileName : "";
  const ext = fileName.match(/\.[A-Za-z0-9]+$/)?.[0]?.toLowerCase() ?? "";
  if (!fileName || !VIDEO_EXTENSIONS.includes(ext)) {
    return Response.json(
      {
        error: `Tipe file tidak didukung. Gunakan: ${VIDEO_EXTENSIONS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const contentType =
    typeof body?.contentType === "string" && body.contentType
      ? body.contentType
      : "video/mp4";

  const s3 = getS3Client();
  const bucket = process.env.IS3_BUCKET!;
  const key = `videos/original/${Date.now()}-${sanitizeFileName(fileName)}`;

  try {
    if (Number(body?.fileSize) <= 64 * 1024 * 1024) {
      // File kecil: satu kali PUT langsung via presigned URL
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
        { expiresIn: 3600 }
      );
      return Response.json({ uploadId: null, key, simple: true, url });
    }

    const result = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      })
    );
    return Response.json({ uploadId: result.UploadId!, key });
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal menghubungi IS3 Storage",
      },
      { status: 502 }
    );
  }
}
