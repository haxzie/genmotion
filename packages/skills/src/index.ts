import type { SkillCatalog, SkillCatalogEntry } from "@genmotion/shared";
import generated from "../generated/index.json" with { type: "json" };

/**
 * The GenMotion skill pack, as a Claude Code plugin.
 *
 * `plugin/` beside `src/` holds `.claude-plugin/plugin.json` and `skills/*`,
 * written here rather than vendored — this is the half of the agent's manual
 * that is ours. The HyperFrames pack in `@genmotion/hyperframes` says how to
 * build a composition; this one says what the video should be.
 *
 * `dist/index.json` is generated from the skills' `skill.json` sidecars by
 * `scripts/build-index.mjs` and committed, for the same reason
 * `plugin/upstream.json` is: the API and the desktop renderer both need the
 * catalog, neither can walk a directory that only exists in the source tree,
 * and a reviewer should see the diff when a skill changes.
 */

/** The plugin's name as Claude Code reports it, e.g. in `skill:` lines. */
export const PLUGIN_NAME = "genmotion-skills";

/**
 * The generated catalog. Already validated when it was written — the build
 * script parses every sidecar through `skillMetaSchema` — so this is a cast,
 * not a second parse, and it costs a consumer nothing at import.
 */
export const SKILL_CATALOG = generated as unknown as SkillCatalog;

export const SKILL_IDS: string[] = SKILL_CATALOG.entries.map((e) => e.id);

export function findSkill(id: string): SkillCatalogEntry | undefined {
  return SKILL_CATALOG.entries.find((e) => e.id === id);
}

export { createSkillCatalog, revisionOf } from "./registry";
export { searchSkills, bm25Scores, cosine, decodeVectors, tokenize } from "./search";
export type { SkillHit, SkillEmbeddings, SearchOptions } from "./search";
export { embeddingSources, sourceHashOf } from "./embed-sources";
