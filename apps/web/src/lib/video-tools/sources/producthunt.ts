import type { MetricVideoData } from "../types";
import { SourceError, fetchJson, inlineImage } from "./fetch";

/**
 * Product Hunt launch: upvotes, comments, rank and the product icon.
 *
 * Reads the official GraphQL API (v2). `PRODUCTHUNT_TOKEN` is the app's
 * developer token from the API dashboard — it never expires and needs no user
 * context, so a lookup is one server-side POST. The budget is 6,250 complexity
 * points per 15 minutes per app; this query costs a handful, and the hour of
 * data cache in front of it means a launch is fetched once no matter how many
 * people paste it.
 */

const API = "https://api.producthunt.com/v2/api/graphql";

/**
 * A launch's slug, from any of the ways people copy it.
 *
 * Product Hunt has used three URL shapes over the years and all are still live:
 * the legacy `/posts/<slug>`, the current `/products/<product>/launches/<slug>`,
 * and `/products/<product>?launch=<slug>`. The API keys on the launch slug. A
 * bare `/products/<product>` has no launch in it, so the product slug is tried
 * as the launch slug — for a product's first launch they're usually the same.
 */
function parseLaunch(input: string): string {
  const raw = input.trim();
  let url: URL | null = null;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    /* not a URL */
  }

  if (url && /(^|\.)producthunt\.com$/i.test(url.hostname)) {
    const fromQuery = url.searchParams.get("launch");
    if (fromQuery) return fromQuery;
    const path = url.pathname.replace(/\/+$/, "");
    const launch = /^\/products\/[^/]+\/launches\/([^/]+)/.exec(path);
    if (launch) return launch[1]!;
    const legacy = /^\/(?:posts|products)\/([^/]+)/.exec(path);
    if (legacy) return legacy[1]!;
    throw new SourceError(400, "That Product Hunt link doesn't point at a launch.");
  }

  if (/^[\w-]+$/.test(raw)) return raw.toLowerCase();
  throw new SourceError(
    400,
    "Paste a Product Hunt launch link — for example producthunt.com/posts/genmotion.",
  );
}

const QUERY = `
  query Launch($slug: String!) {
    post(slug: $slug) {
      id
      name
      tagline
      slug
      url
      votesCount
      commentsCount
      dailyRank
      weeklyRank
      monthlyRank
      featuredAt
      thumbnail { url(width: 200, height: 200) }
    }
  }
`;

interface LaunchResponse {
  data?: {
    post: {
      name: string;
      tagline: string;
      slug: string;
      url: string;
      votesCount: number;
      commentsCount: number;
      dailyRank: number | null;
      weeklyRank: number | null;
      monthlyRank: number | null;
      featuredAt: string | null;
      thumbnail: { url: string } | null;
    } | null;
  };
  errors?: { message: string }[];
}

/** "#1 Product of the Day" — the best rank the launch earned, or nothing. */
function badge(post: NonNullable<NonNullable<LaunchResponse["data"]>["post"]>): string | null {
  const ranks: [number | null, string][] = [
    [post.dailyRank, "Day"],
    [post.weeklyRank, "Week"],
    [post.monthlyRank, "Month"],
  ];
  for (const [rank, period] of ranks) {
    if (rank && rank <= 5) return `#${rank} Product of the ${period}`;
  }
  return null;
}

export async function getProductHuntLaunch(input: string): Promise<MetricVideoData> {
  const token = process.env.PRODUCTHUNT_TOKEN;
  if (!token) {
    throw new SourceError(503, "The Product Hunt tool isn't configured right now.");
  }

  const slug = parseLaunch(input);
  const response = await fetchJson<LaunchResponse>(API, {
    revalidate: 3600,
    headers: { authorization: `Bearer ${token}` },
    body: { query: QUERY, variables: { slug } },
  });

  // GraphQL reports most failures as a 200 with `errors`; a missing post is a
  // 200 with `post: null`.
  if (response.errors?.length) {
    console.error("[tools] Product Hunt query failed:", response.errors);
    throw new SourceError(502, "Product Hunt didn't answer that lookup. Try again in a moment.");
  }
  const post = response.data?.post;
  if (!post) {
    throw new SourceError(404, `Couldn't find a Product Hunt launch called "${slug}".`);
  }

  return {
    source: "producthunt-launch",
    title: post.name,
    subtitle: "Product Hunt upvotes",
    tagline: post.tagline,
    value: post.votesCount,
    unit: post.votesCount === 1 ? "upvote" : "upvotes",
    badge: badge(post),
    secondary: {
      value: post.commentsCount,
      unit: post.commentsCount === 1 ? "comment" : "comments",
    },
    delta: null,
    series: null,
    avatar: await inlineImage(post.thumbnail?.url),
    // The API tags its links with a utm_* trail naming this app; the caption
    // wants the bare launch URL.
    url: post.url.split("?")[0]!,
    accent: "#ff6154",
  };
}
