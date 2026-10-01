import path from "node:path";
import { existsSync } from "node:fs";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createRequire } from "node:module";
import { buildRenderAudioSources } from "@genmotion/shared";
import type { ProjectManifest } from "@genmotion/project";

export type Codec = "mp4" | "webm" | "gif" | "mov" | "png";

export const CODEC_EXTENSIONS: Record<Codec, string> = {
  mp4: ".mp4",
  webm: ".webm",
  gif: ".gif",
  mov: ".mov",
  png: "",
};

/**
 * The ffmpeg binary: `FFMPEG_PATH` when set, then the one `ffmpeg-static`
 * downloaded at install, then whatever is on PATH.
 */
export function ffmpegPath(): string {
  const fromEnv = process.env.FFMPEG_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  try {
    const require = createRequire(import.meta.url);
    const bundled = require("ffmpeg-static") as string | null;
    if (bundled && existsSync(bundled)) return bundled;
  } catch {
    // Not installed, or its postinstall never ran — fall through to PATH.
  }
  return "ffmpeg";
}

export class FfmpegError extends Error {}

let ensured: Promise<string> | null = null;

/**
 * Makes sure there is an ffmpeg to run, downloading it on first use.
 *
 * `ffmpeg-static` fetches its binary in a postinstall script, and a GenMotion
 * project's `.npmrc` sets `ignore-scripts` (an agent can add packages, and a
 * postinstall is arbitrary code). So in a scaffolded project the binary is
 * usually missing; this runs that one known install script, once, on demand.
 * Progress goes to stderr — stdout may be an MCP channel.
 */
export function ensureFfmpeg(): Promise<string> {
  ensured ??= (async () => {
    const current = ffmpegPath();
    if (current !== "ffmpeg") return current;
    let dir: string;
    try {
      const require = createRequire(import.meta.url);
      dir = path.dirname(require.resolve("ffmpeg-static/package.json"));
    } catch {
      return current; // not installed at all: rely on PATH
    }
    if (process.env.GENMOTION_NO_DOWNLOAD) return current;
    process.stderr.write("Downloading ffmpeg (first render only)…\n");
    await new Promise<void>((resolve) => {
      const child = spawn(process.execPath, [path.join(dir, "install.js")], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
      child.stdout.pipe(process.stderr);
      child.stderr.pipe(process.stderr);
      child.on("error", () => resolve());
      child.on("close", () => resolve());
    });
    return ffmpegPath();
  })();
  return ensured;
}

export function runFfmpeg(args: string[], signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath(), ["-hide_banner", "-loglevel", "error", ...args], { signal });
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => {
      stderr = (stderr + d.toString()).slice(-8000);
    });
    proc.on("error", (err) => reject(ffmpegSpawnError(err)));
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new FfmpegError(`ffmpeg exited with ${code}: ${stderr.trim().slice(-1200)}`)),
    );
  });
}

/**
 * Seconds of a media file, or null when ffmpeg can't read one.
 *
 * Only ffmpeg ships (no ffprobe), but `ffmpeg -i <file>` prints the same
 * `Duration:` line to stderr before complaining that no output was given.
 * Same approach as the desktop app's probe.
 */
export async function probeMediaDuration(file: string): Promise<number | null> {
  const bin = await ensureFfmpeg();
  return new Promise((resolve) => {
    const proc = spawn(bin, ["-hide_banner", "-i", file]);
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => {
      stderr = (stderr + d.toString()).slice(-16000);
    });
    proc.on("error", () => resolve(null));
    proc.on("close", () => {
      const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
      resolve(match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : null);
    });
  });
}

function ffmpegSpawnError(err: Error): Error {
  if ((err as NodeJS.ErrnoException).code === "ENOENT") {
    return new FfmpegError("ffmpeg not found. Reinstall @genmotion/cli (it ships ffmpeg-static) or set FFMPEG_PATH.");
  }
  return err;
}

/**
 * CRF from the 0–100 quality knob (100 = visually lossless). Same mapping as
 * the desktop export, so "quality 80" means the same file in both.
 */
export function crfFor(codec: Codec, quality: number): number {
  const q = Math.min(100, Math.max(0, quality));
  return codec === "webm" ? Math.round(40 - (q / 100) * 24) : Math.round(32 - (q / 100) * 16);
}

