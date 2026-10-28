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

/**
 * What to play for a template, always as a loopback path.
 *
 * A summary now also carries `videoUrl`/`previewUrl` pointing straight at the
 * CDN, and this deliberately ignores them: `media-src` here is this origin
 * and nothing else, so an absolute URL would simply be blocked. The loopback
 * server follows the API's redirect to the same CDN on our behalf, which
 * costs one hop and keeps the renderer talking to exactly one origin.
 *
 * `preview` picks the small rendition when the template has been re-rendered
 * since previews existed, and the full video when it hasn't.
 */
export function templateVideoSrc(
  template: { videoPath: string; previewPath: string | null; revision: string },
  kind: "preview" | "full",
): string {
  const path =
    kind === "preview" ? (template.previewPath ?? template.videoPath) : template.videoPath;
  return templateAssetUrl(path, template.revision);
}
