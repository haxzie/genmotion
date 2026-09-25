import { z } from "zod";

/**
 * The curated set a template can be tagged with — shown as pills on the card,
 * the detail page, and the filter row above the gallery. Deliberately closed
 * (not free-form strings): a fixed vocabulary is what makes the filter row
 * make sense, and it's short enough that every template should honestly fit
 * two or three without stretching.
 *
 * "Social Media" belongs on every 9:16 template — the catalog test enforces
 * that pairing rather than deriving the tag at read time, so `template.json`
 * stays the one place a template's tags are declared.
 */
export const TEMPLATE_TAGS = [
  "Social Media",
  "Launch Video",
  "Announcement",
  "Promotional",
  "Educational",
  "Tutorial",
] as const;

export const templateTagSchema = z.enum(TEMPLATE_TAGS);
export type TemplateTag = z.infer<typeof templateTagSchema>;

/**
 * The catalog sidecar — `template.json`, next to the ordinary `project.json`.
 *
 * A sidecar rather than extra manifest keys: `projectManifestSchema` is strict
 * about what a manifest holds, a template folder stays a plain project that the
 * app can open directly, and a remix inherits none of the catalog identity.
 */
export const templateMetaSchema = z.object({
  /** Stable and URL-safe. Must equal the folder name — the catalog test checks it. */
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  /** One sentence, for the gallery card. */
  description: z.string().min(1),
  /**
   * The `<title>` a template's own SEO page renders. Kept separate from
   * `title` because a page title reads best with an intent keyword and the
   * brand name baked in ("Launch Video Template — GenMotion") where the card
   * title is just the template's name — cramming both jobs into one string
   * makes a worse card title. Falls back to `${title} Template — GenMotion`
   * when a template doesn't need anything more specific.
   */
  metaTitle: z.string().min(1).optional(),
  category: z.enum(["intro", "social", "explainer", "product", "data"]),
  /** Two to three, from `TEMPLATE_TAGS`. Shown as pills; filters the gallery. */
  tags: z.array(templateTagSchema).min(2).max(3),
  /**
   * The day the template went into the catalog, `YYYY-MM-DD`. The gallery
   * sorts on it, newest first — so a new template lands on the first page
   * rather than behind a "Load more" nobody presses, which is what a
   * curated-only `order` did once the catalog outgrew one page.
   */
  publishedAt: z.iso.date(),
  /**
   * Whether the marketing home page's curated strip may show this one.
   *
   * A separate flag rather than another entry in `TEMPLATE_TAGS`: those are
   * user-visible pills a visitor filters the gallery by, capped at three per
   * template, and "featured" describes where we put a template rather than
   * what it is — it would eat a pill slot and read as noise on a card. Off by
   * default, so a template is only ever promoted to the home page by someone
   * deciding it should be. The full gallery ignores this entirely; an
   * unfeatured template is listed, searchable and remixable exactly as before.
   */
  featured: z.boolean().default(false),
  /** Breaks ties within a day; lower is earlier. Then title. */
  order: z.number().int().default(100),
  /**
   * Fraction into the first scene where `scripts/poster.mjs` samples its
   * frame. Defaults to 0.6 — late enough that an entrance has settled, early
   * enough that a typical scene's exit hasn't started. Set this when the
   * first scene carries more than one beat and the default would land
   * mid-transition or mid-sentence, as an early multi-headline scene can.
   */
  sampleAt: z.number().min(0).max(1).optional(),
  /**
   * Where `render-video.mjs` last uploaded this template's rendered MP4 in
   * R2 — a record for a human (or another script) to check without listing
   * the bucket, not something a client ever reads. Nothing here serves it
   * directly: R2 isn't public, so every player reaches the video through
   * `GET /api/templates/:id/video` (see `videoPath` in `types.ts`) regardless
   * of what this URL happens to be. Written automatically; never hand-edit it.
   */
  video: z.string().url().optional(),
});

export type TemplateMeta = z.infer<typeof templateMetaSchema>;

/** The sidecar filename. */
export const TEMPLATE_FILE = "template.json";
/** The card image, captured from the template's own first scene. */
export const POSTER_FILE = "poster.jpg";

/**
 * A sample project's sidecar — `sample.json`.
 *
 * Samples are the three projects a brand-new account finds in its workspace.
 * They live beside the templates (`packages/templates/samples/`) and travel
 * over the same bundle format, but they are not in the gallery, have no
 * poster or rendered video, and carry no SEO page — so the sidecar is the
 * bare minimum: an id, a name, a sentence, and an order.
 */
export const sampleMetaSchema = z.object({
  /** Stable and URL-safe. Must equal the folder name. */
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  description: z.string().min(1),
  /** The order they are written into a workspace; lower is first. */
  order: z.number().int().default(100),
});

export type SampleMeta = z.infer<typeof sampleMetaSchema>;

export const SAMPLE_FILE = "sample.json";
