import type { SkillCatalog, SkillCatalogEntry, SkillMeta } from "@genmotion/shared";

/**
 * Assembling a catalog from its entries.
 *
 * Its own module rather than part of `index.ts` because the build script that
 * *writes* `dist/index.json` needs it, and `index.ts` imports that file: one
 * module for both would be a bootstrap cycle on a clean checkout.
 */

export function createSkillCatalog(entries: SkillCatalogEntry[]): SkillCatalog {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id)) throw new Error(`Skill catalog: two entries with id "${entry.id}"`);
    seen.add(entry.id);
  }
  return { entries, revision: revisionOf(entries) };
}

/** FNV-1a over the serialised list: a different list is a different revision. */
export function revisionOf(entries: readonly (SkillMeta | SkillCatalogEntry)[]): string {
  let hash = 0x811c9dc5;
  for (const char of JSON.stringify(entries)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
