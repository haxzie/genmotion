import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { BrowserWindow } from "electron";
import {
  buildRenderAudioSources,
  type ExportFormat,
  type ExportJobData,
} from "@genmotion/shared";
import { readManifest } from "@genmotion/project";
import type { ProjectSession } from "../project-session";

/** Encoder quality knob, matching the hosted renderer's mapping. */
const QUALITY = 80;

type Listener = (job: ExportJobData) => void;

let current: (ExportJobData & { projectDir: string; outputPath?: string }) | null = null;
let cancelled = false;
const listeners = new Set<Listener>();

export function latestExport(): ExportJobData | null {
  if (!current) return null;
  const { projectDir: _dir, outputPath: _out, ...job } = current;
  return job;
}

export function onExportChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function cancelExport(id: string): boolean {
  if (!current || current.id !== id) return false;
  cancelled = true;
  update({ status: "cancelled" });
  return true;
}

function update(patch: Partial<ExportJobData>): void {
  if (!current) return;
  Object.assign(current, patch);
  const snapshot = latestExport();
  if (snapshot) for (const listener of listeners) listener(snapshot);
}

/** A shipped binary, unpacked from the asar so it can be executed. */
function binary(name: string): string {
  const packed = path.join(__dirname, "../bin", name);
  const unpacked = packed.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
  return existsSync(unpacked) ? unpacked : packed;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(binary("ffmpeg"), args);
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
): Promise<ExportJobData> {
  if (current && ["queued", "rendering", "encoding", "uploading"].includes(current.status)) {
    throw new Error("An export is already running");
  }

  const manifest = await readManifest(session.dir);
  const totalFrames = manifest.scenes.reduce((n, s) => n + s.durationInFrames, 0);
  if (totalFrames === 0) throw new Error("Nothing to export — the project has no scenes");

  cancelled = false;
  current = {
    id: `exp_${Date.now().toString(36)}`,
    projectId: session.dir,
    projectDir: session.dir,
    status: "queued",
    progress: 0,
    totalFrames,
  };
  const job = latestExport()!;

  // Run detached: the HTTP response returns the queued job immediately and the
  // client follows progress over the event stream.
  void run(session, manifest, input.format).catch((err) => {
    update({ status: "failed", error: err instanceof Error ? err.message : String(err) });
  });

  return job;
}

async function run(
  session: ProjectSession,
  manifest: Awaited<ReturnType<typeof readManifest>>,
  format: ExportFormat,
): Promise<void> {
  const { fps, width, height } = manifest;
  const totalFrames = manifest.scenes.reduce((n, s) => n + s.durationInFrames, 0);

  // 1. Bundle every scene with the same incremental bundler the editor uses.
  const scenes = [];
  for (const entry of manifest.scenes) {
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

  update({ status: "rendering" });

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
    await win.webContents.executeJavaScript(hostBundle);
    const init = (await win.webContents.executeJavaScript(
      `window.__gmInit(${JSON.stringify({ scenes, fps, width, height })})`,
    )) as { error?: string };
    if (init?.error) throw new Error(init.error);

    // 3. Frame loop → ffmpeg stdin.
    const ffmpeg = spawn(binary("ffmpeg"), [
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
      if (cancelled) break;
      // The host resolves this once React has committed, fonts are ready, and
      // every registered asset reports loaded — the determinism barrier.
      await win.webContents.executeJavaScript(`window.__gm.setFrame(${frame})`);
      const image = await win.webContents.capturePage();
      const jpeg = image.toJPEG(92);
      if (!ffmpeg.stdin.write(jpeg)) {
        await new Promise<void>((resolve) => ffmpeg.stdin.once("drain", resolve));
      }
      if (frame % 5 === 0 || frame === totalFrames - 1) {
        update({ progress: Math.round(((frame + 1) / totalFrames) * 100) });
      }
    }
    ffmpeg.stdin.end();
    await encoded;

    if (cancelled) {
      await fs.rm(silentPath, { force: true });
      return;
    }

    // 4. Mux the timeline audio, if any.
    update({ status: "encoding", progress: 100 });
    const mixed = await muxAudio(session, manifest, silentPath, outputPath, format, totalFrames / fps);
    if (!mixed) await fs.rename(silentPath, outputPath);
    else await fs.rm(silentPath, { force: true });

    update({ status: "done", outputUrl: session.assetUrl(path.relative(session.dir, outputPath)) });
    if (current) current.outputPath = outputPath;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
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
