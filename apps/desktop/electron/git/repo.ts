import path from "node:path";
import fs from "node:fs/promises";
import {
  INTERNAL_DIR,
  SHARED_GITIGNORE,
  missingGitignoreLines,
  renderReadme,
  type ProjectEngine,
} from "@genmotion/project";
import { runGh, runGit, tryGit } from "./run";
import type { GitRepoStatus } from "../shared";

/**
 * The git operations behind Publish and Sync.
 *
 * Everything here is a sequence of ordinary commands run in the project
 * folder, which is the point: what the app does to a user's repository should
 * be something they could have typed, and something they can inspect
 * afterwards with `git log`. No libgit2, no index manipulation, nothing that
 * leaves a state a plain `git status` can't explain.
 */

/** Progress messages, so a caller can narrate a job. */
export type Progress = (step: string, percent: number) => void;

const noop: Progress = () => {};

/**
 * What the button needs to know, and nothing more.
 *
 * Deliberately does not fetch. This runs whenever the editor's project changes
 * — which is every keystroke the agent makes — and a network round trip on
 * that path would make the whole editor feel like it was waiting on GitHub.
 * `behind` is therefore whatever the last fetch knew, and Sync fetches for
 * real before it does anything.
 */
export async function repoStatus(dir: string): Promise<GitRepoStatus> {
  const inside = await tryGit(["rev-parse", "--is-inside-work-tree"], dir).catch(() => null);
  if (!inside || inside.code !== 0 || inside.stdout.trim() !== "true") {
    return { isRepo: false, remoteUrl: null, branch: null, changedFiles: 0, ahead: 0 };
  }

  const [remote, branch, status, ahead] = await Promise.all([
    tryGit(["remote", "get-url", "origin"], dir).catch(() => null),
    tryGit(["rev-parse", "--abbrev-ref", "HEAD"], dir).catch(() => null),
    // `--untracked-files=all`, not the default. Git collapses a wholly
    // untracked directory into one `?? scenes/` line, so a fresh project with
    // twenty scenes in it would otherwise report a single change — and the
    // button puts this number in front of the user as a count of files.
    tryGit(["status", "--porcelain", "--untracked-files=all"], dir).catch(() => null),
    tryGit(["rev-list", "--count", "@{u}..HEAD"], dir).catch(() => null),
  ]);

  const changed = (status?.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;

  return {
    isRepo: true,
    remoteUrl: remote?.code === 0 ? webUrl(remote.stdout.trim()) : null,
    // A repo with no commits yet reports the literal "HEAD" here.
    branch: branch?.code === 0 && branch.stdout.trim() !== "HEAD" ? branch.stdout.trim() : null,
    changedFiles: changed,
    ahead: ahead?.code === 0 ? Number(ahead.stdout.trim()) || 0 : 0,
  };
}

export interface PublishInput {
  name: string;
  visibility: "public" | "private";
  description?: string;
  /** Write a README first. Only ever offered for a folder that hasn't got one. */
  writeReadme?: boolean;
  projectName: string;
  engine?: ProjectEngine;
}

/**
 * Put a project on GitHub for the first time.
 *
 * The order matters. The `.gitignore` is repaired *before* the first `git add`,
 * because the first commit is the one that would otherwise carry the chat
 * transcript, and a file committed once is in the history whether or not a
 * later commit removes it.
 */
export async function publish(
  dir: string,
  input: PublishInput,
  onProgress: Progress = noop,
  signal?: AbortSignal,
): Promise<{ url: string }> {
  onProgress("Preparing the folder", 5);
  await repairGitignore(dir);

  if (input.writeReadme) {
    const readme = path.join(dir, "README.md");
    if (!(await exists(readme))) {
      await fs.writeFile(
        readme,
        renderReadme({ projectName: input.projectName, engine: input.engine }),
        "utf8",
      );
    }
  }

  const status = await repoStatus(dir);
  if (status.remoteUrl) {
    throw new Error(`This project is already published at ${status.remoteUrl}.`);
  }

  if (!status.isRepo) {
    onProgress("Creating a repository", 15);
    await runGit(["init", "-b", "main"], dir, { signal });
  }

  onProgress("Staging files", 30);
  await runGit(["add", "-A"], dir, { signal });
  await assertNothingPrivateStaged(dir);

  const staged = await tryGit(["diff", "--cached", "--name-only"], dir);
  if (staged.stdout.trim()) {
    onProgress("Committing", 45);
    await commit(dir, "Initial commit", signal);
  } else if ((await tryGit(["rev-parse", "HEAD"], dir)).code !== 0) {
    throw new Error("There is nothing to publish — the folder is empty.");
  }

  onProgress("Creating the GitHub repository", 60);
  const args = [
    "repo",
    "create",
    input.name,
    "--source",
    ".",
    "--push",
    `--${input.visibility}`,
  ];
  const description = input.description?.trim();
  if (description) args.push("--description", description);
  await runGh(args, dir, { signal });

  onProgress("Pushed", 100);
  const after = await repoStatus(dir);
  if (!after.remoteUrl) throw new Error("The repository was created but no remote was recorded.");
  return { url: after.remoteUrl };
}

/**
 * Commit whatever changed, take anything new from GitHub, push.
 *
 * The rebase is what makes this safe to press from two machines. If it can't
 * be done without a human — a real conflict — the rebase is aborted rather
 * than left half-applied: the folder is being watched by the editor and read
 * by an agent, and neither of them can make sense of a tree with conflict
 * markers in it.
 */
export async function sync(
  dir: string,
  projectName: string,
  onProgress: Progress = noop,
  signal?: AbortSignal,
): Promise<{ url: string | null; pushed: boolean }> {
  const status = await repoStatus(dir);
  if (!status.isRepo || !status.remoteUrl) {
    throw new Error("This project isn't published to GitHub yet.");
  }
  const branch = status.branch ?? "main";

  onProgress("Staging changes", 10);
  await repairGitignore(dir);
  await runGit(["add", "-A"], dir, { signal });
  await assertNothingPrivateStaged(dir);

  const staged = await tryGit(["diff", "--cached", "--name-only"], dir);
  if (staged.stdout.trim()) {
    onProgress("Committing", 30);
    await commit(dir, `Update ${projectName}`, signal);
  }

  onProgress("Fetching from GitHub", 50);
  await runGit(["fetch", "origin", branch], dir, { signal }).catch((err: unknown) => {
    // A branch that only exists locally is not an error — the push below
    // creates it.
    if (!/couldn't find remote ref/i.test(String(err))) throw err;
  });

  onProgress("Rebasing", 65);
  const rebase = await tryGit(["rebase", `origin/${branch}`], dir);
  if (rebase.code !== 0) {
    const conflicts = await conflictedFiles(dir);
    await tryGit(["rebase", "--abort"], dir).catch(() => null);
    throw new Error(
      conflicts.length
        ? `GitHub has changes that clash with yours in ${conflicts.join(", ")}. Nothing was changed here — resolve it in a terminal and sync again.`
        : "GitHub has changes that clash with yours. Nothing was changed here — resolve it in a terminal and sync again.",
    );
  }

  onProgress("Pushing", 85);
  await runGit(["push", "-u", "origin", branch], dir, { signal });

  onProgress("Up to date", 100);
  return { url: status.remoteUrl, pushed: true };
}

/**
 * Clone a repository into a folder the caller has already chosen.
 *
 * `gh repo clone` rather than `git clone`, so `owner/repo` works, SSH versus
 * HTTPS is the user's own configured preference, and a private repo they have
 * access to just opens.
 */
export async function clone(
  source: string,
  dir: string,
  onProgress: Progress = noop,
  signal?: AbortSignal,
): Promise<void> {
  onProgress("Cloning", 20);
  // Run from the parent: the target doesn't exist yet, and `gh` needs a cwd.
  await runGh(["repo", "clone", normalizeSource(source), dir], path.dirname(dir), { signal });
  onProgress("Cloned", 90);
}

/** Drop the GitHub remote, leaving the local history alone. */
export async function unlink(dir: string): Promise<void> {
  await tryGit(["remote", "remove", "origin"], dir);
}

// ---------------------------------------------------------------------------

/**
 * Add the ignore rules an older project was scaffolded without.
 *
 * Appended, never rewritten: the file may hold rules the user or their agent
 * put there. See `missingGitignoreLines` for why a broader existing rule counts
 * as covering a narrower wanted one.
 */
export async function repairGitignore(dir: string): Promise<void> {
  const file = path.join(dir, ".gitignore");
  const existing = await fs.readFile(file, "utf8").catch(() => null);
  if (existing === null) {
    await fs.writeFile(file, `${[...SHARED_GITIGNORE, ""].join("\n")}`, "utf8");
    return;
  }
  const missing = missingGitignoreLines(existing);
  if (missing.length === 0) return;
  const body = existing.endsWith("\n") ? existing : `${existing}\n`;
  await fs.writeFile(file, `${body}\n# GenMotion\n${missing.join("\n")}\n`, "utf8");
}

/**
 * Refuse to let app-owned state into a commit.
 *
 * `repairGitignore` should have made this impossible, but the cost of being
 * wrong is a user's entire conversation with their agent on a public URL.
 *
 * The check is `git ls-files`, not `git diff --cached`. A `.genmotion/` file
 * that was *already committed* — a project someone put under git themselves,
 * before this app wrote an ignore rule for it — is unchanged, so it appears in
 * no diff, and `.gitignore` has no effect on a path git is already tracking.
 * It would simply ride along into every commit after it. Listing tracked paths
 * catches both that and the ordinary just-staged case.
 */
export async function assertNothingPrivateStaged(dir: string): Promise<void> {
  if ((await trackedInternal(dir)).length === 0) return;

  // Untrack, keeping the files on disk: they are the user's working state, and
  // the project needs them to open.
  await runGit(["rm", "--cached", "-r", "--quiet", "--", INTERNAL_DIR], dir).catch(() => null);

  const still = await trackedInternal(dir);
  if (still.length > 0) {
    throw new Error(
      `Refusing to publish: ${INTERNAL_DIR}/ holds this project's chat history and git is still tracking it.`,
    );
  }
}

/** Paths under the app's own directory that git has a record of, staged or committed. */
async function trackedInternal(dir: string): Promise<string[]> {
  const listed = await tryGit(["ls-files", "--", INTERNAL_DIR], dir).catch(() => null);
  return (listed?.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Commit, without depending on the user having set `user.email`.
 *
 * A machine that has never committed anything has no identity configured, and
 * git's failure there ("Please tell me who you are") is one the app can answer
 * on its own behalf rather than pass on. `-c` sets it for this commit only —
 * nothing is written into the user's config.
 */
async function commit(dir: string, message: string, signal?: AbortSignal): Promise<void> {
  const hasIdentity =
    (await tryGit(["config", "user.email"], dir)).stdout.trim().length > 0;
  const identity = hasIdentity
    ? []
    : ["-c", "user.name=GenMotion", "-c", "user.email=noreply@genmotion.dev"];
  await runGit([...identity, "commit", "-m", message], dir, { signal });
}

async function conflictedFiles(dir: string): Promise<string[]> {
  const result = await tryGit(["diff", "--name-only", "--diff-filter=U"], dir).catch(() => null);
  return (result?.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
}

/** `gh repo clone` takes `owner/repo` or a URL; a pasted browser URL may have extras. */
export function normalizeSource(source: string): string {
  const trimmed = source.trim().replace(/\.git$/, "");
  const match = /^https?:\/\/github\.com\/([^/]+\/[^/]+)/.exec(trimmed);
  return match?.[1] ?? trimmed;
}

/** A remote as a page someone can open. SSH remotes aren't clickable. */
export function webUrl(remote: string): string | null {
  if (!remote) return null;
  const ssh = /^git@([^:]+):(.+?)(?:\.git)?$/.exec(remote);
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`;
  return remote.replace(/\.git$/, "");
}

async function exists(file: string): Promise<boolean> {
  return fs
    .access(file)
    .then(() => true)
    .catch(() => false);
}
