import { Hono } from "hono";
import { env } from "../env";

/**
 * Where the marketing site gets its download link.
 *
 * Public and unauthenticated on purpose — this is what the Download button on
 * the home page points at, and asking someone to sign in before they can try
 * the app defeats the point of shipping a desktop app at all.
 *
 * GitHub is the source of truth rather than a version pinned in this repo: the
 * release workflow publishes the DMG, and a number copied into the web app is
 * a number that will eventually be wrong.
 */
export const releaseRoutes = new Hono();

const GITHUB_API = "https://api.github.com";
const DOWNLOAD_PATH = "/api/releases/latest/download";

/**
 * GitHub allows 60 unauthenticated requests an hour per IP, which one busy
 * afternoon on the marketing page would exhaust — and the answer only changes
 * when a release is published. Ten minutes is far inside the rate limit and
 * still picks up a new release while you are looking at it.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;

/** What both routes need. `assetUrl` never leaves this module. */
interface Release {
  version: string;
  tag: string;
  size: number;
  publishedAt: string;
  filename: string;
  /** The GitHub *API* url for the asset — needs a token, returns a redirect. */
  assetUrl: string;
  /** The public url. Useless on a private repo; correct once public. */
  browserUrl: string;
}

interface GitHubAsset {
  name: string;
  size: number;
  url: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  published_at: string;
  draft: boolean;
  assets: GitHubAsset[];
}

let cached: { at: number; value: Release | null } | null = null;

function headers(): Record<string, string> {
  return {
    accept: "application/vnd.github+json",
    "user-agent": "genmotion-api",
    ...(env.GITHUB_TOKEN ? { authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
  };
}

/** The newest published release carrying a .dmg, or null if there isn't one. */
async function fetchLatest(): Promise<Release | null> {
  const res = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_RELEASE_REPO}/releases/latest`,
    { headers: headers(), signal: AbortSignal.timeout(10_000) },
  );
  // 404 is the ordinary "nothing published yet" answer, not a fault — GitHub
  // returns it for a repo whose only releases are drafts, too.
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub returned ${res.status} ${res.statusText}`);

  const release = (await res.json()) as GitHubRelease;
  if (release.draft) return null;

  const dmg = release.assets.find((a) => a.name.toLowerCase().endsWith(".dmg"));
  if (!dmg) return null;

  return {
    version: release.tag_name.replace(/^desktop-v/, "").replace(/^v/, ""),
    tag: release.tag_name,
    size: dmg.size,
    publishedAt: release.published_at,
    filename: dmg.name,
    assetUrl: dmg.url,
    browserUrl: dmg.browser_download_url,
  };
}

async function latest(): Promise<Release | null> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  try {
    const value = await fetchLatest();
    cached = { at: Date.now(), value };
    return value;
  } catch (err) {
    console.error("[releases] could not read the latest release:", err);
    // Serve a stale answer over an error: a download link that is one release
    // behind is worth more to a visitor than a broken button.
    if (cached) return cached.value;
    throw err;
  }
}

/**
 * Absolute url for this deployment.
 *
 * Taken from the request rather than `env.API_URL`, which is optional and so
 * can be — and locally was — undefined, producing "undefined/api/…".
 */
function downloadUrl(requestUrl: string): string {
  try {
    return new URL(DOWNLOAD_PATH, new URL(requestUrl).origin).toString();
  } catch {
    return DOWNLOAD_PATH;
  }
}

/** What the marketing page renders: version, size, and where to send people. */
releaseRoutes.get("/latest", async (c) => {
  try {
    const release = await latest();
    if (!release) return c.json({ error: "No release published yet" }, 404);
    return c.json({
      version: release.version,
      tag: release.tag,
      size: release.size,
      publishedAt: release.publishedAt,
      filename: release.filename,
      downloadUrl: downloadUrl(c.req.url),
    });
  } catch {
    return c.json({ error: "Could not reach GitHub" }, 502);
  }
});

/**
 * Send the browser to the DMG itself.
 *
 * A redirect rather than a proxy: the file is ~140MB and streaming it through
 * the API would tie up a connection for the length of every download to save
 * nobody anything.
 *
 * While the repo is private, `browser_download_url` is useless to an anonymous
 * browser — GitHub answers it with a login page. Asking the *asset API* for
 * `application/octet-stream` with a token gets a 302 to a short-lived signed
 * URL that needs no credentials, which is what makes the button work before
 * the repo goes public. On a public repo the browser url already works, so the
 * extra round-trip is skipped.
 */
releaseRoutes.get("/latest/download", async (c) => {
  let release: Release | null;
  try {
    release = await latest();
  } catch {
    return c.json({ error: "Could not reach GitHub" }, 502);
  }
  if (!release) return c.json({ error: "No release published yet" }, 404);

  if (!env.GITHUB_TOKEN) return c.redirect(release.browserUrl, 302);

  const asset = await fetch(release.assetUrl, {
    headers: { ...headers(), accept: "application/octet-stream" },
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  const location = asset.headers.get("location");
  if (!location) {
    console.error(`[releases] asset request returned ${asset.status}, no redirect`);
    return c.json({ error: "Could not resolve the download" }, 502);
  }
  return c.redirect(location, 302);
});
