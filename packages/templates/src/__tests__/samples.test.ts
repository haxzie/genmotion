import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { createSceneBundler, loadProject } from "@genmotion/project";
import { validateSceneFile } from "@genmotion/project/validate";
import {
  MAX_REMIX_BYTES,
  TEMPLATE_INLINE_LIMIT,
  TRIPWIRE_PREFIX,
  buildRemixBundle,
  getSample,
  listSampleIds,
  listSamples,
  sampleDir,
} from "../index";

/**
 * The sample projects a new account is seeded with.
 *
 * Held to the same gate as a template — every scene bundles and renders,
 * every audio path is real, the bundle fits — because a sample that opens
 * broken is the first thing a new user sees of the product. What they are
 * not held to is the gallery's business: no poster, no tags, no page.
 */

const ids = await listSampleIds();

it("ships three samples", () => {
  expect(ids).toHaveLength(3);
});

it("refuses an id that escapes the folder", () => {
  for (const bad of ["../secrets", "..", "a/b", "/etc", "A", ""]) {
    expect(() => sampleDir(bad)).toThrow();
  }
});

it("lists them in seeding order", async () => {
  const samples = await listSamples();
  const orders = samples.map((s) => s.meta.order);
  expect([...orders].sort((a, b) => a - b)).toEqual(orders);
});

describe.each(ids)("%s", (id) => {
  it("has a sidecar whose id matches its folder", async () => {
    const record = await getSample(id);
    expect(record).not.toBeNull();
    expect(record!.meta.id).toBe(id);
    expect(record!.meta.title).toMatch(/^Sample - /);
  });

  it("lists no scene that is missing on disk", async () => {
    const { missing } = await loadProject(sampleDir(id));
    expect(missing).toEqual([]);
  });

  it("bundles and smoke-renders every scene", { timeout: 60_000 }, async () => {
    const record = (await getSample(id))!;
    const bundler = createSceneBundler({
      projectDir: record.dir,
      inlineAssetLimit: TEMPLATE_INLINE_LIMIT,
      assetUrlPrefix: TRIPWIRE_PREFIX,
    });
    try {
      for (const scene of record.manifest.scenes) {
        const result = await validateSceneFile({
          bundler,
          sceneFile: scene.file,
          config: {
            fps: record.manifest.fps,
            width: record.manifest.width,
            height: record.manifest.height,
            durationInFrames: scene.durationInFrames,
          },
        });
        expect(result.error, `${scene.file}: ${result.error}`).toBeNull();
      }
    } finally {
      await bundler.dispose();
    }
  });

  it("every declared audio path resolves to a real file", async () => {
    const record = (await getSample(id))!;
    const paths = [
      ...record.manifest.scenes.filter((s) => s.audio).map((s) => s.audio!),
      ...record.manifest.audio.map((clip) => clip.file),
    ];
    for (const relative of paths) {
      await expect(
        fs.stat(path.join(record.dir, relative)),
        `${id}: ${relative} isn't on disk`,
      ).resolves.toBeTruthy();
    }
  });

  it("fits the remix budget and ships only supported files", { timeout: 60_000 }, async () => {
    const bundle = await buildRemixBundle((await getSample(id))!);
    expect(bundle.totalBytes).toBeLessThanOrEqual(MAX_REMIX_BYTES);
    expect(bundle.title).toBe((await getSample(id))!.meta.title);
    for (const file of bundle.files) {
      expect(file.path).not.toBe("project.json");
      expect(file.path).not.toBe("package.json");
      expect(file.path).not.toBe("sample.json");
      expect(file.path.startsWith(".genmotion/")).toBe(false);
    }
    expect(bundle.files.some((f) => f.path.startsWith("scenes/"))).toBe(true);
  });
});
