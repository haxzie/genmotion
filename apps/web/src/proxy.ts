import { NextResponse, type NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

/** Matches the better-auth session cookie, with or without the __Secure- prefix. */
const SESSION_COOKIE = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=/;

/**
 * Sends signed-in visitors from the marketing home straight to the app.
 *
 * This deliberately lives in the proxy rather than in the page. Reading
 * cookies/headers during render opts the route out of static generation, and
 * Next then serves it `Cache-Control: private, no-cache, no-store` — which
 * stops social crawlers from storing a link card, so X renders no preview for
 * the site's most-shared URL. Every other marketing page is `public`; keeping
 * the redirect out of render keeps `/` that way too.
 *
 * The proxy runs on every request regardless, so moving the check here costs
 * nothing and leaves the HTML itself cacheable.
 */
export async function proxy(request: NextRequest) {
  const cookie = request.headers.get("cookie") ?? "";

  // Crawlers and logged-out visitors carry no session cookie, so they fall
  // through to the cached page without an auth round-trip.
  if (!SESSION_COOKIE.test(cookie)) return NextResponse.next();

  try {
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { user?: unknown } | null;
      if (data?.user) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  } catch {
    // Never block the public page on an auth-service hiccup — the visitor just
    // sees the marketing page, exactly as before this check existed.
  }
  return NextResponse.next();
}

export const config = { matcher: "/" };
