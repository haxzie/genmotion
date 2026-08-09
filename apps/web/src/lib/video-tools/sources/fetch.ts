/**
 * Shared plumbing for the free tools' upstream data calls.
 *
 * Server-only: this module reads API keys. It must never be imported from a
 * client component.
 */

/** An upstream or input failure with a status the route handler can pass through. */
export class SourceError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SourceError";
  }
}

export interface FetchOptions {
  /** Seconds Next should serve this response from its data cache. */
  revalidate: number;
  headers?: Record<string, string>;
  /** Message shown to the user on a 404 from upstream. */
  notFound?: string;
  /**
   * Set when the credential only buys a higher rate limit and the endpoint is
   * readable anonymously. A rejected credential then retries once without it
   * instead of failing — an expired token left in the environment shouldn't
   * take down a tool that never needed one.
   */
  authIsOptional?: boolean;
}

/**
 * Fetch JSON with Next's data cache in front of it.
 *
 * The cache is the whole abuse story for these endpoints: a popular repo is
 * fetched from upstream once per revalidate window no matter how many visitors
 * ask for it, which keeps us far inside GitHub's and YouTube's quotas.
 */
export async function fetchJson<T>(url: string, options: FetchOptions): Promise<T> {
  const send = async (headers: Record<string, string>) => {
    try {
      return await fetch(url, {
        headers: { accept: "application/json", ...headers },
        next: { revalidate: options.revalidate },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new SourceError(504, "That service didn't respond in time. Try again in a moment.");
    }
  };

  const headers = options.headers ?? {};
  let response = await send(headers);

  // A rejected-but-optional credential: drop it and try again anonymously.
  const authKey = Object.keys(headers).find((k) => k.toLowerCase() === "authorization");
  if (response.status === 401 && options.authIsOptional && authKey) {
    console.warn(
      `[tools] credential rejected, retrying anonymously — check the token in your environment: ${url}`,
    );
    const { [authKey]: _dropped, ...anonymous } = headers;
    response = await send(anonymous);
  }

  if (response.status === 404) {
    throw new SourceError(404, options.notFound ?? "Not found.");
  }
  // GitHub returns 403 for BOTH "you're going too fast" and "this credential
  // isn't allowed to read that", so the status alone can't tell them apart —
  // only an exhausted quota sets x-ratelimit-remaining to 0. Reporting a
  // permission failure as rate limiting sends people off to wait for a limit
  // that will never reset.
  const quotaExhausted =
    response.headers.get("x-ratelimit-remaining") === "0" ||
    response.headers.get("retry-after") !== null;
  if (response.status === 429 || (response.status === 403 && quotaExhausted)) {
    throw new SourceError(429, "We're being rate limited upstream. Try again in a few minutes.");
  }
  if (response.status === 401 || response.status === 403) {
    // Our credential, not the visitor's problem — don't imply they got it wrong.
    console.error(
      `[tools] upstream rejected our credentials (${response.status}): ${url}`,
    );
    throw new SourceError(503, "This tool isn't configured correctly right now.");
  }
  if (!response.ok) {
    throw new SourceError(502, `Upstream request failed (${response.status}).`);
  }

  return (await response.json()) as T;
}

/** Hosts we will inline an avatar from. Anything else is dropped, not proxied. */
const IMAGE_HOSTS = [
  "avatars.githubusercontent.com",
  "yt3.ggpht.com",
  "yt3.googleusercontent.com",
  "lh3.googleusercontent.com",
];

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** 2MB is far above any avatar; it exists to bound a hostile response. */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Download an avatar and return it as a `data:` URI.
 *
 * Done here rather than in the browser because the export rasterizer cannot
 * draw a cross-origin image — every image a template sees has to already be
 * inlined. Returns null rather than throwing: a missing avatar should degrade
 * the video, not fail the request.
 */
export async function inlineImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || !IMAGE_HOSTS.includes(parsed.hostname)) return null;

  try {
    const response = await fetch(parsed, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;

    const type = (response.headers.get("content-type") ?? "").split(";")[0]!.trim();
    if (!IMAGE_TYPES.includes(type)) return null;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) return null;

    return `data:${type};base64,${Buffer.from(buffer).toString("base64")}`;
  } catch {
    return null;
  }
}
