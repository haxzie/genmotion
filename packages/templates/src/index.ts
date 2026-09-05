import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  ASSETS_DIR,
  INTERNAL_DIR,
  MANIFEST_FILE,
  createSceneBundler,
  readManifest,
  sceneNameFromFile,
  type ProjectManifest,
} from "@genmotion/project";
import {
  POSTER_FILE,
  TEMPLATE_FILE,
  TEMPLATE_TAGS,
  templateMetaSchema,
  templateTagSchema,
  type TemplateMeta,
  type TemplateTag,
} from "./schema";
import {
  MAX_REMIX_BYTES,
  TEMPLATE_PAGE_SIZE,
  TEMPLATE_PAGE_SIZE_MAX,
  TRIPWIRE_PREFIX,
  type TemplateRemixBundle,
  type TemplateRemixFile,
  type TemplateSummary,
} from "./types";

export * from "./types";
export {
  templateMetaSchema,
  templateTagSchema,
  TEMPLATE_FILE,
  POSTER_FILE,
  TEMPLATE_TAGS,
  type TemplateMeta,
  type TemplateTag,
};

/**
 * Preferred ceiling for inlining an image as a data URL.
 *
 * Under this, an image travels inside the compiled scene the render script
 * evaluates, so a single frame needs one request rather than a fetch for
 * every asset. Over it — or for any audio/video, which never inlines
 * regardless of size — the asset becomes a `TRIPWIRE_PREFIX` placeholder
 * instead (see its own doc comment in `types.ts`). An image that lands there
 * is a curation bug: `render-video.mjs` refuses to render past it rather than
 * shipping a video with a broken frame in it.
 */
export const TEMPLATE_INLINE_LIMIT = 512 * 1024;

/**
 * Files that make a template a *template* rather than a project. They stay
 * behind on a remix: the copy is a video of the user's own, not a catalog entry.
 */
const TEMPLATE_ONLY = new Set([TEMPLATE_FILE, POSTER_FILE]);

/**
 * Written fresh by `createProject` on every remix, so never copied.
 *
 * `package.json` especially: a template's pinned versions freeze at authoring
 * time, and the scaffold's `DEFAULT_VERSIONS` are the ones that are current.
 */
const SCAFFOLD_OWNED = new Set([
  MANIFEST_FILE,
  "package.json",
  "tsconfig.json",
  ".npmrc",
  ".gitignore",
]);

/** Never walked, whatever an author leaves lying around. */
const SKIP_DIRS = new Set([INTERNAL_DIR, "node_modules", ".git", "exports"]);

/** Extensions carried as text; everything else is base64. */
const TEXT_EXT = new Set([".tsx", ".ts", ".jsx", ".js", ".json", ".md", ".css", ".svg"]);

/** The only binaries a template may ship. */
const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif",
  ".mp3", ".wav", ".m4a", ".aac", ".ogg",
  ".mp4", ".webm", ".mov",
  ".woff", ".woff2", ".ttf", ".otf",
]);

export class TemplateError extends Error {}

/**
 * The catalog directory.
 *
 * Resolved from this module rather than the working directory: the API imports
 * it as a workspace package and starts from `apps/api`, where a relative path
 * would point somewhere else entirely.
 */
export function catalogDir(): string {
  return (
    process.env.GM_TEMPLATES_DIR ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "catalog")
  );
}

/**
 * Absolute path for a template id.
 *
 * The id arrives from a URL, so it is checked rather than trusted: one segment,
 * matching the schema's own pattern, resolving to a direct child of the catalog.
 */
export function templateDir(id: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new TemplateError(`Not a template id: ${id}`);
  const root = catalogDir();
  const dir = path.resolve(root, id);
  if (path.dirname(dir) !== root) throw new TemplateError(`Not a template id: ${id}`);
  return dir;
}

export function templatePosterPath(id: string): string {
  return path.join(templateDir(id), POSTER_FILE);
}

/**
 * Absolute path for an asset inside a template, or null when it escapes.
 *
 * The tail comes off a URL, so containment is checked here rather than left to
 * each caller — `../../../etc/passwd` must not resolve to a read.
 */
export function templateAssetPath(id: string, relative: string): string | null {
  const dir = templateDir(id);
  const base = path.join(dir, ASSETS_DIR);
  const absolute = path.resolve(base, relative);
  const inside = path.relative(base, absolute);
  if (inside === "" || inside.startsWith("..") || path.isAbsolute(inside)) return null;
  return absolute;
}

