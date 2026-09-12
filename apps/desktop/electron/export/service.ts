import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { BrowserWindow } from "electron";
import {
  buildRenderAudioSources,
  type ExportFormat,
  type ExportStatus,
} from "@genmotion/shared";
import { readManifest, type ProjectManifest } from "@genmotion/project";
// Its own subpath: the barrel also exports Composition/Player (React) and
// the zustand store, none of which the main process needs — pulling them in
// through the barrel added 1.5MB to main.cjs for a badge that is one string.
import { watermarkHtml } from "@genmotion/player/watermark";
import type { ProjectSession } from "../project-session";
import type { DesktopExportJob } from "../shared";
import { bundledBinary } from "../bundled-bin";
import { checkExportEntitlement } from "./entitlement";
import {
  findExportRecord,
  listExportHistory,
  outputExists,
  recordExport,
  type ExportRecord,
} from "./history";
import { readThumbnail } from "./thumbnail";
import { openCompositionWindow, type CompositionWindow } from "./hyperframes-window";
import { planAudioMix, type AudioLevelSamples } from "./hyperframes-audio";

/** Encoder quality knob, matching the hosted renderer's mapping. */
const QUALITY = 80;

type Listener = (job: DesktopExportJob) => void;

/**
 * The full record of one export — the wire shape the export button already
 * reads, plus what the Exports panel needs to list jobs from every project and
 * what the main process needs to run and reveal them.
 */
interface Job extends DesktopExportJob {
  /** Absolute path of the finished file, once there is one. */
  outputPath?: string;
  /** Set by `cancelExport`; the frame loop checks it between frames. */
  cancelled: boolean;
}

/**
 * Every export this run of the app has been asked for, in the order asked.
 *
 * A queue rather than a single slot: with several projects open, two of them
 * asking to export at once is ordinary. They still render one at a time — each
 * job holds a composition-sized offscreen window and an ffmpeg, and two of
 * those would slow the one the user is actually waiting for — but the second
 * waits its turn instead of being refused. Insertion order is the panel's
 * order.
 */
const jobs = new Map<string, Job>();
/** Ids waiting to run, oldest first. */
const waiting: string[] = [];
/** The job holding the offscreen window right now. */
let running: string | null = null;
const listeners = new Set<Listener>();

const ACTIVE: ReadonlySet<ExportStatus> = new Set(["queued", "rendering", "encoding", "uploading"]);

function publicJob(job: Job): DesktopExportJob {
  const { outputPath: _out, cancelled: _cancelled, ...rest } = job;
  return rest;
}

/** The newest export for a project, or across every project when none is given. */
export function latestExport(projectDir?: string): DesktopExportJob | null {
  let found: Job | null = null;
  for (const job of jobs.values()) {
    if (projectDir && job.projectDir !== projectDir) continue;
    found = job;
  }
  return found ? publicJob(found) : null;
}

/** This run's jobs, newest first. */
function liveExports(): DesktopExportJob[] {
  return [...jobs.values()].reverse().map(publicJob);
}

function fromRecord(record: ExportRecord): DesktopExportJob {
  return {
    id: record.id,
    projectId: record.projectDir,
    projectDir: record.projectDir,
    projectName: record.projectName,
    format: record.format,
    status: "done",
    progress: 100,
    totalFrames: Math.round(record.durationSeconds * record.fps),
    createdAt: record.createdAt,
    finishedAt: record.finishedAt,
    sizeBytes: record.sizeBytes,
    width: record.width,
    height: record.height,
    durationSeconds: record.durationSeconds,
  };
}

/**
 * Every export, newest first: this run's queue, then everything remembered
 * from before it. A finished job appears in both, so the live copy wins.
 *
 * `limit` bounds the history read for the panel, which shows a handful;
 * `thumbnails` inlines each project's card image for the page, read once per
 * project rather than once per export.
 */
