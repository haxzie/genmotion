import { z } from "zod";

/**
 * Skills the chat agent reads: GenMotion's own creative pack, and the user's.
 *
 * A skill is a folder — `SKILL.md` plus `references/` — that teaches the agent
 * how to make one kind of video. The HyperFrames pack vendored into
 * `@genmotion/hyperframes` says how to *build* a composition; this pack says
 * what a good ad, launch or announcement actually looks like.
 *
 * Claude Code reads only `name` and `description` from SKILL.md frontmatter,
 * so everything the product needs — category, aspect ratios, what it requires,
 * which models it recommends — lives in a `skill.json` sidecar beside it. Same
 * reasoning as `template.json` beside `project.json`: the skill folder stays a
 * plain skill that any harness can read, and the catalog metadata has one home.
 *
 * Like `mcp.ts`, this file is pure and browser-safe: the API serves the
 * catalog from it, the desktop main process resolves requirements against it,
 * and the renderer draws cards from it.
 */

/** What a skill *is*, which decides how the agent reaches for it. */
export const SKILL_KINDS = [
  /** A named format with a reference storyboard — "a street-interview ad". */
  "style",
  /** Owns a whole deliverable end to end — "a product launch video". */
  "workflow",
  /** One cross-cutting craft — "getting an AI presenter on screen". */
  "technique",
  /** Knowledge the others load, never chosen on its own. */
  "reference",
] as const;
export type SkillKind = (typeof SKILL_KINDS)[number];

/**
 * The curated set a skill can sit in — the pill row above the Skills grid.
 * Closed rather than free-form for the same reason `TEMPLATE_TAGS` is: a fixed
 * vocabulary is what makes a filter row worth having.
 */
export const SKILL_CATEGORIES = [
  "UGC ads",
  "Launch",
  "Announcement",
  "Social",
  "Brand",
  "Craft",
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const SKILL_ASPECTS = ["9:16", "1:1", "4:5", "16:9"] as const;
export type SkillAspect = (typeof SKILL_ASPECTS)[number];

/**
 * The project engines a skill's guidance actually applies to.
 *
 * A skill in this pack is creative direction — what the video should be —
 * not composition mechanics, so nearly every skill applies to all three; the
 * mechanics of building it are left to the project's own authoring guidance
 * (HyperFrames' `hyperframes-core`, or `SCENE_AUTHORING_GUIDE` for React and
 * Three). Restrict this only for a skill that is genuinely bound to one
 * engine's format, not because its author only tested one.
 */
export const SKILL_ENGINES = ["hyperframes", "react", "three"] as const;
export type SkillEngine = (typeof SKILL_ENGINES)[number];

/** What a generated asset is for, so a recommendation can be matched to a need. */
export const SKILL_MODEL_PURPOSES = [
  "voice",
  "avatar",
  "lipsync",
  "video",
  "image",
  "music",
  "sfx",
] as const;
export type SkillModelPurpose = (typeof SKILL_MODEL_PURPOSES)[number];

/**
 * Something a skill needs that may or may not be there.
 *
 * `mcp` names a marketplace catalog id, which is what lets the agent say
 * "this wants ElevenLabs, and you don't have it" and offer to connect it.
 * `tool` names a built-in GenMotion tool, `capability` a coarser ability, and
 * `skill` another skill to load alongside.
 */
export const skillRequirementSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("mcp"), id: z.string().min(1), why: z.string().min(1).max(160) }),
  z.object({ kind: z.literal("tool"), id: z.string().min(1), why: z.string().min(1).max(160) }),
  z.object({
    kind: z.literal("capability"),
    id: z.enum(["web-research", "ffmpeg", "image-generation", "voiceover", "sfx"]),
    why: z.string().min(1).max(160),
  }),
  z.object({ kind: z.literal("skill"), id: z.string().min(1) }),
]);
export type SkillRequirement = z.infer<typeof skillRequirementSchema>;

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase words joined by hyphens");
const httpsUrl = z.url({ protocol: /^https$/ });

/**
 * `skill.json` — the sidecar beside `SKILL.md`.
 *
 * `description` is duplicated from the SKILL.md frontmatter on purpose and the
 * catalog test holds the two equal: the frontmatter copy is what routes the
 * agent, this copy is what feeds search and the marketplace card, and a drift
 * between them means the card promises something the agent won't do.
 */
