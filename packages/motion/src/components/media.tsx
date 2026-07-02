"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  useRenderMode,
  useIsPlaying,
} from "../context";
import { useMediaReadiness } from "../media-readiness";

/** Maximum drift (seconds) tolerated during live preview before hard-seeking. */
const PREVIEW_DRIFT_TOLERANCE = 0.1;
/** Per-frame seek wait cap in render mode; falls back to last decoded frame. */
const RENDER_SEEK_TIMEOUT_MS = 1500;

export interface ImgProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

/** Image that blocks frame capture in render mode until decoded. */
export function Img({ src, style, ...props }: ImgProps) {
  const ref = useRef<HTMLImageElement>(null);
  const mode = useRenderMode();

  const check = useCallback(async () => {
    const el = ref.current;
    if (!el) return;
    try {
      await el.decode();
    } catch {
      // Decode failures shouldn't deadlock the renderer; capture proceeds.
    }
  }, []);

  useMediaReadiness(mode === "render" ? check : null);

  return (
    <img
      ref={ref}
      src={src}
      draggable={false}
      style={{ userSelect: "none", ...style }}
      {...props}
    />
  );
}

interface MediaSyncOptions {
  /** Seconds into the source file where frame 0 of this element begins. */
  startFrom?: number;
  volume?: number;
  muted?: boolean;
  loop?: boolean;
  playbackRate?: number;
}

function useMediaSync(
  ref: React.RefObject<HTMLVideoElement | HTMLAudioElement | null>,
  { startFrom = 0, volume = 1, muted = false, loop = false, playbackRate = 1 }: MediaSyncOptions,
) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mode = useRenderMode();
  const playing = useIsPlaying();

  const targetTime = (() => {
    let t = startFrom + (frame / fps) * playbackRate;
    const el = ref.current;
    if (loop && el && Number.isFinite(el.duration) && el.duration > 0) {
      t = t % el.duration;
    }
    return t;
  })();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.volume = Math.min(1, Math.max(0, volume));
    el.muted = mode === "render" ? true : muted;
    el.playbackRate = playbackRate;
  }, [ref, volume, muted, playbackRate, mode]);

  // Preview, playing: let the element run, correct drift.
  useEffect(() => {
    if (mode !== "preview") return;
    const el = ref.current;
    if (!el) return;
    if (playing) {
      if (Math.abs(el.currentTime - targetTime) > PREVIEW_DRIFT_TOLERANCE) {
        el.currentTime = targetTime;
      }
      el.play().catch(() => {
        // Autoplay restrictions: stay paused but keep seeking on frame change.
      });
    } else {
      el.pause();
      if (Math.abs(el.currentTime - targetTime) > 1 / fps / 2) {
        el.currentTime = targetTime;
      }
    }
  }, [mode, playing, targetTime, ref, fps]);

  // Render mode: exact seek every frame; the readiness check awaits `seeked`.
  useLayoutEffect(() => {
    if (mode !== "render") return;
    const el = ref.current;
    if (!el) return;
    el.pause();
    if (el.currentTime !== targetTime) {
      el.currentTime = targetTime;
    }
  }, [mode, targetTime, ref]);

  const renderCheck = useCallback(async () => {
    const el = ref.current;
    if (!el) return;
    if (el.readyState >= 2 && Math.abs(el.currentTime - targetTime) < 1e-4) {
      return;
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        cleanup();
        resolve();
      }, RENDER_SEEK_TIMEOUT_MS);
      const onSeeked = () => {
        if (el.readyState >= 2) {
          cleanup();
          resolve();
        }
      };
      const onCanPlay = () => onSeeked();
      function cleanup() {
        clearTimeout(timer);
        el!.removeEventListener("seeked", onSeeked);
        el!.removeEventListener("canplay", onCanPlay);
      }
      el.addEventListener("seeked", onSeeked);
      el.addEventListener("canplay", onCanPlay);
      // The seek may already have completed between effect and check.
      if (el.readyState >= 2 && el.seekable.length > 0 && Math.abs(el.currentTime - targetTime) < 1e-4) {
        cleanup();
        resolve();
      }
    });
  }, [ref, targetTime]);

  useMediaReadiness(mode === "render" ? renderCheck : null);
}

export interface VideoProps
  extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "autoPlay">,
    MediaSyncOptions {
  src: string;
}

/** Frame-synced video. In preview it plays natively with drift correction; in render mode every frame is an exact seek. */
export function Video({
  src,
  startFrom,
  volume,
  muted,
  loop,
  playbackRate,
  style,
  ...props
}: VideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  useMediaSync(ref, { startFrom, volume, muted, loop, playbackRate });

  return (
    <video
      ref={ref}
      src={src}
      playsInline
      preload="auto"
      crossOrigin="anonymous"
      style={{ width: "100%", height: "100%", objectFit: "cover", ...style }}
      {...props}
    />
  );
}

export interface AudioProps extends MediaSyncOptions {
  src: string;
}

/** Frame-synced audio. Audible in preview; exports are silent in v1. */
export function Audio({ src, ...options }: AudioProps) {
  const ref = useRef<HTMLAudioElement>(null);
  const mode = useRenderMode();
  useMediaSync(ref, options);
  // In render mode the audio is muted and not captured, but mounting the element
  // makes every frame block on its seek-readiness check (up to 1.5s/frame when a
  // muted element never reaches readyState >= 2) — which can turn a seconds-long
  // render into minutes. Skip mounting it; with a null ref the readiness check
  // returns immediately. (Capturing embedded audio into the export is a separate
  // feature — see the audio-track mux path.)
  if (mode === "render") return null;
  return <audio ref={ref} src={src} preload="auto" crossOrigin="anonymous" />;
}
