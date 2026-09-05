/**
 * Where to send the browser after sign-in or onboarding.
 *
 * Only same-origin relative paths are honoured — the value comes from a URL
 * anyone can craft, and `//evil.example` is a relative path to `new URL` but
 * an absolute one to a browser.
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

/**
 * The current page as a `next` value, so the user comes back here once they
 * have signed in (or finished onboarding). Browser-only by nature.
 */
export function currentPathForNext(): string {
  return `${window.location.pathname}${window.location.search}`;
}
