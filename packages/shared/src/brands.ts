import { z } from "zod";

/**
 * A brand as it is kept on disk: `brand.json` in a folder of the user's own
 * material.
 *
 * The folder is the feature. The desktop app owns it (`~/.genmotion/brands`,
 * beside the projects folder) so that dropping a logo in is something a person
 * can do in Finder, which means every path in here is hand-editable and the
 * schema is the only thing standing between a typo and a read outside the
 * brand. Hence `brandRelativePath`, which is the same containment rule the
 * project manifest uses for the same reason.
 *
 * What it is *for*: the desktop system prompt already tells the agent that a
 * brand's identity is law and that `components/brand.ts` is where a video
 * re-skins from. It never had anywhere to learn the identity from. This is
 * that source, and the app generates the module from it.
 */

/**
 * A file inside the brand folder. Relative, forward-slashed, contained.
 *
 * Dot directories are refused along with `..`: a brand folder sits in the
 * user's home, and "read the file this JSON names" must never be a way to
 * reach `.ssh` the way it must never be a way to reach the disk root.
 */
const brandRelativePath = z
  .string()
  .min(1)
  .refine((p) => !p.startsWith("/") && !/^[A-Za-z]:/.test(p), {
    message: "must be relative to the brand folder",
  })
  .refine((p) => !p.split("/").includes(".."), {
    message: "must not escape the brand folder",
  })
  .refine((p) => !p.split("/").some((seg) => seg.startsWith(".")), {
    message: "must not point inside a dot-directory",
  });

/** `#rgb`, `#rrggbb` or `#rrggbbaa`, which is what a brand guide quotes. */
const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "must be a hex colour like #1d2bf0");

/**
 * Where a value came from.
 *
 * `import` means a URL import guessed it. The distinction is shown in the UI
 * and it matters: a palette scraped off a landing page is a starting point a
 * person should look at, and one presented as settled is a wrong blue nobody
 * re-checks.
 */
export const BRAND_VALUE_SOURCES = ["user", "import"] as const;
export type BrandValueSource = (typeof BRAND_VALUE_SOURCES)[number];
const valueSource = z.enum(BRAND_VALUE_SOURCES).default("user");

/**
 * What a colour is for.
 *
 * Deliberately short. These are the roles the generated `components/brand.ts`
 * can name, and a longer list would be a brand guide's job, not a video's: a
 * scene needs to know what the ground is, what the ink is and what the one
 * accent is.
 */
export const BRAND_COLOR_ROLES = ["primary", "accent", "background", "ink", "muted", "other"] as const;
export type BrandColorRole = (typeof BRAND_COLOR_ROLES)[number];

export const brandColorSchema = z.object({
  /** As the brand guide calls it, e.g. "Volt" — shown in the UI, not in code. */
  name: z.string().min(1).max(60).optional(),
  hex: hexColor,
  role: z.enum(BRAND_COLOR_ROLES).default("other"),
  source: valueSource,
});

/** Which slot in the type system a face fills. */
export const BRAND_FONT_ROLES = ["display", "body", "mono"] as const;
export type BrandFontRole = (typeof BRAND_FONT_ROLES)[number];

/**
 * One weight and style of a family, as a file in `fonts/`.
 *
 * A family is rarely one file: a site ships a regular, a bold and an italic,
 * or one variable font covering the range. The agent needs the actual bytes to
 * set type that matches, and it needs to know which file is which weight to
 * pick the right one.
 */
export const brandFontFileSchema = z.object({
  file: brandRelativePath,
  /** Absent for a variable font, which covers the whole range. */
  weight: z.number().int().min(1).max(1000).optional(),
  style: z.enum(["normal", "italic"]).default("normal"),
  /** True when the file is a variable font: one file, every weight. */
  variable: z.boolean().default(false),
});

export const brandFontSchema = z.object({
  role: z.enum(BRAND_FONT_ROLES).default("body"),
  /** The family name, as CSS would need it. */
  family: z.string().min(1).max(120),
  /**
   * The real files, when the brand has them.
   *
   * Empty is normal and not a problem: plenty of brands use a face that is
   * already on the machine or available from Google Fonts, and a family name
   * alone is enough for the agent to set type. Files matter for a licensed
   * face, which is exactly the case where a name alone produces a video set
   * in Helvetica instead.
   */
  files: z.array(brandFontFileSchema).max(12).default([]),
  source: valueSource,
});

/**
 * Which logo this is.
 *
 * `mark` is the symbol alone, `wordmark` the name set as type, `lockup` the
 * two together. The agent is told to use the real file and never redraw one,
 * so it has to be able to tell which file is which.
 */
export const BRAND_LOGO_VARIANTS = ["mark", "wordmark", "lockup", "icon"] as const;
export type BrandLogoVariant = (typeof BRAND_LOGO_VARIANTS)[number];

/** The ground a logo file is drawn for. `any` is a logo that works on both. */
export const BRAND_LOGO_GROUNDS = ["light", "dark", "any"] as const;
export type BrandLogoGround = (typeof BRAND_LOGO_GROUNDS)[number];

export const brandLogoSchema = z.object({
  file: brandRelativePath,
  variant: z.enum(BRAND_LOGO_VARIANTS).default("mark"),
  on: z.enum(BRAND_LOGO_GROUNDS).default("any"),
  source: valueSource,
});