export interface TemplateRecord {
  dir: string;
  meta: TemplateMeta;
  manifest: ProjectManifest;
  /** Content hash of every first-party file. */
  revision: string;
}

interface WalkedFile {
  /** Project-relative, forward-slashed. */
  path: string;
  absolute: string;
  bytes: number;
}

/** Every first-party file in a template folder, sorted for a stable hash. */
async function walkTemplate(dir: string): Promise<WalkedFile[]> {
  const found: WalkedFile[] = [];
  async function walk(relative: string): Promise<void> {
    const entries = await fs.readdir(path.join(dir, relative || "."), { withFileTypes: true });
    for (const entry of entries) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await walk(child);
        continue;
      }
      // Symlinks are skipped rather than followed: a link is a way out of the
      // folder, and everything here is meant to be self-contained.
      if (!entry.isFile()) continue;
      const absolute = path.join(dir, child);
      found.push({ path: child, absolute, bytes: (await fs.stat(absolute)).size });
    }
  }
  await walk("");
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

async function revisionOf(files: WalkedFile[]): Promise<string> {
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(file.path);
    hash.update(await fs.readFile(file.absolute));
  }
  return hash.digest("hex").slice(0, 12);
}

/**
 * Read templates once and hold them.
 *
 * The API image is immutable, so a template cannot change under a running
 * process — but a template *author* changes them constantly, so the cache is
 * skipped outside production and the gallery reflects a saved file immediately.
 */
const cache = new Map<string, TemplateRecord>();
const cacheable = () => process.env.NODE_ENV === "production";

