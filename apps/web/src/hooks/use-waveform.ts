"use client";

import { useEffect, useState } from "react";

/**
 * Buckets decoded per file. Must stay high: a short clip of a LONG track only
 * maps to a small slice of these buckets, and each bucket is a peak over its
 * whole span — too few buckets and loud, compressed music (whose peak saturates
 * in every coarse bucket) collapses to a flat line. 2048 keeps ~16ms detail even
 * for a 2-minute file. The decode is one pass over the samples regardless, so a
 * higher count is essentially free.
 */
const RESOLUTION = 2048;

export interface WaveformData {
  /** Normalized (0–1) amplitude peaks across the whole source (RESOLUTION long). */
  peaks: number[] | null;
  /** Source length in seconds (null while loading / on failure). */
  duration: number | null;
}

const EMPTY: WaveformData = { peaks: null, duration: null };

// Decoded peaks + duration are cached per URL so re-renders and multiple blocks
// don't re-fetch/re-decode the same audio.
const cache = new Map<string, WaveformData>();
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

/**
 * Fetch + decode an audio file into normalized (0–1) amplitude peaks plus its
 * duration. Decoding happens once per URL (cached). Returns nulls while loading
 * or on failure. Callers map the peaks onto their own pixel width with
 * `sampleBars`, so the waveform stays time-accurate.
 */
export function useWaveform(url: string | null | undefined): WaveformData {
  const [data, setData] = useState<WaveformData>(() =>
    url ? cache.get(url) ?? EMPTY : EMPTY,
  );

  useEffect(() => {
    if (!url) {
      setData(EMPTY);
      return;
    }
    const cached = cache.get(url);
    if (cached) {
      setData(cached);
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
        const channel = audio.getChannelData(0);
        const block = Math.floor(channel.length / RESOLUTION) || 1;

        const result: number[] = [];
        let max = 0;
        for (let i = 0; i < RESOLUTION; i++) {
          let peak = 0;
          const start = i * block;
          for (let j = 0; j < block; j++) {
            const v = Math.abs(channel[start + j] ?? 0);
            if (v > peak) peak = v;
          }
          result.push(peak);
          if (peak > max) max = peak;
        }
        const peaks = max > 0 ? result.map((p) => p / max) : result;
        const value: WaveformData = { peaks, duration: audio.duration };
        cache.set(url, value);
        if (!cancelled) setData(value);
      } catch {
        if (!cancelled) setData(EMPTY);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return data;
}

/**
 * Build `barCount` amplitude values across a card's FULL width, sampling the
 * source only where audio actually plays. Each bar maps to the card time
 * `startSec + (bar/barCount) * windowSec`; bars past the source `duration`
 * (i.e. the card is longer than the audio) come back as 0 — a flat baseline —
 * so the waveform is time-accurate instead of stretched to fill the card.
 *
 * The bars are normalized to the loudest peak WITHIN THIS WINDOW — so the
 * waveform shows the highs and lows of just the audio in hand, using the full
 * height, independent of the rest of the file or any other clip. A trimmed clip
 * over a quiet passage no longer looks flat just because the file peaks louder
 * somewhere off-screen.
 *
 * @param startSec  Seconds into the source where the card begins (0 for scenes;
 *                  the clip's `startFrom` for audio clips).
 * @param windowSec The card's own duration in seconds.
 */
export function sampleBars(
  data: WaveformData,
  barCount: number,
  startSec: number,
  windowSec: number,
): number[] {
  const { peaks, duration } = data;
  const bars: number[] = new Array(barCount).fill(0);
  if (!peaks || !duration || windowSec <= 0) return bars;
  let windowMax = 0;
  for (let i = 0; i < barCount; i++) {
    // Each bar spans a slice of time — take the LOUDEST source peak in that
    // slice (not a single point sample), so transients are never skipped no
    // matter how many source buckets a bar covers.
    const t0 = startSec + (i / barCount) * windowSec;
    if (t0 >= duration) continue; // past the audio → flat baseline
    const t1 = startSec + ((i + 1) / barCount) * windowSec;
    const idx0 = Math.max(0, Math.floor((t0 / duration) * peaks.length));
    const idx1 = Math.min(
      peaks.length - 1,
      Math.floor((t1 / duration) * peaks.length),
    );
    let v = 0;
    for (let k = idx0; k <= idx1; k++) if ((peaks[k] ?? 0) > v) v = peaks[k]!;
    bars[i] = v;
    if (v > windowMax) windowMax = v;
  }
  // Scale to this window's own peak so it spans the full height. Bars past the
  // audio stay 0 (flat baseline) since they never enter windowMax.
  if (windowMax > 0) {
    for (let i = 0; i < barCount; i++) bars[i] = (bars[i] ?? 0) / windowMax;
  }
  return bars;
}
