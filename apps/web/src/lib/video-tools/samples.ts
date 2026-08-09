import type { MetricVideoData, MetricPoint, SourceId } from "./types";

/**
 * Static stand-in data, one per source.
 *
 * Used by the dev harness and as the tool pages' first paint, so a visitor sees
 * a real animated preview before typing anything — and so a template can be
 * worked on without a network round trip or an API key. Deliberately plausible
 * but clearly not live; the page relabels it once real data arrives.
 */

/** Deterministic pseudo-growth curve — no Math.random, so samples never drift. */
function growthSeries(months: number, end: number, curve = 2.2): MetricPoint[] {
  const now = Date.UTC(2026, 7, 1);
  const month = 30 * 24 * 60 * 60 * 1000;
  return Array.from({ length: months }, (_, i) => {
    const progress = (i + 1) / months;
    return {
      t: now - (months - 1 - i) * month,
      v: Math.round(end * Math.pow(progress, curve)),
    };
  });
}

export const SAMPLES: Record<SourceId, MetricVideoData> = {
  "github-stars": {
    source: "github-stars",
    title: "facebook/react",
    subtitle: "GitHub Stars",
    value: 238412,
    unit: "stars",
    // Matches the live source: the repo endpoint carries no historical figure.
    delta: null,
    series: null,
    avatar: null,
    url: "https://github.com/facebook/react",
    accent: "#3b6ef6",
  },
  "npm-downloads": {
    source: "npm-downloads",
    title: "react",
    subtitle: "npm downloads / week",
    value: 41283910,
    unit: "downloads",
    delta: { value: 962004, label: "+962,004 vs last week" },
    series: growthSeries(52, 41283910, 1.15),
    avatar: null,
    url: "https://www.npmjs.com/package/react",
    accent: "#cb3837",
  },
  "youtube-subscribers": {
    source: "youtube-subscribers",
    title: "@mkbhd",
    subtitle: "YouTube subscribers",
    value: 20100000,
    unit: "subscribers",
    delta: null,
    series: null,
    avatar: null,
    url: "https://www.youtube.com/@mkbhd",
    accent: "#ff0033",
  },
};
