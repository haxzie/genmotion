// genmotion.dev is the live host. The fallback matters: production doesn't set
// NEXT_PUBLIC_SITE_URL, so this value is what every canonical, og:url and
// og:image resolves against.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://genmotion.dev";
export const SITE_NAME = "GenMotion";
