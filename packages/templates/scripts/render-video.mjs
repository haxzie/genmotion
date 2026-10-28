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
import { putObject, PUBLIC_BUCKET } from "@genmotion/storage";
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
    // Re-stated, not inherited: `-c:v copy` carries the video bitstream over
    // but the mux writes a fresh container, so the silent pass's own
    // `+faststart` does not survive this step. Without it the `moov` atom
    // lands at the end of the file and a player cannot begin until it has
    // fetched the tail — which, for every template that has audio, is every
    // template that would not start.
    "-movflags", "+faststart",
    "-t", durationSeconds.toFixed(3),
    outputPath,
  ]);
}

/**
 * Encoder settings for the full-size rendition.
 *
 * CRF alone was the whole quality setting here, and on grainy or
 * heavily-dithered material it has no ceiling: the catalog had 35-second
 * clips at 18 Mbps and 79 MB, which is more video than any surface that
 * plays them can use. The cap is what bounds the worst case; CRF still
 * decides everything below it, so clean material stays small.
 *
 * `-g` pins a keyframe every two seconds. Without it x264's default GOP can
 * run long enough that seeking lands seconds away from where it was asked
 * to, which is what makes a scrub feel broken rather than slow.
 */
function qualityArgs(fps) {
  return [
    "-crf", "23",
    "-maxrate", "8M",
    "-bufsize", "16M",
    "-profile:v", "high",
    "-level", "4.2",
    "-g", String(Math.round(fps * 2)),
  ];
}

/**
 * The rendition a gallery card plays on hover.
 *
 * Fits inside a 640px box whatever the template's aspect ratio — a card is
 * around 350 CSS px, so this is still comfortably over-sampled on a retina
 * display — and carries no audio, because a muted autoplaying tile has no
 * use for it and it is pure download. Capped at 30fps for the same reason.
 *
 * Re-encoded from the finished file rather than from the frame pipe: it
 * costs one cheap pass over an already-small input, and it cannot drift from
 * what the full rendition shows.
 */
async function renderPreview(sourcePath, outputPath) {
  await runFfmpeg([
    "-y",
    "-i", sourcePath,
    "-an",
    "-vf", "scale=w=640:h=640:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=fps=30:round=down",
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "30",
    "-maxrate", "900k",
    "-bufsize", "1800k",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
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
function recordVideoUrl(dir, url, previewUrl) {
  const file = path.join(dir, TEMPLATE_FILE);
  const meta = JSON.parse(fs.readFileSync(file, "utf8"));
  meta.video = url;
  // Also the flag that says a preview exists — `toSummary` leaves the preview
  // fields off a summary without it, so a template is never advertised as
  // having one before the object is actually in the bucket.
  meta.preview = previewUrl;
  fs.writeFileSync(file, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
}

async function renderOne(browser, id) {
  const record = await getTemplate(id);
  if (!record) throw new Error(`No such template: ${id}`);
  const { fps, width, height } = record.manifest;
  // Which render host drives the frames: the react player, or the three
  // engine's WebGL canvas. Same `__gmInit`/`__gm` bridge either way, so
  // everything below this line is engine-agnostic.
  const host = await hostBundle(record.manifest.engine);

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
      "-preset", "slow",
      ...qualityArgs(fps),
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

    process.stdout.write(" preview…");
    const previewPath = path.join(workDir, "preview.mp4");
    await renderPreview(finalPath, previewPath);

    const bytes = fs.readFileSync(finalPath);
    const previewBytes = fs.readFileSync(previewPath);
    process.stdout.write(" uploading…");
    // The world-readable bucket, not the main one: these are the only objects
    // anybody may fetch without an account, and keeping them somewhere that
    // holds nothing else is what lets a CDN hostname point at it safely.
    const url = await putObject(
      `templates/${id}/video.mp4`,
      bytes,
      "video/mp4",
      PUBLIC_BUCKET,
    );
    const previewUrl = await putObject(
      `templates/${id}/preview.mp4`,
      previewBytes,
      "video/mp4",
      PUBLIC_BUCKET,
    );
    recordVideoUrl(record.dir, url, previewUrl);
    console.log(
      ` done — ${(bytes.length / 1048576).toFixed(1)}MB` +
        ` + ${Math.round(previewBytes.length / 1024)}KB preview → ${url}`,
    );
  } finally {
    await context.close();
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

async function main() {
  const wanted = process.argv.slice(2);
  const ids = wanted.length ? wanted : await listTemplateIds();
  const browser = await chromium.launch();
  const failed = [];
  try {
    for (const id of ids) {
      try {
        await renderOne(browser, id);
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
