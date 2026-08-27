import { API_URL } from "@/lib/api";

export interface LatestRelease {
  version: string;
  size: number;
  /** Direct link to the .dmg — what the download button should point at. */
  downloadUrl: string;
}

const GITHUB_REPO = "haxzie/genmotion";

/**
 * What the current desktop build is, and where to get it.
 *
 * Two sources, in order. The API is preferred — it caches, and it is the place
 * to add per-platform logic later. GitHub is the fallback because the web app
 * and the API deploy independently: an API a deploy behind must not be able to
 * take the marketing site's primary call to action down with it, which is
 * exactly what it did the first time these shipped apart.
 *
 * Revalidated rather than fetched per request; the answer changes only when a
 * release is published.
 */
export async function getLatestRelease(): Promise<LatestRelease | null> {
  return (await fromApi()) ?? (await fromGitHub());
}

async function fromApi(): Promise<LatestRelease | null> {
  try {
    const res = await fetch(`${API_URL}/api/releases/latest`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      version?: string;
      size?: number;
      filename?: string;
    };
    if (!body.version || !body.filename) return null;
    return {
      version: body.version,
      size: body.size ?? 0,
      downloadUrl: assetUrl(body.filename),
    };
  } catch {
    return null;
  }
}

/** The repo is public, so this needs no credential and no server of ours. */
async function fromGitHub(): Promise<LatestRelease | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { accept: "application/vnd.github+json" }, next: { revalidate: 600 } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      tag_name?: string;
      assets?: { name: string; size: number }[];
    };
    const dmg = body.assets?.find((a) => a.name.toLowerCase().endsWith(".dmg"));
    if (!dmg || !body.tag_name) return null;
    return {
      version: body.tag_name.replace(/^desktop-v/, "").replace(/^v/, ""),
      size: dmg.size,
      downloadUrl: assetUrl(dmg.name),
    };
  } catch {
    return null;
  }
}

/**
 * GitHub resolves `releases/latest/download/<name>` to the newest release
 * carrying that filename, so this stays correct without a redirect of ours.
 */
function assetUrl(filename: string): string {
  return `https://github.com/${GITHUB_REPO}/releases/latest/download/${filename}`;
}

/** "137 MB" — one decimal reads as false precision at this size. */
export function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}
