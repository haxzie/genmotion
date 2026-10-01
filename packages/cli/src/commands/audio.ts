import { readManifest } from "@genmotion/project";
import { formatTimecode } from "@genmotion/render";
import { addAudio, removeAudio, setAudio, type AudioArgs, type AudioResult } from "../audio";
import { resolveProjectDir } from "../project-dir";
import { CliError, bold, dim, green, yellow } from "../output";
import { num, str, type Command, type CommandContext } from "../command";

const USAGE = `Usage: genmotion audio <action> [options]

Actions
  add <file|url>      Put a sound on the timeline (a URL is saved into assets/ first)
  set <id> [options]  Move, trim, re-level or mute a clip
  remove <id>         Take a clip off the timeline (the file stays in assets/)
  list                Every clip with its lane and timing

Options (add, set)
  --at <time>         Where it starts: 48, 2s, 500ms, 50% (add default: 0)
  --duration <time>   How long it plays (add default: the whole file, cut at the video's end)
  --from <time>       How far into the file it starts playing (default: 0)
  --track <n>         Lane, from 0 (add: preferred; set: required to be free)
  --volume <0-2>      1 is unchanged
  --fade-in <time>    --fade-out <time>
  --name <text>       A label; also accepted in place of the id
  --mute, --unmute    (set)
  --json

Lanes are like the desktop timeline's: up to four, and a clip never overlaps
another on its own lane. A clip that would is shortened, and the result says so.`;

function audioArgs(values: CommandContext["values"]): AudioArgs {
  const muted = values.mute === true ? true : values.unmute === true ? false : undefined;
  const track = num(values.track, "track");
  const volume = num(values.volume, "volume");
  return {
    ...(str(values.at) ? { at: str(values.at) } : {}),
    ...(str(values.duration) ? { duration: str(values.duration) } : {}),
    ...(str(values.from) ? { from: str(values.from) } : {}),
    ...(track !== undefined ? { track } : {}),
    ...(volume !== undefined ? { volume } : {}),
    ...(str(values["fade-in"]) ? { fadeIn: str(values["fade-in"]) } : {}),
    ...(str(values["fade-out"]) ? { fadeOut: str(values["fade-out"]) } : {}),
    ...(str(values.name) !== undefined ? { name: str(values.name) } : {}),
    ...(muted !== undefined ? { muted } : {}),
  };
}

function describe(result: AudioResult, verb: string): string {
  const { clip, fps } = result;
  const lines = [
    `${green("✓")} ${verb} ${bold(clip.id)} ${dim(
      `${clip.file} · track ${clip.track} · ${formatTimecode(clip.startFrame, fps)} +${(clip.durationInFrames / fps).toFixed(2)}s` +
        (clip.volume !== 1 ? ` · volume ${clip.volume}` : "") +
        (clip.muted ? " · muted" : ""),
    )}`,
  ];
  if (result.downloaded) lines.push(dim(`  saved to ${result.downloaded}`));
  if (result.trimmedFrom !== undefined) {
    lines.push(yellow(`  shortened from ${(result.trimmedFrom / fps).toFixed(2)}s to fit before the next clip on track ${clip.track}`));
  }
  return lines.join("\n");
}

export const audio: Command = {
  name: "audio",
  summary: "Add, move, trim, mute or remove timeline audio (music, sfx, voiceover)",
  help: USAGE,
  options: {
    at: { type: "string" },
    duration: { type: "string", short: "d" },
    from: { type: "string" },
    track: { type: "string" },
    volume: { type: "string" },
    "fade-in": { type: "string" },
    "fade-out": { type: "string" },
    name: { type: "string" },
    mute: { type: "boolean" },
    unmute: { type: "boolean" },
  },
  async run({ values, positionals, out }) {
    const [action, target] = positionals;
    const projectDir = resolveProjectDir(str(values.dir));
    switch (action) {
      case "add": {
        if (!target) throw new CliError("Name the file to add", { fix: "npx @genmotion/cli audio add assets/music.mp3 --fade-out 1s" });
        const result = await addAudio(projectDir, target, audioArgs(values));
        out.result({ ...result }, describe(result, "added"));
        return;
      }
      case "set": {
        if (!target) throw new CliError("Name the clip to change", { fix: "npx @genmotion/cli audio list" });
        const result = await setAudio(projectDir, target, audioArgs(values));
        out.result({ ...result }, describe(result, "updated"));
        return;
      }
      case "remove":
      case "rm": {
        if (!target) throw new CliError("Name the clip to remove", { fix: "npx @genmotion/cli audio list" });
        const { removed } = await removeAudio(projectDir, target);
        out.result({ removed }, `${green("✓")} removed ${bold(removed.id)} ${dim(removed.file)}`);
        return;
      }
      case "list":
      case "ls":
      case undefined: {
        const manifest = await readManifest(projectDir);
        const clips = [...manifest.audio].sort((a, b) => a.track - b.track || a.startFrame - b.startFrame);
        out.result(
          { fps: manifest.fps, audio: clips },
          clips.length
            ? clips
                .map(
                  (c) =>
                    `  ${dim(`track ${c.track}`)}  ${bold(c.id.padEnd(22))} ${dim(c.file.padEnd(28))} ${formatTimecode(c.startFrame, manifest.fps)} +${(c.durationInFrames / manifest.fps).toFixed(2)}s${c.muted ? dim(" (muted)") : ""}`,
                )
                .join("\n")
            : dim("No audio yet. genmotion audio add assets/music.mp3"),
        );
        return;
      }
      default:
        throw new CliError(`Unknown audio action "${action}"`, { fix: "npx @genmotion/cli audio --help" });
    }
  },
};
