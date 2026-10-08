/**
 * A vendor's own app icon, via Google's favicon resolver.
 *
 * The filled tile — brand background, brand mark — rather than Simple Icons'
 * monochrome glyph, which is a path on a transparent ground and reads as a
 * sticker next to the ones that aren't. Google's resolver already handles the
 * dozen ways a site can declare an icon, and the API caches what it returns
 * (see `routes/mcp-catalog.ts`), so this costs the vendor nothing.
 */
export const favicon = (domain: string) =>
  `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;
