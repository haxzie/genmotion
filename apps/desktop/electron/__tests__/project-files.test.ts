import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readProjectFile, readProjectTree } from "../local-server";

/**
 * The Code panel's explorer and file viewer. What matters here is what the
 * tree leaves out (the app's own state, installed packages) and that a path
 * from the client can't be used to read anything outside the folder.
 */
let dir: string;

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gm-files-"));
  await fs.mkdir(path.join(dir, "scenes"), { recursive: true });
  await fs.mkdir(path.join(dir, "assets"), { recursive: true });
  await fs.mkdir(path.join(dir, "node_modules", "three"), { recursive: true });
  await fs.mkdir(path.join(dir, ".genmotion"), { recursive: true });
  await fs.writeFile(path.join(dir, "project.json"), "{}\n");
  await fs.writeFile(path.join(dir, "index.html"), "<main></main>\n");
  await fs.writeFile(path.join(dir, "scenes", "01-intro.ts"), "export default 1;\n");
  await fs.writeFile(path.join(dir, "assets", "logo.png"), Buffer.from([0x89, 0x50, 0x00, 0x01]));
  await fs.writeFile(path.join(dir, "node_modules", "three", "index.js"), "// huge\n");
  await fs.writeFile(path.join(dir, ".genmotion", "chat.jsonl"), "{}\n");
});

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("readProjectTree", () => {
  it("lists folders before files, each A–Z", async () => {
    const tree = await readProjectTree(dir);
    expect(tree.map((n) => n.name)).toEqual([
      "assets",
      "scenes",
      "index.html",
      "project.json",
    ]);
  });

  it("hides app state and installed packages", async () => {
    const tree = await readProjectTree(dir);
    expect(tree.map((n) => n.name)).not.toContain("node_modules");
    expect(tree.map((n) => n.name)).not.toContain(".genmotion");
  });

  it("carries each folder's children and each file's size", async () => {
    const tree = await readProjectTree(dir);
    const scenes = tree.find((n) => n.name === "scenes");
    expect(scenes?.kind).toBe("directory");
    expect(scenes?.children?.map((c) => c.path)).toEqual(["scenes/01-intro.ts"]);
    expect(scenes?.children?.[0]?.sizeBytes).toBeGreaterThan(0);
  });
});

describe("readProjectFile", () => {
  it("reads a source file, highlighted as TS", async () => {
    const file = await readProjectFile(dir, "scenes/01-intro.ts");
    expect(file.code).toBe("export default 1;\n");
    expect(file.language).toBe("tsx");
  });

  it("reads markup as markup", async () => {
    expect((await readProjectFile(dir, "index.html")).language).toBe("html");
  });

  it("says a picture is binary rather than handing back its bytes", async () => {
    const file = await readProjectFile(dir, "assets/logo.png");
    expect(file.code).toBeNull();
    expect(file.reason).toBe("binary");
  });

  it("refuses a path that climbs out of the project", async () => {
    await expect(readProjectFile(dir, "../secrets.txt")).rejects.toThrow(/Not in this project/);
  });

  it("refuses a path into the app's own state", async () => {
    await expect(readProjectFile(dir, ".genmotion/chat.jsonl")).rejects.toThrow(
      /Not in this project/,
    );
  });
});
