import { skillSearchText, type SkillMeta } from "@genmotion/shared";

/**
 * Exactly what gets embedded, and a hash over it.
 *
 * One definition shared by the generator and by the test that catches a stale
 * `dist/embeddings.json`: if the two disagreed about what was embedded, the
 * staleness check would be worthless.
 */

/** A skill's vectors: one for its own text, then one per trigger. */
export function embeddingSources(meta: SkillMeta): string[] {
  return [skillSearchText(meta), ...meta.triggers];
}

/** FNV-1a over every embedded string in catalog order. */
export function sourceHashOf(metas: readonly SkillMeta[]): string {
  let hash = 0x811c9dc5;
  for (const meta of metas) {
    for (const source of embeddingSources(meta)) {
      for (const char of source) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 0x01000193) >>> 0;
      }
    }
  }
  return hash.toString(16).padStart(8, "0");
}