/** Encoder flags for a codec, written after the frame input. */
export function encoderArgs(codec: Codec, options: { fps: number; width: number; height: number; crf: number }): string[] {
  const { fps, width, height, crf } = options;
  const scale = ["-vf", `scale=${even(width)}:${even(height)}:flags=lanczos`];
  switch (codec) {
    case "webm":
      return [...scale, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(crf), "-deadline", "good",
        "-cpu-used", "4", "-row-mt", "1", "-pix_fmt", "yuv420p", "-r", String(fps)];
    case "mov":
      return ["-vf", `scale=${width}:${height}:flags=lanczos`, "-c:v", "prores_ks", "-profile:v", "3",
        "-pix_fmt", "yuv422p10le", "-r", String(fps)];
    case "gif":
    case "png":
    case "mp4":
      return [...scale, "-c:v", "libx264", "-preset", "medium", "-crf", String(crf),
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", String(fps)];
  }
}

/** yuv420p needs even dimensions; an odd custom size would fail to encode. */
function even(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

/**
 * An ffmpeg process that takes frames on stdin — JPEG or PNG images,
 * back to back — and writes one encoded segment.
 */
export interface FrameSink {
  write(frame: Buffer): Promise<void>;
  finish(): Promise<void>;
  abort(): void;
}

export function openFrameSink(output: string, args: { fps: number; encoder: string[] }): FrameSink {
  const proc: ChildProcessWithoutNullStreams = spawn(ffmpegPath(), [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "image2pipe", "-framerate", String(args.fps), "-i", "-",
    ...args.encoder,
    output,
  ]);
  let stderr = "";
  proc.stderr.on("data", (d: Buffer) => {
    stderr = (stderr + d.toString()).slice(-8000);
  });
  const done = new Promise<void>((resolve, reject) => {
    proc.on("error", (err) => reject(ffmpegSpawnError(err)));
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new FfmpegError(`ffmpeg exited with ${code}: ${stderr.trim().slice(-1200)}`)),
    );
  });
  // Surfaced through `finish()`; without a handler an early exit would crash
  // the process before anyone awaits it.
  done.catch(() => {});

  return {
    async write(frame) {
      if (proc.stdin.destroyed) return done;
      if (!proc.stdin.write(frame)) {
        await new Promise<void>((resolve) => proc.stdin.once("drain", resolve));
      }
    },
    async finish() {
      proc.stdin.end();
      await done;
    },
    abort() {
      proc.kill("SIGKILL");
    },
  };
}

/** Joins same-codec segments without re-encoding. */
export async function concatSegments(segments: string[], output: string, listFile: string): Promise<void> {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(listFile, segments.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join("\n"), "utf8");
  await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", output]);
}

/** A palette-optimised GIF from an encoded intermediate. */
export async function transcodeGif(input: string, output: string, options: { fps: number; width: number }): Promise<void> {
  const fps = Math.min(options.fps, 25);
  const width = Math.min(options.width, 960);
  await runFfmpeg([
    "-y", "-i", input,
    "-vf", `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
    "-loop", "0", output,
  ]);
}

/**
 * Mixes the project's audio — scene voiceovers and timeline clips, with their
 * trims, fades and gains — under an already-encoded video. Same filter order
 * and the same `buildRenderAudioSources` timing as the desktop export.
 *
 * `window` is the rendered frame range; audio is shifted and cut to match, so
 * `--frames 60-120` gets the audio that plays under those frames.
 */
export async function muxAudio(input: {
  projectDir: string;
  manifest: ProjectManifest;
  video: string;
  output: string;
  codec: Codec;
  window: { start: number; end: number };
}): Promise<boolean> {
  const { projectDir, manifest, video, output, codec, window } = input;
  if (codec === "gif" || codec === "png") return false;

  const sources = buildRenderAudioSources(
    manifest.scenes.map((scene) => ({
      durationInFrames: scene.durationInFrames,
      audioUrl: scene.audio ? path.resolve(projectDir, scene.audio) : null,
      audioVolume: scene.audioVolume ?? 1,
      ...(scene.startFrom !== undefined ? { startFrom: scene.startFrom } : {}),
    })),
    manifest.audio.map((clip) => ({
      url: path.resolve(projectDir, clip.file),
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

  const offsetSec = window.start / manifest.fps;
  const durationSec = (window.end - window.start) / manifest.fps;
  const inputs: string[] = ["-y", "-i", video];
  const filters: string[] = [];
  sources.forEach((source, index) => {
    if (source.startFromSec) inputs.push("-ss", String(source.startFromSec));
    inputs.push("-i", source.url);
    const stream = index + 1;
    const trim = source.durationSec ? `atrim=duration=${source.durationSec.toFixed(3)},` : "";
    // Trim, then fade (measured against the clip's own length), then delay —
    // fading after `adelay` would ramp the silence it prepends — then gain.
    const fadeIn = source.fadeInSec ? `afade=t=in:st=0:d=${source.fadeInSec.toFixed(3)},` : "";
    const fadeOut =
      source.fadeOutSec && source.durationSec
        ? `afade=t=out:st=${Math.max(0, source.durationSec - source.fadeOutSec).toFixed(3)}:d=${source.fadeOutSec.toFixed(3)},`
        : "";
    const delay = Math.max(0, Math.round(source.delayMs));
    filters.push(`[${stream}:a]${trim}${fadeIn}${fadeOut}adelay=${delay}|${delay},volume=${source.volume ?? 1}[a${stream}]`);
  });

  const labels = sources.map((_, i) => `[a${i + 1}]`).join("");
  // A partial render takes the slice of the mix that plays under it.
  const window_ = offsetSec > 0 ? `,atrim=start=${offsetSec.toFixed(3)},asetpts=PTS-STARTPTS` : "";
  await runFfmpeg([
    ...inputs,
    "-filter_complex",
    `${filters.join(";")};${labels}amix=inputs=${sources.length}:duration=longest:normalize=0${window_}[aout]`,
    "-map", "0:v",
    "-map", "[aout]",
    "-c:v", "copy",
    "-c:a", codec === "webm" ? "libopus" : codec === "mov" ? "pcm_s16le" : "aac",
    "-t", durationSec.toFixed(3),
    output,
  ]);
  return true;
}
