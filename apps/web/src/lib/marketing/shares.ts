import { API_URL } from "@/lib/api";

/**
 * A shared video, as its public page reads it.
 *
 * Fetched from the API rather than the database — apps/web has no DB access at
 * all, by design — through the anonymous `/api/shares/s/:slug` route.
 */
export interface SharedVideo {
  slug: string;
  title: string;
  description: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  sizeBytes: number | null;
  createdAt: string;
  hasPoster: boolean;
  author: { name: string; image: string | null } | null;
}

/**
 * How long the *list* of shares may be stale. Only used where staleness is
 * harmless — a sitemap that names a withdrawn video for a few minutes costs
 * nothing, because the page it points at will say so.
 */
const LIST_REVALIDATE_SECONDS = 60;

/**
 * `null` for absent, `"gone"` for withdrawn — the page answers differently for
 * each.
 *
 * Read live, with no caching at all. This looked like an obvious place for
 * `revalidate`, and it was measured instead: with a cached fetch, a page whose
 * video had been withdrawn went on serving the old markup — a player pointed at
 * bytes that no longer existed — well past the revalidate window.
 *
 * Taking something off the internet is the one operation here that has to be
 * believed immediately, so it does not get to depend on a cache expiring. The
 * cost is one indexed row read per view, and the API answers with
 * `Cache-Control: public, max-age=300`, so a CDN in front still absorbs the
 * traffic — it just cannot outlive a takedown by itself.
 */
export async function getSharedVideo(
  slug: string,
): Promise<SharedVideo | null | "gone"> {
  try {
    const res = await fetch(`${API_URL}/api/shares/s/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (res.status === 410) return "gone";
    if (!res.ok) return null;
    return (await res.json()) as SharedVideo;
  } catch {
    return null;
  }
}

export function shareVideoUrl(slug: string): string {
  return `${API_URL}/api/shares/s/${encodeURIComponent(slug)}/video`;
}

export function sharePosterUrl(slug: string): string {
  return `${API_URL}/api/shares/s/${encodeURIComponent(slug)}/poster`;
}

export function shareDownloadUrl(slug: string): string {
  return `${API_URL}/api/shares/s/${encodeURIComponent(slug)}/download`;
}

/** "1:04" — the same shape the export list uses. */
export function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole - minutes * 60).padStart(2, "0")}`;
}

/** The aspect ratio a player needs, from the stored dimensions. */
export function aspectRatioOf(width: number | null, height: number | null): string | undefined {
  if (!width || !height) return undefined;
  return `${width}:${height}`;
}

/** Every live share, for the sitemap. Failure yields an empty list rather than a failed build. */
export async function listSharedVideos(): Promise<
  { slug: string; title: string; updatedAt: string }[]
> {
  try {
    const res = await fetch(`${API_URL}/api/shares/public`, {
      next: { revalidate: LIST_REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      items: { slug: string; title: string; updatedAt: string }[];
    };
    return body.items;
  } catch {
    return [];
  }
}
