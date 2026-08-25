"use client";

import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import {
  clearProgress,
  formatTimestamp,
  loadProgress,
  saveProgress,
} from "@/lib/watch-progress";

type LevelInfo = { index: number; height: number };

type VideoPlayerProps = {
  slug: string;
  hlsUrl?: string | null;
  mp4Url?: string | null;
  poster?: string | null;
};

const RESUME_MIN_SECONDS = 15;
const RESUME_TAIL_SECONDS = 30;

export function VideoPlayer({
  slug,
  hlsUrl,
  mp4Url,
  poster,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastSaveRef = useRef(0);

  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [resumeFrom, setResumeFrom] = useState<number | null>(null);

  useEffect(() => {
    const saved = loadProgress(slug);
    if (saved && saved > RESUME_MIN_SECONDS) setResumeFrom(saved);
    else setResumeFrom(null);
  }, [slug]);

  useEffect(() => {
    if (!hlsUrl && !mp4Url) return;

    let cancelled = false;

    async function setup() {
      const el = videoRef.current;
      if (!el) return;

      if (!hlsUrl || fallback) {
        if (mp4Url) el.src = mp4Url;
        return;
      }

      // Safari & iOS: HLS native
      if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = hlsUrl;
        return;
      }

      const HlsMod = (await import("hls.js")).default;
      if (cancelled) return;
      if (!HlsMod.isSupported()) {
        el.src = mp4Url ?? hlsUrl;
        return;
      }

      const hls = new HlsMod({ maxBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(el);
      hls.on(HlsMod.Events.MANIFEST_PARSED, (_evt, data) => {
        const infos = data.levels
          .map((l, index) => ({ index, height: l.height || 0 }))
          .filter((l) => l.height > 0)
          .sort((a, b) => b.height - a.height);
        setLevels(infos);
      });
      hls.on(HlsMod.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        if (mp4Url) setFallback(true);
        else setFailed(true);
      });
    }

    void setup();

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [hlsUrl, mp4Url, fallback, retryKey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      const video = videoRef.current;
      if (!video || failed) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          if (video.paused) void video.play();
          else video.pause();
          break;
        case "arrowleft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case "arrowright":
          e.preventDefault();
          video.currentTime = Math.min(
            video.duration || Infinity,
            video.currentTime + 10
          );
          break;
        case "f": {
          e.preventDefault();
          const wrapper = wrapperRef.current;
          if (!wrapper) break;
          if (document.fullscreenElement) void document.exitFullscreen();
          else void wrapper.requestFullscreen?.().catch(() => undefined);
          break;
        }
        case "m":
          e.preventDefault();
          video.muted = !video.muted;
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [failed]);

  if (!hlsUrl && !mp4Url) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-500">
        Video belum tersedia. Upload video melalui halaman Admin.
      </div>
    );
  }

  function persistNow() {
    const v = videoRef.current;
    if (v && v.currentTime > 1) saveProgress(slug, v.currentTime);
  }

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v || v.paused) return;
    const now = Date.now();
    if (now - lastSaveRef.current > 5000) {
      saveProgress(slug, v.currentTime);
      lastSaveRef.current = now;
    }
  }

  function handleVideoError() {
    if (hlsUrl && !fallback) setFallback(true);
    else setFailed(true);
  }

  function resume() {
    const v = videoRef.current;
    if (v && resumeFrom !== null) {
      const maxPos = Number.isFinite(v.duration)
        ? Math.max(0, v.duration - 5)
        : resumeFrom;
      v.currentTime = Math.min(resumeFrom, maxPos);
      void v.play().catch(() => undefined);
    }
    setResumeFrom(null);
  }

  function restart() {
    const v = videoRef.current;
    clearProgress(slug);
    if (v) {
      v.currentTime = 0;
      void v.play().catch(() => undefined);
    }
    setResumeFrom(null);
  }

  function retry() {
    setFailed(false);
    setFallback(false);
    setLevels([]);
    setRetryKey((k) => k + 1);
  }

  function pickLevel(index: number) {
    if (hlsRef.current) hlsRef.current.currentLevel = index;
    setCurrentLevel(index);
    setMenuOpen(false);
  }

  const currentLabel =
    currentLevel === -1
      ? "Auto"
      : `${levels.find((l) => l.index === currentLevel)?.height ?? ""}p`;

  return (
    <div className="space-y-2">
      <div
        ref={wrapperRef}
        className="relative w-full overflow-hidden rounded-xl bg-black ring-1 ring-zinc-800"
      >
        {!failed ? (
          <video
            key={retryKey}
            ref={videoRef}
            controls
            playsInline
            poster={poster ?? undefined}
            className="aspect-video h-full w-full"
            onWaiting={() => setBuffering(true)}
            onPlaying={() => setBuffering(false)}
            onCanPlay={() => setBuffering(false)}
            onTimeUpdate={handleTimeUpdate}
            onPause={persistNow}
            onEnded={() => clearProgress(slug)}
            onError={handleVideoError}
          />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-zinc-950 text-center">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm font-medium text-zinc-300">
              Video gagal dimuat.
            </p>
            <p className="max-w-xs text-xs text-zinc-500">
              Periksa koneksi atau URL video pada storage, lalu coba lagi.
            </p>
            <button
              type="button"
              onClick={retry}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!failed && levels.length > 1 && (
          <div className="absolute right-3 top-3 z-10">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={`Kualitas video: ${currentLabel}`}
              aria-expanded={menuOpen}
              className="flex min-h-[44px] items-center rounded-md bg-black/70 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/90"
            >
              ⚙ {currentLabel}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-28 overflow-hidden rounded-lg bg-black/90 py-1 text-xs text-white backdrop-blur">
                <button
                  type="button"
                  onClick={() => pickLevel(-1)}
                  className={`block min-h-[40px] w-full px-3 text-left transition hover:bg-red-600 ${
                    currentLevel === -1 ? "text-red-400" : ""
                  }`}
                >
                  Auto
                </button>
                {levels.map((l) => (
                  <button
                    key={l.index}
                    type="button"
                    onClick={() => pickLevel(l.index)}
                    className={`block min-h-[40px] w-full px-3 text-left transition hover:bg-red-600 ${
                      currentLevel === l.index ? "text-red-400" : ""
                    }`}
                  >
                    {l.height}p
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!failed && buffering && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-600 border-t-red-500" />
          </div>
        )}

        {!failed && resumeFrom !== null && (
          <div className="absolute inset-x-0 bottom-14 z-10 mx-auto flex w-max max-w-[92%] items-center gap-3 rounded-full bg-black/85 px-4 py-2.5 text-xs text-zinc-200 shadow-lg backdrop-blur">
            <span>
              Lanjutkan dari{" "}
              <strong className="text-white">
                {formatTimestamp(resumeFrom)}
              </strong>
              ?
            </span>
            <button
              type="button"
              onClick={resume}
              className="rounded-full bg-red-600 px-3 py-1 font-semibold text-white transition hover:bg-red-500"
            >
              Lanjutkan
            </button>
            <button
              type="button"
              onClick={restart}
              className="rounded-full px-2 py-1 font-medium text-zinc-400 transition hover:text-white"
            >
              Mulai Ulang
            </button>
          </div>
        )}
      </div>

      <div className="hidden flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-zinc-600 sm:flex">
        <Hint keys="Space / K" label="putar" />
        <Hint keys="← →" label="±10 detik" />
        <Hint keys="F" label="layar penuh" />
        <Hint keys="M" label="bisu" />
      </div>
    </div>
  );
}

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
        {keys}
      </kbd>
      {label}
    </span>
  );
}
