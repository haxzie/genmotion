/**
 * Cues plus a bank, as interleaved stereo.
 *
 * The one place a voice is *placed*: everything else decides which voice and how
 * loud. An equal-power pan law, and a voice that would run past the end is
 * truncated rather than wrapped.
 */

import { voiceOf, type Bank } from "./bank";
import type { Cue } from "./schedule";

export interface MixOptions {
  /** How long the buffer is. Defaults to the last cue plus its voice's tail. */
  durationMs?: number;
  /** Linear gain over the whole mix, applied before the limiter. Default 1. */
  gain?: number;
}

/**
 * The ceiling the mix is held under, -1dBFS.
 *
 * Two cues landing inside a few milliseconds of each other — Shift and a letter,
 * a space bar over a letter's tail — sum, and each voice is already at -6dBFS
 * with the scheduler free to add 4.5dB on top. Rather than clip, the whole mix
 * is scaled down by whatever its own peak asks for: a typing run is one gesture,
 * and per-sample limiting inside it would pump.
 */
const CEILING = 0.891;

export function mix(bank: Bank, cues: readonly Cue[], options: MixOptions = {}): Float32Array {
  const rate = bank.sampleRate;
  const last = cues[cues.length - 1];
  const impliedMs = last ? last.atMs + (bank.voices[0]?.length ?? 0) / rate * 1_000 : 0;
  const totalFrames = Math.max(1, Math.round(((options.durationMs ?? impliedMs) / 1_000) * rate));
  const out = new Float32Array(totalFrames * 2);

  for (const cue of cues) {
    const voice = voiceOf(bank, cue.kind, cue.variant);
    if (!voice) continue;
    const start = Math.round((cue.atMs / 1_000) * rate) - bank.onset;
    const left = Math.sqrt((1 - cue.pan) / 2) * cue.gain;
    const right = Math.sqrt((1 + cue.pan) / 2) * cue.gain;
    for (let i = 0; i < voice.length; i++) {
      const frame = start + i;
      if (frame < 0 || frame >= totalFrames) continue;
      const sample = voice[i] ?? 0;
      out[frame * 2] = (out[frame * 2] ?? 0) + sample * left;
      out[frame * 2 + 1] = (out[frame * 2 + 1] ?? 0) + sample * right;
    }
  }

  const gain = options.gain ?? 1;
  let peak = 0;
  for (const sample of out) peak = Math.max(peak, Math.abs(sample));
  const scale = peak * gain > CEILING ? CEILING / peak : gain;
  if (scale !== 1) for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) * scale;

  return out;
}
