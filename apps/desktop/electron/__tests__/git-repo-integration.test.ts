import { afterEach, beforeEach, describe, expect, it } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import {
  assertNothingPrivateStaged,
  repairGitignore,
  repoStatus,
  sync,
} from "../git/repo";
import { runGit, tryGit } from "../git/run";

/**
 * Against real git, in a throwaway folder. Nothing here touches GitHub.
 *
 * The first block is what the Publish/Sync button reads. The second is the one
 * that matters most: a project folder holds the whole conversation with the
 * agent, and `publish` runs these two steps, in this order, before its first
 * `git add`. A test that only checked the scaffold's `.gitignore` would miss
 * every project made before that rule existed — which is exactly the case
 * this guards.
 */

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gm-git-"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

/** A commit without depending on this machine having a git identity configured. */
async function commit(message: string): Promise<void> {
  await runGit(
    ["-c", "user.name=T", "-c", "user.email=t@example.com", "commit", "-m", message],
    dir,
  );
}

async function tracked(): Promise<string[]> {
  return (await tryGit(["ls-files"], dir)).stdout.split("\n").filter(Boolean);
}

describe("repoStatus", () => {
  it("reports a plain folder as not a repository", async () => {
    expect(await repoStatus(dir)).toMatchObject({ isRepo: false, remoteUrl: null, ahead: 0 });
  });

  it("counts uncommitted files, which is what the Sync button shows", async () => {
    await runGit(["init", "-b", "main"], dir);
    await fs.writeFile(path.join(dir, "a.txt"), "hi", "utf8");
    await fs.writeFile(path.join(dir, "b.txt"), "there", "utf8");
    expect(await repoStatus(dir)).toMatchObject({ isRepo: true, changedFiles: 2 });
  });

  it("counts files inside a wholly untracked directory, not the directory", async () => {
    // `git status --porcelain` on its own collapses these into one `?? scenes/`
    // line. A new project is exactly this shape — nothing committed yet and a
    // folder of scenes — and the button shows this number as a file count.
    await runGit(["init", "-b", "main"], dir);
    await fs.mkdir(path.join(dir, "scenes"), { recursive: true });
    for (const n of ["01", "02", "03"]) {
      await fs.writeFile(path.join(dir, `scenes/${n}.html`), "<template></template>", "utf8");
    }
    expect(await repoStatus(dir)).toMatchObject({ changedFiles: 3 });
  });

  it("turns an SSH remote into a page someone can open", async () => {
    await runGit(["init", "-b", "main"], dir);
    await runGit(["remote", "add", "origin", "git@github.com:me/thing.git"], dir);
    expect((await repoStatus(dir)).remoteUrl).toBe("https://github.com/me/thing");
  });
});

describe("what a first commit is allowed to carry", () => {
  it("keeps the chat transcript out of a project scaffolded before the rule existed", async () => {
    // An older project: the ignore file only knew about the cache directory.
    await fs.writeFile(path.join(dir, ".gitignore"), "node_modules/\n.genmotion/cache/\n", "utf8");
    await fs.mkdir(path.join(dir, ".genmotion"), { recursive: true });
    await fs.writeFile(path.join(dir, ".genmotion/chat.jsonl"), '{"secret":true}\n', "utf8");
    await fs.writeFile(path.join(dir, "project.json"), "{}\n", "utf8");
    await runGit(["init", "-b", "main"], dir);

    await repairGitignore(dir);
    await runGit(["add", "-A"], dir);
    await assertNothingPrivateStaged(dir);
    await commit("Initial commit");

    const files = await tracked();
    expect(files).toContain("project.json");
    expect(files.some((f) => f.startsWith(".genmotion/"))).toBe(false);
  });

  it("keeps the user's own ignore rules", async () => {
    await fs.writeFile(path.join(dir, ".gitignore"), "dist/\nsecrets.env\n", "utf8");
    await repairGitignore(dir);
    const ignored = await fs.readFile(path.join(dir, ".gitignore"), "utf8");
    expect(ignored).toContain("dist/");
    expect(ignored).toContain("secrets.env");
    expect(ignored).toContain(".genmotion/");
  });

  it("writes an ignore file for a folder that hasn't got one", async () => {
    await repairGitignore(dir);
    expect(await fs.readFile(path.join(dir, ".gitignore"), "utf8")).toContain(".genmotion/");
  });

  it("untracks app state that was committed before the rule was added", async () => {
    // The case .gitignore cannot fix on its own: git ignores nothing already tracked.
    await runGit(["init", "-b", "main"], dir);
    await fs.mkdir(path.join(dir, ".genmotion"), { recursive: true });
    await fs.writeFile(path.join(dir, ".genmotion/chat.jsonl"), '{"secret":true}\n', "utf8");
    await runGit(["add", "-f", ".genmotion/chat.jsonl"], dir);
    await commit("oops");

    await repairGitignore(dir);
    await fs.writeFile(path.join(dir, "project.json"), "{}\n", "utf8");
    await runGit(["add", "-A"], dir);
    await assertNothingPrivateStaged(dir);
    await commit("Initial commit");

    expect((await tracked()).some((f) => f.startsWith(".genmotion/"))).toBe(false);
    // Untracked, not deleted — it is the user's working state.
    expect(await fs.readFile(path.join(dir, ".genmotion/chat.jsonl"), "utf8")).toContain("secret");
  });
});

