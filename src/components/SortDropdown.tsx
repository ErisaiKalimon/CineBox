"use client";

import { usePathname, useRouter } from "next/navigation";

const OPTIONS = [
  { value: "terbaru", label: "Terbaru" },
  { value: "tahun", label: "Tahun Terbaru" },
  { value: "judul", label: "Judul A–Z" },
] as const;

export function SortDropdown({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function change(value: string) {
    const sp = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    if (value === "terbaru") sp.delete("sort");
    else sp.set("sort", value);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Urutkan film</span>
      <select
        value={OPTIONS.some((o) => o.value === active) ? active : "terbaru"}
        onChange={(e) => change(e.target.value)}
        className="appearance-none rounded-full border border-zinc-700 bg-zinc-900 py-2 pl-4 pr-9 text-xs font-medium text-zinc-300 outline-none transition hover:border-zinc-500 focus:border-red-500"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-zinc-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}
