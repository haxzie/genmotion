import { API_URL } from "@/lib/api";
import type { TemplateCatalog, TemplateSummary } from "@genmotion/templates/types";

/**
 * The template catalog, over HTTP from the hosted API — same route the
 * desktop app browses, same shape. Server components fetch it directly
 * (`getTemplatesPage`, `getAllTemplateSummaries`); the client-side "Load
 * more" button in `TemplatesBrowser` hits the same route straight from the
 * browser, which the API's CORS already allows for this site's own origin.
 *
 * Revalidated rather than cached forever: a template's poster or tags can
 * change without a deploy here, and 5 minutes matches the API's own
 * `Cache-Control` on these responses.
 */
const REVALIDATE_SECONDS = 300;

export async function getTemplatesPage(
  { cursor, limit }: { cursor?: string; limit?: number } = {},
): Promise<TemplateCatalog | null> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  try {
    const res = await fetch(`${API_URL}/api/templates${qs ? `?${qs}` : ""}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as TemplateCatalog;
  } catch {
    return null;
  }
}

/**
 * Every template, walking every page.
 *
 * For `generateStaticParams`, the sitemap, and the gallery's JSON-LD — each
 * wants the complete catalog rather than one page of it, regardless of how
 * the visible gallery paginates. The catalog is small enough that this costs
 * a handful of requests, all against the API's own in-memory cache.
 */
export async function getAllTemplateSummaries(): Promise<TemplateSummary[]> {
  const all: TemplateSummary[] = [];
  let cursor: string | undefined;
  for (let guard = 0; guard < 100; guard++) {
    const page = await getTemplatesPage({ cursor, limit: 100 });
    if (!page) break;
    all.push(...page.templates);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return all;
}

/**
 * One template's card-level data, by id.
 *
 * Used to be a heavier "detail" fetch carrying bundled scene code — gone now
 * that every page plays the pre-rendered video instead, so this is exactly
 * `TemplateSummary`, the same shape the list already returns per template.
 */
export async function getTemplateSummary(id: string): Promise<TemplateSummary | null> {
  try {
    const res = await fetch(`${API_URL}/api/templates/${id}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as TemplateSummary;
  } catch {
    return null;
  }
}

/**
 * Other templates worth showing under this one — ranked by how many tags
 * they share with it (ties broken by publish date, newest first), padded
 * out with the catalog's most recent templates if too few share a tag. The
 * catalog is small enough that "related" degrading to "recent" reads as a
 * reasonable fallback rather than a mistake.
 */
export function getRelatedTemplates(
  template: TemplateSummary,
  catalog: TemplateSummary[],
  limit = 4,
): TemplateSummary[] {
  return catalog
    .filter((t) => t.id !== template.id)
    .map((t) => ({
      template: t,
      sharedTags: t.tags.filter((tag) => template.tags.includes(tag)).length,
    }))
    .sort((a, b) => {
      if (b.sharedTags !== a.sharedTags) return b.sharedTags - a.sharedTags;
      return a.template.publishedAt < b.template.publishedAt ? 1 : -1;
    })
    .slice(0, limit)
    .map(({ template: t }) => t);
}

/** "Sep 18, 2026" from a `YYYY-MM-DD` — pinned to UTC and en-US so server and client agree. */
export function formatPublished(publishedAt: string): string {
  return new Date(`${publishedAt}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Join a template-relative path (a poster or asset route) onto the API's own origin. */
export function templateApiUrl(path: string): string {
  return `${API_URL}${path}`;
}

/**
 * A template as schema.org's `VideoObject`, for the pages' JSON-LD.
 *
 * One builder rather than three hand-written copies: the gallery, category
 * and detail pages all describe the same video, and Google's video rich
 * results want the same required set everywhere — `name`, `description`,
 * `thumbnailUrl`, `uploadDate`, and a `contentUrl` that is the actual MP4,
 * not the poster.
 */
export function templateVideoObject(t: TemplateSummary, siteUrl: string) {
  return {
    "@type": "VideoObject",
    name: t.title,
    description: t.description,
    thumbnailUrl: templateApiUrl(t.posterPath),
    contentUrl: templateApiUrl(`${t.videoPath}?v=${t.revision}`),
    uploadDate: t.publishedAt,
    duration: `PT${Math.round(t.durationInFrames / t.fps)}S`,
    width: t.width,
    height: t.height,
    keywords: t.tags.join(", "),
    url: `${siteUrl}/templates/${t.id}`,
  };
}
