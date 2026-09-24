import path from "node:path";
import fs from "node:fs/promises";
import type { SkillCatalog, SkillCatalogEntry, SkillMeta } from "@genmotion/shared";
import { SKILL_FILE, skillMetaSchema } from "@genmotion/shared";
import type { SkillEmbeddings } from "@genmotion/skills/search";
import { skillMetaDir } from "../hyperframes/vendor";
import { resolveSkills } from "./sources";
import { skillsCacheRoot } from "./store";

/**
 * The skill catalog this machine can actually search.
 *
 * Two halves. The first-party pack ships a generated `index.json`, so reading
 * it is one file rather than a walk of forty folders — and, when it is the
 * bundled copy, it carries the embeddings that make semantic search possible.
 * `refresh.ts` writes a newer `index.json` into `skillsCacheRoot()` when the
 * API has moved on; that copy is preferred when present, and it never carries
 * embeddings of its own (the API doesn't serve them), so a refreshed pack
 * search falls back to keyword scoring until the next embeddings rebuild ships
 * in an app update. The user's own skills have no generated index at all;
 * their sidecars are read from disk and merged in, keyword-only, which is
 * honest — nobody is going to embed a skill on the user's machine without a
 * key.
 *
 * Both are cached for the process's lifetime and invalidated when a skill is
 * imported, removed, toggled, or refreshed.
 */

interface Cached {
  entries: SkillCatalogEntry[];
  embeddings: SkillEmbeddings | null;
}

let cache: Promise<Cached> | null = null;

async function readIndex(dir: string): Promise<SkillCatalog | null> {
  return fs
    .readFile(path.join(dir, "index.json"), "utf8")
    .then((raw) => JSON.parse(raw) as SkillCatalog)
    .catch(() => null);
}

async function readBundled(): Promise<Cached> {
  const refreshed = await readIndex(skillsCacheRoot());
  const index = refreshed ?? (await readIndex(skillMetaDir())) ?? ({ entries: [], revision: "" } satisfies SkillCatalog);
  const embeddings = await fs
    .readFile(path.join(skillMetaDir(), "embeddings.json"), "utf8")
    .then((raw) => JSON.parse(raw) as SkillEmbeddings)
    .catch(() => null);
  return { entries: index.entries, embeddings: refreshed ? null : embeddings };
}

/** A skill folder the user brought in. Invalid sidecars are skipped, not fatal. */
async function readLoose(dir: string): Promise<SkillMeta | null> {
  const raw = await fs.readFile(path.join(dir, SKILL_FILE), "utf8").catch(() => null);
  if (!raw) return null;
  try {
    return skillMetaSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Every skill on this machine, enabled or not.
 *
 * `resolveSkills` filters disabled ones out, so this asks it for the *paths*
 * and then reads the bundled index separately: the marketplace has to list a
 * skill the user switched off, which is exactly what the agent must not see.
 */
export async function loadCatalog(projectDir?: string): Promise<Cached> {
  cache ??= (async () => {
    const bundled = await readBundled();
    const loose = (await resolveSkills({ projectDir })).filter((s) => s.source !== "first-party");
    const extra: SkillCatalogEntry[] = [];
    for (const skill of loose) {
      const meta = await readLoose(skill.dir);
      if (meta) extra.push({ ...meta, source: skill.source });
    }
    return { entries: [...bundled.entries, ...extra], embeddings: bundled.embeddings };
  })();
  return cache;
}

/** Drop the cache. Called after an import, a removal or an enable/disable. */
export function invalidateCatalog(): void {
  cache = null;
}

/** Where a skill's folder is, for the `path` the agent is handed. */
export async function skillPath(id: string, projectDir?: string, engine?: string): Promise<string | null> {
  const resolved = await resolveSkills({ projectDir, engine });
  return resolved.find((s) => s.id === id)?.dir ?? null;
}
