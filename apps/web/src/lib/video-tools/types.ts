/**
 * Shared vocabulary for the free video generators under /tools.
 *
 * The whole point of `MetricVideoData` is to decouple data sources from
 * templates: every source normalizes into this one shape, so any template can
 * render any source. Adding a source is a mapping function, not a new template.
 */

export const SOURCE_IDS = [
  "github-stars",
  "github-star-history",
  "npm-downloads",
  "youtube-subscribers",
] as const;

export type SourceId = (typeof SOURCE_IDS)[number];

/** One point on a metric's history. `t` is epoch ms so it survives JSON. */
export interface MetricPoint {
  t: number;
  v: number;
}

export interface MetricVideoData {
  source: SourceId;
  /** Headline identity of the subject — "facebook/react", "@mkbhd". */
  title: string;
  /** What the number means — "GitHub Stars", "npm downloads / week". */
  subtitle: string;
  value: number;
  /** Singular-or-plural noun rendered under the value — "stars", "downloads". */
  unit: string;
  /** Optional movement callout, e.g. +1,204 this month. */
  delta?: { value: number; label: string } | null;
  /**
   * History for the chart templates. Sources that only expose a current value
   * leave this null, and `chart-rise` filters itself out for them.
   */
  series?: MetricPoint[] | null;
  /**
   * Avatar/logo as a `data:` URI. Must never be a remote URL — the export
   * rasterizer cannot draw a cross-origin image, so sources inline it.
   */
  avatar?: string | null;
  /** Canonical link to the subject, shown as a caption. */
  url: string;
  /** Hex accent that drives the template palette. */
  accent: string;
}

export const ASPECTS = {
  landscape: { label: "16:9", width: 1920, height: 1080 },
  square: { label: "1:1", width: 1080, height: 1080 },
  portrait: { label: "9:16", width: 1080, height: 1920 },
} as const;

export type AspectKey = keyof typeof ASPECTS;

export const ASPECT_KEYS = Object.keys(ASPECTS) as AspectKey[];

/** Every generated video is a single 6-second scene at 30fps. */
export const FPS = 30;
export const DURATION_IN_FRAMES = 180;
