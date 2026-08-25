export default function MovieDetailLoading() {
  return (
    <div
      className="mx-auto max-w-4xl space-y-6"
      aria-busy="true"
      aria-label="Memuat film"
    >
      <div className="h-4 w-32 animate-pulse rounded bg-zinc-900" />

      <div className="aspect-video w-full animate-pulse rounded-xl bg-zinc-900 ring-1 ring-zinc-800" />

      <div className="space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-900/80" />
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-zinc-900" />
        <div className="flex gap-2">
          <div className="h-7 w-14 animate-pulse rounded-full bg-zinc-900" />
          <div className="h-7 w-16 animate-pulse rounded-full bg-zinc-900" />
        </div>
        <div className="space-y-2 pt-1">
          <div className="h-3.5 w-full animate-pulse rounded bg-zinc-900/80" />
          <div className="h-3.5 w-11/12 animate-pulse rounded bg-zinc-900/70" />
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-zinc-900/60" />
        </div>
      </div>
    </div>
  );
}