export async function listExports({
  limit,
  thumbnails = false,
}: { limit?: number; thumbnails?: boolean } = {}): Promise<DesktopExportJob[]> {
  const live = liveExports();
  const seen = new Set(live.map((job) => job.id));
  const remembered = (await listExportHistory()).filter((record) => !seen.has(record.id));
  const merged = [...live, ...remembered.map(fromRecord)].sort(
    (a, b) => (b.finishedAt ?? b.createdAt) - (a.finishedAt ?? a.createdAt),
  );
  const page = limit ? merged.slice(0, limit) : merged;

  const pictures = new Map<string, Promise<string | null>>();
  return Promise.all(
    page.map(async (job) => {
      const out: DesktopExportJob = { ...job };
      if (job.status === "done") {
        const target = await outputPathFor(job.id);
        out.fileMissing = !target || !(await outputExists({ outputPath: target }));
      }
      if (thumbnails) {
        let picture = pictures.get(job.projectDir);
        if (!picture) {
          picture = readThumbnail(job.projectDir).catch(() => null);
          pictures.set(job.projectDir, picture);
        }
        out.thumbnail = await picture;
      }
      return out;
    }),
  );
}

/** True while any project's export holds, or is waiting for, the window. */
export function hasActiveExport(): boolean {
  return running !== null || waiting.length > 0;
}

export function onExportChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Stop an export. A queued one is simply pulled from the line; a running one
 * finishes the frame it is on and then stops.
 */
export function cancelExport(id: string): boolean {
  const job = jobs.get(id);
  if (!job || !ACTIVE.has(job.status)) return false;
  job.cancelled = true;
  const index = waiting.indexOf(id);
  if (index !== -1) waiting.splice(index, 1);
  update(id, { status: "cancelled", finishedAt: Date.now() });
  return true;
}

/** Closing or deleting a project takes its exports with it. */
export function cancelExportsForProject(projectDir: string): void {
  for (const job of jobs.values()) {
    if (job.projectDir === projectDir && ACTIVE.has(job.status)) cancelExport(job.id);
  }
}

/** Where a finished export landed, for revealing it — main owns the path, not the renderer. */
async function outputPathFor(id: string): Promise<string | null> {
  const live = jobs.get(id)?.outputPath;
  if (live) return live;
  return (await findExportRecord(id))?.outputPath ?? null;
}

export function exportOutputPath(id: string): Promise<string | null> {
  return outputPathFor(id);
}

function update(id: string, patch: Partial<Job>): void {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch);
  const snapshot = publicJob(job);
  for (const listener of listeners) listener(snapshot);
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bundledBinary("ffmpeg"), args);
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
      if (stderr.length > 20000) stderr = stderr.slice(-10000);
    });
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}: ${stderr.slice(-600)}`)),
    );
  });
}

/** Shared with the thumbnail capture, so both draw onto an identical page. */
export const PAGE_SHELL = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #000; overflow: hidden; }
</style></head><body><div id="root"></div></body></html>`;

/**
 * `capturePage` renders at the display's device pixel ratio, so on a Retina
 * screen the frames arrive at 2× the composition. That is free supersampling —
 * exactly what the hosted renderer pays for deliberately — so keep it and let
 * ffmpeg scale back to the project's declared size. It also makes the output
 * resolution independent of whichever monitor the app happens to be on.
 */
function encoderArgs(
  format: ExportFormat,
  fps: number,
  width: number,
  height: number,
): string[] {
  const crf = Math.round(32 - (QUALITY / 100) * 16);
  if (format === "gif") {
    return [
      "-vf",
      "fps=15,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
      "-loop",
      "0",
    ];
  }
  const scale = ["-vf", `scale=${width}:${height}:flags=lanczos`];
  if (format === "webm") {
    return [...scale, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(crf), "-deadline", "good",
            "-cpu-used", "4", "-row-mt", "1", "-pix_fmt", "yuv420p"];
  }
  return [...scale, "-c:v", "libx264", "-preset", "medium", "-crf", String(crf),
          "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", String(fps)];
}

/**
 * Render the project to a file, entirely locally.
 *
 * Electron already ships the browser the preview runs in, so the export uses an
 * offscreen window of the same engine rather than a separate headless Chromium:
 * seek to a frame, wait for the composition's readiness barrier, capture, pipe
 * the JPEG into ffmpeg. Frames come out of the same `mountRenderHost` the
 * preview and the hosted renderer use, so all three agree.
 */
