import path from "node:path";
import { existsSync } from "node:fs";
import type { TimelineAudio } from "@genmotion/hyperframes";

/**
 * The ffmpeg inputs and filter graph that mix a HyperFrames composition's
 * `<audio>` elements under its video.
 *
 * Static placement — `data-start`, `data-duration`, `data-media-start`,
 * `data-volume` — comes from the compiled timeline. Fades do not: HyperFrames
 * animates `volume` on the GSAP timeline, and the only faithful reading of
 * that is the element's own `volume` at each frame, which the export window
 * reports as it seeks. Those samples become a piecewise-linear `volume`
 * expression, so a `tl.to("#bgm", { volume: 0 })` ducks in the file exactly
 * as it did in the preview.
 */
export interface AudioMixPlan {
  /** `-ss … -i …` pairs, in stream order starting at input 1 (0 is the video). */
  inputs: string[];
  /** One `[n:a]…[an]` chain per input, plus the final `amix`. */
  filterComplex: string;
  streams: number;
}

/** Per-frame gain of every `<audio>` element, keyed by id, as the export sampled it. */
export type AudioLevelSamples = Record<string, number>[];

export function planAudioMix(
  projectDir: string,
  audio: TimelineAudio[],
  samples: AudioLevelSamples,
  fps: number,
  totalFrames: number,
): AudioMixPlan | null {
  const inputs: string[] = [];
  const filters: string[] = [];
  let stream = 0;

  for (const clip of audio) {
    const file = path.resolve(projectDir, clip.src);
    if (!existsSync(file)) continue;
    const duration =
      clip.duration ?? Math.max(0, totalFrames / fps - clip.start);
    if (duration <= 0 || clip.start >= totalFrames / fps) continue;

    stream += 1;
    if (clip.mediaStart > 0) inputs.push("-ss", clip.mediaStart.toFixed(3));
    inputs.push("-i", file);

    const delay = Math.round(clip.start * 1000);
    const gain = volumeFilter(clip, samples, fps, duration);
    // Trim first so the envelope's clock is the clip's own, then delay —
    // `adelay` prepends silence, and shaping after it would ramp the silence.
    filters.push(
      `[${stream}:a]atrim=duration=${duration.toFixed(3)},${gain},adelay=${delay}|${delay}[a${stream}]`,
    );
  }

  if (stream === 0) return null;
  const labels = Array.from({ length: stream }, (_, i) => `[a${i + 1}]`).join("");
  return {
    inputs,
    filterComplex: `${filters.join(";")};${labels}amix=inputs=${stream}:duration=longest:normalize=0[aout]`,
    streams: stream,
  };
}

/**
 * The `volume` filter for one clip.
 *
 * The page reports `HTMLMediaElement.volume`, which the browser clamps to
 * 0–1, so a `data-volume` above unity — HyperFrames allows up to +12dB —
 * comes through as 1. The boost is reapplied on top: the samples carry the
 * shape, the attribute carries the level.
 */
function volumeFilter(
  clip: TimelineAudio,
  samples: AudioLevelSamples,
  fps: number,
  duration: number,
): string {
  const boost = clip.volume > 1 ? clip.volume : 1;
  const first = Math.max(0, Math.round(clip.start * fps));
  const last = Math.min(samples.length - 1, Math.round((clip.start + duration) * fps));

  const points: { t: number; v: number }[] = [];
  for (let f = first; f <= last; f++) {
    const level = samples[f]?.[clip.id];
    if (level === undefined) continue;
    points.push({ t: (f - first) / fps, v: level * boost });
  }

  // Nothing sampled (a clip past the end, or one the page never listed):
  // the attribute is all there is.
  if (points.length === 0) return `volume=${clip.volume.toFixed(3)}`;

  const breakpoints = decimate(simplify(points));
  if (breakpoints.length === 1) return `volume=${breakpoints[0]!.v.toFixed(3)}`;
  return `volume='${envelopeExpression(breakpoints)}':eval=frame`;
}

/** Keep only the points where the slope changes — a constant clip becomes one point, a fade two. */
function simplify(points: { t: number; v: number }[]): { t: number; v: number }[] {
  const out: { t: number; v: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const prev = out[out.length - 1];
    const next = points[i + 1];
    if (!prev || !next) {
      out.push(p);
      continue;
    }
    const slopeIn = (p.v - prev.v) / (p.t - prev.t);
    const slopeOut = (next.v - p.v) / (next.t - p.t);
    if (Math.abs(slopeIn - slopeOut) > 1e-4) out.push(p);
  }
  // A flat line collapses to its first point.
  if (out.length === 2 && Math.abs(out[0]!.v - out[1]!.v) < 1e-4) return [out[0]!];
  return out;
}

/**
 * An eased fade keeps a breakpoint per sampled frame — the slope never
 * repeats — and a minute of automation would be an expression ffmpeg parses
 * per frame. Past this many, keep every k-th point: at 30fps the curve is
 * still sampled many times a second.
 */
const MAX_BREAKPOINTS = 400;

function decimate(points: { t: number; v: number }[]): { t: number; v: number }[] {
  if (points.length <= MAX_BREAKPOINTS) return points;
  const step = Math.ceil(points.length / MAX_BREAKPOINTS);
  const kept = points.filter((_, i) => i % step === 0);
  const last = points[points.length - 1]!;
  if (kept[kept.length - 1] !== last) kept.push(last);
  return kept;
}

/**
 * Piecewise-linear interpolation as an ffmpeg expression in `t`.
 *
 * Nested `if(lt(t, T), …)` per segment; ffmpeg evaluates it per frame, so
 * a long automation lane is a long expression, but a handful of fades is a
 * handful of terms. Held at the last value past the end.
 */
function envelopeExpression(points: { t: number; v: number }[]): string {
  const n = (x: number) => x.toFixed(4);
  let expr = n(points[points.length - 1]!.v);
  for (let i = points.length - 2; i >= 0; i--) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const span = b.t - a.t;
    const lerp =
      span > 0 ? `(${n(a.v)}+(${n(b.v)}-${n(a.v)})*(t-${n(a.t)})/${n(span)})` : n(a.v);
    expr = `if(lt(t,${n(b.t)}),${lerp},${expr})`;
  }
  return expr;
}
