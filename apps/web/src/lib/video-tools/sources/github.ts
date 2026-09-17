import type { MetricPoint, MetricVideoData } from "../types";
import { SourceError, fetchJson, inlineImage } from "./fetch";

/**
 * GitHub star count, with the star history riding along for the chart style.
 *
 * `GITHUB_TOKEN` is optional — `/repos/{owner}/{repo}` is public — but set it in
 * production, because unauthenticated callers get only 60 requests per hour per
 * IP.
 *
 * The star history does NOT come from GitHub. `/repos/{o}/{r}/stargazers` is
 * unreliable for this: it needs auth, is ordered oldest-first, and stops
 * paginating at 400 pages (~40,000 stars), so the recent end of a popular
 * repo's timeline is unreachable even when it does answer. It comes instead
 * from OSS Insight, which derives it from GH Archive's public event stream —
 * no auth, no star ceiling, and monthly totals back to the repo's first star
 * (capped at the last ten years).
 */

const API = "https://api.github.com";

function headers(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

interface RepoResponse {
  full_name: string;
  html_url: string;
  stargazers_count: number;
  owner: { avatar_url: string };
}

/**
 * GitHub avatar URLs already carry a `?v=` query, so the size has to be set as
 * a parameter rather than appended. 200px is 2× the largest size any template
 * draws, and keeps the inlined base64 small.
 */
function avatarUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.searchParams.set("s", "200");
    return url.toString();
  } catch {
    return raw;
  }
}

/**
 * Accepts `owner/repo`, a github.com URL, or `github.com/owner/repo`.
 * Rejects anything else rather than guessing.
 */
function parseRepo(input: string): { owner: string; repo: string } {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^(www\.)?github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");

  const match = /^([\w.-]+)\/([\w.-]+)/.exec(cleaned);
  if (!match) {
    throw new SourceError(400, "Enter a repository as owner/repo — for example facebook/react.");
  }
  return { owner: match[1]!, repo: match[2]! };
}

async function fetchRepo(owner: string, repo: string): Promise<RepoResponse> {
  return fetchJson<RepoResponse>(`${API}/repos/${owner}/${repo}`, {
    revalidate: 3600,
    headers: headers(),
    // The token here only lifts the rate limit; the endpoint is public. An
    // expired one degrades to anonymous rather than breaking the tool.
    authIsOptional: true,
    notFound: `Couldn't find ${owner}/${repo}. Check the spelling, and that it's public.`,
  });
}

/** OSS Insight's star-history endpoint. Public, unauthenticated, ~100 req/min. */
const OSSINSIGHT = "https://api.ossinsight.io/v1/repos";

interface StarHistoryResponse {
  data?: { rows?: { date?: string; stargazers?: string }[] };
}

/**
 * Cumulative star totals per month, ending on today's exact figure.
 *
 * Two sources on purpose: OSS Insight supplies the shape of the curve, and
 * GitHub supplies the headline number. The two disagree by a few percent —
 * GH Archive counts every star ever given, GitHub's live figure has the
 * unstars and the purged spam accounts taken out — so the curve is scaled onto
 * the live count rather than spliced: every bucket keeps its proportion and the
 * last one becomes today's number. Replacing only the last point would draw a
 * dip at the end of a curve that has only ever gone up.
 *
 * Returns null rather than throwing. The history is one style of a tool whose
 * headline is the count: a repo too young to chart, a renamed one OSS Insight
 * hasn't caught up with, or OSS Insight being down should cost the chart style
 * and nothing else.
 */
async function fetchStarHistory(fullName: string, live: number): Promise<MetricPoint[] | null> {
  let body: StarHistoryResponse;
  try {
    // Ask under the repo's *canonical* name. A transferred repo returns no rows
    // under its old one — facebook/react is empty, react/react is complete —
    // and `full_name` is GitHub's answer to where it lives now.
    body = await fetchJson<StarHistoryResponse>(`${OSSINSIGHT}/${fullName}/stargazers/history/`, {
      revalidate: 21_600,
    });
  } catch (error) {
    console.warn(`[tools] star history unavailable for ${fullName}:`, error);
    return null;
  }

  const series: MetricPoint[] = (body.data?.rows ?? [])
    .map((row) => ({ t: Date.parse(`${row.date}T00:00:00Z`), v: Number(row.stargazers) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))
    .sort((a, b) => a.t - b.t);

  if (series.length < 2) return null;

  const scale = live / Math.max(series[series.length - 1]!.v, 1);
  return series.map((p, i) =>
    i === series.length - 1 ? { t: Date.now(), v: live } : { t: p.t, v: Math.round(p.v * scale) },
  );
}

/**
 * The movement callout. OSS Insight caps the history at 120 months, so "gained
 * since the first point" would just restate the headline for any repo older
 * than ten years — the last year is the figure that actually says something.
 * Younger repos get the whole run, which is the same thing for them.
 *
 * Nothing rather than a non-positive figure: the series is normalised, not
 * exact, and a repo that genuinely lost stars is better served by no callout
 * than by a red one built on an approximation.
 */
function starDelta(series: MetricPoint[], live: number): MetricVideoData["delta"] {
  const yearAgo = series[series.length - 13];
  const from = yearAgo ?? series[0]!;
  const gained = live - from.v;
  if (gained <= 0) return null;
  const span = yearAgo ? "in the last 12 months" : `over ${series.length} months`;
  return { value: gained, label: `+${gained.toLocaleString("en-US")} ${span}` };
}

export async function getStarCount(input: string): Promise<MetricVideoData> {
  const { owner, repo } = parseRepo(input);
  const data = await fetchRepo(owner, repo);
  const [series, avatar] = await Promise.all([
    fetchStarHistory(data.full_name, data.stargazers_count),
    inlineImage(avatarUrl(data.owner.avatar_url)),
  ]);

  return {
    source: "github-stars",
    title: data.full_name,
    subtitle: "GitHub Stars",
    value: data.stargazers_count,
    unit: data.stargazers_count === 1 ? "star" : "stars",
    delta: series ? starDelta(series, data.stargazers_count) : null,
    series,
    avatar,
    url: data.html_url,
    accent: "#3b6ef6",
  };
}
