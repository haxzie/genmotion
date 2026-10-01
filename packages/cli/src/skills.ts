import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { SKILL_DOC, type SkillCatalogEntry, type SkillKind, type SkillRequirement } from "@genmotion/shared";
import { SKILL_CATALOG, availableOn, fallbackFor, findSkill, searchSkills, type SkillSurface } from "@genmotion/skills";
import { CliError } from "./output";

/**
 * GenMotion's creative skill pack, for agents outside the desktop app.
 *
 * The same `packages/skills` pack the desktop agent reads, shipped inside the
 * CLI (`dist/skills/`, copied at build) so `search_skills`, `get_skill` and
 * `genmotion skills add` work offline and match the CLI's own version.
 */

/** The router skill: always installed, always the first thing an agent reads. */
export const ROUTER_SKILL = "genmotion-skills";

/** Where installed skills go, per agent: Claude Code and Codex. */
export const SKILL_ROOTS = [".claude/skills", ".agents/skills"] as const;

/** The pack's folder: bundled next to the CLI, or the workspace package in development. */
export function packDir(): string {
  const bundled = path.join(path.dirname(fileURLToPath(import.meta.url)), "skills");
  if (existsSync(path.join(bundled, ROUTER_SKILL, SKILL_DOC))) return bundled;
  const require = createRequire(import.meta.url);
  return path.join(path.dirname(require.resolve("@genmotion/skills/package.json")), "plugin", "skills");
}

export function catalog(): SkillCatalogEntry[] {
  return SKILL_CATALOG.entries;
}

function entryOrThrow(id: string): SkillCatalogEntry {
  const entry = findSkill(id);
  if (!entry) throw new CliError(`No skill "${id}"`, { fix: "npx genmotion skills list" });
  return entry;
}

/** A requirement as an agent on this surface should read it. */
export interface RequirementView {
  kind: SkillRequirement["kind"];
  id: string;
  available: boolean;
  why?: string;
  /** What to do instead, when it isn't available here. */
  instead?: string;
}

function requirementsFor(entry: SkillCatalogEntry, surface: SkillSurface, engine: string | undefined): RequirementView[] {
  return entry.requires
    .filter((req) => req.kind !== "skill" || !req.engines || !engine || (req.engines as readonly string[]).includes(engine))
    .map((req) => {
      const available = availableOn(req, surface);
      const instead = !available && req.kind === "capability" ? fallbackFor(req.id) : undefined;
      return {
        kind: req.kind,
        id: req.id,
        available,
        ...("why" in req ? { why: req.why } : {}),
        ...(instead ? { instead } : {}),
      };
    });
}

export interface SkillSummary {
  id: string;
  title: string;
  kind: SkillKind;
  category: string;
  summary: string;
  /** Present for skills that own a video: what the user gets and what to ask. */
  route?: SkillCatalogEntry["route"];
  aspects: string[];
  durationSeconds: [number, number];
  requires: RequirementView[];
}

function summarize(entry: SkillCatalogEntry, surface: SkillSurface, engine?: string): SkillSummary {
  return {
    id: entry.id,
    title: entry.title,
    kind: entry.kind,
    category: entry.category,
    summary: entry.summary,
    ...(entry.route ? { route: entry.route } : {}),
    aspects: entry.aspects,
    durationSeconds: [entry.duration.minSeconds, entry.duration.maxSeconds],
    requires: requirementsFor(entry, surface, engine),
  };
}

/**
 * Rank the pack against a request. The router itself is left out: whoever
 * is searching has already read it.
 */
export function searchPack(opts: {
  query: string;
  kind?: SkillKind;
  engine?: string;
  limit?: number;
  surface: SkillSurface;
}): SkillSummary[] {
  const entries = catalog().filter((e) => e.id !== ROUTER_SKILL);
  return searchSkills({ query: opts.query, entries, kind: opts.kind, engine: opts.engine, limit: opts.limit ?? 5 }).map((hit) =>
    summarize(hit.entry, opts.surface, opts.engine),
  );
}

export function listPack(surface: SkillSurface, engine?: string): SkillSummary[] {
  return catalog()
    .filter((e) => !engine || (e.engines as readonly string[]).includes(engine))
    .map((e) => summarize(e, surface, engine));
}

/**
 * A skill's text. With no `file`, SKILL.md plus the list of its reference
 * files — the progressive-disclosure contract: read the index, then only the
 * reference the step needs.
 */
export async function readSkill(id: string, file?: string): Promise<{ id: string; file: string; text: string; references: string[] }> {
  entryOrThrow(id);
  const dir = path.join(packDir(), id);
  const references = await fs
    .readdir(path.join(dir, "references"))
    .then((names) => names.filter((n) => n.endsWith(".md")).map((n) => `references/${n}`))
    .catch(() => [] as string[]);
  const target = file ?? SKILL_DOC;
  const absolute = path.resolve(dir, target);
  if (path.relative(dir, absolute).startsWith("..") || path.isAbsolute(path.relative(dir, absolute))) {
    throw new CliError(`"${file}" is outside the skill`);
  }
  const text = await fs.readFile(absolute, "utf8").catch(() => {
    throw new CliError(`${id} has no ${target}`, { fix: references.length ? `One of: ${references.join(", ")}` : undefined });
  });
  return { id, file: target, text, references };
}

/**
 * Everything installing `ids` brings with it: the skills themselves plus the
 * pack skills they require for this engine, transitively. HyperFrames-pack
 * requirements are skipped — they only exist inside the desktop app.
 */
export function closure(ids: string[], engine?: string): string[] {
  const out: string[] = [];
  const visit = (id: string) => {
    if (out.includes(id)) return;
    const entry = entryOrThrow(id);
    out.push(id);
    for (const req of entry.requires) {
      if (req.kind !== "skill" || !findSkill(req.id)) continue;
      if (req.engines && engine && !(req.engines as readonly string[]).includes(engine)) continue;
      visit(req.id);
    }
  };
  ids.forEach(visit);
  return out;
}

/**
 * Copy skills into a project, for every agent that reads skills from the
 * folder. Existing copies are replaced, so `skills update` refreshes them.
 */
export async function installSkills(projectDir: string, ids: string[], engine?: string): Promise<string[]> {
  const all = closure(ids, engine);
  const source = packDir();
  for (const id of all) {
    for (const root of SKILL_ROOTS) {
      const target = path.join(projectDir, root, id);
      await fs.rm(target, { recursive: true, force: true });
      await fs.cp(path.join(source, id), target, { recursive: true });
    }
  }
  return all;
}

/** Pack skills already installed in a project, by folder. */
export async function installedSkills(projectDir: string): Promise<string[]> {
  const names = await fs.readdir(path.join(projectDir, SKILL_ROOTS[0])).catch(() => [] as string[]);
  return names.filter((name) => findSkill(name) !== undefined);
}