export const skillMetaSchema = z
  .object({
    /** Stable slug. Must equal the folder name — the catalog test checks it. */
    id: slug,
    /** The card's title. The SKILL.md frontmatter `name` is the id, not this. */
    title: z.string().min(1).max(60),
    /** Verbatim from the SKILL.md frontmatter. Routes the agent; feeds search. */
    description: z.string().min(1).max(600),
    /** Two lines on the card. Shorter and plainer than `description`. */
    summary: z.string().min(1).max(160),
    kind: z.enum(SKILL_KINDS),
    category: z.enum(SKILL_CATEGORIES),
    tags: z.array(slug).min(1).max(8),
    aspects: z.array(z.enum(SKILL_ASPECTS)).min(1),
    /** The length this format actually works at. Shown on the card. */
    duration: z.object({ minSeconds: z.number().int().positive(), maxSeconds: z.number().int().positive() }),
    engines: z.array(z.enum(SKILL_ENGINES)).min(1),
    requires: z.array(skillRequirementSchema).default([]),
    /** What to generate each asset with, and through which connector. */
    models: z
      .array(
        z.object({
          purpose: z.enum(SKILL_MODEL_PURPOSES),
          model: z.string().min(1),
          /** A GenMotion tool name, or `mcp:<catalog id>`. */
          via: z.string().min(1),
          note: z.string().max(160).optional(),
        }),
      )
      .default([]),
    /**
     * Prompts a real person would type to want this skill. Three to ten.
     * They are functional, not decorative: search embeds them one by one, and
     * the detail panel shows them as "try saying" chips.
     */
    triggers: z.array(z.string().min(4).max(200)).min(3).max(10),
    /** Template catalog ids that demonstrate this format. */
    templates: z.array(slug).default([]),
    author: z.object({ name: z.string().min(1), url: httpsUrl.optional() }),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, "semver"),
    /** An emoji, or an https image. Never a bundled video — see `preview`. */
    icon: z.string().min(1).max(256),
    /** Hosted, never bundled: a pack full of MP4s would double the installer. */
    preview: z.object({ video: httpsUrl.optional(), poster: httpsUrl.optional() }).optional(),
  })
  .refine((s) => s.duration.minSeconds <= s.duration.maxSeconds, {
    message: "duration.minSeconds must not exceed duration.maxSeconds",
    path: ["duration"],
  });

export type SkillMeta = z.infer<typeof skillMetaSchema>;

/**
 * Declare a skill. Validates at module load, so a bad sidecar fails the
 * package's own test rather than landing in a user's marketplace.
 */
export function defineSkill(meta: SkillMeta): SkillMeta {
  return skillMetaSchema.parse(meta);
}

/** Where a skill came from, which decides what the user may do to it. */
export type SkillSource = "first-party" | "user" | "project";

export interface SkillCatalogEntry extends SkillMeta {
  source: SkillSource;
}

export interface SkillCatalog {
  entries: SkillCatalogEntry[];
  /** Bumped when the list changes, so a client can tell a stale copy apart. */
  revision: string;
}

/** A requirement with the answer to "does this machine have it?" filled in. */
export interface ResolvedSkillRequirement {
  kind: SkillRequirement["kind"];
  id: string;
  /** The human name — the MCP catalog entry's, or the id. */
  label: string;
  why?: string;
  installed: boolean;
  /** For an MCP requirement that is installed: how the probe is doing. */
  status?: string;
}

/** An installed skill as the renderer draws it and the agent's search returns it. */
export interface SkillView {
  meta: SkillMeta;
  source: SkillSource;
  enabled: boolean;
  /** False for the bundled pack: it can be switched off, never deleted. */
  removable: boolean;
  /** Absolute path to the skill folder, for "Reveal in Finder" and for Codex. */
  path: string;
  requirements: ResolvedSkillRequirement[];
  /** Things the import found and did not act on, e.g. "ships scripts". */
  warnings: string[];
}

/** The file that carries `SkillMeta`, beside `SKILL.md`. */
export const SKILL_FILE = "skill.json";
export const SKILL_DOC = "SKILL.md";

/**
 * Everything a skill's text is searched over, in one string.
 *
 * One definition, used by the BM25 scorer, by the embedding generator, and by
 * the staleness hash that catches a skill edited without re-running it.
 */
export function skillSearchText(meta: SkillMeta): string {
  return [meta.title, meta.summary, meta.description, meta.category, meta.tags.join(" "), meta.triggers.join(" ")].join(
    "\n",
  );
}

/**
 * The pack's actual file contents, served over the wire.
 *
 * The Claude Agent SDK only takes a plugin as a local filesystem path — there
 * is no "remote plugin" — so this is not how the agent reads a skill live. It
 * is how the desktop app refreshes its local cache of the first-party pack
 * without shipping a new build: fetch this once, write the files to disk, and
 * the existing plugin-path machinery picks the newer copy up from there.
 *
 * Text only in practice (the pack is markdown and JSON), but `encoding`
 * covers a future image the same way `TemplateRemixFile` does for a template.
 */
export const SKILL_BUNDLE_MAX_BYTES = 5 * 1024 * 1024;
export const SKILL_BUNDLE_MAX_FILES_PER_SKILL = 50;

export const skillFileSchema = z.object({
  /** Relative to the skill's own folder, e.g. `"SKILL.md"`, `"references/hook-library.md"`. */
  path: z.string().min(1),
  encoding: z.enum(["text", "base64"]),
  contents: z.string(),
});
export type SkillFile = z.infer<typeof skillFileSchema>;

export const skillBundleEntrySchema = z.object({
  id: slug,
  files: z.array(skillFileSchema).max(SKILL_BUNDLE_MAX_FILES_PER_SKILL),
});
export type SkillBundleEntry = z.infer<typeof skillBundleEntrySchema>;

export const skillCatalogBundleSchema = z.object({
  /** Matches `SkillCatalog.revision` at the moment this was built. */
  revision: z.string().min(1),
  skills: z.array(skillBundleEntrySchema),
  /** Decoded byte total, so a client can refuse before it writes anything. */
  totalBytes: z.number().int().nonnegative(),
});
export type SkillCatalogBundle = z.infer<typeof skillCatalogBundleSchema>;