/**
 * Sync against a real remote — a bare repository in another temp folder, which
 * behaves exactly as GitHub does for everything `sync` actually depends on.
 * Nothing here reaches the network.
 */
describe("sync", () => {
  let remote: string;
  let other: string;

  beforeEach(async () => {
    remote = await fs.mkdtemp(path.join(os.tmpdir(), "gm-remote-"));
    other = await fs.mkdtemp(path.join(os.tmpdir(), "gm-other-"));
    await runGit(["init", "--bare", "-b", "main"], remote);

    // The project, published.
    await runGit(["init", "-b", "main"], dir);
    await runGit(["remote", "add", "origin", remote], dir);
    await fs.writeFile(path.join(dir, "project.json"), '{"name":"P"}\n', "utf8");
    await runGit(["add", "-A"], dir);
    await commit("Initial commit");
    await runGit(["push", "-u", "origin", "main"], dir);
  });

  afterEach(async () => {
    await fs.rm(remote, { recursive: true, force: true });
    await fs.rm(other, { recursive: true, force: true });
  });

  /** Someone else pushes to the same repo — the second machine, or the web editor. */
  async function pushFromElsewhere(file: string, body: string): Promise<void> {
    await runGit(["clone", remote, other], path.dirname(other));
    await fs.writeFile(path.join(other, file), body, "utf8");
    await runGit(["add", "-A"], other);
    await runGit(
      ["-c", "user.name=O", "-c", "user.email=o@example.com", "commit", "-m", "theirs"],
      other,
    );
    await runGit(["push", "origin", "main"], other);
  }

  it("commits local work and pushes it", async () => {
    await fs.writeFile(path.join(dir, "scenes.html"), "<p>hi</p>", "utf8");

    const result = await sync(dir, "P");

    expect(result.pushed).toBe(true);
    expect(await repoStatus(dir)).toMatchObject({ changedFiles: 0, ahead: 0 });
    // It really reached the remote.
    const remoteFiles = await tryGit(["ls-tree", "--name-only", "main"], remote);
    expect(remoteFiles.stdout).toContain("scenes.html");
  });

  it("rebases local work on top of what GitHub already had", async () => {
    await pushFromElsewhere("theirs.txt", "from the other machine\n");
    await fs.writeFile(path.join(dir, "mine.txt"), "from here\n", "utf8");

    await sync(dir, "P");

    // Both survive, and ours sits on top rather than forking the history.
    const files = await tryGit(["ls-tree", "--name-only", "main"], remote);
    expect(files.stdout).toContain("theirs.txt");
    expect(files.stdout).toContain("mine.txt");
    const graph = await tryGit(["rev-list", "--count", "HEAD"], dir);
    expect(Number(graph.stdout.trim())).toBe(3);
  });

  it("leaves the folder untouched when a change genuinely clashes", async () => {
    await pushFromElsewhere("project.json", '{"name":"Theirs"}\n');
    await fs.writeFile(path.join(dir, "project.json"), '{"name":"Mine"}\n', "utf8");

    await expect(sync(dir, "P")).rejects.toThrow(/clash|resolve/i);

    // The critical part: no half-applied rebase. The editor watches this folder
    // and an agent may be reading it — neither can make sense of conflict
    // markers, and `git status` must still be answerable.
    const state = await tryGit(["status", "--porcelain"], dir);
    expect(state.stdout).not.toContain("UU ");
    expect(await exists(path.join(dir, ".git/rebase-merge"))).toBe(false);
    expect(await exists(path.join(dir, ".git/rebase-apply"))).toBe(false);
    // Our own work is still here.
    expect(await fs.readFile(path.join(dir, "project.json"), "utf8")).toContain("Mine");
  });

  it("refuses a project that was never published", async () => {
    await runGit(["remote", "remove", "origin"], dir);
    await expect(sync(dir, "P")).rejects.toThrow(/isn't published/i);
  });
});

async function exists(file: string): Promise<boolean> {
  return fs
    .access(file)
    .then(() => true)
    .catch(() => false);
}
