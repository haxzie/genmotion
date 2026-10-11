import path from "node:path";
import fs from "node:fs/promises";
import { readManifest, writeManifest } from "@genmotion/project";
import { allocateProjectDir } from "./projects-dir";

/**
 * Copying a project into a new one beside it.
 *
 * The folder is the project, so duplicating one is a file copy — not a
 * scaffold-and-fill like a remix. That is deliberate: a remix rebuilds the
 * manifest and writes the *current* scaffold because a template's pinned
 * versions froze when it was authored. A duplicate is the opposite case. Its
 * source is a project that works right now, and the point of the copy is to
 * try something without risking it, so every version, every installed package
 * and every asset comes along exactly as they are.
 *
 * `node_modules` included, which is the one surprising part. It is the heaviest
 * thing in the folder (tens of megabytes) and a copy that left it out would
 * preview fine on a starter project — every runtime module a scene imports is
 * external to the bundle — and then fail on any project whose agent installed
 * something. On APFS the copy below is a clone: no bytes, no disk.
 */

/** OS litter, wherever it turns up. */
const SKIP_ANYWHERE = new Set([".DS_Store"]);

/**
 * Top-level entries the copy is better off without.
 *
 * - `.git` — the copy would share the original's remote, so its first push
 *   would land on the project it was copied from.
 * - `.agents` — symlinks into this machine's app, re-made on every open.
 * - `exports` — rendered video, and the heaviest thing here after
 *   `node_modules`. The copy has rendered nothing; the files belong to the
 *   project that did the work.
 */
const SKIP_AT_ROOT = new Set([".git", ".agents", "exports"]);

/**
 * Inside `.genmotion/`: the app's own state.
 *
 * The chat and the agent's session id are the conversation that built the
 * original. Resuming that thread from two folders would have one agent
 * writing into a project it has never seen, so the copy starts fresh. The
 * card image (`thumbnail.jpg`) and the remix record are kept — both describe
 * the video, which is the thing being copied.
 */
const SKIP_IN_INTERNAL = new Set(["chat.jsonl", "session.json"]);

/**
 * Inside `.genmotion/cache/`, only the filmstrips are worth bringing.
 *
 * They are keyed by scene file and content hash, so every one of them is as
 * true of the copy as of the original — and carrying them means the copy
 * opens with its timeline already drawn instead of re-rendering every strip
 * the moment a second editor mounts. `markups` and `snapshots` are frames
 * captured for a particular chat message, and the chat does not come along.
 */
const KEEP_IN_CACHE = new Set(["filmstrips"]);

export interface DuplicatedProject {
  dir: string;
  name: string;
}

/**
 * Copy the project at `dir`. Returns where the copy landed; the caller opens
 * it.
 *
 * `readManifest` first, so a folder that is not a project fails before a
 * directory is allocated for it. Once one is, the rest is wrapped: on any
 * error it is removed, and it can only ever hold what this function put there
 * — `allocateProjectDir` had just confirmed the path was free.
 */
export async function duplicateProject(dir: string): Promise<DuplicatedProject> {
  const manifest = await readManifest(dir);
  const name = copyName(manifest.name);
  const target = await allocateProjectDir(name);
  try {
    await copyTree(dir, target, "");
    // The manifest is copied with the rest and then rewritten under the new
    // name, rather than copied last: anything the walk found is already in
    // place, so this is the only file that has to be right afterwards.
    await writeManifest(target, { ...manifest, name });
  } catch (err) {
    await fs.rm(target, { recursive: true, force: true });
    throw err;
  }
  return { dir: target, name };
}

/**
 * "Launch video" → "Launch video copy" → "Launch video copy 2".
 *
 * Counting on the suffix rather than adding another one, so duplicating a
 * duplicate does not read "copy copy copy". The folder is numbered separately
 * by `allocateProjectDir`, which has no idea what the name says.
 */
export function copyName(name: string): string {
  const existing = /^(.*) copy(?: (\d+))?$/.exec(name);
  if (!existing) return `${name} copy`;
  return `${existing[1]} copy ${Number(existing[2] ?? 1) + 1}`;
}

/**
 * The copy itself, depth-first, skipping what the sets above name.
 *
 * `COPYFILE_FICLONE` asks the filesystem for a copy-on-write clone and falls
 * back to a byte copy where that is not possible — which is what makes
 * bringing `node_modules` along affordable on macOS.
 *
 * Symlinks are left behind rather than followed: the only ones a project has
 * are the skill links under `.agents`, which are skipped anyway, and
 * following a link out of the folder is how a copy ends up writing somewhere
 * it was never asked to.
 */
async function copyTree(from: string, to: string, relative: string): Promise<void> {
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    if (skip(relative, entry.name)) continue;
    const source = path.join(from, entry.name);
    const destination = path.join(to, entry.name);
    if (entry.isDirectory()) {
      await copyTree(source, destination, relative ? `${relative}/${entry.name}` : entry.name);
    } else if (entry.isFile()) {
      await fs.copyFile(source, destination, fs.constants.COPYFILE_FICLONE);
    }
  }
}

function skip(relative: string, name: string): boolean {
  if (SKIP_ANYWHERE.has(name)) return true;
  if (relative === "") return SKIP_AT_ROOT.has(name);
  if (relative === ".genmotion") return SKIP_IN_INTERNAL.has(name);
  if (relative === ".genmotion/cache") return !KEEP_IN_CACHE.has(name);
  return false;
}
