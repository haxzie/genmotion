import type { MetricPoint, MetricVideoData } from "../types";
import { SourceError, fetchJson, inlineImage } from "./fetch";

/**
 * GitHub star count and star history.
 *
 * `GITHUB_TOKEN` is optional — `/repos/{owner}/{repo}` is public — but set it in
 * production, because unauthenticated callers get only 60 requests per hour per
 * IP.
 *
 * The history does NOT come from GitHub. `/repos/{o}/{r}/stargazers` is
 * unreliable for this: it needs auth, is ordered oldest-first, and stops
 * paginating at 400 pages (~40,000 stars), so the recent end of a popular
 * repo's timeline is unreachable even when it does answer. It comes instead
 * from OSS Insight, which derives it from GH Archive's public event stream —
 * no auth, no star ceiling, and monthly totals back to the repo's first star.
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

export async function getStarCount(input: string): Promise<MetricVideoData> {
  const { owner, repo } = parseRepo(input);
  const data = await fetchRepo(owner, repo);

  return {
    source: "github-stars",
    title: data.full_name,
    subtitle: "GitHub Stars",
    value: data.stargazers_count,
    unit: data.stargazers_count === 1 ? "star" : "stars",
    // The repo endpoint carries no historical figure, and there is no cheap way
    // to get one — so no delta rather than an invented one.
    delta: null,
    series: null,
    avatar: await inlineImage(avatarUrl(data.owner.avatar_url)),
    url: data.html_url,
    accent: "#3b6ef6",
  };
}

/** OSS Insight's star-history endpoint. Public, unauthenticated, ~100 req/min. */
const OSSINSIGHT = "https://api.ossinsight.io/v1/repos";

interface StarHistoryResponse {
  data?: { rows?: { date?: string; stargazers?: string }[] };
}

/**
 * Cumulative star totals per month, plus today's exact figure.
 *
 * Two sources on purpose: OSS Insight supplies the shape of the curve, and
 * GitHub supplies the headline number. OSS Insight's newest bucket is the
 * current month and can trail by a few hours, so the last point is replaced
 * with GitHub's live `stargazers_count` — otherwise the curve would land
 * somewhere slightly below the number printed above it.
 */
export async function getStarHistory(input: string): Promise<MetricVideoData> {
  const { owner, repo } = parseRepo(input);
  const data = await fetchRepo(owner, repo);

  // Ask under the repo's *canonical* name. A transferred repo returns no rows
  // under its old one — facebook/react is empty, react/react is complete — and
  // `full_name` is GitHub's answer to where it lives now.
  const body = await fetchJson<StarHistoryResponse>(
    `${OSSINSIGHT}/${data.full_name}/stargazers/history/`,
    {
      revalidate: 21_600,
      notFound: `No star history available for ${data.full_name}.`,
    },
  );

  const series: MetricPoint[] = (body.data?.rows ?? [])
    .map((row) => ({ t: Date.parse(`${row.date}T00:00:00Z`), v: Number(row.stargazers) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))
    .sort((a, b) => a.t - b.t);

  if (series.length < 2) {
    throw new SourceError(
      422,
      `${data.full_name} doesn't have enough star history to chart yet.`,
    );
  }

  // Close the curve on the live count rather than the month bucket.
  series[series.length - 1] = { t: Date.now(), v: data.stargazers_count };

  const months = series.length;
  const gained = data.stargazers_count - series[0]!.v;

  return {
    source: "github-star-history",
    title: data.full_name,
    subtitle: "GitHub star history",
    value: data.stargazers_count,
    unit: "stars",
    delta: {
      value: gained,
      label: `+${gained.toLocaleString("en-US")} over ${months} months`,
    },
    series,
    avatar: await inlineImage(avatarUrl(data.owner.avatar_url)),
    url: data.html_url,
    accent: "#f5b800",
  };
}