export async function startExport(
  session: ProjectSession,
  input: { format: ExportFormat },
): Promise<DesktopExportJob> {
  // Checked before anything else — including before a job exists to be queued
  // — so a trial that has ended refuses the same way the hosted API's own
  // `POST /api/exports` does: nothing starts, and `ExportPaywallError`
  // propagates out for the loopback route to turn into the same 402 shape the
  // export button's `handleLimitError` already knows how to catch.
  const entitlement = await checkExportEntitlement();

  const manifest = await readManifest(session.dir);
  const totalFrames = expectedFrames(session, manifest);
  if (totalFrames === 0) {
    throw new Error(
      manifest.engine === "hyperframes"
        ? session.hyperframes.compileError ?? "Nothing to export — the composition has no duration"
        : "Nothing to export — the project has no scenes",
    );
  }

  const id = `exp_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
  const job: Job = {
    id,
    projectId: session.dir,
    projectDir: session.dir,
    projectName: manifest.name,
    format: input.format,
    status: "queued",
    progress: 0,
    totalFrames,
    createdAt: Date.now(),
    cancelled: false,
  };
  jobs.set(id, job);
  waiting.push(id);
  // Announce the queued job so the panel's feed shows it at once, even though
  // nothing has started yet.
  update(id, {});

  // Run detached: the HTTP response returns the queued job immediately and the
  // client follows progress over the event stream.
  void pump(() => ({ session, manifest, watermark: entitlement.watermark }));

  return publicJob(job);
}

/**
 * How many frames the export will have, from what is known before it runs.
 *
 * A React project's length is the sum of its scenes; a HyperFrames project's
 * is whatever the last compile resolved — the page confirms it once open.
 */
function expectedFrames(session: ProjectSession, manifest: ProjectManifest): number {
  if (manifest.engine === "hyperframes") {
    const seconds = session.hyperframes.current?.durationSeconds ?? 0;
    return Math.round(seconds * manifest.fps);
  }
  return manifest.scenes.reduce((n, s) => n + s.durationInFrames, 0);
}

/** What a queued job needs to run, held beside it until its turn comes. */
type Prepared = { session: ProjectSession; manifest: ProjectManifest; watermark: boolean };
const prepared = new Map<string, Prepared>();

/**
 * Run the next job in line, if the window is free.
 *
 * Re-entered after every job — successful, failed or cancelled — so a queue
 * of three drains without anyone asking again.
 */
async function pump(next?: () => Prepared): Promise<void> {
  if (next) {
    const id = waiting.at(-1);
    if (id) prepared.set(id, next());
  }
  if (running !== null) return;
  const id = waiting.shift();
  if (!id) return;
  const job = jobs.get(id);
  const input = prepared.get(id);
  prepared.delete(id);
  // Cancelled while waiting: nothing to run, move on.
  if (!job || !input || job.cancelled) {
    void pump();
    return;
  }
  running = id;
  try {
    update(id, { startedAt: Date.now() });
    await run(job, input.session, input.manifest, input.watermark);
  } catch (err) {
    update(id, {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      finishedAt: Date.now(),
    });
  } finally {
    running = null;
    void pump();
  }
}

async function run(
  job: Job,
  session: ProjectSession,
  manifest: ProjectManifest,
  watermark: boolean,
): Promise<void> {
  if (manifest.engine === "hyperframes") return runHyperframes(job, session, manifest, watermark);

  const { fps, width, height } = manifest;
  const totalFrames = manifest.scenes.reduce((n, s) => n + s.durationInFrames, 0);
  const format = job.format;
  const id = job.id;

  // 1. Bundle every scene with the same incremental bundler the editor uses.
  const scenes = [];
  for (const entry of manifest.scenes) {
    // The project's tab may have closed while this job waited its turn.
    if (session.disposed) throw new Error("This project was closed.");
    const built = await session.bundler.bundle(entry.file);
    if (!built.ok) throw new Error(`${entry.file} failed to build: ${built.error.message}`);
    scenes.push({
      id: entry.file,
      name: entry.name ?? entry.file,
      durationInFrames: entry.durationInFrames,
      compiledCode: built.code,
    });
  }

  const hostBundle = await fs.readFile(path.join(__dirname, "render-host.js"), "utf8");

  update(id, { status: "rendering" });

  // 2. An offscreen window at exactly the composition's pixel size. Offscreen
  //    rendering keeps painting when the window is never shown, which a plain
  //    hidden window does not.
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const outDir = path.join(session.dir, "exports");
  await fs.mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const silentPath = path.join(outDir, `.render-${stamp}.${format}`);
  const outputPath = path.join(outDir, `${slug(manifest.name)}-${stamp}.${format}`);

  try {
    await win.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(PAGE_SHELL)}`);

    // Appended before the host mounts, so the badge is present on every
    // captured frame — it lives outside #root, so the composition can't paint
    // over it. Same markup and the same rule the hosted renderer uses.
    if (watermark) {
      await win.webContents.executeJavaScript(
        `(() => {
           const holder = document.createElement("div");
           holder.innerHTML = ${JSON.stringify(watermarkHtml(width, height))};
           const badge = holder.firstElementChild;
           if (badge) document.body.appendChild(badge);
         })()`,
      );
    }

    await win.webContents.executeJavaScript(hostBundle);
    const init = (await win.webContents.executeJavaScript(
      `window.__gmInit(${JSON.stringify({ scenes, fps, width, height })})`,
    )) as { error?: string };
    if (init?.error) throw new Error(init.error);

    // 3. Frame loop → ffmpeg stdin.
    const ffmpeg = spawn(bundledBinary("ffmpeg"), [
      "-y",
      "-f", "image2pipe",
      "-framerate", String(fps),
      "-i", "-",
      ...encoderArgs(format, fps, width, height),
      silentPath,
    ]);
    let ffmpegErr = "";
    ffmpeg.stderr.on("data", (d: Buffer) => {
      ffmpegErr += d.toString();
      if (ffmpegErr.length > 20000) ffmpegErr = ffmpegErr.slice(-10000);
    });
    const encoded = new Promise<void>((resolve, reject) => {
      ffmpeg.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}: ${ffmpegErr.slice(-600)}`)),
      );
      ffmpeg.on("error", reject);
    });

    for (let frame = 0; frame < totalFrames; frame++) {
      if (job.cancelled) break;
      // The host resolves this once React has committed, fonts are ready, and
      // every registered asset reports loaded — the determinism barrier.
      await win.webContents.executeJavaScript(`window.__gm.setFrame(${frame})`);
      const image = await win.webContents.capturePage();
      const jpeg = image.toJPEG(92);
      if (!ffmpeg.stdin.write(jpeg)) {
        await new Promise<void>((resolve) => ffmpeg.stdin.once("drain", resolve));
      }
      if (frame % 5 === 0 || frame === totalFrames - 1) {
        update(id, { progress: Math.round(((frame + 1) / totalFrames) * 100) });
      }
    }
    ffmpeg.stdin.end();
    await encoded;

    if (job.cancelled) {
      await fs.rm(silentPath, { force: true });
      return;
    }

    // 4. Mux the timeline audio, if any.
    update(id, { status: "encoding", progress: 100 });
    const mixed = await muxAudio(session, manifest, silentPath, outputPath, format, totalFrames / fps);
    if (!mixed) await fs.rename(silentPath, outputPath);
    else await fs.rm(silentPath, { force: true });

    const finishedAt = Date.now();
    const sizeBytes = await fs.stat(outputPath).then((s) => s.size).catch(() => 0);
    update(id, {
      status: "done",
      outputUrl: session.assetUrl(path.relative(session.dir, outputPath)),
      outputPath,
      finishedAt,
      sizeBytes,
      width,
      height,
      durationSeconds: totalFrames / fps,
    });
    // Remembered across launches — the panel and the Exports page read it
    // back. Best-effort: a history write failing must not fail the export.
    await recordExport({
      id,
      projectDir: session.dir,
      projectName: job.projectName,
      format,
      outputPath,
      sizeBytes,
      width,
      height,
      fps,
      durationSeconds: totalFrames / fps,
      createdAt: job.createdAt,
      finishedAt,
    }).catch(() => {});
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

/**
 * The HyperFrames export.
 *
 * Same shape as the React one — offscreen window, seek, capture, pipe to
 * ffmpeg, mux — with the composition page standing in for the render host.
 * The size and length come from the page rather than the manifest: the root's
 * `data-width`/`data-height` and the duration the runtime resolved are the
 * truth, and a manifest that disagrees is only the app's record of what the
 * project was created as.
 */
async function runHyperframes(
  job: Job,
  session: ProjectSession,
  manifest: ProjectManifest,
  watermark: boolean,
): Promise<void> {
  const { fps } = manifest;
  const format = job.format;
  const id = job.id;

  const compiled = session.hyperframes.current;
  if (!compiled) throw new Error(session.hyperframes.compileError ?? "The composition does not compile");
  const { width, height } = compiled;

  update(id, { status: "rendering" });
  const page = await openCompositionWindow(session, { width, height });

  const outDir = path.join(session.dir, "exports");
  await fs.mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const silentPath = path.join(outDir, `.render-${stamp}.${format}`);
  const outputPath = path.join(outDir, `${slug(manifest.name)}-${stamp}.${format}`);

  try {
    const totalFrames = Math.max(1, Math.round(page.durationSeconds * fps));
    update(id, { totalFrames });

    if (watermark) {
      await injectWatermark(page, width, height);
    }

    const ffmpeg = spawn(bundledBinary("ffmpeg"), [
      "-y",
      "-f", "image2pipe",
      "-framerate", String(fps),
      "-i", "-",
      ...encoderArgs(format, fps, width, height),
      silentPath,
    ]);
    let ffmpegErr = "";
    ffmpeg.stderr.on("data", (d: Buffer) => {
      ffmpegErr += d.toString();
      if (ffmpegErr.length > 20000) ffmpegErr = ffmpegErr.slice(-10000);
    });
    const encoded = new Promise<void>((resolve, reject) => {
      ffmpeg.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}: ${ffmpegErr.slice(-600)}`)),
      );
      ffmpeg.on("error", reject);
    });

    // Every frame's audio gains, for the mix: a fade the timeline animates
    // is only knowable by asking the page at each frame.
    const levels: AudioLevelSamples = [];
    for (let frame = 0; frame < totalFrames; frame++) {
      if (job.cancelled) break;
      await page.seek(frame / fps);
      levels.push(await page.audioLevels());
      const image = await page.capture();
      const jpeg = image.toJPEG(92);
      if (!ffmpeg.stdin.write(jpeg)) {
        await new Promise<void>((resolve) => ffmpeg.stdin.once("drain", resolve));
      }
      if (frame % 5 === 0 || frame === totalFrames - 1) {
        update(id, { progress: Math.round(((frame + 1) / totalFrames) * 100) });
      }
    }
    ffmpeg.stdin.end();
    await encoded;

    if (job.cancelled) {
      await fs.rm(silentPath, { force: true });
      return;
    }

    update(id, { status: "encoding", progress: 100 });
    const plan =
      format === "gif"
        ? null
        : planAudioMix(session.dir, compiled.timeline.audio, levels, fps, totalFrames);
    if (plan) {
      await runFfmpeg([
        "-y", "-i", silentPath,
        ...plan.inputs,
        "-filter_complex", plan.filterComplex,
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", format === "webm" ? "libopus" : "aac",
        "-t", (totalFrames / fps).toFixed(3),
        outputPath,
      ]);
      await fs.rm(silentPath, { force: true });
    } else {
      await fs.rename(silentPath, outputPath);
    }

    const finishedAt = Date.now();
    const sizeBytes = await fs.stat(outputPath).then((s) => s.size).catch(() => 0);
    update(id, {
      status: "done",
      outputUrl: session.assetUrl(path.relative(session.dir, outputPath)),
      outputPath,
      finishedAt,
      sizeBytes,
      width,
      height,
      durationSeconds: totalFrames / fps,
    });
    await recordExport({
      id,
      projectDir: session.dir,
      projectName: job.projectName,
      format,
      outputPath,
      sizeBytes,
      width,
      height,
      fps,
      durationSeconds: totalFrames / fps,
      createdAt: job.createdAt,
      finishedAt,
    }).catch(() => {});
  } finally {
    page.close();
  }
}

