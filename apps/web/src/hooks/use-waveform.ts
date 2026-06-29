"use client";

import { useEffect, useMemo, useState } from "react";

/** Buckets decoded per file — high enough to downsample to any render width. */
const RESOLUTION = 240;

// Decoded peaks are cached per URL so re-renders and multiple scene blocks
// don't re-fetch/re-decode the same audio.
const cache = new Map<string, number[]>();
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

/** Reduce a high-res peak array down to `target` bars (peak per bucket). */
function downsample(peaks: number[], target: number): number[] {
  if (target >= peaks.length) return peaks;
  const out: number[] = [];
  const block = peaks.length / target;
  for (let i = 0; i < target; i++) {
    const start = Math.floor(i * block);
    const end = Math.max(start + 1, Math.floor((i + 1) * block));
    let peak = 0;
    for (let j = start; j < end; j++) {
      const v = peaks[j] ?? 0;
      if (v > peak) peak = v;
    }
    out.push(peak);
  }
  return out;
}

/**
 * Fetch + decode an audio file into normalized (0–1) amplitude peaks, then
 * downsample to `bars` columns. Decoding happens once per URL (cached);
 * changing `bars` only re-downsamples. Returns null while loading / on failure.
 */
export function useWaveform(
  url: string | null | undefined,
  bars: number,
): number[] | null {
  const [raw, setRaw] = useState<number[] | null>(() =>
    url ? cache.get(url) ?? null : null,
  );

  useEffect(() => {
    if (!url) {
      setRaw(null);
      return;
    }
    const cached = cache.get(url);
    if (cached) {
      setRaw(cached);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const audio = await ctx.decodeAudioData(arrayBuffer);
        const data = audio.getChannelData(0);
        const block = Math.floor(data.length / RESOLUTION) || 1;

        const result: number[] = [];
        let max = 0;
        for (let i = 0; i < RESOLUTION; i++) {
          let peak = 0;
          const start = i * block;
          for (let j = 0; j < block; j++) {
            const v = Math.abs(data[start + j] ?? 0);
            if (v > peak) peak = v;
          }
          result.push(peak);
          if (peak > max) max = peak;
        }
        const normalized = max > 0 ? result.map((p) => p / max) : result;
        cache.set(url, normalized);
        if (!cancelled) setRaw(normalized);
      } catch {
        if (!cancelled) setRaw(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return useMemo(
    () => (raw ? downsample(raw, Math.max(1, bars)) : null),
    [raw, bars],
  );
}
