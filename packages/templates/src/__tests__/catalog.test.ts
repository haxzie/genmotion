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
  compileTemplate,
  getTemplate,
  listTemplateIds,
  listTemplates,
  listTemplatesPage,
  templateAssetPath,
  templateDir,
  templatePosterPath,
} from "../index";

const ids = await listTemplateIds();

it("ships at least one template", () => {
  expect(ids.length).toBeGreaterThan(0);
});

it("refuses an id that escapes the catalog", () => {
  for (const bad of ["../secrets", "..", "a/b", "/etc", "A", ""]) {
    expect(() => templateDir(bad)).toThrow();
  }
});

it("refuses an asset path that escapes the template", () => {
  const id = ids[0]!;
  expect(templateAssetPath(id, "../project.json")).toBeNull();
  expect(templateAssetPath(id, "../../some-other-template/project.json")).toBeNull();
  expect(templateAssetPath(id, "/etc/passwd")).toBeNull();
});

it("sorts the catalog by order", async () => {
  const templates = await listTemplates();
  const orders = templates.map((t) => t.meta.order);
  expect([...orders].sort((a, b) => a - b)).toEqual(orders);
});

it("pages through the whole catalog, in the same order listTemplates gives", async () => {
  const whole = await listTemplates();
  expect(whole.length).toBeGreaterThan(1);

  const paged: string[] = [];
  let cursor: string | null | undefined;
  do {
    const page = await listTemplatesPage({ cursor, limit: 1 });
    expect(page.records.length).toBe(1);
    paged.push(...page.records.map((r) => r.meta.id));
    cursor = page.nextCursor;
  } while (cursor);

  expect(paged).toEqual(whole.map((r) => r.meta.id));
});

it("has no next page once a limit already covers the whole catalog", async () => {
  const whole = await listTemplates();
  const page = await listTemplatesPage({ limit: whole.length + 10 });
  expect(page.records.length).toBe(whole.length);
  expect(page.nextCursor).toBeNull();
});

it("restarts from the top on a cursor it doesn't recognize", async () => {
  const page = await listTemplatesPage({ cursor: "not-a-real-cursor", limit: 100 });
  const whole = await listTemplates();
  expect(page.records.length).toBe(whole.length);
});

it("tags every portrait template Social Media", async () => {
  const templates = await listTemplates();
  for (const { meta, manifest } of templates) {
    if (manifest.height > manifest.width) {
      expect(meta.tags, `${meta.id} is ${manifest.width}x${manifest.height}`).toContain(
        "Social Media",
      );
    }
  }
});

describe.each(ids)("%s", (id) => {
  it("has a sidecar whose id matches its folder", async () => {
    const record = await getTemplate(id);
    expect(record).not.toBeNull();
    expect(record!.meta.id).toBe(id);
  });

  it("lists no scene that is missing on disk", async () => {
    const { missing } = await loadProject(templateDir(id));
    expect(missing).toEqual([]);
  });

  it("references every scene file it ships", async () => {
    const record = (await getTemplate(id))!;
    const listed = new Set(record.manifest.scenes.map((s) => s.file));
    const onDisk = await fs.readdir(path.join(record.dir, "scenes"));
    for (const file of onDisk) {
      expect(listed.has(`scenes/${file}`), `scenes/${file} is not in the manifest`).toBe(true);
    }
  });

  // The real gate: every scene bundles, exports a default, uses no clock or
  // random source, and survives three rendered frames. This is what stops a
  // template rotting when @genmotion/motion changes underneath it.
  it("bundles and smoke-renders every scene", { timeout: 60_000 }, async () => {
    const record = (await getTemplate(id))!;
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

  // An asset the bundler can't inline (an oversized image, or any audio/video,
  // which never inlines) is left as a `TRIPWIRE_PREFIX` placeholder.
  // `render-video.mjs` refuses to render past one on anything but audio — see
  // its own `assertNoUnresolvedVisualAssets` — so what actually matters here
  // is whether the file it points at exists at all, not whether the prefix
  // appears.
  it("every scene bundles, and every asset it leaves unlined is real", { timeout: 60_000 }, async () => {
    const record = (await getTemplate(id))!;
    const scenes = await compileTemplate(record);
    for (const scene of scenes) {
      expect(scene.error, `${scene.id} failed to bundle`).toBeNull();
      expect(scene.code).toBeTruthy();
      for (const match of scene.code!.matchAll(
        new RegExp(`${TRIPWIRE_PREFIX}assets/([^"']+)`, "g"),
      )) {
        const relative = decodeURIComponent(match[1]!);
        await expect(
          fs.stat(path.join(record.dir, "assets", relative)),
          `${scene.id} references assets/${relative}, which isn't on disk`,
        ).resolves.toBeTruthy();
      }
    }
  });

  // The manifest's own audio paths (`audio[].file`, a scene's own `audio`) are
  // project-relative, exactly as written in `project.json` — this is what
  // `render-video.mjs`'s `collectAudioTracks` resolves straight against
  // `record.dir` to build ffmpeg's input list. A path that doesn't exist here
  // is a render that will fail, not a 404 in a player (nothing serves these
  // over the wire anymore).
  it("every declared audio path resolves to a real file", { timeout: 60_000 }, async () => {
    const record = (await getTemplate(id))!;
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
    const bundle = await buildRemixBundle((await getTemplate(id))!);
    expect(bundle.totalBytes).toBeLessThanOrEqual(MAX_REMIX_BYTES);
    // The scaffold is written fresh on every remix, so none of it travels.
    for (const file of bundle.files) {
      expect(file.path).not.toBe("project.json");
      expect(file.path).not.toBe("package.json");
      expect(file.path).not.toBe("template.json");
      expect(file.path.startsWith(".genmotion/")).toBe(false);
    }
    expect(bundle.files.some((f) => f.path.startsWith("scenes/"))).toBe(true);
  });

  it("has a poster", async () => {
    const stat = await fs.stat(templatePosterPath(id)).catch(() => null);
    expect(stat, `${id} has no poster.jpg — run \`pnpm poster ${id}\``).not.toBeNull();
    expect(stat!.size).toBeGreaterThan(2048);
  });
});
