import { describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { createProject, forkScene, readManifest, type SceneFork } from "../index";

const fork = (scene = "scenes/02-share.ts"): SceneFork => ({
  id: `demo-template/${path.basename(scene, ".ts")}`,
  template: "demo-template",
  engine: "three",
  fps: 30,
  width: 1920,
  height: 1080,
  title: "Share",
  durationInFrames: 90,
  files: [
    { path: scene, encoding: "text", contents: 'import { C } from "../components/brand";\nimport logo from "../assets/x.svg";\nimport { pose } from "./01-intro";\nexport default () => () => {};\n' },
    { path: "components/brand.ts", encoding: "text", contents: 'import { k } from "./kit";\nexport const C = k;\n' },
    { path: "components/kit.ts", encoding: "text", contents: "export const k = 1;\n" },
    { path: "scenes/01-intro.ts", encoding: "text", contents: "export const pose = 0;\n" },
    { path: "assets/x.svg", encoding: "base64", contents: Buffer.from("<svg/>").toString("base64") },
  ],
});

describe("forkScene", () => {
  it("copies, namespaces, rewrites imports and registers the scene", async () => {
    const dir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "gm-fork-")), "p");
    await createProject({ dir, engine: "three", width: 1920, height: 1080, fps: 30 });
    const first = await forkScene({ projectDir: dir, fork: fork() });
    const scene = await fs.readFile(path.join(dir, first.file), "utf8");
    expect(scene).toContain('from "../components/demo-template/brand"');
    expect(scene).toContain('from "../assets/demo-template/x.svg"');
    expect(scene).toContain('from "../components/demo-template/from-scenes/01-intro"');
    expect(await fs.readFile(path.join(dir, "components/demo-template/brand.ts"), "utf8")).toContain('from "./kit"');
    expect((await readManifest(dir)).scenes.at(-1)).toMatchObject({ file: first.file, durationInFrames: 90 });

    // A re-skinned shared component survives a second fork from the template.
    await fs.writeFile(path.join(dir, "components/demo-template/kit.ts"), "export const k = 2;\n");
    const second = await forkScene({ projectDir: dir, fork: fork("scenes/05-other.ts") });
    expect(second.kept).toContain("components/demo-template/kit.ts");
    expect(await fs.readFile(path.join(dir, "components/demo-template/kit.ts"), "utf8")).toContain("k = 2");
  });

  it("replaces a scene and deletes its file", async () => {
    const dir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "gm-fork-")), "p");
    await createProject({ dir, engine: "three", width: 1920, height: 1080, fps: 30 });
    const starter = (await readManifest(dir)).scenes[0]!.file;
    const forked = await forkScene({ projectDir: dir, fork: fork(), replace: starter });
    expect(forked.removed).toEqual([starter]);
    expect((await readManifest(dir)).scenes.map((s) => s.file)).toEqual([forked.file]);
  });

  it("refuses another engine and unsafe paths", async () => {
    const dir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "gm-fork-")), "p");
    await createProject({ dir, engine: "three", width: 1920, height: 1080, fps: 30 });
    await expect(forkScene({ projectDir: dir, fork: { ...fork(), engine: "react" } })).rejects.toThrow(/react scene/);
    const bad = fork();
    bad.files.push({ path: "../escape.ts", encoding: "text", contents: "" });
    await expect(forkScene({ projectDir: dir, fork: bad })).rejects.toThrow(/unsafe/);
  });
});
