import path from "node:path";
import fs from "node:fs/promises";
import {
  createProject,
  isInsideProject,
  projectManifestSchema,
  writeManifest,
} from "@genmotion/project";
import {
  MAX_REMIX_BYTES,
  MAX_REMIX_FILES,
  remixBundleSchema,
  type TemplateRemixBundle,
} from "@genmotion/templates/types";

/**
 * Turning a template into a project.
 *
 * The bundle comes off the network, so nothing in it is trusted: the envelope
 * is re-parsed, every path is re-validated against the same rules the manifest
 * schema enforces, and the extension has to be one we expect. The server has
 * already filtered all of this — but "the server filtered it" is not a property
 * this side can check, and this side is the one holding a filesystem.
 */

/** Text files a template may ship. Anything else is either binary or refused. */
const TEXT_EXT = new Set([".tsx", ".ts", ".jsx", ".js", ".json", ".md", ".css", ".svg"]);

const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif",
  ".mp3", ".wav", ".m4a", ".aac", ".ogg",
  ".mp4", ".webm", ".mov",
  ".woff", ".woff2", ".ttf", ".otf",
]);

/**
 * Written fresh by `createProject`, so a bundle claiming to carry one is
 * refused rather than allowed to overwrite the scaffold. `AGENTS.md` is the
 * deliberate exception: a template's own is written about that video, and it
 * is the first thing a remixer's coding agent reads.
 */
const SCAFFOLD_OWNED = new Set([
  "project.json",
  "package.json",
  "tsconfig.json",
  ".npmrc",
  ".gitignore",
  "template.json",
  "poster.jpg",
]);

/** Mirrors `projectRelativePath` in the manifest schema, applied to every file. */
export function safePath(relative: string): boolean {
  if (!relative || relative.startsWith("/") || /^[A-Za-z]:/.test(relative)) return false;
  const segments = relative.split("/");
  if (segments.some((s) => s === "" || s === "." || s === "..")) return false;
  if (segments[0]?.startsWith(".") && relative !== "AGENTS.md") return false;
  if (segments.includes("node_modules")) return false;
  return !SCAFFOLD_OWNED.has(relative);
}

export function allowedExtension(relative: string, encoding: "text" | "base64"): boolean {
  if (relative === "AGENTS.md") return encoding === "text";
  const ext = path.extname(relative).toLowerCase();
  return encoding === "text" ? TEXT_EXT.has(ext) : BINARY_EXT.has(ext);
}

export class RemixError extends Error {}

/** Fetch and check a template's bundle. Nothing has touched disk yet. */
export async function fetchRemixBundle(templateId: string): Promise<TemplateRemixBundle> {
  // Lazily, like the loopback server's own proxies: `./auth` reaches for
  // Electron's `app` at import time, and the path checks below are worth being
  // able to test without a running Electron.
  const { cloudFetch } = await import("./auth");
  const res = await cloudFetch(`/api/templates/${encodeURIComponent(templateId)}/files`, {
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);

  if (!res) throw new RemixError("Can't reach GenMotion.");
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new RemixError(body?.error ?? `The template could not be fetched (${res.status}).`);
  }

  const parsed = remixBundleSchema.safeParse(await res.json());
  if (!parsed.success) throw new RemixError("That template arrived in a shape we don't recognise.");

  const bundle = parsed.data;
  if (bundle.totalBytes > MAX_REMIX_BYTES) throw new RemixError("That template is too large.");
  if (bundle.files.length > MAX_REMIX_FILES) throw new RemixError("That template has too many files.");

  for (const file of bundle.files) {
    if (!safePath(file.path) || !allowedExtension(file.path, file.encoding)) {
      throw new RemixError(`That template contains a file we won't write: ${file.path}`);
    }
  }
  return bundle;
}

/**
 * Scaffold `dir` from an already-checked bundle.
 *
 * The caller allocates the folder and owns cleaning it up: everything here
 * happens inside a directory that did not exist a moment ago, so a failure
 * halfway through is recoverable by deleting it.
 */
export async function writeRemix(
  dir: string,
  name: string,
  bundle: TemplateRemixBundle,
): Promise<void> {
  const { fps, width, height } = bundle.manifest;
  // `empty: true` skips the starter scene but still writes package.json,
  // tsconfig, the dotfiles and AGENTS.md from the *current* scaffold — which
  // is why the template's own package.json is never copied. Its pinned
  // versions froze when it was authored; these are the ones that are right.
  await createProject({ dir, name, fps, width, height, empty: true });

  for (const file of bundle.files) {
    const absolute = path.resolve(dir, file.path);
    // The string check above is not the same question as this one: a symlinked
    // home or a case-insensitive filesystem can resolve a "safe" path outside.
    if (!isInsideProject(dir, file.path)) {
      throw new RemixError(`That template contains a file we won't write: ${file.path}`);
    }
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(
      absolute,
      file.encoding === "base64" ? Buffer.from(file.contents, "base64") : file.contents,
      file.encoding === "base64" ? undefined : "utf8",
    );
  }

  // The manifest is rebuilt rather than copied: under the project's own name,
  // re-parsed so a drifted one cannot land on disk, and with any entry whose
  // file did not arrive dropped — a brand-new project showing missing scenes
  // is the worst possible first impression.
  const arrived = new Set(bundle.files.map((f) => f.path));
  const manifest = projectManifestSchema.parse({
    ...bundle.manifest,
    name,
    scenes: bundle.manifest.scenes.filter((scene) => arrived.has(scene.file)),
    audio: bundle.manifest.audio.filter((clip) => arrived.has(clip.file)),
  });
  await writeManifest(dir, manifest);
}
