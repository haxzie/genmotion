import path from "node:path";
import fs from "node:fs/promises";
import type { SkillCatalog } from "@genmotion/shared";
import { skillCatalogBundleSchema } from "@genmotion/shared";
import { cloudFetch } from "../auth";
import { listSessions } from "../session-registry";
import { linkSkillsIntoProject } from "../hyperframes/skills";
import { cachedRevision, setCachedRevision, skillsCacheRoot } from "./store";
import { invalidateCatalog } from "./catalog";

/**
 * Keep the first-party pack current without a new app release.
 *
 * The Claude Agent SDK only takes a plugin as a local path — there is no
 * remote plugin type — so this does not make the agent read skills off the
 * network. It fetches the pack from the API once, on launch, and writes it
 * to `skillsCacheRoot()`; `sources.ts` already prefers that directory over
 * the bundled copy, so from there the existing local-plugin machinery just
 * picks up the newer files. A network failure, a signed-out session, or the
 * API being unreachable all fall through to the bundled copy untouched —
 * this is a strict upgrade, never a requirement.
 *
 * Cheap check first: `GET /catalog` is metadata only, and its `revision` is
 * compared against what was cached last time before the heavier `GET /bundle`
 * (every file of every skill) is ever requested.
 */

/** Only these can land on disk, matching the pack's own authoring rule. */
const ALLOWED_EXTENSIONS = new Set([".md", ".json", ".txt", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".css", ".html", ".woff2"]);

function isSafeRelativePath(rel: string): boolean {
  if (path.isAbsolute(rel)) return false;
  const normalized = path.normalize(rel);
  if (normalized.startsWith("..") || normalized.includes(`..${path.sep}`)) return false;
  return ALLOWED_EXTENSIONS.has(path.extname(normalized).toLowerCase());
}

async function fetchJson<T>(pathname: string): Promise<T | null> {
  return cloudFetch(pathname, { signal: AbortSignal.timeout(15_000) })
    .then((res) => (res.ok ? (res.json() as Promise<T>) : null))
    .catch(() => null);
}

/**
 * Pull the pack if the server has moved on, and relink every open project.
 *
 * Best-effort throughout, by design: called fire-and-forget at launch, never
 * awaited by anything the user is waiting on. Every failure path leaves the
 * previous cache (or the bundled copy, if there never was one) exactly as it
 * was — there is no partial-write state a later run can't just overwrite.
 */
export async function refreshSkillsFromApi(): Promise<{ updated: boolean; revision?: string }> {
  const catalog = await fetchJson<SkillCatalog>("/api/skills/catalog");
  if (!catalog || catalog.entries.length === 0) return { updated: false };
  if (catalog.revision === (await cachedRevision())) return { updated: false, revision: catalog.revision };

  const raw = await fetchJson<unknown>("/api/skills/bundle");
  const bundle = raw ? skillCatalogBundleSchema.safeParse(raw) : null;
  if (!bundle?.success || bundle.data.revision !== catalog.revision) return { updated: false };

  const root = skillsCacheRoot();
  // A sibling of `root`, not a child of it — writing inside the directory
  // this same function is about to `rm -rf` would delete the new copy along
  // with the old one.
  const next = `${root}.next`;
  await fs.rm(next, { recursive: true, force: true });
  await fs.mkdir(next, { recursive: true });

  for (const skill of bundle.data.skills) {
    const skillDir = path.join(next, skill.id);
    for (const file of skill.files) {
      if (!isSafeRelativePath(file.path)) continue;
      const dest = path.join(skillDir, file.path);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, file.encoding === "text" ? file.contents : Buffer.from(file.contents, "base64"));
    }
  }
  await fs.writeFile(path.join(next, "index.json"), JSON.stringify(catalog));

  // Swap in place: every other reader either sees the old, complete
  // directory or the new, complete one — never a half-written one.
  await fs.rm(root, { recursive: true, force: true }).catch(() => {});
  await fs.rename(next, root);

  await setCachedRevision(catalog.revision);
  invalidateCatalog();

  for (const session of listSessions()) {
    await linkSkillsIntoProject(session.dir, session.engine).catch(() => {});
  }
  const { refreshWarmClaudeCode } = await import("../agent/claude-code");
  const { getSession } = await import("../session-registry");
  refreshWarmClaudeCode(getSession);

  return { updated: true, revision: catalog.revision };
}
