export const QUALITY_OPTIONS = ["360p", "480p", "720p", "1080p"] as const;

export type QualityOption = (typeof QUALITY_OPTIONS)[number];

export function isQualityOption(v: unknown): v is QualityOption {
  return (
    typeof v === "string" && (QUALITY_OPTIONS as readonly string[]).includes(v)
  );
}

export function parseRating(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(10, Math.max(0, Math.round(n * 10) / 10));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

export function normalizeGenres(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const parts = raw
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function formatDuration(durationSec: number | null | undefined): string {
  if (!durationSec || durationSec <= 0) return "-";
  const h = Math.floor(durationSec / 3600);
  const m = Math.round((durationSec % 3600) / 60);
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}
