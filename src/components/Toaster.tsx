"use client";

import { useEffect } from "react";

export type ToastType = "ok" | "err" | "info";
export type ToastItem = { id: number; type: ToastType; text: string };

export function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), 4000);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  const palette =
    item.type === "ok"
      ? "border-emerald-800 bg-emerald-950/95 text-emerald-200"
      : item.type === "err"
        ? "border-red-800 bg-red-950/95 text-red-200"
        : "border-zinc-700 bg-zinc-900/95 text-zinc-200";

  const icon = item.type === "ok" ? "✓" : item.type === "err" ? "✕" : "ℹ";

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur animate-toast-in ${palette}`}
    >
      <span className="mt-0.5 font-bold">{icon}</span>
      <p className="flex-1 leading-snug">{item.text}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Tutup notifikasi"
        className="mt-0.5 shrink-0 opacity-60 transition hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
