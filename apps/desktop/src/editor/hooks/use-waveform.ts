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

/**
 * Sample rate a long file is decoded at.
 *
 * `decodeAudioData` resamples to its context's rate, and the levels above are
 * 8192 buckets over the whole source however many samples went into them — so
 * past a few seconds, decoding at 44.1kHz buys detail that is averaged away a
 * moment later and charges hundreds of megabytes for it. 8kHz is the lowest
 * the Web Audio spec allows, and at the threshold below it still leaves ~20
 * samples per bucket.
 */
const LOW_SAMPLE_RATE = 8000;

/**
 * Above this, decode at `LOW_SAMPLE_RATE`.
 *
 * Short clips keep the full rate deliberately: under twenty seconds it is the
 * buckets that are in short supply, not the samples going into them, and
 * resampling first would only coarsen a strip that costs nothing to decode
 * properly.
 */
const LOW_RATE_ABOVE_SECONDS = 20;

/**
 * Longer than this and the strip is the duration alone, with no shape.
 *
 * A backstop, not a feature. `decodeAudioData` holds the whole file as PCM —
 * and decodes at the source's own rate before resampling to the context's, so
 * the transient is float32 per channel per sample at 44.1kHz however low the
 * context is set. An hour of stereo music is ~1.3GB of that, and a renderer
 * that runs out is not a missing waveform: it is every open project's tab
 * disappearing at once. Twenty minutes is far past any clip whose shape is
 * worth reading; a background mix this long shows a sliver of itself on the
 * timeline anyway. The strip already draws a flat baseline when `levels` is
 * null, and the lane still knows where the audio ends.
 */
const MAX_WAVEFORM_SECONDS = 20 * 60;

/**
 * The same ceiling in bytes, for a file whose metadata would not load.
 *
 * Only a fallback: file size says very little about duration on its own —
 * three minutes of WAV and two hours of mp3 are about the same number — which
 * is why the length is asked for first.
 */
const MAX_DECODE_BYTES = 64 * 1024 * 1024;

// Decoded levels + duration are cached per URL so re-renders and multiple blocks
// don't re-fetch/re-decode the same audio.
const cache = new Map<string, WaveformData>();
/**
 * Decodes still running, by URL.
 *
 * The result cache alone is not enough: every audio clip is drawn by two
 * components that mount in the same tick (the lane and its waveform), and both
 * find the cache empty and start a decode of their own. On a long file that is
 * several gigabytes of PCM alive at once for one strip — the difference
 * between a working editor and a renderer that is killed. Sharing the promise
 * makes a URL decode once however many components ask for it.
 */
const inFlight = new Map<string, Promise<WaveformData>>();

let decodeCtx: BaseAudioContext | null = null;
let lowRateCtx: BaseAudioContext | null = null;

/**
 * A context to decode against — offline, because nothing here is played.
 *
 * A live `AudioContext` opens an output device (and on some machines wakes the
 * speakers) to do arithmetic on samples nobody will hear.
 */
function decodeContext(lowRate: boolean): BaseAudioContext | null {
  if (typeof window === "undefined" || !window.OfflineAudioContext) return null;
  if (lowRate) return (lowRateCtx ??= new OfflineAudioContext(1, 1, LOW_SAMPLE_RATE));
  return (decodeCtx ??= new OfflineAudioContext(1, 1, 44100));
}

/** The source's length without decoding it — metadata only. */
function probeDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : null);
      audio.src = "";
    }, { once: true });
    audio.addEventListener("error", () => resolve(null), { once: true });
    audio.src = url;
  });
}

/** Fetch, decode and bucket one URL. Shared by every caller asking for it. */
async function load(url: string): Promise<WaveformData> {
  // How long the audio is, before any of it is decoded. Both decisions below
  // are about duration, and inferring that from the file size gets a short
  // uncompressed take and a long compressed one exactly the wrong way round.
  const duration = await probeDuration(url);
  if (duration !== null && duration > MAX_WAVEFORM_SECONDS) return { levels: null, duration };

  const res = await fetch(url);
  // Checked from the header rather than after reading the body: the point of
  // the ceiling is not to hold the file in memory, and `arrayBuffer()` would
  // already have done it.
  if (duration === null && Number(res.headers.get("content-length")) > MAX_DECODE_BYTES) {
    await res.body?.cancel();
    return EMPTY;
  }
  const buffer = await res.arrayBuffer();
  if (duration === null && buffer.byteLength > MAX_DECODE_BYTES) return EMPTY;

  const ctx = decodeContext(duration === null || duration > LOW_RATE_ABOVE_SECONDS);
  if (!ctx) return EMPTY;
  const audio = await ctx.decodeAudioData(buffer);
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
  return { levels, duration: audio.duration };
}

/**
 * Fetch + decode an audio file into normalized (0–1) RMS levels plus its
 * duration. Decoding happens once per URL (cached, and shared while it is
 * still running). Returns nulls while loading or on failure. Callers map the
 * levels onto their own pixel width with `sampleEnvelope`, so the waveform
 * stays time-accurate.
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
    const pending =
      inFlight.get(url) ??
      load(url)
        .catch(() => EMPTY)
        .then((value) => {
          // Only a real decode is worth keeping: a failure should be retried
          // by whoever asks next, not remembered as "this file has no sound".
          if (value !== EMPTY) cache.set(url, value);
          inFlight.delete(url);
          return value;
        });
    inFlight.set(url, pending);
    void pending.then((value) => {
      if (!cancelled) setData(value);
    });

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
