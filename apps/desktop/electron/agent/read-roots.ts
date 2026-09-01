import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { app } from "electron";

/**
 * Folders outside the project that the agent is allowed to READ.
 *
 * The containment rule in `claude-code.ts` is what keeps a scene-writing agent
 * off the rest of the machine, and it is deliberately absolute for writes: the
 * project folder is the only place anything is ever written. But reading is a
 * different question — a user with a brief, a script, a folder of shots, or an
 * existing codebase to match wants the agent to look at it, and the only way
 * to do that today is to copy every file into the project by hand.
 *
 * So: a per-project list of folders the user has explicitly picked, granted
 * through a native folder dialog and revocable from the composer. Read-only,
 * always — a grant widens what the agent can see, never what it can change.
 *
 * The list lives in the app's own userData rather than in the project folder.
 * A grant is a statement by *this* user on *this* machine about their own
 * filesystem; writing it into `.genmotion/` would ship it to anyone the
 * project folder is later shared with, where the paths mean nothing at best.
 */

export interface ReadRoot {
  /** Absolute, symlink-resolved. */
  path: string;
  grantedAt: number;
}

/**
 * Names never readable, even inside a granted folder.
 *
 * A grant is meant to say "look at my work", not "read my credentials", and a
 * user picking their home folder or a repo root is not thinking about the dot
 * directories inside it. The agent has web access, so a secret it can read is
 * a secret that can leave — cheap to block, expensive to regret.
 */
const SENSITIVE = [
  ".ssh",
  ".aws",
  ".gnupg",
  ".kube",
  ".docker",
  ".netrc",
  ".npmrc",
  ".pypirc",
  ".git-credentials",
  "gcloud",
  "Keychains",
  "credentials.json",
];

function storeFile(): string {
  return path.join(app.getPath("userData"), "read-roots.json");
}

/** projectDir → granted roots. Loaded once, written through on every change. */
let store: Record<string, ReadRoot[]> | null = null;

async function load(): Promise<Record<string, ReadRoot[]>> {
  if (store) return store;
  const raw = await fs.readFile(storeFile(), "utf8").catch(() => "{}");
  try {
    const parsed: unknown = JSON.parse(raw);
    store =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, ReadRoot[]>)
        : {};
  } catch {
    store = {};
  }
  return store;
}

async function persist(): Promise<void> {
  await fs.writeFile(storeFile(), `${JSON.stringify(store ?? {}, null, 2)}\n`, "utf8");
}

/** What this project may read outside itself, newest grant last. */
export async function listReadRoots(projectDir: string): Promise<ReadRoot[]> {
  const all = await load();
  return all[projectDir] ?? [];
}

/**
 * Grant read access to a folder.
 *
 * Resolves symlinks first so the stored root is the same shape as the paths a
 * tool call will be checked against — a grant of `/tmp/shots` that doesn't
 * resolve to `/private/tmp/shots` on macOS would match nothing.
 */
/**
 * A folder as it will be stored, or a refusal explaining itself.
 *
 * Shared by both kinds of grant so that "the whole disk" is refused in the
 * same words whether a project is open or not.
 */
async function resolveRoot(dir: string): Promise<string> {
  const resolved = await realpathish(path.resolve(dir));
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat?.isDirectory()) throw new Error("That is not a folder.");
  // A grant is meant to name a folder. The whole disk or the whole home
  // directory names everything, including every dot directory in it, and
  // nobody picking one of those has thought about what that includes.
  if (resolved === path.parse(resolved).root || resolved === os.homedir()) {
    throw new Error("Pick a specific folder rather than your whole home or disk.");
  }
  return resolved;
}

export async function grantReadRoot(projectDir: string, dir: string): Promise<ReadRoot[]> {
  const resolved = await resolveRoot(dir);
  if (isInside(await realpathish(projectDir), resolved)) {
    throw new Error("That folder is already inside the project — the agent can read it.");
  }

  const all = await load();
  const current = all[projectDir] ?? [];
  // Already covered — by itself, or by a parent that was granted earlier.
  if (current.some((root) => isInside(root.path, resolved))) return current;
  // Supersedes anything it contains, so the list stays readable.
  const next = [
    ...current.filter((root) => !isInside(resolved, root.path)),
    { path: resolved, grantedAt: Date.now() },
  ];
  all[projectDir] = next;
  await persist();
  return next;
}

