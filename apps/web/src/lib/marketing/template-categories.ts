import type { TemplateTag } from "@genmotion/templates/types";

/**
 * One SEO landing page per template tag — "Launch Video Templates",
 * "Announcement Templates", and so on. Same gallery component as `/templates`
 * itself (see the category route), just pre-filtered to the tag and carrying
 * its own title/description/meta, so each one can actually rank for its own
 * search intent instead of every tag competing for the one generic page.
 *
 * Hand-authored rather than derived from `TEMPLATE_TAGS` — the slug and SEO
 * copy for a tag isn't mechanical, and a bare enum-to-title-case pass reads
 * exactly like what it is.
 */
export interface TemplateCategory {
  tag: TemplateTag;
  /** URL segment — /templates/category/<slug>. */
  slug: string;
  /** <h1> on the page itself. */
  heading: string;
  /** <title> — distinct from `heading` so it can carry the brand suffix and
   *  read more like a search query than a page headline. */
  metaTitle: string;
  description: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    tag: "Launch Video",
    slug: "launch-video",
    heading: "Launch video templates",
    metaTitle: "Launch Video Templates — GenMotion",
    description:
      "Product launch videos you can take apart and remix — the reveal, the feature walkthrough, the closing brand mark. Real scenes, real assets, ready to make your own.",
  },
  {
    tag: "Announcement",
    slug: "announcement",
    heading: "Announcement video templates",
    metaTitle: "Announcement Video Templates — GenMotion",
    description:
      "Templates built for a milestone announcement — a funding round, a growth number, a big update. Remix one and swap in your own story.",
  },
  {
    tag: "Promotional",
    slug: "promotional",
    heading: "Promotional video templates",
    metaTitle: "Promotional Video Templates — GenMotion",
    description:
      "Finished promo videos for a product, a feature, or a brand moment — take one apart and remix it into a project of your own.",
  },
  {
    tag: "Social Media",
    slug: "social-media",
    heading: "Social media video templates",
    metaTitle: "Social Media Video Templates — GenMotion",
    description:
      "Vertical, feed-ready templates built for social — chat-app ads, feature demos, and more. Remix one into a project of your own.",
  },
  {
    tag: "Educational",
    slug: "educational",
    heading: "Educational video templates",
    metaTitle: "Educational Video Templates — GenMotion",
    description:
      "Templates for explaining an idea clearly — built to remix into a video that teaches something, not just sells it.",
  },
  {
    tag: "Tutorial",
    slug: "tutorial",
    heading: "Tutorial video templates",
    metaTitle: "Tutorial Video Templates — GenMotion",
    description:
      "Step-by-step, walkthrough-style templates — remix one into a tutorial video of your own.",
  },
];

export function getTemplateCategory(slug: string): TemplateCategory | undefined {
  return TEMPLATE_CATEGORIES.find((c) => c.slug === slug);
}
