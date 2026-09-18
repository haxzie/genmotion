import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { readManifest } from "@genmotion/project";
import type { TemplateRemixBundle } from "@genmotion/templates/types";
import {
  allowedExtension,
  checkRemixBundle,
  readRemixOrigin,
  safePath,
  writeBundle,
  writeRemix,
} from "../remix";
import { buildRemixNote } from "../agent/prompt";

/**
 * A remix bundle arrives over the network, so every path in it is treated as
 * hostile. These are the checks that stand between that response and the
 * filesystem.
 */

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gm-remix-"));
  dirs.push(dir);
  return path.join(dir, "project");
}

function bundle(files: TemplateRemixBundle["files"]): TemplateRemixBundle {
  return {
    id: "demo",
    revision: "abc123",
    manifest: {
      name: "Demo",
      engine: "react",
      fps: 30,
      width: 1920,
      height: 1080,
      scenes: [{ file: "scenes/01-intro.tsx", durationInFrames: 90 }],
      audio: [],
    },
    files,
    totalBytes: files.reduce((n, f) => n + f.contents.length, 0),
  };
}

const SCENE = {
  path: "scenes/01-intro.tsx",
  encoding: "text" as const,
  contents: "export default function Scene() { return null; }\n",
};

describe("safePath", () => {
  it("accepts ordinary project files", () => {
    for (const good of ["scenes/01-intro.tsx", "components/theme.ts", "assets/logo.png", "AGENTS.md"]) {
      expect(safePath(good), good).toBe(true);
    }
  });

  it("refuses anything that climbs out or hides", () => {
    for (const bad of [
      "../secrets.txt",
      "scenes/../../etc/passwd",
      "/etc/passwd",
      "C:\\Windows\\System32",
      ".ssh/id_rsa",
      ".genmotion/session.json",
      "node_modules/evil/index.js",
      "scenes//01.tsx",
      "",
    ]) {
      expect(safePath(bad), bad).toBe(false);
    }
  });

  it("refuses the scaffold's own files, which createProject writes fresh", () => {
    for (const owned of [
      "project.json",
      "package.json",
      "tsconfig.json",
      ".npmrc",
      ".gitignore",
      "template.json",
      "poster.jpg",
    ]) {
      expect(safePath(owned), owned).toBe(false);
    }
  });
});

describe("allowedExtension", () => {
  it("accepts the file kinds a template may ship", () => {
    expect(allowedExtension("scenes/a.tsx", "text")).toBe(true);
    expect(allowedExtension("assets/logo.png", "base64")).toBe(true);
    expect(allowedExtension("AGENTS.md", "text")).toBe(true);
  });

  it("refuses anything executable, and anything mislabelled", () => {
    expect(allowedExtension("install.sh", "text")).toBe(false);
    expect(allowedExtension("run.command", "base64")).toBe(false);
    expect(allowedExtension("scenes/a.tsx", "base64")).toBe(false);
    expect(allowedExtension("assets/logo.png", "text")).toBe(false);
  });
});

