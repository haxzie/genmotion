import path from "node:path";
import fs from "node:fs/promises";
import { addScene, readManifest } from "@genmotion/project";
import { formatTimecode, parseDuration } from "@genmotion/render";
import { resolveProjectDir } from "../project-dir";
import { CliError, bold, dim, green } from "../output";
import { str, type Command } from "../command";

export interface ProjectOverview {
  dir: string;
  name: string;
  engine: string;
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  durationSeconds: number;
  scenes: { index: number; file: string; name: string; startFrame: number; durationInFrames: number; seconds: number; exists: boolean }[];
  audio: {
    id: string;
    name?: string;
    file: string;
    track: number;
    startFrame: number;
    durationInFrames: number;
    startFrom: number;
    volume: number;
    fadeInFrames: number;
    fadeOutFrames: number;
    muted: boolean;
  }[];
  assets: string[];
}

export async function projectOverview(projectDir: string): Promise<ProjectOverview> {
  const manifest = await readManifest(projectDir);
  const starts = manifest.scenes.reduce<number[]>((acc, _s, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + manifest.scenes[i - 1]!.durationInFrames], []);
  const totalFrames = manifest.scenes.reduce((sum, s) => sum + s.durationInFrames, 0);
  const scenes = await Promise.all(
    manifest.scenes.map(async (scene, index) => ({
      index,
      file: scene.file,
      name: scene.name ?? path.basename(scene.file).replace(/\.[^.]+$/, ""),
      startFrame: starts[index]!,
      durationInFrames: scene.durationInFrames,
      seconds: scene.durationInFrames / manifest.fps,
      exists: await fs.stat(path.join(projectDir, scene.file)).then(() => true, () => false),
    })),
  );
  const assets = await fs
    .readdir(path.join(projectDir, "assets"), { recursive: true, withFileTypes: true })
    .then((entries) =>
      entries.filter((e) => e.isFile()).map((e) => path.relative(projectDir, path.join(e.parentPath, e.name)).split(path.sep).join("/")),
    )
    .catch(() => []);
  return {
    dir: projectDir,
    name: manifest.name,
    engine: manifest.engine,
    fps: manifest.fps,
    width: manifest.width,
    height: manifest.height,
    totalFrames,
    durationSeconds: totalFrames / manifest.fps,
    scenes,
    audio: manifest.audio.map((a) => ({
      id: a.id,
      ...(a.name ? { name: a.name } : {}),
      file: a.file,
      track: a.track,
      startFrame: a.startFrame,
      durationInFrames: a.durationInFrames,
      startFrom: a.startFrom,
      volume: a.volume,
      fadeInFrames: a.fadeInFrames,
      fadeOutFrames: a.fadeOutFrames,
      muted: a.muted,
    })),
    assets,
  };
}

export const info: Command = {
  name: "info",
  summary: "Show the project: size, fps, scenes, timing, audio, assets",
  help: `Usage: genmotion info [--json]

Aliases: compositions`,
  options: {},
  async run({ values, out }) {
    const overview = await projectOverview(resolveProjectDir(str(values.dir)));
    const rows = overview.scenes.map(
      (s) =>
        `  ${String(s.index + 1).padStart(2)}. ${bold(s.name.padEnd(22))} ${dim(s.file.padEnd(28))} ${formatTimecode(s.startFrame, overview.fps)} +${s.seconds.toFixed(2)}s${s.exists ? "" : "  (missing!)"}`,
    );
    out.result(
      { ...overview },
      [
        `${bold(overview.name)} ${dim(`${overview.engine} · ${overview.width}×${overview.height} · ${overview.fps}fps · ${overview.durationSeconds.toFixed(2)}s (${overview.totalFrames} frames)`)}`,
        ...rows,
        overview.audio.length ? dim(`  audio: ${overview.audio.map((a) => a.file).join(", ")}`) : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  },
};

export const scene: Command = {
  name: "scene",
  summary: "Add a scene (creates the file and registers it in project.json)",
  help: `Usage: genmotion scene add <name> [options]

Options
  --duration <time>   Length: 4s, 120, 2500ms (default: 4s)
  --after <scene>     Insert after this scene (file or name); appends by default
  --json`,
  options: {
    duration: { type: "string", short: "d" },
    after: { type: "string" },
  },
  async run({ values, positionals, out }) {
    const [action, ...rest] = positionals;
    if (action !== "add") throw new CliError(`Unknown scene action "${action ?? ""}"`, { fix: 'npx @genmotion/cli scene add "Intro" --duration 4s' });
    const name = rest.join(" ").trim();
    if (!name) throw new CliError("Give the scene a name", { fix: 'npx @genmotion/cli scene add "Intro" --duration 4s' });
    const projectDir = resolveProjectDir(str(values.dir));
    const manifest = await readManifest(projectDir);
    const added = await addScene({
      projectDir,
      name,
      durationInFrames: parseDuration(str(values.duration) ?? "4s", manifest.fps),
      after: str(values.after),
    });
    out.result(
      { file: added.file, name: added.name, durationInFrames: added.durationInFrames, index: added.index },
      `${green("✓")} ${bold(added.file)} ${dim(`${(added.durationInFrames / manifest.fps).toFixed(2)}s, scene ${added.index + 1} of ${added.manifest.scenes.length}`)}`,
    );
  },
};
