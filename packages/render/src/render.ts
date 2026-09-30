import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import type { Browser } from "playwright-core";
import { launchBrowser, type LaunchOptions } from "./browser";
import { serveProject, type ProjectServer } from "./server";
import { CompositionPage, type ImageFormat } from "./page";
import { chunkRange, parseFrameRange, parseTime, type FrameRange } from "./time";
import {
  CODEC_EXTENSIONS,
  concatSegments,
  crfFor,
  encoderArgs,
  ensureFfmpeg,
  muxAudio,
  openFrameSink,
  transcodeGif,
  type Codec,
} from "./ffmpeg";
import type { CompiledComposition } from "./composition";

export interface RenderProgress {
  /** Frames captured so far, across every worker. */
  rendered: number;
  total: number;
  stage: "capturing" | "encoding" | "muxing" | "done";
}

export interface RenderOptions extends LaunchOptions {
  projectDir: string;
  /** Output file (or folder, for `png`). Defaults to `exports/<name>.<ext>`. */
  output?: string;
  codec?: Codec;
  /** `30-90`, `1s-3s`, `30-`. The whole composition when omitted. */
  frames?: string;
  /** Output pixels per composition pixel — `2` renders a 1080p project at 4K. */
  scale?: number;
  /** 0–100, where 100 is visually lossless. Ignored when `crf` is set. */
  quality?: number;
  crf?: number;
  /** Parallel browser tabs. Defaults to half the CPU cores, at most 8. */
  concurrency?: number;
  /** Mix the project's audio in. Default true. */
  audio?: boolean;
  onProgress?: (progress: RenderProgress) => void;
  signal?: AbortSignal;
  /** Reuse a running browser (the MCP server keeps one warm). */
  browser?: Browser;
}

export interface RenderResult {
  output: string;
  codec: Codec;
  frames: number;
  range: FrameRange;
  fps: number;
  width: number;
  height: number;
  durationSeconds: number;
  sizeBytes: number;
  elapsedMs: number;
  concurrency: number;
  hasAudio: boolean;
  /** Page errors logged during the render — worth reading even when it succeeded. */
  warnings: string[];
}

export function defaultConcurrency(): number {
  return Math.max(1, Math.min(8, Math.floor(os.availableParallelism() / 2)));
}

export function defaultOutput(projectDir: string, name: string, codec: Codec): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "video";
  return path.join(projectDir, "exports", codec === "png" ? `${slug}-frames` : `${slug}${CODEC_EXTENSIONS[codec]}`);
}

/**
 * Renders a project to a video file.
 *
 * The frame range is split across `concurrency` tabs; each captures its chunk
 * and pipes it straight into its own ffmpeg, the segments are joined without
 * re-encoding, and the project's audio is mixed in once at the end. Every tab
 * loads the same page from the same loopback server, and every frame is a pure
 * function of its index, so a chunked render is frame-for-frame the same as a
 * serial one.
 */
