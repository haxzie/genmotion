import os from "node:os";
import path from "node:path";
import { clickSound, demoSound, profiles, typingSound } from "../keysound";
import { resolveProjectDir } from "../project-dir";
import { CliError, bold, dim, green } from "../output";
import { num, str, type Command } from "../command";

const USAGE = `Usage: genmotion keysound <action> [options]

Actions
  typing <text>       Synthesise someone typing that text, into assets/
  click               Synthesise mouse clicks, into assets/
  list                Every keyboard and click sound, with what it sounds like
  demo <id>           Write a few seconds of one sound to a file, to hear it

Options (typing)
  --profile <id>      Keyboard: thock (default), linear, tactile, clicky, phone
  --wpm <n>           Words per minute, a word being five characters (default 62)
  --fit <time>        Fill exactly this long instead, keeping the rhythm's shape
  --typos <0-0.1>     Chance per character of a slip that gets backspaced out
                      (default 0.01; 0 for a clean run)
  --hesitation <0-2>  Scales the thinking pauses (default 1)

Options (click)
  --at <s,s,s>        Seconds from the start of the file, one per click

Options (typing, click)
  --seed <text>       Fixes the rhythm and the variation (default: stable)
  --out <name>        Filename in assets/ (default typing.wav / click.wav)
  --place <time>      Also put it on the timeline at this time (2s, 48, 500ms)
  --json

Everything here is synthesised on this machine: no key, no credits, no network,
and the same text and seed give the same file forever.

Typing also writes a <name>.timing.json beside the WAV, holding what the text
says on every frame it changes on. Drive the on-screen text from that file
rather than revealing a character every n frames — evenly-spaced typing is what
marks a typing shot as fake, and a scene spaced by hand drifts from its own
sound.

Examples
  genmotion keysound typing "npm run build" --place 1s
  genmotion keysound typing "$(cat prompt.txt)" --fit 4s --typos 0
  genmotion keysound click --at 0,1.4,2.1 --profile hush --place 2s
  genmotion keysound demo thock --out /tmp/thock.wav && afplay /tmp/thock.wav`;

/** `--at 0,1.4,2.1` — one list, because a flag per click would not scale. */
function clickTimes(value: string | undefined): number[] {
  if (!value) throw new CliError("Name the click times", { fix: "genmotion keysound click --at 0,1.4" });
  return value.split(",").map((part) => {
    const seconds = Number(part.trim());
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new CliError(`--at expects seconds separated by commas, got "${part.trim()}"`, {
        fix: "genmotion keysound click --at 0,1.4,2.1",
      });
    }
    return seconds;
  });
}

function placed(clip: { id: string; track: number; startFrame: number } | undefined, fps: number): string {
  if (!clip) return "";
  return `\n  ${green("✓")} on the timeline as ${bold(clip.id)} ${dim(`track ${clip.track} · frame ${clip.startFrame} (${(clip.startFrame / fps).toFixed(2)}s)`)}`;
}

