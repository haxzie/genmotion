import path from "node:path";
import fs from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { createProject, DEFAULT_THREE_VERSIONS, projectEngineSchema, type ProjectEngine } from "@genmotion/project";
import { VERSION } from "../version";
import { wireAgents, THREE_AUTHORING_GUIDE } from "../agents";
import { createFromTemplate } from "../templates";
import { CliError, bold, cyan, dim, green } from "../output";
import { num, str, type Command } from "../command";

/** Named sizes, so nobody has to remember 1080×1920. */
export const SIZES: Record<string, [number, number]> = {
  landscape: [1920, 1080],
  "1080p": [1920, 1080],
  "4k": [3840, 2160],
  portrait: [1080, 1920],
  vertical: [1080, 1920],
  square: [1080, 1080],
  "4:5": [1080, 1350],
};

export function parseSize(input: string): [number, number] {
  const named = SIZES[input.toLowerCase()];
  if (named) return named;
  const match = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(input.trim());
  if (!match) {
    throw new CliError(`Can't read size "${input}"`, { fix: `Use WIDTHxHEIGHT or one of: ${Object.keys(SIZES).join(", ")}` });
  }
  return [Number(match[1]), Number(match[2])];
}

export const init: Command = {
  name: "init",
  summary: "Create a new video project (Three.js by default)",
  help: `Usage: genmotion init [dir] [options]

Creates a ready-to-run video project: a starter scene, project.json, package.json
with dev/render/check scripts, and agent wiring (AGENTS.md, CLAUDE.md, .mcp.json,
skills) so any coding agent opened in the folder can make the video.

Options
  --engine <three|react|hyperframes>   Scene runtime (default: three)
  --template <id|path>                 Start from a catalog template or a local project
  --size <WxH|landscape|portrait|square|4k>   Frame size (default: 1920x1080)
  --fps <n>                            Frame rate (default: 30)
  --name <name>                        Display name (default: folder name)
  --yes, -y                            Never prompt
  --json                               Machine-readable result

Examples
  npx @genmotion/cli init my-video
  npx @genmotion/cli init reel --size portrait --fps 60
  npx @genmotion/cli init launch --template crypto-launch-video`,
  options: {
    engine: { type: "string" },
    template: { type: "string", short: "t" },
    size: { type: "string" },
    fps: { type: "string" },
    name: { type: "string" },
    yes: { type: "boolean", short: "y" },
  },
  async run({ values, positionals, out }) {
    let target = positionals[0];
    const interactive = !values.yes && !out.json && process.stdin.isTTY && process.stderr.isTTY;
    if (!target && interactive) {
      const rl = createInterface({ input: process.stdin, output: process.stderr });
      target = (await rl.question(`${bold("Project folder")} ${dim("(my-video)")} `)).trim() || "my-video";
      rl.close();
    }
    target ??= "my-video";
    const dir = path.resolve(target);

    const entries = await fs.readdir(dir).catch(() => [] as string[]);
    if (entries.some((e) => !e.startsWith("."))) {
      throw new CliError(`${dir} isn't empty`, { fix: `Pick a new folder: npx @genmotion/cli init ${path.basename(dir)}-2` });
    }

    const engineInput = str(values.engine) ?? "three";
    const engine = projectEngineSchema.safeParse(engineInput);
    if (!engine.success) throw new CliError(`Unknown engine "${engineInput}"`, { fix: "--engine three|react|hyperframes" });
    if (engine.data === "hyperframes") {
      throw new CliError("The CLI doesn't scaffold HyperFrames projects — they need the GenMotion app's bundled runtime.", {
        fix: "Use the default Three.js engine, or create the project in the GenMotion app",
      });
    }
    const [width, height] = parseSize(str(values.size) ?? "landscape");
    const fps = num(values.fps, "fps") ?? 30;
    const name = str(values.name);
    const template = str(values.template);

    out.info(`Creating ${bold(path.basename(dir))}${template ? ` from ${cyan(template)}` : ""}…`);
    const manifest = template
      ? await createFromTemplate(dir, template, name)
      : await createProject({
          dir,
          name,
          engine: engine.data as ProjectEngine,
          fps,
          width,
          height,
          authoringGuide: engine.data === "three" ? THREE_AUTHORING_GUIDE : undefined,
          // The project's scripts run the CLI line that made it, not whatever
          // the scaffold's defaults were when it was last released. The minor
          // line, not the exact patch, so a patch release doesn't change what
          // `init` writes (examples/three-starter is checked for drift).
          threeVersions: { ...DEFAULT_THREE_VERSIONS, cli: `^${VERSION.split(".").slice(0, 2).join(".")}.0` },
        });
    const wired = await wireAgents(dir, { engine: manifest.engine });

    const rel = path.relative(process.cwd(), dir) || ".";
    out.result(
      {
        dir,
        name: manifest.name,
        engine: manifest.engine,
        fps: manifest.fps,
        width: manifest.width,
        height: manifest.height,
        scenes: manifest.scenes.map((s) => ({ file: s.file, durationInFrames: s.durationInFrames })),
        agentFiles: wired,
        next: [`cd ${rel}`, "npm install", "npm run dev"],
      },
      `${green("✓")} Created ${bold(manifest.name)} ${dim(`(${manifest.engine}, ${manifest.width}×${manifest.height} @ ${manifest.fps}fps)`)}

  cd ${rel}
  npm install
  npm run dev        ${dim("# live studio")}
  npm run render     ${dim("# exports/*.mp4")}

Then ask your coding agent for the video you want — the project already tells it how.`,
    );
  },
};
