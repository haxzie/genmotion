import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "../rate-limit";
import type { MetricVideoData } from "../types";
import { SourceError } from "./fetch";

/**
 * Wrap a source resolver into a route handler: rate limit, read the `q` query
 * parameter, map failures onto a status the tool UI can show verbatim.
 *
 * Every generator takes exactly one free-text input (a repo, a package, a
 * channel), so `q` is the whole request surface.
 */
export function toolRoute(
  resolve: (query: string) => Promise<MetricVideoData>,
): (request: Request) => Promise<NextResponse> {
  return async function handler(request: Request) {
    const limit = rateLimit(clientKey(request));
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Give it a minute." },
        { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
      );
    }

    const query = new URL(request.url).searchParams.get("q")?.trim();
    if (!query) {
      return NextResponse.json({ error: "Nothing to look up." }, { status: 400 });
    }
    if (query.length > 200) {
      return NextResponse.json({ error: "That input is too long." }, { status: 400 });
    }

    try {
      const data = await resolve(query);
      return NextResponse.json(data, {
        // The upstream calls are already cached by revalidate; this lets a
        // browser or CDN reuse the assembled payload too.
        headers: { "cache-control": "public, max-age=300, stale-while-revalidate=3600" },
      });
    } catch (error) {
      if (error instanceof SourceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error("[tools] unexpected source failure:", error);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
  };
}