/**
 * The trial badge, on the composition page. Appended to `<body>` outside the
 * composition root so nothing the agent wrote can paint over it — the same
 * markup and rule the React export uses.
 */
async function injectWatermark(
  page: CompositionWindow,
  width: number,
  height: number,
): Promise<void> {
  await page.execute(
    `(() => {
       const holder = document.createElement("div");
       holder.innerHTML = ${JSON.stringify(watermarkHtml(width, height))};
       const badge = holder.firstElementChild;
       if (badge) document.body.appendChild(badge);
     })()`,
  );
}

/** Returns true when an audio track was mixed in. */
async function muxAudio(
  session: ProjectSession,
  manifest: Awaited<ReturnType<typeof readManifest>>,
  videoPath: string,
  outputPath: string,
  format: ExportFormat,
  durationSeconds: number,
): Promise<boolean> {
  if (format === "gif") return false;

  // Built with the same helper the hosted renderer uses, so a project exports
  // to the same mix in both places. Local file paths stand in for URLs — the
  // builder only passes them through. Scene-level audio is included here, which
  // a hand-rolled clips-only version would have silently dropped.
  const sources = buildRenderAudioSources(
    manifest.scenes.map((scene) => ({
      durationInFrames: scene.durationInFrames,
      audioUrl: scene.audio ? path.resolve(session.dir, scene.audio) : null,
      audioVolume: scene.audioVolume ?? 1,
    })),
    manifest.audio.map((clip) => ({
      url: path.resolve(session.dir, clip.file),
      startFrame: clip.startFrame,
      durationInFrames: clip.durationInFrames,
      startFrom: clip.startFrom,
      volume: clip.volume,
      fadeInFrames: clip.fadeInFrames,
      fadeOutFrames: clip.fadeOutFrames,
      muted: clip.muted,
    })),
    manifest.fps,
  ).filter((source) => existsSync(source.url));

  if (sources.length === 0) return false;

  const inputs: string[] = ["-y", "-i", videoPath];
  const filters: string[] = [];
  sources.forEach((source, index) => {
    if (source.startFromSec) inputs.push("-ss", String(source.startFromSec));
    inputs.push("-i", source.url);
    const stream = index + 1;
    const trim = source.durationSec ? `atrim=duration=${source.durationSec.toFixed(3)},` : "";
    const delay = Math.round(source.delayMs);
    // Order matters. Trim first so the fades measure against the clip's own
    // length, then fade, and only then delay — `adelay` prepends silence, and
    // fading after it would ramp the silence instead of the audio. `volume`
    // last so a gain change never rescales the fade's shape.
    const fadeIn = source.fadeInSec
      ? `afade=t=in:st=0:d=${source.fadeInSec.toFixed(3)},`
      : "";
    const fadeOut =
      source.fadeOutSec && source.durationSec
        ? `afade=t=out:st=${Math.max(0, source.durationSec - source.fadeOutSec).toFixed(3)}:d=${source.fadeOutSec.toFixed(3)},`
        : "";
    filters.push(
      `[${stream}:a]${trim}${fadeIn}${fadeOut}adelay=${delay}|${delay},volume=${source.volume ?? 1}[a${stream}]`,
    );
  });

  const labels = sources.map((_, i) => `[a${i + 1}]`).join("");
  const codec = format === "webm" ? "libopus" : "aac";
  await runFfmpeg([
    ...inputs,
    "-filter_complex",
    `${filters.join(";")};${labels}amix=inputs=${sources.length}:duration=longest:normalize=0[aout]`,
    "-map", "0:v",
    "-map", "[aout]",
    "-c:v", "copy",
    "-c:a", codec,
    "-t", durationSeconds.toFixed(3),
    outputPath,
  ]);
  return true;
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "export"
  );
}
