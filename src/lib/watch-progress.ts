const keyFor = (slug: string) => `cb-pos-${slug}`;

export function loadProgress(slug: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(slug));
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function saveProgress(slug: string, seconds: number): void {
  if (typeof window === "undefined" || !(seconds > 1)) return;
  try {
    window.localStorage.setItem(keyFor(slug), String(Math.floor(seconds)));
  } catch {
    /* storage penuh/blocked — abaikan */
  }
}

export function clearProgress(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(slug));
  } catch {
    /* abaikan */
  }
}

export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
