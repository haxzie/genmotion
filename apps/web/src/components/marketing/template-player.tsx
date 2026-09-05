"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplateSummary } from "@genmotion/templates/types";
import { cx } from "@/lib/cx";
import { templateApiUrl } from "@/lib/marketing/templates";

/**
 * The template's own pre-rendered MP4 — `render-video.mjs` produced it once,
 * offline, from these exact scenes, and every public page plays that instead
 * of live-compiling and evaluating them the way the editor does.
 */

function PlayGlyph({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <rect x="3" y="2" width="4" height="12" rx="1" />
      <rect x="9" y="2" width="4" height="12" rx="1" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <path d="M4.5 2.7a1 1 0 0 1 1.53-.85l8 5.3a1 1 0 0 1 0 1.7l-8 5.3a1 1 0 0 1-1.53-.85V2.7Z" />
    </svg>
  );
}

/** "1:04" from a video's own currentTime/duration (seconds) — no fps needed,
 *  unlike the frame-based timecode the live preview used to show. */
function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function Transport({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    onMeta();
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
    };
  }, [videoRef]);

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <button
        type="button"
        onClick={() => {
          const el = videoRef.current;
          if (!el) return;
          if (el.paused) void el.play().catch(() => {});
          else el.pause();
        }}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <PlayGlyph playing={isPlaying} />
      </button>
      <input
        type="range"
        min={0}
        max={duration}
        step={0.01}
        value={Math.min(currentTime, duration)}
        onChange={(e) => {
          const el = videoRef.current;
          if (el) el.currentTime = Number(e.target.value);
        }}
        aria-label="Seek"
        className="h-1 flex-1 cursor-pointer accent-cta"
      />
      <span className="shrink-0 font-mono text-[0.786rem] tabular-nums text-text-tertiary">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}

export function TemplatePlayer({
  summary,
  className,
}: {
  summary: TemplateSummary;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  // Autoplay from the top the moment the page opens.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => {});
  }, [summary.id]);

  if (failed) {
    return (
      <div
        className={cx(
          "flex aspect-video items-center justify-center rounded-xl border border-border bg-surface-raised text-[0.9rem] text-text-tertiary",
          className,
        )}
      >
        This template hasn’t been rendered yet — it still remixes fine in the app.
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className="mx-auto w-full overflow-hidden rounded-xl border border-border bg-black"
        style={{ maxWidth: `calc(70vh * ${summary.width} / ${summary.height})` }}
      >
        <div style={{ aspectRatio: `${summary.width} / ${summary.height}` }}>
          <video
            ref={videoRef}
            src={templateApiUrl(`${summary.videoPath}?v=${summary.revision}`)}
            poster={templateApiUrl(`${summary.posterPath}?v=${summary.revision}`)}
            className="size-full object-cover"
            loop
            playsInline
            onError={() => setFailed(true)}
          />
        </div>
      </div>

      <div className="mx-auto mt-2 max-w-xl rounded-md border border-border bg-surface">
        <Transport videoRef={videoRef} />
      </div>
    </div>
  );
}
