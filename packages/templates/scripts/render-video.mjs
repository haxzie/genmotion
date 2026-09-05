/**
 * Render each template's full composition to an MP4 and upload it to R2.
 *
 * This is what a public page should ever play — the desktop gallery's hover
 * preview, the detail page, and the web site's template pages all point a
 * plain `<video>` at the result instead of live-compiling scene bundles and
 * evaluating them in the browser. That live path stays, but only for
 * `/api/templates/:id/files` — the raw source a remix actually needs.
 *
 * The upload lands at a fixed key, `templates/<id>/video.mp4` — no client
 * needs to know the resulting URL, because R2 isn't public (see
 * `packages/storage`) and every player reaches it through
 * `GET /api/templates/:id/video` instead, which fetches that exact key
 * regardless. The URL is still written back into `template.json`'s `video`
 * field, purely as a record of where it last landed. Re-running this script
 * overwrites both; `?v=<revision>` on the API route is what cache-busts a
 * changed render, exactly like the poster.
 *
 *   pnpm --filter @genmotion/templates render-video                    # every template
 *   pnpm --filter @genmotion/templates render-video prequel-launch     # just one
 *
 * Needs R2/S3 credentials in the environment — see the root .env
 * (S3_ENDPOINT, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY). Local
 * MinIO works the same way the rest of the app's uploads already use it.
 */
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { putObject } from "@genmotion/storage";
import {
  compileTemplate,
  getTemplate,
  listTemplateIds,
  TEMPLATE_FILE,
  TRIPWIRE_PREFIX,
} from "../src/index.ts";
import { hostBundle } from "./lib/render-host-bundle.mjs";

const require = createRequire(import.meta.url);
const FFMPEG_PATH = require("ffmpeg-static");

const PAGE_SHELL = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #000; overflow: hidden; }
</style></head><body><div id="root"></div></body></html>`;

/**
 * Fake origin `TRIPWIRE_PREFIX` gets rewritten to before a scene evaluates —
 * never resolved over real DNS, since `context.route()` below intercepts
 * every request to it and answers straight off disk. An oversized image, any
 * audio (which never inlines regardless of size), or an on-screen `<Video>`
 * all leave the same placeholder; all three need to actually load for the
 * capture to be correct — audio least of all (it's muxed separately, below),
 * but a `<Video>` overlay is really painted, and a broken one is a broken
 * frame in the render for as long as it's on screen.
 */
const ASSET_ORIGIN = "https://gm-template-asset.internal";

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, args);
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 20000) stderr = stderr.slice(-10000);
    });
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}: ${stderr.slice(-800)}`)),
    );
    proc.on("error", reject);
  });
}

/** Mirrors `apps/renderer`'s `mixAudio` filter graph — trim, delay, volume,
 *  mix — deliberately: the two renderers should never disagree about what an
 *  audio clip's timing math means. No fades: the hosted export doesn't apply
 *  them either (a pre-existing gap there, not one introduced here). */
