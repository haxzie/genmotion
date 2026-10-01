import path from "node:path";
import fs from "node:fs/promises";
import type { Browser } from "playwright-core";
import { readManifest, ProjectError } from "@genmotion/project";
import { validateSceneFile, validateThreeSceneFile } from "@genmotion/project/validate";
import { launchBrowser, type LaunchOptions } from "./browser";
import { serveProject } from "./server";
import { CompositionPage } from "./page";
import { createProjectBundler } from "./composition";

export type FindingLevel = "error" | "warning";

export interface Finding {
  level: FindingLevel;
  /** Stable identifier an agent can branch on. */
  rule:
    | "manifest"
    | "missing-scene"
    | "compile"
    | "determinism"
    | "load"
    | "runtime"
    | "page-error"
    | "blank-frame"
    | "unsupported-engine"
    | "browser"
    /** `--static` couldn't draw it; only a headless check can. */
    | "not-rendered";
  message: string;
  file?: string;
  frame?: number;
  /** What to do about it, when there is one obvious thing. */
  fix?: string;
}

export interface CheckResult {
  ok: boolean;
  engine: string | null;
  totalFrames: number;
  scenes: { file: string; name: string; startFrame: number; durationInFrames: number; sampled: number[] }[];
  findings: Finding[];
  /** Written only when `snapshots` was asked for. */
  snapshots: { frame: number; path: string }[];
}

export interface CheckOptions extends LaunchOptions {
  projectDir: string;
  /** Skip the headless render — static checks only. */
  static?: boolean;
  /** Write each sampled frame to `.genmotion/check/` for a look. */
  snapshots?: boolean;
  browser?: Browser;
}

/**
 * Everything an agent should run before calling a video done, in one call:
 * the manifest parses, every scene compiles and passes the determinism rules,
 * and — the part static analysis can't do — every scene actually renders in a
 * real browser at its first, middle and last frame without throwing, logging
 * errors, or drawing an empty frame.
 */
