import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";

/**
 * One place to build page metadata so every route ships a complete social card:
 * og:image (with declared dimensions), og:url, og:site_name, a canonical, and a
 * large-image Twitter card. Pages that hand-rolled `openGraph` used to drop the
 * layout's defaults entirely — Next replaces that object rather than merging it
 * — which is how the site ended up with no card image anywhere.
 */

/** The GenMotion account on X, credited on every card. */
export const TWITTER_HANDLE = "@genmotionhq";

/** Default social card — 1200×630, served from /public/og.png. */
export const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "GenMotion — create product launch videos using AI",
} as const;

export type SeoImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

type SeoInput = {
  /** Full <title>, including the “— GenMotion” suffix. */
  title: string;
  description: string;
  /** Site-relative path, e.g. "/blog" or "/" — drives og:url and canonical. */
  path: string;
  type?: "website" | "article" | "video.other";
  /** ISO date; only meaningful for `type: "article"`. */
  publishedTime?: string;
  /** ISO date of the last material revision; only meaningful for articles. */
  modifiedTime?: string;
  /**
   * Overrides the default card (e.g. a showcase video poster). Pass `null` when
   * the route ships an `opengraph-image` file — Next replaces `openGraph.images`
   * rather than merging, so leaving the default here would shadow the generated
   * card with the static /og.png.
   */
  image?: SeoImage | null;
  /** Card title/description, when they should read differently from <title>. */
  ogTitle?: string;
  ogDescription?: string;
};

export function canonicalUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  publishedTime,
  modifiedTime,
  image,
  ogTitle,
  ogDescription,
}: SeoInput): Metadata {
  const url = canonicalUrl(path);
  const cardTitle = ogTitle ?? title;
  const cardDescription = ogDescription ?? description;
  // `null` means "this route generates its own card" — omit the key entirely so
  // Next's opengraph-image file convention fills it in.
  const images = image === null ? undefined : [image ?? OG_IMAGE];
  const shared = {
    title: cardTitle,
    description: cardDescription,
    url,
    siteName: SITE_NAME,
    ...(images ? { images } : {}),
  };

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph:
      type === "article"
        ? { ...shared, type: "article", publishedTime, modifiedTime }
        : type === "video.other"
          ? { ...shared, type: "video.other" }
          : { ...shared, type: "website" },
    twitter: {
      card: "summary_large_image",
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title: cardTitle,
      description: cardDescription,
      ...(images ? { images } : {}),
    },
  };
}
