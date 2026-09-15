/** Brand mark from Simple Icons, in the brand's own colour. */
export const brand = (slug: string, color: string) => `https://cdn.simpleicons.org/${slug}/${color}`;

/** A vendor without a Simple Icons entry: its favicon, via Google's resolver. */
export const favicon = (domain: string) =>
  `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;