export async function checkProject(options: CheckOptions): Promise<CheckResult> {
  const findings: Finding[] = [];
  const result: CheckResult = { ok: false, engine: null, totalFrames: 0, scenes: [], findings, snapshots: [] };

  let manifest;
  try {
    manifest = await readManifest(options.projectDir);
  } catch (err) {
    findings.push({
      level: "error",
      rule: "manifest",
      message: err instanceof Error ? err.message : String(err),
      file: "project.json",
      fix: err instanceof ProjectError && /No project\.json/.test(err.message) ? "npx @genmotion/cli init" : undefined,
    });
    return result;
  }
  result.engine = manifest.engine;
  if (manifest.engine === "hyperframes") {
    findings.push({
      level: "error",
      rule: "unsupported-engine",
      message: "The genmotion CLI doesn't check HyperFrames projects yet.",
      fix: "Open the folder in the GenMotion app with `genmotion .`",
    });
    return result;
  }

  let start = 0;
  for (const scene of manifest.scenes) {
    result.scenes.push({
      file: scene.file,
      name: scene.name ?? path.basename(scene.file).replace(/\.[^.]+$/, ""),
      startFrame: start,
      durationInFrames: scene.durationInFrames,
      sampled: [],
    });
    start += scene.durationInFrames;
  }
  result.totalFrames = start;
  if (manifest.scenes.length === 0) {
    findings.push({
      level: "error",
      rule: "manifest",
      message: "project.json lists no scenes, so there is nothing to render.",
      file: "project.json",
      fix: "npx @genmotion/cli scene add intro --duration 4s",
    });
    return result;
  }

  // Static: compile + determinism, per scene.
  const bundler = createProjectBundler(options.projectDir);
  try {
    for (const scene of manifest.scenes) {
      const exists = await fs.stat(path.resolve(bundler.projectDir, scene.file)).catch(() => null);
      if (!exists) {
        findings.push({
          level: "error",
          rule: "missing-scene",
          file: scene.file,
          message: `${scene.file} is listed in project.json but doesn't exist.`,
          fix: "Create the file, or remove its entry from project.json.",
        });
        continue;
      }
      const validation =
        manifest.engine === "three"
          ? await validateThreeSceneFile({ bundler, sceneFile: scene.file })
          : await validateSceneFile({
              bundler,
              sceneFile: scene.file,
              config: { fps: manifest.fps, width: manifest.width, height: manifest.height, durationInFrames: scene.durationInFrames },
            });
      if (validation.error) {
        findings.push({ level: "error", rule: classify(validation.error), file: scene.file, message: validation.error });
      }
      for (const warning of validation.warnings) {
        // The static validator's "can't render WebGL here" note is exactly
        // what the headless pass below answers.
        if (/cannot render WebGL output/.test(warning)) {
          if (!options.static) continue;
          findings.push({
            level: "warning",
            rule: "not-rendered",
            file: scene.file,
            message: `${scene.file} compiles and loads; --static doesn't draw it.`,
            fix: "npx @genmotion/cli check (without --static) renders it headlessly",
          });
          continue;
        }
        findings.push({ level: "warning", rule: "determinism", file: scene.file, message: warning });
      }
    }
  } finally {
    await bundler.dispose();
  }

  if (options.static || findings.some((f) => f.level === "error")) {
    result.ok = !findings.some((f) => f.level === "error");
    return result;
  }

  // Headless: render each scene's first, middle and last frame for real.
  const server = await serveProject({ projectDir: options.projectDir });
  let browser = options.browser ?? null;
  const ownBrowser = !browser;
  let page: CompositionPage | null = null;
  try {
    try {
      browser ??= await launchBrowser(options);
    } catch (err) {
      findings.push({
        level: "error",
        rule: "browser",
        message: err instanceof Error ? err.message : String(err),
        fix: "npx @genmotion/cli browser install",
      });
      return result;
    }
    const comp = await server.composition();
    try {
      page = await CompositionPage.open(browser, server.url, comp, {});
    } catch (err) {
      findings.push({ level: "error", rule: "load", message: err instanceof Error ? err.message : String(err) });
      return result;
    }

    const snapshotDir = path.join(server.projectDir, ".genmotion", "check");
    if (options.snapshots) await fs.mkdir(snapshotDir, { recursive: true });

    for (const scene of result.scenes) {
      const last = scene.startFrame + scene.durationInFrames - 1;
      const samples = [...new Set([scene.startFrame, Math.round((scene.startFrame + last) / 2), last])];
      for (const frame of samples) {
        const before = page.pageErrors().length;
        try {
          await page.seek(frame);
        } catch (err) {
          findings.push({
            level: "error",
            rule: "runtime",
            file: scene.file,
            frame,
            message: err instanceof Error ? err.message : String(err),
          });
          continue;
        }
        scene.sampled.push(frame);
        for (const message of page.pageErrors().slice(before)) {
          findings.push({ level: "warning", rule: "page-error", file: scene.file, frame, message });
        }
        const image = await page.capture({ format: "png", maxWidth: 320 });
        if (await isBlank(page, image)) {
          findings.push({
            level: "warning",
            rule: "blank-frame",
            file: scene.file,
            frame,
            message: `Frame ${frame} of ${scene.file} is a single flat colour — nothing visible was drawn. Expected on the first frame of a fade-in; anywhere else it's usually a bug.`,
            fix:
              manifest.engine === "three"
                ? "Check the camera is looking at the content, and the objects are lit and inside the frustum."
                : "Check the content isn't transparent, off-canvas, or the same colour as the background at this frame.",
          });
        }
        if (options.snapshots) {
          const file = path.join(snapshotDir, `${String(frame).padStart(5, "0")}.png`);
          await fs.writeFile(file, image);
          result.snapshots.push({ frame, path: file });
        }
      }
    }
  } finally {
    await page?.close();
    if (ownBrowser) await browser?.close().catch(() => {});
    await server.close();
  }

  result.ok = !findings.some((f) => f.level === "error");
  return result;
}

function classify(message: string): Finding["rule"] {
  if (/breaks deterministic|reads wall-clock|hot-links/.test(message)) return "determinism";
  if (/failed to load|must have a default export/.test(message)) return "load";
  return "compile";
}

/**
 * A frame is blank when every pixel is (nearly) the same colour. Decoded in
 * the page itself, which already has a PNG decoder, rather than in Node.
 */
async function isBlank(page: CompositionPage, png: Buffer): Promise<boolean> {
  return page.page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const g = canvas.getContext("2d")!;
    g.drawImage(bitmap, 0, 0);
    const { data } = g.getImageData(0, 0, bitmap.width, bitmap.height);
    let min = [255, 255, 255];
    let max = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const v = data[i + c]!;
        if (v < min[c]!) min[c] = v;
        if (v > max[c]!) max[c] = v;
      }
    }
    return max.every((v, c) => v - min[c]! < 6);
  }, png.toString("base64"));
}
