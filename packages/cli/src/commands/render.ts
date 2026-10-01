import path from "node:path";
import { renderProject, renderStills, CODEC_EXTENSIONS, type Codec, type GlMode } from "@genmotion/render";
import { resolveProjectDir } from "../project-dir";
import { CliError, bold, dim, formatBytes, formatMs, green } from "../output";
import { num, str, strs, type Command, type CommandContext } from "../command";

const CODECS = Object.keys(CODEC_EXTENSIONS) as Codec[];

function glMode(values: CommandContext["values"]): GlMode | undefined {
  const gl = str(values.gl);
  if (gl === undefined) return undefined;
  if (gl !== "swiftshader" && gl !== "gpu") throw new CliError(`--gl must be swiftshader or gpu, got "${gl}"`);
  return gl;
}

function codecFor(values: CommandContext["values"], output: string | undefined): Codec {
  const explicit = str(values.codec);
  if (explicit) {
    if (!CODECS.includes(explicit as Codec)) throw new CliError(`Unknown codec "${explicit}"`, { fix: `--codec ${CODECS.join("|")}` });
    return explicit as Codec;
  }
  const ext = output ? path.extname(output).toLowerCase() : "";
  const byExt = CODECS.find((c) => CODEC_EXTENSIONS[c] === ext && ext !== "");
  return byExt ?? "mp4";
}

export const render: Command = {
  name: "render",
  summary: "Render the video to MP4, WebM, GIF, MOV or PNG frames",
  help: `Usage: genmotion render [output] [options]

Renders the project with headless Chromium and ffmpeg. Frames are split across
parallel browser tabs and joined without re-encoding; audio from project.json
is mixed in at the end.

Options
  --codec <mp4|webm|gif|mov|png>   Output format (default: from the extension, else mp4)
  --frames <range>                 Part of the video: 0-89, 1s-3s, 120- (inclusive)
  --scale <n>                      Output size multiplier, e.g. 2 for 4K from 1080p
  --quality <0-100>                Encoder quality (default: 80)
  --crf <n>                        Exact x264/VP9 CRF, overrides --quality
  --concurrency <n>                Parallel tabs (default: half your cores, max 8)
  --gl <swiftshader|gpu>           WebGL backend. swiftshader (default) is identical
                                   on every machine; gpu is faster
  --no-audio                       Skip the audio mix
  --json                           Machine-readable result

Output defaults to exports/<project-name>.<ext>.`,
  options: {
    codec: { type: "string" },
    frames: { type: "string" },
    scale: { type: "string" },
    quality: { type: "string" },
    crf: { type: "string" },
    concurrency: { type: "string", short: "c" },
    gl: { type: "string" },
    "no-audio": { type: "boolean" },
    output: { type: "string", short: "o" },
  },
  async run({ values, positionals, out }) {
    const projectDir = resolveProjectDir(str(values.dir));
    const output = str(values.output) ?? positionals[0];
    const codec = codecFor(values, output);
    const started = Date.now();
    out.info(`Rendering ${dim(projectDir)}`);
    const result = await renderProject({
      projectDir,
      output,
      codec,
      frames: str(values.frames),
      scale: num(values.scale, "scale"),
      quality: num(values.quality, "quality"),
      crf: num(values.crf, "crf"),
      concurrency: num(values.concurrency, "concurrency"),
      gl: glMode(values),
      audio: values["no-audio"] ? false : true,
      onProgress: (p) => {
        if (p.stage === "capturing") out.progress("capturing", p.rendered, p.total);
        else {
          out.endProgress();
          if (p.stage !== "done") out.info(`${p.stage}…`);
        }
      },
    });
    out.endProgress();
    for (const warning of result.warnings) out.warn(warning);
    const fps = result.frames / Math.max(0.001, result.elapsedMs / 1000);
    out.result(
      { ...result },
      `${green("✓")} ${bold(path.relative(process.cwd(), result.output) || result.output)} ${dim(
        `${result.width}×${result.height} · ${result.durationSeconds.toFixed(2)}s · ${result.frames} frames${
          result.sizeBytes ? ` · ${formatBytes(result.sizeBytes)}` : ""
        }${result.hasAudio ? " · audio" : ""} · ${formatMs(Date.now() - started)} (${fps.toFixed(1)} fps, ${result.concurrency} tabs)`,
      )}`,
    );
  },
};

export const still: Command = {
  name: "still",
  summary: "Capture one or more frames as images",
  help: `Usage: genmotion still [options]

Options
  --at <time>        Frame to capture; repeatable. 45 | 45f | 1.5s | 500ms | 60%
                     (default: first frame)
  --out, -o <path>   File for one still, folder for several (default: exports/)
  --format <png|jpeg>
  --scale <n>        Output size multiplier
  --gl <swiftshader|gpu>
  --json

Example
  npx @genmotion/cli still --at 0 --at 50% --at 100% --json`,
  options: {
    at: { type: "string", multiple: true },
    out: { type: "string", short: "o" },
    format: { type: "string" },
    scale: { type: "string" },
    gl: { type: "string" },
  },
  async run({ values, out }) {
    const projectDir = resolveProjectDir(str(values.dir));
    const format = str(values.format) ?? "png";
    if (format !== "png" && format !== "jpeg" && format !== "jpg") throw new CliError(`--format must be png or jpeg`);
    const at = strs(values.at);
    const stills = await renderStills({
      projectDir,
      at: at.length ? at : undefined,
      output: str(values.out),
      format: format === "png" ? "png" : "jpeg",
      scale: num(values.scale, "scale"),
      gl: glMode(values),
    });
    out.result(
      { stills: stills.map(({ image: _image, ...rest }) => rest) },
      stills
        .map((s) => `${green("✓")} ${path.relative(process.cwd(), s.path ?? "") || s.path} ${dim(`frame ${s.frame} · ${s.time.toFixed(2)}s · ${s.scene ?? ""}`)}`)
        .join("\n"),
    );
  },
};
