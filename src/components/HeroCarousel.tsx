"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDuration } from "@/lib/format";

export type CarouselSlide = {
  title: string;
  slug: string;
  description: string | null;
  posterUrl: string | null;
  year: number | null;
  durationSec: number | null;
  genres: string | null;
  rating: number | null;
};

export function HeroCarousel({ slides }: { slides: CarouselSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      6000
    );
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;
  const safeIndex = Math.min(index, slides.length - 1);
  const movie = slides[safeIndex];
  const meta = [
    movie.year,
    formatDuration(movie.durationSec),
    movie.genres?.split(", ")[0],
  ].filter(Boolean);

  return (
    <section
      className="relative overflow-hidden rounded-2xl ring-1 ring-zinc-800"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Film unggulan"
    >
      {slides.map(
        (s, i) =>
          s.posterUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={s.slug}
              src={s.posterUrl}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 h-full w-full scale-110 object-cover blur-md transition-opacity duration-700 ${
                i === safeIndex ? "opacity-30" : "opacity-0"
              }`}
            />
          )
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#09090f] via-[#09090f]/75 to-transparent" />

      <div
        key={movie.slug}
        className="relative z-10 max-w-2xl space-y-4 p-8 sm:p-12 animate-hero-fade"
      >
        <span className="inline-block rounded bg-red-600 px-2 py-0.5 text-[10px] font-black tracking-widest text-white">
          SEDANG TAYANG
        </span>
        <h1 className="text-3xl font-black text-white sm:text-5xl">
          {movie.title}
        </h1>
        {movie.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-zinc-300 sm:text-base">
            {movie.description}
          </p>
        )}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
          {meta.join(" • ")}
          {movie.rating !== null && movie.rating > 0 && (
            <span className="font-bold text-amber-400">
              ★ {movie.rating.toFixed(1)}
            </span>
          )}
        </p>
        <div className="pt-1">
          <Link
            href={`/movie/${movie.slug}`}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-500"
          >
            ▶ Tonton Sekarang
          </Link>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <div className="absolute bottom-5 left-8 z-20 flex items-center gap-2 sm:left-12">
            {slides.map((s, i) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Tampilkan slide ${i + 1}: ${s.title}`}
                className={`h-2 rounded-full transition-all ${
                  i === safeIndex
                    ? "w-6 bg-red-600"
                    : "w-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
          <div className="absolute bottom-4 right-4 z-20 hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() =>
                setIndex((i) => (i - 1 + slides.length) % slides.length)
              }
              aria-label="Slide sebelumnya"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/85"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % slides.length)}
              aria-label="Slide berikutnya"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/85"
            >
              ›
            </button>
          </div>
        </>
      )}
    </section>
  );
}