async function muxAudio(videoPath, tracks, durationSeconds, outputPath) {
  const inputs = tracks.flatMap((t) => ["-i", t.path]);
  const delayed = tracks.map((t, i) => {
    const trim =
      t.startFromSec || t.durationSec
        ? `atrim=start=${(t.startFromSec ?? 0).toFixed(3)}` +
          `${t.durationSec ? `:duration=${t.durationSec.toFixed(3)}` : ""}` +
          `,asetpts=PTS-STARTPTS,`
        : "";
    return `[${i + 1}:a]${trim}adelay=${Math.round(t.delayMs)}:all=1,volume=${t.volume}[a${i}]`;
  });
  const labels = tracks.map((_, i) => `[a${i}]`).join("");
  const mix =
    tracks.length === 1
      ? delayed[0].replace("[a0]", "[aout]")
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

/** Every audio track this template plays, as local file paths — scene
 *  voiceovers first (whole source, delayed to the scene's start), then
 *  project-level clips (trimmed to their window, delayed to their start).
 *  Same shape and ordering as `buildRenderAudioSources` in
 *  `packages/shared`, just resolved against the filesystem instead of
 *  fetching a public URL — nothing here is uploaded anywhere yet. */
function collectAudioTracks(record) {
  const { manifest, dir } = record;
  const tracks = [];

  let startFrame = 0;
  for (const scene of manifest.scenes) {
    if (scene.audio) {
      tracks.push({
        path: path.join(dir, scene.audio),
        delayMs: (startFrame / manifest.fps) * 1000,
        volume: scene.audioVolume ?? 1,
      });
    }
    startFrame += scene.durationInFrames;
  }

  for (const clip of manifest.audio) {
    if (clip.muted) continue;
    tracks.push({
      path: path.join(dir, clip.file),
      delayMs: (clip.startFrame / manifest.fps) * 1000,
      volume: clip.volume,
      startFromSec: clip.startFrom,
      durationSec: clip.durationInFrames / manifest.fps,
    });
  }

  return tracks;
}

/** Point every `TRIPWIRE_PREFIX` placeholder at `ASSET_ORIGIN` instead — the
 *  one thing that turns it into a URL a browser will actually try to load. */
function resolveAssetPlaceholders(code) {
  return code.replaceAll(`${TRIPWIRE_PREFIX}assets/`, `${ASSET_ORIGIN}/`);
}

/**
 * Stamp `template.json`'s `video` field with where this upload just landed —
 * a record for a human checking the sidecar, not something any client reads
 * (see the field's own doc comment in `schema.ts`).
 */
function recordVideoUrl(dir, url) {
  const file = path.join(dir, TEMPLATE_FILE);
  const meta = JSON.parse(fs.readFileSync(file, "utf8"));
  meta.video = url;
  fs.writeFileSync(file, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
}

async function renderOne(browser, host, id) {
  const record = await getTemplate(id);
  if (!record) throw new Error(`No such template: ${id}`);
  const { fps, width, height } = record.manifest;

  const scenes = await compileTemplate(record);
  for (const scene of scenes) {
    if (scene.error) throw new Error(`${id}/${scene.id} failed to bundle: ${scene.error}`);
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "gm-template-video-"));
  const context = await browser.newContext({
    viewport: { width, height },
    // See render-job.ts: Page.captureScreenshot ignores this for resolution —
    // kept at 1 so nothing here is quietly relying on a different behavior.
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });

  // Answer every `ASSET_ORIGIN` request straight off disk — the only network
  // this render ever needs. A relative path that climbs out of `assets/`
  // can't reach here: `compileTemplate`'s bundler is the one that emitted
  // these placeholders, always as paths relative to the template's own
  // `assets/` dir.
  await context.route(`${ASSET_ORIGIN}/**`, async (route) => {
    const relative = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
    const absolute = path.join(record.dir, "assets", relative);
    // `path` (not `body`) so Playwright reads the file itself and sets
    // Content-Type from the extension — a `<Video>` needs the real one to
    // even attempt playback.
    await route.fulfill({ path: absolute }).catch(() => route.fulfill({ status: 404 }));
  });

  try {
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    await page.setContent(PAGE_SHELL, { waitUntil: "domcontentloaded" });
    await page.addScriptTag({ content: host });

    const init = await page.evaluate(
      (payload) => window.__gmInit(payload),
      {
        scenes: scenes.map((s) => ({
          id: s.id,
          name: s.name,
          durationInFrames: s.durationInFrames,
          compiledCode: resolveAssetPlaceholders(s.code),
        })),
        fps,
        width,
        height,
      },
    );
    if (init?.error) throw new Error(`${id}: ${init.error}`);

    const totalFrames = await page.evaluate(() => window.__gm.getTotalFrames());
    if (totalFrames <= 0) throw new Error(`${id}: composition has no frames`);

    const silentPath = path.join(workDir, "silent.mp4");
    const ffmpeg = spawn(FFMPEG_PATH, [
      "-y",
      "-f", "image2pipe",
      "-framerate", String(fps),
      "-i", "-",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "20",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      silentPath,
    ]);
    let ffmpegStderr = "";
    ffmpeg.stderr.on("data", (d) => {
      ffmpegStderr += d.toString();
      if (ffmpegStderr.length > 20000) ffmpegStderr = ffmpegStderr.slice(-10000);
    });
    const ffmpegDone = new Promise((resolve, reject) => {
      ffmpeg.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}: ${ffmpegStderr.slice(-800)}`)),
      );
      ffmpeg.on("error", reject);
    });

    const cdp = await context.newCDPSession(page);
    process.stdout.write(`${id}: rendering ${totalFrames} frames…`);
    for (let frame = 0; frame < totalFrames; frame++) {
      await page.evaluate((f) => window.__gm.setFrame(f), frame);
      const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92 });
      const buffer = Buffer.from(shot.data, "base64");
      if (!ffmpeg.stdin.write(buffer)) {
        await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve));
      }
      if (frame % 30 === 0) process.stdout.write(".");
    }
    process.stdout.write(" encoding…");
    ffmpeg.stdin.end();
    await ffmpegDone;

    if (pageErrors.length > 0) {
      console.warn(`\n${id}: page errors during render:`, pageErrors.slice(0, 3));
    }

    const tracks = collectAudioTracks(record);
    let finalPath = silentPath;
    if (tracks.length > 0) {
      process.stdout.write(" muxing audio…");
      const mixedPath = path.join(workDir, "final.mp4");
      await muxAudio(silentPath, tracks, totalFrames / fps, mixedPath);
      finalPath = mixedPath;
    }

    const bytes = fs.readFileSync(finalPath);
    process.stdout.write(" uploading…");
    const key = `templates/${id}/video.mp4`;
    const url = await putObject(key, bytes, "video/mp4");
    recordVideoUrl(record.dir, url);
    console.log(` done — ${Math.round(bytes.length / 1024 / 1024)}MB → ${url}`);
  } finally {
    await context.close();
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

async function main() {
  const wanted = process.argv.slice(2);
  const ids = wanted.length ? wanted : await listTemplateIds();
  const host = await hostBundle();
  const browser = await chromium.launch();
  const failed = [];
  try {
    for (const id of ids) {
      try {
        await renderOne(browser, host, id);
      } catch (err) {
        console.error(`\n${id}: FAILED — ${err instanceof Error ? err.message : err}`);
        failed.push(id);
      }
    }
  } finally {
    await browser.close();
  }
  if (failed.length > 0) {
    console.error(`\n${failed.length} template(s) failed: ${failed.join(", ")}`);
    process.exit(1);
  }
}

main();
