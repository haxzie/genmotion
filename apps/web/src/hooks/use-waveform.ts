"use client";

import { useEffect, useState } from "react";

/**
 * Buckets decoded per file. Must stay high: a short clip of a LONG track only
 * maps to a small slice of these buckets, so too few and a trimmed clip has
 * fewer buckets than it has pixel columns and the outline visibly stair-steps.
 * 8192 keeps ~15ms detail even for a 2-minute file, comfortably finer than any
 * clip is wide. The decode is one pass over the samples regardless, so a higher
 * count is essentially free.
 */
const RESOLUTION = 8192;

export interface WaveformData {
  /**
   * Normalized (0–1) RMS level per bucket across the whole source (RESOLUTION
   * long). RMS, not peak: peak follows the single loudest sample in a bucket,
   * which on loud/compressed music saturates into a noisy fuzz at the top of
   * the strip. RMS tracks perceived loudness, so the drawn envelope is smooth
   * and reads as the shape of the sound.
   */
  levels: number[] | null;
  /** Source length in seconds (null while loading / on failure). */
  duration: number | null;
}

const EMPTY: WaveformData = { levels: null, duration: null };

// Decoded levels + duration are cached per URL so re-renders and multiple blocks
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
 * Fetch + decode an audio file into normalized (0–1) RMS levels plus its
 * duration. Decoding happens once per URL (cached). Returns nulls while loading
 * or on failure. Callers map the levels onto their own pixel width with
 * `sampleEnvelope`, so the waveform stays time-accurate.
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
          let sum = 0;
          const start = i * block;
          for (let j = 0; j < block; j++) {
            const v = channel[start + j] ?? 0;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / block);
          result.push(rms);
          if (rms > max) max = rms;
        }
        const levels = max > 0 ? result.map((p) => p / max) : result;
        const value: WaveformData = { levels, duration: audio.duration };
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
 * Build `columns` amplitude values across a card's FULL width, sampling the
 * source only where audio actually plays. Each column maps to the card time
 * `startSec + (col/columns) * windowSec`; columns past the source `duration`
 * (i.e. the card is longer than the audio) come back as 0 — a flat baseline —
 * so the waveform is time-accurate instead of stretched to fill the card.
 *
 * The columns are normalized to the loudest level WITHIN THIS WINDOW — so the
 * waveform shows the highs and lows of just the audio in hand, using the full
 * height, independent of the rest of the file or any other clip. A trimmed clip
 * over a quiet passage no longer looks flat just because the file peaks louder
 * somewhere off-screen.
 *
 * @param startSec  Seconds into the source where the card begins (0 for scenes;
 *                  the clip's `startFrom` for audio clips).
 * @param windowSec The card's own duration in seconds.
 */
export function sampleEnvelope(
  data: WaveformData,
  columns: number,
  startSec: number,
  windowSec: number,
): number[] {
  const { levels, duration } = data;
  const out: number[] = new Array(columns).fill(0);
  if (!levels || !duration || windowSec <= 0) return out;
  let windowMax = 0;
  for (let i = 0; i < columns; i++) {
    // Each column spans a slice of time — take the LOUDEST bucket in that slice
    // (not a single point sample), so a beat is never skipped no matter how
    // many source buckets a column covers.
    const t0 = startSec + (i / columns) * windowSec;
    if (t0 >= duration) continue; // past the audio → flat baseline
    const t1 = startSec + ((i + 1) / columns) * windowSec;
    const idx0 = Math.max(0, Math.floor((t0 / duration) * levels.length));
    const idx1 = Math.min(
      levels.length - 1,
      Math.floor((t1 / duration) * levels.length),
    );
    let v = 0;
    for (let k = idx0; k <= idx1; k++) if ((levels[k] ?? 0) > v) v = levels[k]!;
    out[i] = v;
    if (v > windowMax) windowMax = v;
  }
  // Scale to this window's own peak so it spans the full height. Columns past
  // the audio stay 0 (flat baseline) since they never enter windowMax.
  if (windowMax > 0) {
    for (let i = 0; i < columns; i++) out[i] = (out[i] ?? 0) / windowMax;
  }
  return out;
}
