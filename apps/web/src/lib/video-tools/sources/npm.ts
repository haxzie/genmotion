import type { MetricPoint, MetricVideoData } from "../types";
import { SourceError, fetchJson } from "./fetch";

/**
 * npm download counts. The registry's download API is fully public with no key
 * and generous limits, which makes this the cheapest of the four sources.
 */

const API = "https://api.npmjs.org/downloads";

interface PointResponse {
  downloads: number;
  package: string;
}

interface RangeResponse {
  downloads: { day: string; downloads: number }[];
}

/** Accepts a bare name, a scoped name, or an npmjs.com URL. */
function parsePackage(input: string): string {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^(www\.)?npmjs\.com\/package\//, "")
    .replace(/\/+$/, "");

  // The registry's own rule: optional @scope/, lowercase, no leading dot or underscore.
  if (!/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(cleaned)) {
    throw new SourceError(400, "Enter an npm package name — for example react or @tanstack/react-query.");
  }
  return cleaned;
}

export async function getNpmDownloads(input: string): Promise<MetricVideoData> {
  const name = parsePackage(input);
  const encoded = name.replace("/", "%2F");
  const notFound = `Couldn't find the package "${name}" on npm.`;

  const [point, range] = await Promise.all([
    fetchJson<PointResponse>(`${API}/point/last-week/${encoded}`, { revalidate: 3600, notFound }),
    fetchJson<RangeResponse>(`${API}/range/last-year/${encoded}`, { revalidate: 21_600, notFound }),
  ]);

  const daily = range.downloads ?? [];
  if (point.downloads === 0 && daily.every((d) => d.downloads === 0)) {
    throw new SourceError(422, `"${name}" has no recorded downloads yet.`);
  }

  const series = toWeekly(daily);
  // Both sides come from the series, not from `point`: npm's "last week" is a
  // rolling window that doesn't line up with our weekly buckets, so subtracting
  // one from the other would compare two different spans of days.
  const delta =
    series.length >= 2
      ? series[series.length - 1]!.v - series[series.length - 2]!.v
      : null;

  return {
    source: "npm-downloads",
    title: name,
    subtitle: "npm downloads / week",
    value: point.downloads,
    unit: "downloads",
    delta:
      delta === null
        ? null
        : {
            value: delta,
            label: `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toLocaleString("en-US")} vs previous week`,
          },
    series: series.length >= 2 ? series : null,
    // npm exposes no per-package image, and the registry logo would misrepresent
    // the package as official. Better to show nothing.
    avatar: null,
    url: `https://www.npmjs.com/package/${name}`,
    accent: "#cb3837",
  };
}

/**
 * Roll daily counts up into calendar weeks. A year of daily points is far more
 * detail than a 6-second chart can show, and weekly smooths out the very
 * pronounced weekday/weekend cycle in package downloads.
 */
function toWeekly(daily: { day: string; downloads: number }[]): MetricPoint[] {
  const weeks: MetricPoint[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    // Drop a trailing partial week — it would read as a sudden collapse.
    if (chunk.length < 7) break;
    const start = Date.parse(chunk[0]!.day);
    if (!Number.isFinite(start)) continue;
    weeks.push({ t: start, v: chunk.reduce((sum, d) => sum + d.downloads, 0) });
  }
  return weeks;
}
