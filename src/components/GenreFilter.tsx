"use client";

import { usePathname, useRouter } from "next/navigation";

type GenreFilterProps = {
  genres: string[];
  active: string;
};

export function GenreFilter({ genres, active }: GenreFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  function toggle(genre: string) {
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (genre === active) sp.delete("genre");
    else sp.set("genre", genre);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (genres.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => {
          const sp = new URLSearchParams(
            typeof window !== "undefined" ? window.location.search : ""
          );
          sp.delete("genre");
          const qs = sp.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }}
        className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
          !active
            ? "border-red-500 bg-red-600 text-white"
            : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-white"
        }`}
      >
        Semua
      </button>
      {genres.map((genre) => {
        const isActive = genre === active;
        return (
          <button
            key={genre}
            onClick={() => toggle(genre)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              isActive
                ? "border-red-500 bg-red-600 text-white"
                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-white"
            }`}
          >
            {genre}
          </button>
        );
      })}
    </div>
  );
}
