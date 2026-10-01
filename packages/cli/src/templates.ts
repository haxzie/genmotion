import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import {
  createProject,
  projectManifestSchema,
  readManifest,
  writeManifest,
  MANIFEST_FILE,
  type ProjectManifest,
} from "@genmotion/project";
import { CliError } from "./output";
import { VERSION } from "./version";

/**
 * Starter templates come from the same public, anonymous endpoint the desktop
 * app's gallery reads (`/api/templates`), so the CLI never ships a stale copy
 * of the catalog. A local folder works too — any GenMotion project can be a
 * template.
 */
export const API_URL = (process.env.GENMOTION_API_URL ?? "https://api.genmotion.dev").replace(/\/$/, "");

export interface TemplateSummary {
  id: string;
  title: string;
  description: string;
  engine?: string;
  tags?: string[];
}

interface RemixFile {
  path: string;
  encoding: "text" | "base64";
  contents: string;
}

interface RemixBundle {
  id: string;
  title: string;
  manifest: ProjectManifest;
  files: RemixFile[];
}

/** Files a template never overrides: the scaffold writes fresh ones. */
const SCAFFOLD_OWNED = new Set([MANIFEST_FILE, "package.json", "tsconfig.json", ".npmrc", ".gitignore"]);
const TEMPLATE_ONLY = new Set(["template.json", "poster.jpg", "sample.mp4"]);

export async function listTemplates(): Promise<TemplateSummary[]> {
  const templates: TemplateSummary[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL(`${API_URL}/api/templates`);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const body = (await fetchJson(url.href)) as { templates: TemplateSummary[]; nextCursor?: string | null };
    templates.push(...body.templates);
    cursor = body.nextCursor ?? undefined;
  } while (cursor);
  return templates;
}

async function fetchJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": `genmotion-cli/${VERSION}`, "X-GenMotion-Client": `cli/${VERSION}` } });
  } catch (err) {
    throw new CliError(`Couldn't reach ${API_URL}: ${err instanceof Error ? err.message : String(err)}`, {
      fix: "Check your connection, or pass a local folder: --template ./path/to/project",
    });
  }
  if (res.status === 404) throw new CliError(`Not found: ${url}`, { fix: "npx @genmotion/cli templates" });
  if (!res.ok) throw new CliError(`${url} answered ${res.status}`);
  return res.json();
}

/**
 * Creates `dir` from a template — a catalog id or a local project folder. The
 * scaffold is written first (package.json, tsconfig, agent files: always
 * current), then the template's own scenes, components, assets and AGENTS.md
 * on top, then its timeline.
 */
export async function createFromTemplate(dir: string, template: string, name?: string): Promise<ProjectManifest> {
  const bundle = isLocal(template) ? await readLocalTemplate(template) : await fetchTemplate(template);
  const manifest = bundle.manifest;
  await createProject({
    dir,
    name: name ?? path.basename(path.resolve(dir)),
    engine: manifest.engine,
    fps: manifest.fps,
    width: manifest.width,
    height: manifest.height,
    empty: true,
  });

  const root = path.resolve(dir);
  for (const file of bundle.files) {
    const target = path.resolve(root, file.path);
    const inside = path.relative(root, target);
    // The bundle is remote input: a path that climbs out is refused, not written.
    if (!inside || inside.startsWith("..") || path.isAbsolute(inside)) {
      throw new CliError(`Template file "${file.path}" points outside the project — refusing to write it`);
    }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file.encoding === "base64" ? Buffer.from(file.contents, "base64") : file.contents);
  }

  const fresh = await readManifest(root);
  const merged = projectManifestSchema.parse({
    ...fresh,
    scenes: manifest.scenes,
    audio: manifest.audio,
  });
  await writeManifest(root, merged);
  return merged;
}

function isLocal(template: string): boolean {
  return template.startsWith(".") || template.startsWith("/") || template.startsWith("~") || existsSync(template);
}

async function fetchTemplate(id: string): Promise<RemixBundle> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    throw new CliError(`"${id}" isn't a template id`, { fix: "npx @genmotion/cli templates" });
  }
  return (await fetchJson(`${API_URL}/api/templates/${id}/files`)) as RemixBundle;
}

async function readLocalTemplate(folder: string): Promise<RemixBundle> {
  const root = path.resolve(folder.replace(/^~(?=$|\/)/, process.env.HOME ?? "~"));
  const manifest = await readManifest(root).catch((err: Error) => {
    throw new CliError(`${folder} isn't a GenMotion project: ${err.message}`);
  });
  const files: RemixFile[] = [];
  const walk = async (dir: string) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".genmotion" || entry.name === "exports") continue;
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile() && !SCAFFOLD_OWNED.has(relative) && !TEMPLATE_ONLY.has(relative)) {
        const bytes = await fs.readFile(absolute);
        const text = /\.(ts|tsx|js|jsx|json|md|html|css|svg|txt)$/i.test(entry.name);
        files.push({ path: relative, encoding: text ? "text" : "base64", contents: bytes.toString(text ? "utf8" : "base64") });
      }
    }
  };
  await walk(root);
  return { id: path.basename(root), title: manifest.name, manifest, files };
}