export async function renderProject(options: RenderOptions): Promise<RenderResult> {
  const started = Date.now();
  await ensureFfmpeg();
  const codec = options.codec ?? "mp4";
  const scale = options.scale ?? 1;
  const server = await serveProject({ projectDir: options.projectDir });
  const ownBrowser = !options.browser;
  let browser: Browser | null = options.browser ?? null;
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "genmotion-render-"));
  const warnings: string[] = [];

  try {
    const comp = await ready(server);
    const range = options.frames ? parseFrameRange(options.frames, comp.fps, comp.totalFrames) : { start: 0, end: comp.totalFrames };
    const output = path.resolve(options.output ?? defaultOutput(server.projectDir, comp.name, codec));
    const width = Math.round(comp.width * scale);
    const height = Math.round(comp.height * scale);
    const crf = options.crf ?? crfFor(codec, options.quality ?? 80);
    const chunks = chunkRange(range, options.concurrency ?? defaultConcurrency());
    const total = range.end - range.start;

    browser ??= await launchBrowser(options);
    let rendered = 0;
    const progress = (stage: RenderProgress["stage"]) => options.onProgress?.({ rendered, total, stage });
    progress("capturing");

    // PNG sequences are written frame by frame; everything else goes through an
    // encoded segment per chunk. GIF encodes to an mp4 intermediate first, so
    // the palette is computed over the whole video, not per chunk.
    const segmentCodec: Codec = codec === "gif" || codec === "png" ? "mp4" : codec;
    const segmentExt = CODEC_EXTENSIONS[segmentCodec];
    if (codec === "png") await fs.mkdir(output, { recursive: true });

    const segments = await Promise.all(
      chunks.map(async (chunk, index) => {
        const page = await CompositionPage.open(browser!, server.url, comp, {
          scale,
          onPageError: (message) => warnings.push(message),
        });
        const segment = path.join(workDir, `segment-${String(index).padStart(3, "0")}${segmentExt}`);
        const sink =
          codec === "png"
            ? null
            : openFrameSink(segment, {
                fps: comp.fps,
                encoder: encoderArgs(segmentCodec, { fps: comp.fps, width, height, crf: codec === "gif" ? 12 : crf }),
              });
        const format: ImageFormat = codec === "png" || codec === "mov" ? "png" : "jpeg";
        try {
          for (let frame = chunk.start; frame < chunk.end; frame++) {
            if (options.signal?.aborted) throw new Error("Render cancelled");
            await page.seek(frame);
            const image = await page.capture({ format, quality: 95 });
            if (sink) await sink.write(image);
            else await fs.writeFile(path.join(output, `frame-${String(frame).padStart(5, "0")}.png`), image);
            rendered++;
            if (rendered % 10 === 0) progress("capturing");
          }
          await sink?.finish();
        } catch (err) {
          sink?.abort();
          throw err;
        } finally {
          await page.close();
        }
        return segment;
      }),
    );

    if (codec !== "png") {
      progress("encoding");
      await fs.mkdir(path.dirname(output), { recursive: true });
      const joined = path.join(workDir, `joined${segmentExt}`);
      if (segments.length === 1) await fs.rename(segments[0]!, joined);
      else await concatSegments(segments, joined, path.join(workDir, "segments.txt"));

      let hasAudio = false;
      if (codec === "gif") {
        await transcodeGif(joined, output, { fps: comp.fps, width });
      } else {
        if (options.audio !== false) {
          progress("muxing");
          const mixed = path.join(workDir, `mixed${segmentExt}`);
          hasAudio = await muxAudio({
            projectDir: server.projectDir,
            manifest: comp.manifest,
            video: joined,
            output: mixed,
            codec,
            window: range,
          });
          if (hasAudio) await fs.rename(mixed, joined).catch(() => fs.copyFile(mixed, joined));
        }
        await moveFile(joined, output);
      }
      progress("done");
      const stat = await fs.stat(output);
      return result({ output, codec, total, range, comp, width, height, sizeBytes: stat.size, started, chunks, hasAudio, warnings });
    }

    progress("done");
    return result({ output, codec, total, range, comp, width, height, sizeBytes: 0, started, chunks, hasAudio: false, warnings });
  } finally {
    if (ownBrowser) await browser?.close().catch(() => {});
    await server.close();
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function result(input: {
  output: string;
  codec: Codec;
  total: number;
  range: FrameRange;
  comp: CompiledComposition;
  width: number;
  height: number;
  sizeBytes: number;
  started: number;
  chunks: FrameRange[];
  hasAudio: boolean;
  warnings: string[];
}): RenderResult {
  return {
    output: input.output,
    codec: input.codec,
    frames: input.total,
    range: input.range,
    fps: input.comp.fps,
    width: input.width,
    height: input.height,
    durationSeconds: input.total / input.comp.fps,
    sizeBytes: input.sizeBytes,
    elapsedMs: Date.now() - input.started,
    concurrency: input.chunks.length,
    hasAudio: input.hasAudio,
    warnings: [...new Set(input.warnings)].slice(0, 20),
  };
}

/** The compiled composition, or an error naming every scene that failed. */
async function ready(server: ProjectServer): Promise<CompiledComposition> {
  const comp = await server.composition();
  if (comp.errors.length) {
    throw new Error(comp.errors.map((e) => `${e.file}: ${e.message}`).join("\n"));
  }
  if (comp.totalFrames === 0) throw new Error("Nothing to render — project.json lists no scenes");
  return comp;
}

async function moveFile(from: string, to: string): Promise<void> {
  try {
    await fs.rename(from, to);
  } catch {
    // Across devices (tmp on another volume) rename fails; copy instead.
    await fs.copyFile(from, to);
  }
}

export interface StillOptions extends LaunchOptions {
  projectDir: string;
  /** Frame or time: `45`, `1.5s`, `60%`. Defaults to the first frame. */
  at?: string | number | (string | number)[];
  /** Where to write. A single still defaults to `exports/still-<frame>.<ext>`. */
  output?: string;
  format?: ImageFormat;
  scale?: number;
  /** Downsample to at most this width — handy for agents. */
  maxWidth?: number;
  browser?: Browser;
}

export interface Still {
  frame: number;
  time: number;
  /** The scene this frame belongs to. */
  scene: string | null;
  image: Buffer;
  path?: string;
}

/**
 * Captures one or more frames. With an `output`, a single still is written
 * there; several go into it as a folder. Without one, nothing touches disk and
 * the images come back as buffers (what the MCP server returns to agents).
 */
export async function renderStills(options: StillOptions & { write?: boolean }): Promise<Still[]> {
  const server = await serveProject({ projectDir: options.projectDir });
  const ownBrowser = !options.browser;
  const browser = options.browser ?? (await launchBrowser(options));
  try {
    const comp = await ready(server);
    const requests = options.at === undefined ? [0] : Array.isArray(options.at) ? options.at : [options.at];
    const frames = requests.map((at) => parseTime(at, comp.fps, comp.totalFrames));
    const format = options.format ?? "png";
    const page = await CompositionPage.open(browser, server.url, comp, { scale: options.scale ?? 1 });
    const stills: Still[] = [];
    try {
      for (const frame of frames) {
        await page.seek(frame);
        const image = await page.capture({ format, quality: 90, maxWidth: options.maxWidth });
        const scene = comp.scenes.find((s) => frame >= s.startFrame && frame < s.startFrame + s.durationInFrames);
        stills.push({ frame, time: frame / comp.fps, scene: scene?.name ?? null, image });
      }
    } finally {
      await page.close();
    }

    if (options.write !== false) {
      const ext = format === "png" ? ".png" : ".jpg";
      const target = options.output ? path.resolve(options.output) : null;
      for (const still of stills) {
        const file =
          target && stills.length === 1
            ? target
            : path.join(target ?? path.join(server.projectDir, "exports"), `still-${String(still.frame).padStart(5, "0")}${ext}`);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, still.image);
        still.path = file;
      }
    }
    return stills;
  } finally {
    if (ownBrowser) await browser.close().catch(() => {});
    await server.close();
  }
}
