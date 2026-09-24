import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import {
  SKILL_BUNDLE_MAX_BYTES,
  SKILL_DOC,
  SKILL_FILE,
  skillMetaSchema,
  type SkillBundleEntry,
  type SkillFile,
  type SkillMeta,
} from "@genmotion/shared";

/**
 * Reading skill folders off disk.
 *
 * Node-only, and deliberately separate from `index.ts`: the desktop renderer
 * and the API both want the *catalog*, which is a generated JSON file, and
 * neither can afford `node:fs` in its bundle. Only the build script and the
 * package's own tests come through here.
 */

/** A skill folder as it sits on disk, before anything is resolved about it. */
export interface SkillOnDisk {
  meta: SkillMeta;
  dir: string;
  /** The SKILL.md frontmatter's `name` and `description`, as written. */
  frontmatter: { name?: string; description?: string };
  /** Relative paths of everything in the folder, for the convention checks. */
  files: string[];
  bytes: number;
}

/**
 * Pull `name` and `description` out of a SKILL.md frontmatter block.
 *
 * Deliberately not a YAML parser: the only two keys that matter are scalars,
 * and upstream writes `description` three ways (quoted one-liner, bare, and a
 * folded `>` block). A dependency to read two strings is not worth it.
 */
export function readFrontmatter(doc: string): { name?: string; description?: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(doc);
  if (!match?.[1]) return {};
  const lines = match[1].split(/\r?\n/);
  const out: { name?: string; description?: string } = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const key = /^(name|description):\s*(.*)$/.exec(line);
    if (!key) continue;
    const field = key[1] as "name" | "description";
    let value = (key[2] ?? "").trim();

    // A folded block (`description: >`) continues on the indented lines below.
    if (value === ">" || value === ">-" || value === "|" || value === "|-") {
      const folded: string[] = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1] ?? "")) {
        folded.push((lines[++i] ?? "").trim());
      }
      value = folded.join(" ");
    } else if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    out[field] = value.trim();
  }
  return out;
}

function walk(dir: string, base = dir, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, acc);
    else acc.push(path.relative(base, full));
  }
  return acc;
}

/** Read one skill folder. Throws with the folder named if the sidecar is bad. */
export function readSkill(dir: string): SkillOnDisk {
  const sidecar = path.join(dir, SKILL_FILE);
  const doc = path.join(dir, SKILL_DOC);
  const raw = JSON.parse(fs.readFileSync(sidecar, "utf8")) as unknown;
  const parsed = skillMetaSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${path.basename(dir)}/${SKILL_FILE}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  }
  const files = walk(dir);
  const bytes = files.reduce((n, rel) => n + fs.statSync(path.join(dir, rel)).size, 0);
  return { meta: parsed.data, dir, frontmatter: readFrontmatter(fs.readFileSync(doc, "utf8")), files, bytes };
}

/** Read every skill folder under a `skills/` directory, sorted by id. */
export function readSkills(skillsDir: string): SkillOnDisk[] {
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => readSkill(path.join(skillsDir, e.name)))
    .sort((a, b) => a.meta.id.localeCompare(b.meta.id));
}

/**
 * `plugin/skills/` of the installed `@genmotion/skills` package.
 *
 * Resolved the same way `apps/desktop/electron/hyperframes/vendor.ts` finds
 * this package in development: through `package.json`, which works whether
 * the caller is this repo's own workspace symlink or a real npm install.
 * There is no packaged/vendored branch here — this function is for a server
 * process, which always runs from `node_modules`, never from inside an
 * Electron asar.
 */
export function pluginSkillsDir(): string {
  const require = createRequire(import.meta.url);
  return path.join(path.dirname(require.resolve("@genmotion/skills/package.json")), "plugin", "skills");
}

const TEXT_EXTENSIONS = new Set([".md", ".json", ".txt", ".svg", ".css", ".html"]);

function encodeForBundle(absPath: string): SkillFile["encoding"] {
  return TEXT_EXTENSIONS.has(path.extname(absPath).toLowerCase()) ? "text" : "base64";
}

/**
 * Build the wire bundle: every file of every skill, ready to write straight
 * to disk on the other end.
 *
 * Text where the extension says text, base64 otherwise (a skill's own
 * convention test only allows images beyond markdown/JSON, and none exist
 * yet — this just means the day one does, nothing here has to change).
 */
export function buildSkillBundle(skillsDir: string): { skills: SkillBundleEntry[]; totalBytes: number } {
  const skills = readSkills(skillsDir);
  const entries: SkillBundleEntry[] = [];
  let totalBytes = 0;

  for (const skill of skills) {
    const files: SkillFile[] = skill.files.map((rel) => {
      const absPath = path.join(skill.dir, rel);
      const bytes = fs.readFileSync(absPath);
      totalBytes += bytes.byteLength;
      const encoding = encodeForBundle(absPath);
      return { path: rel, encoding, contents: encoding === "text" ? bytes.toString("utf8") : bytes.toString("base64") };
    });
    entries.push({ id: skill.meta.id, files });
  }

  if (totalBytes > SKILL_BUNDLE_MAX_BYTES) {
    throw new Error(`skill bundle is ${Math.round(totalBytes / 1024)}KB, over the ${SKILL_BUNDLE_MAX_BYTES / 1024 / 1024}MB budget`);
  }
  return { skills: entries, totalBytes };
}
