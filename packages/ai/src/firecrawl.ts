/**
 * The one Firecrawl client.
 *
 * Two callers now: the chat agent's web research, and the brand import behind
 * `/api/brands/inspect`. One module so the key, the timeout and the shape of a
 * failure are decided once — a second copy would drift on exactly the parts
 * that are annoying to debug remotely.
 *
 * Deliberately server-side. The key is billable, so bundling it into the
 * desktop build would hand a credential to every user; that is the same
 * reasoning behind `/api/events` existing rather than a PostHog key in the
 * app. Callers here are API routes and the agent, both of which run on a
 * machine we control.
 */

const FIRECRAWL_API = "https://api.firecrawl.dev/v2";

export type FirecrawlResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

/** Whether this process can reach Firecrawl at all, for callers that want to say so up front. */
export function hasFirecrawlKey(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

export async function firecrawl(
  path: "/scrape" | "/search",
  body: Record<string, unknown>,
  { timeoutMs = 120_000 }: { timeoutMs?: number } = {},
): Promise<FirecrawlResult> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    return {
      ok: false,
      error:
        "Web research is not configured (FIRECRAWL_API_KEY is missing). Proceed with your own design judgment and tell the user web research is unavailable.",
    };
  }
  try {
    const res = await fetch(`${FIRECRAWL_API}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: Record<string, unknown>;
      error?: string;
    };
    if (!res.ok || json.success === false) {
      return {
        ok: false,
        error: `Firecrawl request failed (${res.status}): ${json.error ?? "unknown error"}`,
      };
    }
    return { ok: true, data: json.data ?? (json as Record<string, unknown>) };
  } catch (err) {
    return {
      ok: false,
      error: `Firecrawl request failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
