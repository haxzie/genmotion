/**
 * Absolute URL for a path the API handed back.
 *
 * Every path in a template payload is relative on purpose, so it can be joined
 * onto whichever base the client reached the API on. Here that is the loopback
 * server, which makes posters and video same-origin — the only source the
 * renderer's CSP allows for `media-src`.
 *
 * Its own module so the gallery and the lightbox it opens can both have it
 * without importing each other.
 */
export function templateAssetUrl(path: string, revision?: string | null): string {
  return `${window.__GM_API_URL__}${path}${revision ? `?v=${revision}` : ""}`;
}
