import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import type { Browser, CDPSession, Page } from "playwright";
import { asc, eq, db, schema } from "@genmotion/db";
import { compileSceneToJs } from "@genmotion/compiler/node";
import { formatCompileError } from "@genmotion/compiler";
import { putObject } from "@genmotion/storage";
import { buildRenderHostBundle } from "./build-host";

const require = createRequire(import.meta.url);
const FFMPEG_PATH = require("ffmpeg-static") as string;

const PAGE_SHELL = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&family=Instrument+Serif:ital@0;1&display=block" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #000; overflow: hidden; }
</style>
</head>
<body><div id="root"></div></body>
</html>`;

type JobStatus = "rendering" | "encoding" | "uploading" | "done" | "failed";

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, args);
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 20000) stderr = stderr.slice(-10000);
    });
    proc.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`ffmpeg exited with ${code}: ${stderr.slice(-800)}`)),
    );
    proc.on("error", reject);
  });
}

interface SceneAudio {
  path: string;
  /** Milliseconds into the composition where this track starts. */
  delayMs: number;
  volume: number;
}

/**
 * Mux scene audio tracks into the silent render: each track is delayed to its
 * scene's start, volume-adjusted, mixed, and trimmed to the video's length.
 */
async function mixAudio(
  videoPath: string,
  tracks: SceneAudio[],
  durationSeconds: number,
  outputPath: string,
): Promise<void> {
  const inputs = tracks.flatMap((t) => ["-i", t.path]);
  const delayed = tracks.map(
    (t, i) =>
      `[${i + 1}:a]adelay=${Math.round(t.delayMs)}:all=1,volume=${t.volume}[a${i}]`,
  );
  const labels = tracks.map((_, i) => `[a${i}]`).join("");
  const mix =
    tracks.length === 1
      ? `${delayed[0]!.replace("[a0]", "[aout]")}`
      : `${delayed.join(";")};${labels}amix=inputs=${tracks.length}:duration=longest:normalize=0[aout]`;

  await runFfmpeg([
    "-y",
    "-i", videoPath,
    ...inputs,
    "-filter_complex", mix,
    "-map", "0:v",
    "-map", "[aout]",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    "-t", durationSeconds.toFixed(3),
    outputPath,
  ]);
}

async function updateJob(
  jobId: string,
  patch: Partial<{
    status: JobStatus;
    progress: number;
    error: string;
    outputAssetId: string;
    startedAt: Date;
    completedAt: Date;
  }>,
) {
  await db
    .update(schema.exportJobs)
    .set(patch)
    .where(eq(schema.exportJobs.id, jobId));
}

interface CompiledSceneInput {
  id: string;
  name: string;
  code: string;
  durationInFrames: number;
}

async function compileScenes(
  scenes: CompiledSceneInput[],
): Promise<Array<{ id: string; name: string; durationInFrames: number; compiledCode: string }>> {
  const compiled = [];
  for (const scene of scenes) {
    const result = await compileSceneToJs(scene.code);
    if (!result.ok) {
      throw new Error(
        `Scene "${scene.name}" failed to compile: ${formatCompileError(result.error)}`,
      );
    }
    compiled.push({
      id: scene.id,
      name: scene.name,
      durationInFrames: scene.durationInFrames,
      compiledCode: result.code,
    });
  }
  return compiled;
}

/** Fresh browser context + page running the render host with the given scenes. */
async function createRenderPage(
  browser: Browser,
  project: { fps: number; width: number; height: number },
  compiledScenes: Array<{ id: string; name: string; durationInFrames: number; compiledCode: string }>,
) {
  const context = await browser.newContext({
    viewport: { width: project.width, height: project.height },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  // Network allowlist: storage + Google Fonts only.
  const storageOrigin = new URL(
    process.env.S3_PUBLIC_URL ?? "http://localhost:9000",
  ).origin;
  await context.route("**/*", (route) => {
    const url = route.request().url();
    const type = route.request().resourceType();
    const allowed =
      url.startsWith(storageOrigin) ||
      url.startsWith("https://fonts.googleapis.com") ||
      url.startsWith("https://fonts.gstatic.com") ||
      url.startsWith("https://cdn.simpleicons.org/") ||
      url.startsWith("data:") ||
      url.startsWith("about:") ||
      // Media may come from anywhere (brand logos, user-pasted URLs) so the
      // export matches the preview; scripts/XHR stay blocked.
      type === "image" ||
      type === "media" ||
      type === "font";
    return allowed ? route.continue() : route.abort();
  });

  const page: Page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await page.setContent(PAGE_SHELL, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ content: await buildRenderHostBundle() });

  const initResult = await page.evaluate(
    (payload) => window.__gmInit(payload),
    {
      scenes: compiledScenes,
      fps: project.fps,
      width: project.width,
      height: project.height,
    },
  );
  if (initResult.error) {
    await context.close();
    throw new Error(initResult.error);
  }

  return { context, page, pageErrors };
}

/**
 * Render one representative frame (60% into the first scene, where intro
 * animations have settled) and store it as the project's thumbnail.
 */
export async function runThumbnailJob(browser: Browser, projectId: string) {
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId));
  if (!project) return;

  const scenes = await db
    .select()
    .from(schema.scenes)
    .where(eq(schema.scenes.projectId, projectId))
    .orderBy(asc(schema.scenes.order));

  if (scenes.length === 0) {
    await db
      .update(schema.projects)
      .set({ thumbnailUrl: null })
      .where(eq(schema.projects.id, projectId));
    return;
  }

  const workDir = mkdtempSync(join(tmpdir(), "gm-thumb-"));
  let context: Awaited<ReturnType<Browser["newContext"]>> | null = null;
  try {
    // Only the first scene is needed for the thumbnail frame.
    const firstScene = scenes[0]!;
    const compiled = await compileScenes([firstScene]);
    const setup = await createRenderPage(browser, project, compiled);
    context = setup.context;

    const frame = Math.floor(firstScene.durationInFrames * 0.6);
    await setup.page.evaluate((f) => window.__gm!.setFrame(f), frame);

    const cdp = await context.newCDPSession(setup.page);
    const shot = await cdp.send("Page.captureScreenshot", {
      format: "jpeg",
      quality: 80,
    });
    const fullPath = join(workDir, "full.jpg");
    writeFileSync(fullPath, Buffer.from(shot.data, "base64"));

    const thumbPath = join(workDir, "thumb.jpg");
    await runFfmpeg(["-y", "-i", fullPath, "-vf", "scale=640:-1", "-q:v", "4", thumbPath]);

    const storageKey = `projects/${projectId}/thumbnails/${crypto.randomUUID()}.jpg`;
    const url = await putObject(storageKey, readFileSync(thumbPath), "image/jpeg");

    await db
      .update(schema.projects)
      .set({ thumbnailUrl: url })
      .where(eq(schema.projects.id, projectId));
    console.log(`[thumbnail ${projectId}] updated`);
  } catch (err) {
    // Thumbnails are best-effort; a broken first scene shouldn't crash the worker.
    console.warn(
      `[thumbnail ${projectId}] failed:`,
      err instanceof Error ? err.message : err,
    );
  } finally {
    await context?.close();
    rmSync(workDir, { recursive: true, force: true });
  }
}

export async function runRenderJob(browser: Browser, exportJobId: string) {
  const [job] = await db
    .select()
    .from(schema.exportJobs)
    .where(eq(schema.exportJobs.id, exportJobId));
  if (!job) throw new Error(`Export job ${exportJobId} not found`);

  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, job.projectId));
  if (!project) {
    await updateJob(exportJobId, { status: "failed", error: "Project no longer exists" });
    return;
  }

  const scenes = await db
    .select()
    .from(schema.scenes)
    .where(eq(schema.scenes.projectId, project.id))
    .orderBy(asc(schema.scenes.order));

  await updateJob(exportJobId, { status: "rendering", startedAt: new Date(), progress: 0 });

  let context: Awaited<ReturnType<Browser["newContext"]>> | null = null;
  const workDir = mkdtempSync(join(tmpdir(), "gm-render-"));

  try {
    const compiledScenes = await compileScenes(scenes);

    // Fresh context + page, deterministic rendering flags.
    const setup = await createRenderPage(browser, project, compiledScenes);
    context = setup.context;
    const { page, pageErrors } = setup;

    const totalFrames = await page.evaluate(() => window.__gm!.getTotalFrames());
    if (totalFrames <= 0) throw new Error("Composition has no frames");

    // 3. Frame loop → ffmpeg stdin.
    const outputPath = join(workDir, "out.mp4");
    const ffmpeg = spawn(FFMPEG_PATH, [
      "-y",
      "-f", "image2pipe",
      "-framerate", String(project.fps),
      "-i", "-",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      outputPath,
    ]);
    let ffmpegStderr = "";
    ffmpeg.stderr.on("data", (d) => {
      ffmpegStderr += d.toString();
      if (ffmpegStderr.length > 20000) ffmpegStderr = ffmpegStderr.slice(-10000);
    });
    const ffmpegDone = new Promise<void>((resolve, reject) => {
      ffmpeg.on("close", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`ffmpeg exited with ${code}: ${ffmpegStderr.slice(-800)}`)),
      );
      ffmpeg.on("error", reject);
    });

    const cdp: CDPSession = await context.newCDPSession(page);
    for (let frame = 0; frame < totalFrames; frame++) {
      await page.evaluate((f) => window.__gm!.setFrame(f), frame);
      const shot = await cdp.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 95,
      });
      const buffer = Buffer.from(shot.data, "base64");
      if (!ffmpeg.stdin.write(buffer)) {
        await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve));
      }
      if (frame % 15 === 0) {
        await updateJob(exportJobId, {
          progress: Math.round((frame / totalFrames) * 90),
        });
      }
    }

    await updateJob(exportJobId, { status: "encoding", progress: 92 });
    ffmpeg.stdin.end();
    await ffmpegDone;

    if (pageErrors.length > 0) {
      console.warn(`[render ${exportJobId}] page errors:`, pageErrors.slice(0, 3));
    }

    // 4. Mix scene voiceovers/audio tracks into the video.
    let finalPath = outputPath;
    const scenesWithAudio = scenes.filter((s) => s.audioUrl);
    if (scenesWithAudio.length > 0) {
      const tracks: SceneAudio[] = [];
      let startFrame = 0;
      for (const scene of scenes) {
        if (scene.audioUrl) {
          const res = await fetch(scene.audioUrl);
          if (res.ok) {
            const audioPath = join(workDir, `audio-${tracks.length}.mp3`);
            writeFileSync(audioPath, Buffer.from(await res.arrayBuffer()));
            tracks.push({
              path: audioPath,
              delayMs: (startFrame / project.fps) * 1000,
              volume: scene.audioVolume ?? 1,
            });
          } else {
            console.warn(
              `[render ${exportJobId}] audio fetch failed (${res.status}) for scene "${scene.name}" — exporting without it`,
            );
          }
        }
        startFrame += scene.durationInFrames;
      }
      if (tracks.length > 0) {
        const mixedPath = join(workDir, "out-audio.mp4");
        await mixAudio(outputPath, tracks, totalFrames / project.fps, mixedPath);
        finalPath = mixedPath;
      }
    }

    // 5. Upload + asset row.
    await updateJob(exportJobId, { status: "uploading", progress: 96 });
    const mp4 = readFileSync(finalPath);
    const safeName = project.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "export";
    const storageKey = `projects/${project.id}/exports/${exportJobId}/${safeName}.mp4`;
    const url = await putObject(storageKey, mp4, "video/mp4");

    const [asset] = await db
      .insert(schema.assets)
      .values({
        userId: job.userId,
        projectId: project.id,
        storageKey,
        url,
        kind: "export",
        filename: `${safeName}.mp4`,
        mimeType: "video/mp4",
        sizeBytes: mp4.byteLength,
        width: project.width,
        height: project.height,
        durationSeconds: totalFrames / project.fps,
        status: "ready",
      })
      .returning({ id: schema.assets.id });

    await updateJob(exportJobId, {
      status: "done",
      progress: 100,
      outputAssetId: asset!.id,
      completedAt: new Date(),
    });
    console.log(`[render ${exportJobId}] done — ${totalFrames} frames → ${url}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[render ${exportJobId}] failed:`, message);
    await updateJob(exportJobId, {
      status: "failed",
      error: message.slice(0, 2000),
      completedAt: new Date(),
    });
  } finally {
    await context?.close();
    rmSync(workDir, { recursive: true, force: true });
  }
}
