import { afterEach, beforeEach, describe, expect, it } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { createProject, loadProject, readManifest, writeManifest } from "../project";
import { projectManifestSchema, sceneNameFromFile } from "../schema";
import { SCENES_DIR } from "../paths";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gm-project-"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("createProject", () => {
  it("scaffolds a playable npm project", async () => {
    const manifest = await createProject({ dir, name: "My Launch" });

    expect(manifest.fps).toBe(30);
    expect(manifest.scenes).toHaveLength(1);

    const files = await fs.readdir(dir);
    expect(files).toEqual(
      expect.arrayContaining([
        "project.json",
        "package.json",
        "tsconfig.json",
        "AGENTS.md",
        ".npmrc",
        ".gitignore",
        SCENES_DIR,
      ]),
    );

    const pkg = JSON.parse(await fs.readFile(path.join(dir, "package.json"), "utf8"));
    expect(pkg.name).toBe("my-launch");
    expect(pkg.dependencies["@genmotion/motion"]).toBeTruthy();

    // The safety line that keeps agent-driven installs from running code.
    expect(await fs.readFile(path.join(dir, ".npmrc"), "utf8")).toContain(
      "ignore-scripts=true",
    );
  });

  it("refuses to overwrite an existing project", async () => {
    await createProject({ dir });
    await expect(createProject({ dir })).rejects.toThrow(/already contains/);
  });
});

describe("manifest", () => {
  it("round-trips through disk", async () => {
    await createProject({ dir, name: "Round Trip" });
    const manifest = await readManifest(dir);
    manifest.scenes.push({ file: "scenes/02-outro.tsx", durationInFrames: 90 });
    await writeManifest(dir, manifest);

    const reread = await readManifest(dir);
    expect(reread.scenes.map((s) => s.file)).toEqual([
      "scenes/01-intro.tsx",
      "scenes/02-outro.tsx",
    ]);
  });

  it("rejects paths that escape the project", () => {
    for (const file of ["../../.ssh/id_rsa", "/etc/passwd", ".genmotion/session.json"]) {
      const parsed = projectManifestSchema.safeParse({
        name: "x",
        scenes: [{ file, durationInFrames: 30 }],
      });
      expect(parsed.success, file).toBe(false);
    }
  });

  it("reports invalid manifests instead of throwing raw JSON errors", async () => {
    await fs.writeFile(path.join(dir, "project.json"), "{ nope", "utf8");
    await expect(readManifest(dir)).rejects.toThrow(/not valid JSON/);
  });
});

describe("loadProject", () => {
  it("maps the folder onto the shape the editor already speaks", async () => {
    await createProject({ dir, name: "Editor Shape" });
    const project = await loadProject(dir);

    expect(project.name).toBe("Editor Shape");
    expect(project.scenes).toHaveLength(1);
    expect(project.scenes[0]).toMatchObject({
      id: "scenes/01-intro.tsx",
      name: "Intro",
      order: 0,
    });
    expect(project.scenes[0]?.code).toContain("export default function Scene");
    expect(project.missing).toEqual([]);
  });

  it("reports scenes the manifest lists but disk doesn't have", async () => {
    await createProject({ dir, name: "Gappy" });
    await fs.rm(path.join(dir, "scenes/01-intro.tsx"));

    const project = await loadProject(dir);
    expect(project.scenes).toHaveLength(0);
    expect(project.missing).toEqual(["scenes/01-intro.tsx"]);
  });
});

describe("sceneNameFromFile", () => {
  it("strips ordering digits and title-cases the rest", () => {
    expect(sceneNameFromFile("scenes/01-intro.tsx")).toBe("Intro");
    expect(sceneNameFromFile("scenes/02-key-features.tsx")).toBe("Key Features");
    expect(sceneNameFromFile("scenes/outro.tsx")).toBe("Outro");
  });
});
