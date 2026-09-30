/**
 * Frame math for everything a user or agent types: `--at 1.5s`, `--frames
 * 30-90`, `--duration 4s`. One parser, so the CLI flags and the MCP tool
 * arguments accept exactly the same spellings.
 */

export class TimeParseError extends Error {}

/**
 * A point in the composition as a frame index. Accepts a bare frame number
 * (`45`), frames (`45f`), seconds (`1.5s`), milliseconds (`500ms`) or a
 * percentage of the whole (`60%`). Clamped to the last frame.
 */
export function parseTime(input: string | number, fps: number, totalFrames: number): number {
  const last = Math.max(0, totalFrames - 1);
  if (typeof input === "number") return clamp(Math.round(input), 0, last);
  const text = input.trim().toLowerCase();
  const match = /^(-?\d+(?:\.\d+)?)\s*(ms|s|f|%)?$/.exec(text);
  if (!match) {
    throw new TimeParseError(`Can't read "${input}" as a time — use a frame number (45), seconds (1.5s), ms (500ms) or a percentage (60%)`);
  }
  const value = Number(match[1]);
  const unit = match[2] ?? "f";
  const frame =
    unit === "s" ? value * fps
    : unit === "ms" ? (value / 1000) * fps
    : unit === "%" ? (value / 100) * last
    : value;
  return clamp(Math.round(frame), 0, last);
}

/** A length as a frame count: `4s`, `120`, `120f`, `2500ms`. At least one frame. */
export function parseDuration(input: string | number, fps: number): number {
  if (typeof input === "number") return Math.max(1, Math.round(input));
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|f)?$/.exec(input.trim().toLowerCase());
  if (!match) throw new TimeParseError(`Can't read "${input}" as a duration — use seconds (4s) or frames (120)`);
  const value = Number(match[1]);
  const unit = match[2] ?? "f";
  const frames = unit === "s" ? value * fps : unit === "ms" ? (value / 1000) * fps : value;
  return Math.max(1, Math.round(frames));
}

/** An inclusive-exclusive frame window. */
export interface FrameRange {
  start: number;
  /** Exclusive. */
  end: number;
}

/**
 * `30-90` (inclusive, like ffmpeg and Remotion), `30-` (to the end), or a
 * single frame `30`. Times work on either side: `1s-3s`.
 */
export function parseFrameRange(input: string, fps: number, totalFrames: number): FrameRange {
  const text = input.trim();
  const dash = text.indexOf("-", 1);
  if (dash === -1) {
    const frame = parseTime(text, fps, totalFrames);
    return { start: frame, end: frame + 1 };
  }
  const left = text.slice(0, dash);
  const right = text.slice(dash + 1);
  const start = parseTime(left, fps, totalFrames);
  const end = right.trim() === "" ? totalFrames : parseTime(right, fps, totalFrames) + 1;
  if (end <= start) throw new TimeParseError(`Frame range "${input}" is empty`);
  return { start, end };
}

/**
 * Splits a range into at most `parts` contiguous chunks of near-equal length,
 * never smaller than `minFrames` — a worker that renders five frames spends
 * more on its browser tab than on the frames.
 */
export function chunkRange(range: FrameRange, parts: number, minFrames = 30): FrameRange[] {
  const total = range.end - range.start;
  const count = clamp(Math.min(Math.floor(parts), Math.ceil(total / minFrames)), 1, Math.max(1, total));
  const chunks: FrameRange[] = [];
  for (let i = 0; i < count; i++) {
    const start = range.start + Math.floor((total * i) / count);
    const end = range.start + Math.floor((total * (i + 1)) / count);
    if (end > start) chunks.push({ start, end });
  }
  return chunks;
}

export function formatTimecode(frame: number, fps: number): string {
  const seconds = frame / fps;
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