/** Slug rules, matching a project folder's: this is also the folder name. */
export const BRAND_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export const brandManifestSchema = z.object({
  $schema: z.string().optional(),
  /** Folder name, and the handle `@acme` in the composer resolves. */
  id: z.string().min(1).max(64).regex(BRAND_ID_PATTERN, "must be a lowercase slug"),
  name: z.string().min(1).max(120),
  site: z.string().url().optional(),
  colors: z.array(brandColorSchema).max(24).default([]),
  fonts: z.array(brandFontSchema).max(8).default([]),
  logos: z.array(brandLogoSchema).max(16).default([]),
  /**
   * What the company does, in a sentence or two.
   *
   * Taken from the site's own meta description on import. It is the one piece
   * of a brand that tells an agent what the video is *about* rather than what
   * it should look like, which is why it is worth carrying even though nothing
   * renders it.
   */
  description: z.string().max(600).optional(),
  /** How the brand talks, in the user's own words. Read, not parsed. */
  voice: z.string().max(2000).optional(),
  /**
   * Someone else's brand.
   *
   * Set when a brand is imported from a domain, cleared when the user says it
   * is theirs. It changes nothing about how a video is built; it is there so
   * the app can say, at the point a video leaves the machine, that it carries
   * marks the user does not own.
   */
  thirdParty: z.boolean().default(false),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export type BrandColor = z.infer<typeof brandColorSchema>;
export type BrandFontFile = z.infer<typeof brandFontFileSchema>;
export type BrandFont = z.infer<typeof brandFontSchema>;
export type BrandLogo = z.infer<typeof brandLogoSchema>;
export type BrandManifest = z.infer<typeof brandManifestSchema>;
/** As written to disk: defaults may be omitted and are filled in on read. */
export type BrandManifestInput = z.input<typeof brandManifestSchema>;

export const BRAND_FILE = "brand.json";
export const BRAND_DOC = "BRAND.md";

/**
 * The subfolders a brand folder has, and what each is for.
 *
 * One list, because it is the drag-and-drop targets in the UI, the directories
 * the scaffold creates, and the sections `brand_overview` lists — three places
 * that must not drift.
 */
export const BRAND_DIRS = [
  { dir: "logos", label: "Logos", what: "The real mark, wordmark and lockup files. SVG where there is one." },
  { dir: "fonts", label: "Fonts", what: "Licensed faces, as otf, ttf or woff2." },
  { dir: "references", label: "References", what: "Videos, posters and screenshots of work that is on-brand." },
  { dir: "assets", label: "Assets", what: "Product shots, icons, UI captures." },
] as const;
export type BrandDir = (typeof BRAND_DIRS)[number]["dir"];

/** A brand as the renderer lists it: the manifest plus what is on disk. */
export interface BrandSummary extends BrandManifest {
  /** Absolute, for "Reveal in Finder" and for the prompt's folder line. */
  dir: string;
  /** Files per subfolder, so a card can say "3 logos, 12 references". */
  counts: Record<BrandDir, number>;
  /** Epoch ms a project last had this brand attached. Absent until one has. */
  lastUsedAt?: number;
}

/* ------------------------------------------------------- reading a website */

/**
 * What a website looks like it says about a brand.
 *
 * Produced by the API from Firecrawl's `branding` extraction and shown to the
 * user for confirmation before any of it is written. Every field is a
 * suggestion: this type exists so the *shape* of a guess is the same on both
 * sides of the wire, not so a guess can be trusted.
 *
 * Shared because the API builds it and the desktop renders it, and a drift
 * between those two is a dialog that silently shows nothing.
 */
export interface InspectedColor {
  hex: string;
  role: BrandColorRole;
  /** What the site calls it, or what it is used for: "Primary button". */
  label: string;
}

/** A font file the page actually loads, before it has been fetched. */
export interface InspectedFontFile {
  url: string;
  /** `woff2`, `woff`, `otf`, `ttf`. */
  format: string;
  weight?: number;
  style: "normal" | "italic";
  variable: boolean;
  /** How it was found: a `@font-face` rule, or a preload hint. */
  from: "font-face" | "preload";
}

export interface InspectedFont {
  family: string;
  role: BrandFontRole;
  /** The files the site serves for this family, offered for download. */
  files: InspectedFontFile[];
}

export interface InspectedLogo {
  /**
   * An `https:` URL, or a `data:` URI for a logo that was inline SVG on the
   * page. The inline ones are the better find: that is the real mark, at full
   * quality, rather than whatever the favicon happens to be.
   */
  src: string;
  variant: BrandLogoVariant;
  /** Where it came from, shown so the user can tell a mark from a favicon. */
  label: string;
}

export interface BrandInspection {
  /** The URL as it resolved, which may differ from what was typed. */
  url: string;
  name?: string;
  description?: string;
  colors: InspectedColor[];
  fonts: InspectedFont[];
  logos: InspectedLogo[];
  /** Whether the site is designed light or dark, when it is clear. */
  colorScheme?: "light" | "dark";
  /**
   * The extractor's own confidence in the colours, 0 to 1.
   *
   * Surfaced rather than hidden: a low number is the signal to look harder at
   * what is being offered, and a user who is told that checks.
   */
  confidence?: number;
  /** What could not be found, in words the dialog can show as-is. */
  missing: string[];
}
