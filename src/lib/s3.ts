import { S3Client } from "@aws-sdk/client-s3";

const REQUIRED_ENVS = [
  "IS3_ENDPOINT_URL",
  "IS3_REGION",
  "IS3_ACCESS_KEY_ID",
  "IS3_SECRET_ACCESS_KEY",
  "IS3_BUCKET",
] as const;

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("IS3 Storage belum dikonfigurasi. Isi variabel IS3_* di file .env");
    this.name = "StorageNotConfiguredError";
  }
}

export function isStorageConfigured(): boolean {
  return REQUIRED_ENVS.every((k) => !!process.env[k]);
}

export function normalizeBaseUrl(url: string | undefined): string {
  const trimmed = (url ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

let cachedClient: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!isStorageConfigured()) throw new StorageNotConfiguredError();
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: process.env.IS3_REGION,
    endpoint: normalizeBaseUrl(process.env.IS3_ENDPOINT_URL),
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.IS3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.IS3_SECRET_ACCESS_KEY!,
    },
  });
  return cachedClient;
}

export function publicObjectUrl(key: string): string {
  const base = normalizeBaseUrl(process.env.IS3_PUBLIC_BASE_URL);
  if (!base) {
    throw new Error(
      "IS3_PUBLIC_BASE_URL belum diisi — URL publik video tidak bisa dibentuk"
    );
  }
  return `${base}/${key.replace(/^\/+/, "")}`;
}

export function sanitizeFileName(name: string): string {
  const extMatch = name.match(/\.[A-Za-z0-9]+$/);
  const ext = extMatch ? extMatch[0].toLowerCase() : "";
  const stem = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${stem || "video"}${ext}`;
}

export const VIDEO_EXTENSIONS = [
  ".mp4",
  ".m4v",
  ".webm",
  ".mov",
  ".mkv",
  ".avi",
  ".ts",
];
