export default function HomeLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Memuat katalog">
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900/60 ring-1 ring-zinc-800">
        <div className="h-[280px] animate-pulse sm:h-[340px]" />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-44 animate-pulse rounded-lg bg-zinc-900" />
          <div className="h-9 w-full max-w-md animate-pulse rounded-full bg-zinc-900" />
        </div>

        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-20 animate-pulse rounded-full bg-zinc-900"
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[2/3] animate-pulse rounded-lg bg-zinc-900" />
              <div className="mt-2 h-3.5 w-3/4 animate-pulse rounded bg-zinc-900" />
              <div className="mt-1.5 h-3 w-1/3 animate-pulse rounded bg-zinc-900/70" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
