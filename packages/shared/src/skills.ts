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
  "Explainer",
  "Editing",
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
 * What an agent can do, named once for every surface it runs on.
 *
 * A skill says "`capture-frames` on the hook" rather than naming a tool,
 * because the same skill is read by the desktop app's agent (in-process
 * tools), by any agent talking to `genmotion mcp`, and by one that only has a
 * shell and the `genmotion` CLI — three surfaces with three different
 * spellings, and some of them without the ability at all. Each surface maps
 * these ids to what it actually has (`CAPABILITIES` in `@genmotion/skills`),
 * and tells the agent what to do when one is missing.
 */
export const SKILL_CAPABILITIES = [
  /** Compile and check the scenes or composition just written. */
  "validate",
  /** Render chosen frames and look at them. */
  "capture-frames",
  /** The project's scenes, timing, audio and assets. */
  "project-overview",
  /** Copy a remote image, video, font or audio file into `assets/`. */
  "save-asset",
  /** Save the video from a public post on X (Twitter) into `assets/`. */
  "x-video",
  /** Generate artwork. */
  "generate-image",
  /** Choose a voice before narrating. */
  "pick-voice",
  /** Narration. */
  "voiceover",
  /** Clicks, taps, chimes, ambience. */
  "sfx",
  /** A music bed or score: generated, or found under a licence that allows the use. */
  "music",
  /** Words with timestamps from speech, for cutting footage by what is said. */
  "transcribe",
  /** Put a sound on the timeline: music, narration, effects. */
  "place-audio",
  /** Rank the skill pack against a request. */
  "search-skills",
  /** Find how a beat was done in the template library, with frames and code. */
  "search-scenes",
  /** Offer the user a connector a skill wants. */
  "recommend-integration",
  /** Trims, transcodes and frame extraction on the command line. */
  "ffmpeg",
  /** Looking things up on the web. */
  "web-research",
  /** Old spelling of `generate-image`, kept so existing user skills still parse. */
  "image-generation",
] as const;
export type SkillCapability = (typeof SKILL_CAPABILITIES)[number];

/**
 * Something a skill needs that may or may not be there.
 *
 * `mcp` names a marketplace catalog id, which is what lets the agent say
 * "this wants ElevenLabs, and you don't have it" and offer to connect it.
 * `capability` is one of `SKILL_CAPABILITIES`, which each surface resolves to
 * its own tool. `tool` names a desktop tool directly — kept for user skills
 * written before capabilities existed; the first-party pack uses capabilities.
 * `skill` is another skill to load alongside.
 */
export const skillRequirementSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("mcp"), id: z.string().min(1), why: z.string().min(1).max(160) }),
  z.object({ kind: z.literal("tool"), id: z.string().min(1), why: z.string().min(1).max(160) }),
  z.object({
    kind: z.literal("capability"),
    id: z.enum(SKILL_CAPABILITIES),
    why: z.string().min(1).max(160),
  }),
  z.object({
    kind: z.literal("skill"),
    id: z.string().min(1),
    /**
     * Only for projects on these engines — how a skill gets the same craft on
     * each one: `hyperframes-keyframes` for HyperFrames, `three-camera` for
     * Three.js. Absent means every engine.
     */
    engines: z.array(z.enum(["hyperframes", "react", "three"])).min(1).optional(),
  }),
]);

/** What a request starts from, so routing can match it to the right skill. */
export const SKILL_ROUTE_INPUTS = ["brief", "url", "script", "footage", "screen-recording", "repo", "data", "audio", "logo"] as const;
export type SkillRouteInput = (typeof SKILL_ROUTE_INPUTS)[number];

/**
 * How a `workflow` or `style` skill gets picked: the router's table row.
 *
 * The same idea as HyperFrames' route files, carried as data so search can
 * show it and the router can apply it without reading every skill first:
 * match the deliverable the user wants (not a word in passing), break ties by
 * `priority`, then ask only `askFirst`.
 */
export const skillRouteSchema = z.object({
  /** What the user ends up with, in one line. */
  deliverable: z.string().min(1).max(160),
  /** What the request usually arrives with. */
  inputs: z.array(z.enum(SKILL_ROUTE_INPUTS)).min(1),
  /** Lower wins when two skills fit equally. The fallback skill is the highest. */
  priority: z.number().int().min(1).max(100),
  /** The must-have questions, asked only when the request doesn't answer them. */
  askFirst: z.array(z.string().min(4).max(160)).max(3),
});
export type SkillRoute = z.infer<typeof skillRouteSchema>;
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
    /** How a `workflow` or `style` skill is picked. Required for those two kinds. */
    route: skillRouteSchema.optional(),
    /** What to generate each asset with, and through which connector. */
    models: z
      .array(
        z.object({
          purpose: z.enum(SKILL_MODEL_PURPOSES),
          model: z.string().min(1),
          /** A capability (`voiceover`), a desktop tool name, or `mcp:<catalog id>`. */
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
  return [
    meta.title,
    meta.summary,
    meta.description,
    meta.category,
    meta.tags.join(" "),
    meta.triggers.join(" "),
    meta.route?.deliverable ?? "",
  ].join("\n");
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
