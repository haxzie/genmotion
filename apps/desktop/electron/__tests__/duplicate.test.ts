import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What a duplicate carries, and what it leaves behind.
 *
 * The skip list is the whole design of this feature in one place — carry the
 * chat and two folders share an agent thread, carry `.git` and the copy's
 * first push lands on the original's remote — and it is a `Set` of strings
 * that anyone could reasonably add a line to. These tests are what makes
 * adding the wrong line fail.
 */

const home = await fs.mkdtemp(path.join(os.tmpdir(), "gm-duplicate-test-"));

vi.mock("electron", () => ({
  app: { getPath: () => home, getVersion: () => "0.0.0-test" },
}));

const { duplicateProject, copyName } = await import("../duplicate");

const root = path.join(home, "projects");
process.env.GM_PROJECTS_ROOT = root;

async function write(file: string, contents: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, contents, "utf8");
}

/** A project with one of everything the copy has an opinion about. */
async function makeProject(name: string): Promise<string> {
  const dir = path.join(root, "source");
  await fs.rm(dir, { recursive: true, force: true });
  await write(
    path.join(dir, "project.json"),
    JSON.stringify({
      name,
      engine: "three",
      fps: 30,
      width: 1920,
      height: 1080,
      scenes: [{ file: "scenes/01-intro.tsx", durationInFrames: 90, name: "Intro" }],
      audio: [],
    }),
  );
  await write(path.join(dir, "scenes/01-intro.tsx"), "export default function Intro() {}\n");
  await write(path.join(dir, "assets/logo.png"), "png");
  await write(path.join(dir, "package.json"), '{"name":"source"}\n');
  await write(path.join(dir, "node_modules/three/index.js"), "// 46MB of this\n");
  await write(path.join(dir, "exports/source-2026.mp4"), "mp4");
  await write(path.join(dir, ".git/config"), "[remote \"origin\"]\n");
  await write(path.join(dir, ".agents/skills/readme.md"), "linked\n");
  await write(path.join(dir, ".genmotion/thumbnail.jpg"), "jpg");
  await write(path.join(dir, ".genmotion/chat.jsonl"), '{"role":"user"}\n');
  await write(path.join(dir, ".genmotion/session.json"), '{"sessionId":"abc"}\n');
  await write(path.join(dir, ".genmotion/remix.json"), '{"templateId":"nova"}\n');
  await write(path.join(dir, ".genmotion/cache/filmstrips/01-intro.aaa.jpg"), "strip");
  await write(path.join(dir, ".genmotion/cache/snapshots/turn-1.jpg"), "snap");
  return dir;
}

const has = (dir: string, file: string) =>
  fs.access(path.join(dir, file)).then(
    () => true,
    () => false,
  );

beforeEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
  await fs.mkdir(root, { recursive: true });
});

describe("duplicateProject", () => {
  it("copies the video and names the copy", async () => {
    const source = await makeProject("Launch video");
    const copy = await duplicateProject(source);

    expect(copy.name).toBe("Launch video copy");
    expect(path.basename(copy.dir)).toBe("launch-video-copy");
    const manifest = JSON.parse(await fs.readFile(path.join(copy.dir, "project.json"), "utf8"));
    expect(manifest.name).toBe("Launch video copy");
    // The rest of the manifest is the original's — same engine, same scenes.
    expect(manifest.engine).toBe("three");
    expect(manifest.scenes).toHaveLength(1);

    for (const file of [
      "scenes/01-intro.tsx",
      "assets/logo.png",
      "package.json",
      "node_modules/three/index.js",
      ".genmotion/thumbnail.jpg",
      ".genmotion/remix.json",
      ".genmotion/cache/filmstrips/01-intro.aaa.jpg",
    ]) {
      expect(await has(copy.dir, file), `expected ${file} to come along`).toBe(true);
    }
  });

  it("leaves the original's history, remote and exports behind", async () => {
    const source = await makeProject("Launch video");
    const copy = await duplicateProject(source);

    for (const file of [
      ".genmotion/chat.jsonl",
      ".genmotion/session.json",
      ".genmotion/cache/snapshots/turn-1.jpg",
      ".git/config",
      ".agents/skills/readme.md",
      "exports/source-2026.mp4",
    ]) {
      expect(await has(copy.dir, file), `expected ${file} to stay behind`).toBe(false);
    }
  });

  it("leaves nothing behind when the folder isn't a project", async () => {
    const empty = path.join(root, "not-a-project");
    await fs.mkdir(empty, { recursive: true });
    await expect(duplicateProject(empty)).rejects.toThrow();
    expect(await fs.readdir(root)).toEqual(["not-a-project"]);
  });

  it("counts on the suffix rather than stacking copies of copies", () => {
    expect(copyName("Launch video")).toBe("Launch video copy");
    expect(copyName("Launch video copy")).toBe("Launch video copy 2");
    expect(copyName("Launch video copy 2")).toBe("Launch video copy 3");
  });
});
