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

/** Join a template-relative path (a poster or asset route) onto the API's own origin. */
export function templateApiUrl(path: string): string {
  return `${API_URL}${path}`;
}
