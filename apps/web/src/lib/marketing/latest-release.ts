import { API_URL } from "@/lib/api";

export interface LatestRelease {
  version: string;
  tag: string;
  size: number;
  publishedAt: string;
  downloadUrl: string;
  filename: string;
}

/**
 * What the current desktop build is, for the line under the download button.
 *
 * Revalidated rather than fetched per request: the answer changes only when a
 * release is published, and the API is already caching it — this just keeps the
 * marketing page from making a network call on every render.
 *
 * Returns null instead of throwing. A missing version line is a cosmetic loss;
 * a home page that 500s because GitHub is slow is not.
 */
export async function getLatestRelease(): Promise<LatestRelease | null> {
  try {
    const res = await fetch(`${API_URL}/api/releases/latest`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as LatestRelease;
  } catch {
    return null;
  }
}

/** "137 MB" — one decimal reads as false precision at this size. */
export function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}
