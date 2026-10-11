import path from "node:path";
import fs from "node:fs/promises";
import {
  listProfiles,
  renderClicks,
  renderDemo,
  renderTyping,
  type ProfileCatalog,
} from "@genmotion/keysound";
import { readManifest } from "@genmotion/project";
import { addAudio } from "./audio";
import { CliError } from "./output";

/**
 * `genmotion keysound …` and the `generate_typing_sound` / `generate_click_sound`
 * MCP tools, as one set of functions — so the flag and the tool argument mean
 * exactly the same thing.
 *
 * Everything here is local: `@genmotion/keysound` synthesises a keystroke from a
 * table of resonances, so there is no key, no credit and no network behind any
 * of it, and the same text and seed give the same file byte for byte. That is
 * why this is the one audio capability the CLI and MCP surfaces have that the
 * voiceover and SFX ones do not — those need the hosted API, and this needs
 * nothing.
 */

export interface TypingSoundArgs {
  profile?: string;
  wpm?: number;
  fitSeconds?: number;
  typoRate?: number;
  hesitation?: number;
  seed?: string;
  filename?: string;
  /** Put the clip on the timeline at this time (`2s`, `48`, `500ms`) too. */
  place?: string;
}

export interface ClickSoundArgs {
  profile?: string;
  seed?: string;
  filename?: string;
  place?: string;
}

export interface SoundResult {
  /** Project-relative path to the WAV. */
  file: string;
  /** Project-relative path to the timings, for typing only. */
  timing?: string;
  profile: string;
  durationMs: number;
  durationInFrames: number;
  fps: number;
  /** Set when `--place` put it on the timeline. */
  clip?: { id: string; track: number; startFrame: number; durationInFrames: number };
}

export interface TypingSoundResult extends SoundResult {
  text: string;
  keystrokes: number;
  effectiveWpm: number;
  mistakes: number;
}

export interface ClickSoundResult extends SoundResult {
  clicks: number;
  /** How many were closer together than the ear can tell apart, and merged. */
  merged: number;
}

export function profiles(): ProfileCatalog {
  return listProfiles();
}

/** A free name in `assets/`, so a second take never overwrites the first. */
async function freeAssetPath(projectDir: string, preferred: string, ext: string): Promise<string> {
  const base = preferred.replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "sound";
  const stem = base.toLowerCase().endsWith(ext) ? base.slice(0, -ext.length) : base;
  await fs.mkdir(path.join(projectDir, "assets"), { recursive: true });
  for (let n = 0; n < 200; n++) {
    const rel = `assets/${stem}${n === 0 ? "" : `-${n + 1}`}${ext}`;
    const taken = await fs
      .access(path.join(projectDir, rel))
      .then(() => true)
      .catch(() => false);
    if (!taken) return rel;
  }
  throw new CliError("Could not find a free filename in assets/", { fix: "Tidy up assets/ and try again" });
}

async function placeOn(projectDir: string, file: string, at: string): Promise<SoundResult["clip"]> {
  const { clip } = await addAudio(projectDir, file, { at });
  return {
    id: clip.id,
    track: clip.track,
    startFrame: clip.startFrame,
    durationInFrames: clip.durationInFrames,
  };
}

export async function typingSound(
  projectDir: string,
  text: string,
  args: TypingSoundArgs = {},
): Promise<TypingSoundResult> {
  const { fps } = await readManifest(projectDir);
  const render = renderTyping(text, {
    fps,
    ...(args.profile ? { profile: args.profile } : {}),
    ...(args.wpm !== undefined ? { wpm: args.wpm } : {}),
    ...(args.fitSeconds !== undefined ? { fitMs: args.fitSeconds * 1_000 } : {}),
    ...(args.typoRate !== undefined ? { typoRate: args.typoRate } : {}),
    ...(args.hesitation !== undefined ? { hesitation: args.hesitation } : {}),
    ...(args.seed ? { seed: args.seed } : {}),
  });

  const file = await freeAssetPath(projectDir, args.filename ?? "typing", ".wav");
  const timing = file.replace(/\.wav$/, ".timing.json");
  const durationInFrames = Math.max(1, Math.ceil((render.durationMs / 1_000) * fps));
  await fs.writeFile(path.join(projectDir, file), render.wav);
  await fs.writeFile(
    path.join(projectDir, timing),
    `${JSON.stringify(
      {
        text: render.plan.text,
        fps,
        durationInFrames,
        durationMs: render.durationMs,
        keyboard: render.profile,
        effectiveWpm: render.plan.effectiveWpm,
        mistakes: render.plan.mistakes,
        steps: render.steps ?? [],
      },
      null,
      2,
    )}\n`,
  );

  return {
    file,
    timing,
    text: render.plan.text,
    profile: render.profile,
    durationMs: render.durationMs,
    durationInFrames,
    fps,
    keystrokes: render.plan.keystrokes.length,
    effectiveWpm: render.plan.effectiveWpm,
    mistakes: render.plan.mistakes,
    ...(args.place ? { clip: await placeOn(projectDir, file, args.place) } : {}),
  };
}

export async function clickSound(
  projectDir: string,
  at: readonly number[],
  args: ClickSoundArgs = {},
): Promise<ClickSoundResult> {
  if (at.length === 0) throw new CliError("Name at least one click time", { fix: "genmotion keysound click --at 0" });
  const { fps } = await readManifest(projectDir);
  const render = renderClicks(
    at.map((seconds) => seconds * 1_000),
    {
      ...(args.profile ? { profile: args.profile } : {}),
      ...(args.seed ? { seed: args.seed } : {}),
    },
  );

  const file = await freeAssetPath(projectDir, args.filename ?? "click", ".wav");
  await fs.writeFile(path.join(projectDir, file), render.wav);
  const durationInFrames = Math.max(1, Math.ceil((render.durationMs / 1_000) * fps));

  return {
    file,
    profile: render.profile,
    durationMs: render.durationMs,
    durationInFrames,
    fps,
    clicks: render.cues.length,
    merged: at.length - render.cues.length,
    ...(args.place ? { clip: await placeOn(projectDir, file, args.place) } : {}),
  };
}

/**
 * A few seconds of one profile, written wherever asked.
 *
 * Outside a project, because this is for hearing a keyboard before choosing
 * one — the equivalent of the app's play button for an agent with a terminal
 * and a way to play a file.
 */
export async function demoSound(id: string, outPath: string): Promise<{ file: string; durationMs: number }> {
  const demo = renderDemo(id);
  const file = path.resolve(outPath);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, demo.wav);
  return { file, durationMs: demo.durationMs };
}
