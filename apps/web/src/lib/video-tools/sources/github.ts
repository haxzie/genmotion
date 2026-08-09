import type { MetricVideoData } from "../types";
import { SourceError, fetchJson, inlineImage } from "./fetch";

/**
 * GitHub star count.
 *
 * `GITHUB_TOKEN` is optional here — `/repos/{owner}/{repo}` is public — but set
 * it in production, because unauthenticated callers get only 60 requests per
 * hour per IP.
 *
 * Deliberately no star history and no stargazer avatars: GitHub does not expose
 * *who* starred a repository. `/repos/{owner}/{repo}/stargazers` answers 404 and
 * the GraphQL `stargazers` connection returns zero edges, for any repo, with any
 * token (`/subscribers` behaves the same way, while `/forks` and
 * `/contributors` are fine — it's the "which humans follow this repo" lists that
 * are restricted). Star counts are available; star identities and timestamps are
 * not. Don't rebuild either feature on those endpoints.
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