export async function revokeReadRoot(projectDir: string, dir: string): Promise<ReadRoot[]> {
  const all = await load();
  const next = (all[projectDir] ?? []).filter((root) => root.path !== dir);
  all[projectDir] = next;
  await persist();
  return next;
}

/**
 * Folders shared before there is a project to share them with.
 *
 * The start screen has the same Folders control the editor does, and `genmotion
 * .` lands there too — but a grant is recorded against a project, and at that
 * point there isn't one. So they are held for the life of the app run and
 * applied to whichever project is opened or created next, which is the moment
 * they become real grants on disk.
 *
 * Not persisted, deliberately: "I started here" and "I picked this before
 * making a project" are both facts about this run of the app.
 */
let sessionRoots: ReadRoot[] = [];

export function listSessionRoots(): ReadRoot[] {
  return sessionRoots;
}

export async function addSessionRoot(dir: string): Promise<ReadRoot[]> {
  const resolved = await resolveRoot(dir);
  if (!sessionRoots.some((root) => isInside(root.path, resolved))) {
    sessionRoots = [
      ...sessionRoots.filter((root) => !isInside(resolved, root.path)),
      { path: resolved, grantedAt: Date.now() },
    ];
  }
  return sessionRoots;
}

export function removeSessionRoot(dir: string): ReadRoot[] {
  sessionRoots = sessionRoots.filter((root) => root.path !== dir);
  return sessionRoots;
}

/**
 * Turn what was picked before the project existed into grants against it.
 *
 * Failures are dropped rather than reported: the ordinary one is a folder that
 * turns out to be inside the project, which means the agent can already read
 * it — nothing has gone wrong and there is nobody to tell.
 */
export async function applySessionRoots(projectDir: string): Promise<void> {
  for (const root of sessionRoots) {
    await grantReadRoot(projectDir, root.path).catch(() => null);
  }
}

/** Drop every grant for a project — used when the folder itself is deleted. */
export async function clearReadRoots(projectDir: string): Promise<void> {
  const all = await load();
  if (!(projectDir in all)) return;
  delete all[projectDir];
  await persist();
}

/**
 * `realpath`, but for a path that may not exist yet.
 *
 * A tool call can name a file that isn't there — a typo, or a search for
 * something that was moved — and the answer still has to be a decision rather
 * than an exception. Resolves the deepest ancestor that does exist and rebuilds
 * the rest on top of it.
 */
async function realpathish(target: string): Promise<string> {
  const resolved = path.resolve(target);
  const real = await fs.realpath(resolved).catch(() => null);
  if (real) return real;
  const parent = path.dirname(resolved);
  if (parent === resolved) return resolved;
  return path.join(await realpathish(parent), path.basename(resolved));
}

/** Is `candidate` at or below `root`? Both are resolved first. */
export function isInside(root: string, candidate: string): boolean {
  const rel = path.relative(root, path.resolve(root, candidate));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * May the agent read this path?
 *
 * Only ever consulted for paths already known to be outside the project, and
 * only for read-only tools — this function widens reading, and nothing else.
 */
export async function isReadable(projectDir: string, candidate: string): Promise<boolean> {
  // Resolved through symlinks, because the grant was. Two reasons: a path the
  // model spells `/tmp/shots` has to match a root stored as `/private/tmp/shots`
  // on macOS, and a symlink planted inside a granted folder has to be judged by
  // where it actually points rather than where it sits.
  const target = await realpathish(path.resolve(projectDir, candidate));
  const roots = await listReadRoots(projectDir);
  if (!roots.some((root) => isInside(root.path, target))) return false;
  return !hasSensitiveSegment(target);
}

/** True when any part of the path is a credential store rather than work. */
function hasSensitiveSegment(target: string): boolean {
  const parts = target.split(path.sep).filter(Boolean);
  return parts.some(
    (part) =>
      SENSITIVE.includes(part) ||
      part === ".env" ||
      part.startsWith(".env."),
  );
}