describe("writeRemix", () => {
  it("scaffolds a project and writes the template's files", async () => {
    const dir = await tempDir();
    await writeRemix(dir, "My Copy", bundle([SCENE]));

    const manifest = await readManifest(dir);
    expect(manifest.name).toBe("My Copy");
    expect(manifest.scenes).toHaveLength(1);

    // The scaffold is written fresh, so a remix is a real npm project.
    for (const file of ["package.json", "tsconfig.json", ".npmrc", "AGENTS.md"]) {
      await expect(fs.stat(path.join(dir, file))).resolves.toBeTruthy();
    }
    await expect(fs.readFile(path.join(dir, SCENE.path), "utf8")).resolves.toContain("Scene");
  });

  it("decodes a binary file rather than writing its base64", async () => {
    const dir = await tempDir();
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await writeRemix(
      dir,
      "With Asset",
      bundle([SCENE, { path: "assets/mark.png", encoding: "base64", contents: bytes.toString("base64") }]),
    );
    await expect(fs.readFile(path.join(dir, "assets/mark.png"))).resolves.toEqual(bytes);
  });

  it("drops a manifest entry whose file never arrived", async () => {
    const dir = await tempDir();
    const missing = bundle([SCENE]);
    missing.manifest.scenes = [
      ...missing.manifest.scenes,
      { file: "scenes/02-gone.tsx", durationInFrames: 60 },
    ];
    await writeRemix(dir, "Partial", missing);

    // Better than a brand-new project that opens with a hole in its timeline.
    const manifest = await readManifest(dir);
    expect(manifest.scenes.map((s) => s.file)).toEqual([SCENE.path]);
  });

  it("refuses a path that resolves outside the project", async () => {
    const dir = await tempDir();
    await expect(
      writeRemix(dir, "Escape", bundle([{ ...SCENE, path: "scenes/../../escaped.tsx" }])),
    ).rejects.toThrow();
    await expect(fs.stat(path.join(path.dirname(dir), "escaped.tsx"))).rejects.toThrow();
  });

  it("records where the project came from, for the agent's first turn", async () => {
    const dir = await tempDir();
    await writeRemix(dir, "My Copy", {
      ...bundle([SCENE]),
      title: "Demo Launch",
      description: "A launch video with a hero and a CTA.",
    });

    const origin = await readRemixOrigin(dir);
    expect(origin).toMatchObject({
      templateId: "demo",
      revision: "abc123",
      title: "Demo Launch",
      description: "A launch video with a hero and a CTA.",
    });
    expect(Date.parse(origin!.remixedAt)).not.toBeNaN();
  });

  it("falls back to the manifest's name when the bundle predates the title", async () => {
    const dir = await tempDir();
    await writeRemix(dir, "My Copy", bundle([SCENE]));
    expect((await readRemixOrigin(dir))?.title).toBe("Demo");
  });
});

describe("writeBundle", () => {
  it("writes the project without a remix record — a sample is just a project", async () => {
    const dir = await tempDir();
    await writeBundle(dir, "Sample - Demo", { ...bundle([SCENE]), title: "Sample - Demo" });
    expect((await readManifest(dir)).name).toBe("Sample - Demo");
    await expect(fs.readFile(path.join(dir, SCENE.path), "utf8")).resolves.toContain("Scene");
    expect(await readRemixOrigin(dir)).toBeNull();
  });
});

describe("checkRemixBundle", () => {
  it("accepts a well-formed bundle", () => {
    expect(checkRemixBundle(bundle([SCENE])).id).toBe("demo");
  });

  it("refuses a bundle that is not one, or that carries a file it shouldn't", () => {
    expect(() => checkRemixBundle({ nope: true })).toThrow();
    expect(() => checkRemixBundle(bundle([{ ...SCENE, path: "../escape.tsx" }]))).toThrow();
    expect(() =>
      checkRemixBundle(bundle([{ path: "scenes/run.sh", encoding: "text", contents: "rm -rf" }])),
    ).toThrow();
  });
});

describe("readRemixOrigin", () => {
  it("is null for a project that was not remixed", async () => {
    const dir = await tempDir();
    await fs.mkdir(dir, { recursive: true });
    expect(await readRemixOrigin(dir)).toBeNull();
  });

  it("is null for a record it cannot read, rather than failing the turn", async () => {
    const dir = await tempDir();
    await fs.mkdir(path.join(dir, ".genmotion"), { recursive: true });
    await fs.writeFile(path.join(dir, ".genmotion", "remix.json"), "{ not json", "utf8");
    expect(await readRemixOrigin(dir)).toBeNull();
  });
});

describe("buildRemixNote", () => {
  it("names the template and tells the agent to adapt, not rebuild", () => {
    const note = buildRemixNote({
      templateId: "demo",
      revision: "abc123",
      title: "Demo Launch",
      description: "A launch video with a hero and a CTA.",
      remixedAt: "2026-09-18T00:00:00.000Z",
    });
    expect(note).toContain("**Demo Launch** template — A launch video with a hero and a CTA.");
    expect(note).toContain("Never clear them and start over");
    expect(note).toContain("Ask before you guess");
  });

  it("reads cleanly without a description", () => {
    const note = buildRemixNote({
      templateId: "demo",
      revision: "abc123",
      title: "Demo Launch",
      remixedAt: "",
    });
    expect(note).toContain("**Demo Launch** template. ");
  });
});