export async function listTemplateIds(): Promise<string[]> {
  const entries = await fs.readdir(catalogDir(), { withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

/**
 * One template, or null when there is no such folder.
 *
 * A folder that *is* there but fails to parse throws instead: a template
 * silently missing from the gallery is the failure nobody notices, and the
 * catalog test exists so it surfaces at author time rather than on a deploy.
 */
export async function getTemplate(id: string): Promise<TemplateRecord | null> {
  const cached = cache.get(id);
  if (cached && cacheable()) return cached;

  const dir = templateDir(id);
  const raw = await fs.readFile(path.join(dir, TEMPLATE_FILE), "utf8").catch(() => null);
  if (raw === null) return null;

  const parsed = templateMetaSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new TemplateError(`${id}/${TEMPLATE_FILE} is invalid: ${parsed.error.message}`);
  }
  if (parsed.data.id !== id) {
    throw new TemplateError(`${id}/${TEMPLATE_FILE} declares id "${parsed.data.id}"`);
  }

  const manifest = await readManifest(dir);
  const record: TemplateRecord = {
    dir,
    meta: parsed.data,
    manifest,
    revision: await revisionOf(await walkTemplate(dir)),
  };
  cache.set(id, record);
  return record;
}

/** Used when a sidecar doesn't declare its own `metaTitle`. */
function defaultMetaTitle(title: string): string {
  return `${title} Template — GenMotion`;
}

export function toSummary(record: TemplateRecord): TemplateSummary {
  const { meta, manifest } = record;
  return {
    id: meta.id,
    title: meta.title,
    description: meta.description,
    metaTitle: meta.metaTitle ?? defaultMetaTitle(meta.title),
    category: meta.category,
    tags: meta.tags,
    fps: manifest.fps,
    width: manifest.width,
    height: manifest.height,
    durationInFrames: manifest.scenes.reduce((total, s) => total + s.durationInFrames, 0),
    sceneCount: manifest.scenes.length,
    posterPath: `/api/templates/${meta.id}/poster`,
    videoPath: `/api/templates/${meta.id}/video`,
    revision: record.revision,
  };
}

export async function listTemplates(): Promise<TemplateRecord[]> {
  const ids = await listTemplateIds();
  const records = await Promise.all(ids.map((id) => getTemplate(id)));
  return records
    .filter((r): r is TemplateRecord => r !== null)
    .sort((a, b) => a.meta.order - b.meta.order || a.meta.title.localeCompare(b.meta.title));
}

/** Opaque so a client never has reason to parse it — just the id, wrapped. */
function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string | null {
  try {
    return Buffer.from(cursor, "base64url").toString("utf8") || null;
  } catch {
    return null;
  }
}

export interface TemplatePage {
  records: TemplateRecord[];
  nextCursor: string | null;
}

/**
 * One page of the catalog, in gallery order.
 *
 * The catalog is small enough to read in full and slice in memory — this
 * exists for the shape of pagination (a client fetching the whole thing
 * up front doesn't scale as the catalog grows), not because listing it is
 * expensive today.
 */
export async function listTemplatesPage(
  { cursor, limit = TEMPLATE_PAGE_SIZE }: { cursor?: string | null; limit?: number } = {},
): Promise<TemplatePage> {
  const all = await listTemplates();

  let start = 0;
  if (cursor) {
    const afterId = decodeCursor(cursor);
    const index = afterId ? all.findIndex((r) => r.meta.id === afterId) : -1;
    // A cursor that no longer resolves — malformed, or the template it
    // pointed at was removed between requests — restarts the page rather
    // than throwing: a gallery losing its place silently is a better failure
    // than a 400 mid-scroll.
    start = index === -1 ? 0 : index + 1;
  }

  const capped = Math.min(Math.max(1, Math.trunc(limit)), TEMPLATE_PAGE_SIZE_MAX);
  const records = all.slice(start, start + capped);
  const last = records[records.length - 1];
  const nextCursor = last && start + capped < all.length ? encodeCursor(last.meta.id) : null;
  return { records, nextCursor };
}

/** One scene, bundled to evaluable CJS — what `render-video.mjs` feeds the
 *  render host. Not part of the wire format: nothing serves this to a client
 *  anymore, so it stays a plain local shape rather than living in `types.ts`. */
export interface CompiledTemplateScene {
  id: string;
  name: string;
  durationInFrames: number;
  code: string | null;
  /** Why it failed to bundle, when it did. */
  error: string | null;
}

/**
 * Build every scene, for `render-video.mjs` to drive frame by frame.
 *
 * The only other consumer scene bundling ever had — a browser live-previewing
 * a template by evaluating this same code — is gone; every public surface
 * plays the MP4 this produces instead. `/api/templates/:id/files` (a remix)
 * doesn't need this either — it ships the raw, unbundled source.
 */
export async function compileTemplate(record: TemplateRecord): Promise<CompiledTemplateScene[]> {
  const bundler = createSceneBundler({
    projectDir: record.dir,
    inlineAssetLimit: TEMPLATE_INLINE_LIMIT,
    assetUrlPrefix: TRIPWIRE_PREFIX,
  });
  try {
    return await Promise.all(
      record.manifest.scenes.map(async (entry): Promise<CompiledTemplateScene> => {
        const built = await bundler.bundle(entry.file);
        return {
          id: entry.file,
          name: entry.name ?? sceneNameFromFile(entry.file),
          durationInFrames: entry.durationInFrames,
          code: built.ok ? built.code : null,
          error: built.ok ? null : built.error.message,
        };
      }),
    );
  } finally {
    await bundler.dispose();
  }
}

function encodingFor(relative: string): "text" | "base64" | null {
  const ext = path.extname(relative).toLowerCase();
  if (TEXT_EXT.has(ext)) return "text";
  if (BINARY_EXT.has(ext)) return "base64";
  // `.npmrc`, `.gitignore` and friends are scaffold-owned and filtered above;
  // anything else extensionless is not something a template gets to ship.
  return null;
}

/**
 * Everything a remix should receive, as one document.
 *
 * The manifest travels parsed rather than as bytes — the client writes it under
 * the new project's own name — so `project.json` is filtered out of the files
 * alongside the rest of the scaffold.
 */
export async function buildRemixBundle(record: TemplateRecord): Promise<TemplateRemixBundle> {
  const walked = await walkTemplate(record.dir);
  const files: TemplateRemixFile[] = [];
  let totalBytes = 0;

  for (const file of walked) {
    if (SCAFFOLD_OWNED.has(file.path) || TEMPLATE_ONLY.has(file.path)) continue;
    // AGENTS.md is the one scaffold file a template may override: it is written
    // *about* this video, and a remixer's own coding agent should read it.
    const encoding = file.path === "AGENTS.md" ? "text" : encodingFor(file.path);
    if (encoding === null) {
      throw new TemplateError(`${record.meta.id} ships an unsupported file: ${file.path}`);
    }
    const bytes = await fs.readFile(file.absolute);
    totalBytes += bytes.byteLength;
    files.push({
      path: file.path,
      encoding,
      contents: encoding === "text" ? bytes.toString("utf8") : bytes.toString("base64"),
    });
  }

  if (totalBytes > MAX_REMIX_BYTES) {
    throw new TemplateError(
      `${record.meta.id} is ${Math.round(totalBytes / 1024)}KB, over the remix budget`,
    );
  }

  return { id: record.meta.id, revision: record.revision, manifest: record.manifest, files, totalBytes };
}

export { walkTemplate as listTemplateFiles };
