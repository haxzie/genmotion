import { API_URL } from "@/lib/api";

export interface LatestRelease {
  version: string;
  size: number;
  /** Direct link to the .dmg — what the download button should point at. */
  downloadUrl: string;
}

const GITHUB_REPO = "haxzie/genmotion";

/**
 * The R2 mirror, and the manifest the release workflow writes to it.
 *
 * Same default as the API's `RELEASE_MIRROR_URL`, so a deployment that sets
 * one variable moves both.
 */
const MIRROR_URL = (
  process.env.RELEASE_MIRROR_URL ?? "https://assets.genmotion.dev/desktop"
).replace(/\/$/, "");

/**
 * What the current desktop build is, and where to get it.
 *
 * Three sources, in order, because the four things that produce this answer —
 * the mirror, the API, GitHub, and this site — all deploy independently, and
 * the primary call to action must not depend on all four agreeing.
 *
 * The mirror is first because it is the only one that answers both halves of
 * the question at once: `latest.json` names the version *and* carries the URL
 * of the file for that exact version, written by the same job that uploaded
 * it. It is also the fast copy — 30 MB/s against GitHub's 0.3–1.5 MB/s, which
 * on a 140MB build is the difference between a five second install and a five
 * minute one.
 */
export async function getLatestRelease(): Promise<LatestRelease | null> {
  return (await fromMirror()) ?? (await fromApi()) ?? (await fromGitHub());
}

/**
 * Revalidated rather than fetched per request. Sixty seconds matches the
 * `cache-control` the mirror job puts on `latest.json` itself: that object is
 * the one thing in this chain that changes, and it says how long it is good
 * for. Anything longer here would ignore it.
 */
async function fromMirror(): Promise<LatestRelease | null> {
  try {
    const res = await fetch(`${MIRROR_URL}/latest.json`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      version?: string;
      size?: number;
      url?: string;
    };
    if (!body.version || !body.url) return null;
    return { version: body.version, size: body.size ?? 0, downloadUrl: body.url };
  } catch {
    return null;
  }
}

async function fromApi(): Promise<LatestRelease | null> {
  try {
    const res = await fetch(`${API_URL}/api/releases/latest`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      version?: string;
      tag?: string;
      size?: number;
      filename?: string;
    };
    if (!body.version || !body.filename || !body.tag) return null;
    return {
      version: body.version,
      size: body.size ?? 0,
      downloadUrl: githubAssetUrl(body.tag, body.filename),
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
      downloadUrl: githubAssetUrl(body.tag_name, dmg.name),
    };
  } catch {
    return null;
  }
}

/**
 * Pinned to the tag, not to `latest`.
 *
 * `releases/latest/download/<name>` resolves the release at request time but
 * takes the filename literally, and our filenames carry the version — so the
 * moment the newest release stops holding that exact file, the link 404s while
 * still looking correct. It shipped that way, and broke on the first release
 * where the cached version and the real one disagreed.
 */
function githubAssetUrl(tag: string, filename: string): string {
  return `https://github.com/${GITHUB_REPO}/releases/download/${tag}/${filename}`;
}

/** "137 MB" — one decimal reads as false precision at this size. */
export function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}