export const keysound: Command = {
  name: "keysound",
  summary: "Synthesise typing and mouse-click sounds, with their keystroke timings",
  help: USAGE,
  options: {
    profile: { type: "string" },
    wpm: { type: "string" },
    fit: { type: "string" },
    typos: { type: "string" },
    hesitation: { type: "string" },
    seed: { type: "string" },
    out: { type: "string" },
    place: { type: "string" },
    at: { type: "string" },
  },
  async run({ values, positionals, out }) {
    const [action, ...rest] = positionals;

    switch (action) {
      case "list":
      case "ls":
      case undefined: {
        const catalog = profiles();
        const rows = (label: string, list: typeof catalog.keyboards) =>
          [
            bold(label),
            ...list.map(
              (p) =>
                `  ${green(p.id.padEnd(12))}${p.isDefault ? dim("default  ") : "         "}${p.blurb}`,
            ),
          ].join("\n");
        out.result({ ...catalog }, `${rows("Keyboards", catalog.keyboards)}\n\n${rows("Mouse clicks", catalog.clicks)}`);
        return;
      }

      case "typing": {
        const text = rest.join(" ");
        if (!text) {
          throw new CliError("Name the text being typed", { fix: 'genmotion keysound typing "npm run build"' });
        }
        const projectDir = resolveProjectDir(str(values.dir));
        const fit = str(values.fit);
        const result = await typingSound(projectDir, text, {
          ...(str(values.profile) ? { profile: str(values.profile)! } : {}),
          ...(num(values.wpm, "wpm") !== undefined ? { wpm: num(values.wpm, "wpm")! } : {}),
          // `--fit 4s` and `--fit 4` both mean four seconds here: unlike the
          // timeline flags this is a length of sound, not a frame count.
          ...(fit !== undefined ? { fitSeconds: parseSeconds(fit) } : {}),
          ...(num(values.typos, "typos") !== undefined ? { typoRate: num(values.typos, "typos")! } : {}),
          ...(num(values.hesitation, "hesitation") !== undefined
            ? { hesitation: num(values.hesitation, "hesitation")! }
            : {}),
          ...(str(values.seed) ? { seed: str(values.seed)! } : {}),
          ...(str(values.out) ? { filename: str(values.out)! } : {}),
          ...(str(values.place) ? { place: str(values.place)! } : {}),
        });
        out.result(
          { ...result },
          [
            `${green("✓")} ${bold(result.file)} ${dim(
              `${(result.durationMs / 1_000).toFixed(2)}s · ${result.durationInFrames} frames at ${result.fps}fps · ${result.profile}`,
            )}`,
            `  ${result.keystrokes} keystrokes at ${result.effectiveWpm} wpm, ${result.mistakes} corrected ${result.mistakes === 1 ? "slip" : "slips"}`,
            `  ${dim(`timings in ${result.timing} — show its \`steps\` rather than spacing the characters evenly`)}`,
          ].join("\n") + placed(result.clip, result.fps),
        );
        return;
      }

      case "click":
      case "clicks": {
        const projectDir = resolveProjectDir(str(values.dir));
        const result = await clickSound(projectDir, clickTimes(str(values.at)), {
          ...(str(values.profile) ? { profile: str(values.profile)! } : {}),
          ...(str(values.seed) ? { seed: str(values.seed)! } : {}),
          ...(str(values.out) ? { filename: str(values.out)! } : {}),
          ...(str(values.place) ? { place: str(values.place)! } : {}),
        });
        out.result(
          { ...result },
          [
            `${green("✓")} ${bold(result.file)} ${dim(
              `${result.clicks} ${result.clicks === 1 ? "click" : "clicks"} · ${(result.durationMs / 1_000).toFixed(2)}s · ${result.profile}`,
            )}`,
            ...(result.merged > 0
              ? [
                  `  ${dim(`${result.merged} were within 12ms of another and became one sound, as the ear hears them`)}`,
                ]
              : []),
          ].join("\n") + placed(result.clip, result.fps),
        );
        return;
      }

      case "demo": {
        const id = rest[0];
        if (!id) throw new CliError("Which sound?", { fix: "genmotion keysound demo thock" });
        const target = str(values.out) ?? path.join(os.tmpdir(), `genmotion-${id}.wav`);
        const result = await demoSound(id, target);
        out.result(
          { ...result },
          `${green("✓")} ${bold(result.file)} ${dim(`${(result.durationMs / 1_000).toFixed(2)}s`)}\n  ${dim(`play it: afplay ${result.file}`)}`,
        );
        return;
      }

      default:
        throw new CliError(`Unknown keysound action "${action}"`, { fix: "genmotion keysound --help" });
    }
  },
};

/** `4s`, `500ms` or a bare number of seconds. */
function parseSeconds(value: string): number {
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s)?$/.exec(value.trim().toLowerCase());
  if (!match) throw new CliError(`--fit expects a length like 4s or 500ms, got "${value}"`, { fix: "--fit 4s" });
  const amount = Number(match[1]);
  return match[2] === "ms" ? amount / 1_000 : amount;
}
