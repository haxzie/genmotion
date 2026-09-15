import path from "node:path";
import fs from "node:fs/promises";
import { z } from "zod";
import { readManifest } from "@genmotion/project";
import { validateSceneFile } from "@genmotion/project/validate";
import { PAYWALL_STATUS } from "@genmotion/shared";
import { formatFinding } from "@genmotion/hyperframes";
import { desktopAuth } from "../auth";
import { captureCompositionFrame, captureFrame } from "../export/capture";
import { resolveFrameTarget, SAMPLE_AT } from "../export/frame-target";
import { openCompositionWindow } from "../export/hyperframes-window";
import type { ProjectSession } from "../project-session";
import { getSecrets, listConfigs } from "../mcp/store";
import type { AgentSdkModule } from "./load-sdk";

function text(body: string): ToolResult {
  return { text: body };
}

/**
 * A failed tool call. `isError` is what makes it a *failure* rather than a
 * success whose text happens to say "failed" — it reaches the chat as a
 * tool-output-error, so the card shows a warning instead of a green tick.
 */
function failure(body: string): ToolResult {
  return { text: body, isError: true };
}

/** The MCP content shape both transports hand back to their harness. */
export function toMcpContent(result: ToolResult) {
  return {
    content: [
      { type: "text" as const, text: result.text },
      ...(result.image
        ? [
            {
              type: "image" as const,
              data: result.image.base64,
              mimeType: result.image.mimeType,
            },
          ]
        : []),
    ],
    ...(result.isError ? { isError: true } : {}),
  };
}

/** What a tool call produced: text for the model, and whether it went wrong. */
export interface ToolResult {
  text: string;
  isError?: boolean;
  /**
   * A picture to put in front of the model alongside the text.
   *
   * The text still has to stand on its own: not every harness forwards image
   * content into the model's context, so anything it needs — a file path, a
   * frame number — belongs in `text` as well.
   */
  image?: { base64: string; mimeType: string };
}

/**
 * One tool, defined once.
 *
 * Claude Code takes these through the Agent SDK's in-process MCP server. Codex
 * can only reach an MCP server over a socket, so it gets the same list served
 * over loopback HTTP (`mcp-http.ts`). Both transports call the same `run`, so
 * a tool cannot behave differently depending on which harness is driving.
 */
export interface GenmotionTool {
  name: string;
  description: string;
  /** Zod shape: the SDK's `tool()` takes it as-is, and the JSON Schema derives from it. */
  shape: z.ZodRawShape;
  readOnly?: boolean;
  run(session: ProjectSession, args: Record<string, never>): Promise<ToolResult>;
}

/**
 * The few things the filesystem can't express.
 *
 * Everything structural — writing scenes, editing the timeline, factoring out
 * components — is the harness's own file tools operating on the project folder.
 * What it can't do is compile a scene against the app's runtime and render it,
 * so that is what we hand over.
 */
/**
 * The header the user's GitHub marketplace connection sends, if they made
 * one — our tool rides on the same key rather than asking for another.
 */
async function githubToken(): Promise<string | null> {
  const github = (await listConfigs()).find((c) => c.catalogId === "github" && c.enabled);
  if (!github) return null;
  const value = (await getSecrets(github.id)).headers?.Authorization;
  return value ?? null;
}

async function githubError(res: Response, repo: string): Promise<string> {
  if (res.status === 404) return `FAILED: ${repo} was not found (or the connected key can't see it).`;
  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
    return "FAILED: GitHub's rate limit is spent. Connect GitHub in the Marketplace, or wait an hour.";
  }
  if (res.status === 401) return "FAILED: GitHub rejected the connected key. Replace it in the Marketplace.";
  return `FAILED: GitHub answered ${res.status}.`;
}

export const GENMOTION_TOOLS: GenmotionTool[] = [
  {
    name: "validate_scene",
    description:
      "Compile, load, and smoke-render a scene the way the editor does. Returns the exact error when it fails. Run this on every scene you write or change.",
    shape: { file: z.string().describe('Project-relative path, e.g. "scenes/01-intro.tsx"') },
    readOnly: true,
    async run(session, args) {
      if (session.engine === "hyperframes") {
        return failure(
          "This is a HyperFrames project — there are no TSX scenes to validate. Call `validate_composition` instead.",
        );
      }
      const { file } = args as unknown as { file: string };
      const rel = file.replace(/^\.?\//, "");
      let durationInFrames = 150;
      try {
        const manifest = await readManifest(session.dir);
        const entry = manifest.scenes.find((s) => s.file === rel);
        if (entry) durationInFrames = entry.durationInFrames;
        const result = await validateSceneFile({
          bundler: session.bundler,
          sceneFile: rel,
          config: {
            fps: manifest.fps,
            width: manifest.width,
            height: manifest.height,
            durationInFrames,
          },
        });
        if (result.error) return failure(`INVALID\n\n${result.error}`);
        const notes = result.warnings.length
          ? `\n\nWarnings:\n${result.warnings.map((w) => `- ${w}`).join("\n")}`
          : "";
        const listed = entry
          ? ""
          : `\n\nNote: ${rel} is not listed in project.json, so it is not in the video yet.`;
        return text(`VALID — compiles, loads, and renders.${notes}${listed}`);
      } catch (err) {
        return failure(`INVALID\n\n${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },

  {
    name: "validate_composition",
    description:
      "Check a HyperFrames project the way the editor does: compile index.html (scenes inlined, timing resolved), run the HyperFrames linter over index.html and every scenes/*.html, then load the composition for real and seek three frames. Returns every finding with its file and a fix hint. Run this after every edit to composition HTML — it is what `npx hyperframes lint`/`check` would be, and those commands are not available here.",
    shape: {},
    readOnly: true,
    async run(session) {
      if (session.engine !== "hyperframes") {
        return failure("This is not a HyperFrames project — use `validate_scene` on a scene file instead.");
      }
      const engine = session.hyperframes;
      // Fresh, not the watcher's last pass: the agent is asking about the
      // file it just wrote, and the watcher debounces.
      await engine.refresh();
      const state = engine.state();

      if (state.compileError) return failure(`INVALID — does not compile\n\n${state.compileError}`);

      const errors = state.lint.findings.filter((f) => f.severity === "error");
      const warnings = state.lint.findings.filter((f) => f.severity !== "error");
      const notes = warnings.length
        ? `\n\nWarnings (${warnings.length}):\n${warnings.map(formatFinding).join("\n")}`
        : "";
      if (errors.length) {
        return failure(
          `INVALID — ${errors.length} lint error${errors.length === 1 ? "" : "s"}\n\n${errors
            .map(formatFinding)
            .join("\n")}${notes}`,
        );
      }

      // Lint passing proves the markup; only loading the page proves the
      // timeline registers, the media loads, and a seek lands.
      const compiled = engine.current;
      if (!compiled) return failure("INVALID — the composition did not compile");
      let page;
      try {
        page = await openCompositionWindow(session, { width: compiled.width, height: compiled.height });
      } catch (err) {
        return failure(`INVALID — the composition does not load\n\n${err instanceof Error ? err.message : String(err)}`);
      }
      try {
        const d = page.durationSeconds;
        for (const t of [0, d / 2, Math.max(0, d - 1 / 30)]) await page.seek(t);
      } catch (err) {
        return failure(`INVALID — seeking failed\n\n${err instanceof Error ? err.message : String(err)}`);
      } finally {
        page.close();
      }

      const scenes = state.timeline.scenes.length
        ? ` · ${state.timeline.scenes.length} scene${state.timeline.scenes.length === 1 ? "" : "s"}`
        : "";
      return text(
        `VALID — compiles, lints clean, loads and seeks. ${compiled.width}×${compiled.height}, ${compiled.durationSeconds.toFixed(1)}s${scenes}, HyperFrames ${state.runtime.version}.${notes}`,
      );
    },
  },

  {
    name: "capture_frames",
    description:
      "Look at the video. Renders one frame offscreen through the same path the export uses and hands it back as an image, so you can see what a scene actually looks like rather than imagining it. `validate_scene` proves a scene builds; this shows what it renders. Use it after any visual change — it is how you catch text overflowing its box, a dark card on a dark background, or an element that never appears.",
    shape: {
      scene: z
        .string()
        .optional()
        .describe(
          'Project-relative scene file, e.g. "scenes/02-hero.tsx". Omit to address the whole video.',
        ),
      at: z
        .string()
        .optional()
        .describe(
          'When to sample: seconds ("1.5s") or a frame number ("45"), measured from the start of `scene` when given, otherwise from the start of the video. Omit for 60% in — past the intro, before the outro.',
        ),
    },
    readOnly: true,
    async run(session, args) {
      const { scene, at } = args as unknown as { scene?: string; at?: string };
      if (session.engine === "hyperframes") return captureComposition(session, { scene, at });

      let manifest;
      try {
        manifest = await readManifest(session.dir);
      } catch (err) {
        return failure(
          `FAILED — project.json is invalid: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      const resolved = resolveFrameTarget(manifest, { scene, at });
      if (!resolved.ok) return failure(`FAILED — ${resolved.error}`);
      const { frame, scene: owner, localFrame, totalFrames } = resolved.target;

      // Naming a scene mounts only that scene. A project mid-edit usually has
      // something else broken, and a scene you haven't touched failing to
      // build is no reason to refuse you a look at the one you just fixed.
      // Asking by timecode is different: the timeline is the question, so the
      // whole thing has to compile for the answer to mean anything.
      const single = scene !== undefined;
      let image;
      try {
        image = await captureFrame(session, {
          manifest,
          scenes: single ? [owner] : manifest.scenes,
          frame: single ? localFrame : frame,
        });
      } catch (err) {
        return failure(`FAILED — ${err instanceof Error ? err.message : String(err)}`);
      }

      // `capturePage` returns the frame at the display's pixel ratio, which is
      // twice the composition on a Retina screen. A vision model resolves
      // nothing like that, and the full-size original would be megabytes of
      // base64 — so it is scaled down once, for both the file and the model.
      const jpeg = image
        .resize({ width: Math.min(manifest.width, SNAPSHOT_WIDTH), quality: "good" })
        .toJPEG(SNAPSHOT_QUALITY);
      const saved = await writeSnapshot(session.dir, owner.file, frame, jpeg);

      const { fps } = manifest;
      return {
        text: [
          `${owner.file} — frame ${localFrame} of ${owner.durationInFrames} (${seconds(localFrame, fps)} into the scene, ${seconds(frame, fps)} of ${seconds(totalFrames, fps)} on the timeline) · ${manifest.width}×${manifest.height}`,
          `Saved to ${saved}`,
        ].join("\n"),
        image: { base64: jpeg.toString("base64"), mimeType: "image/jpeg" },
      };
    },
  },

  {
    name: "github_stargazers",
    description:
      "Who starred a GitHub repository, newest first, with the total: login, avatar URL and when. For a milestone or community video. Needs GitHub connected in the Marketplace — GitHub only lists stargazers to a signed-in caller.",
    shape: {
      owner: z.string().describe("Repository owner, e.g. `vercel`"),
      repo: z.string().describe("Repository name, e.g. `ai`"),
      limit: z.number().int().min(1).max(500).optional().describe("How many, newest first. Default 100."),
    },
    readOnly: true,
    async run(_session, args) {
      const { owner, repo, limit = 100 } = args as unknown as { owner: string; repo: string; limit?: number };
      const token = await githubToken();
      if (!token) {
        return failure("FAILED: GitHub isn't connected. Connect it in the Marketplace (it needs an API key) and try again.");
      }
      const headers: Record<string, string> = {
        accept: "application/vnd.github.star+json",
        "user-agent": "GenMotion",
        authorization: token,
      };
      const repoRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, { headers });
      if (!repoRes.ok) return failure(await githubError(repoRes, `${owner}/${repo}`));
      const info = (await repoRes.json()) as { stargazers_count: number; full_name: string };

      // Newest first means walking from the last page backwards — GitHub only
      // sorts stargazers oldest-first, and stops paging at 40,000 of them.
      const perPage = 100;
      const maxPage = 400;
      const lastPage = Math.min(maxPage, Math.max(1, Math.ceil(info.stargazers_count / perPage)));
      const rows: { login: string; avatar: string; starredAt: string }[] = [];
      for (let page = lastPage; page >= 1 && rows.length < limit; page--) {
        const res = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stargazers?per_page=${perPage}&page=${page}`,
          { headers },
        );
        if (!res.ok) return failure(await githubError(res, `${owner}/${repo}`));
        const batch = (await res.json()) as { starred_at: string; user: { login: string; avatar_url: string } }[];
        for (const s of batch.reverse()) {
          if (rows.length >= limit) break;
          rows.push({ login: s.user.login, avatar: s.user.avatar_url, starredAt: s.starred_at });
        }
      }
      return text(
        [
          `${info.full_name}: ${info.stargazers_count.toLocaleString("en-US")} stars${info.stargazers_count > maxPage * perPage ? " (GitHub lists only the first 40,000; the newest shown are from that range)" : ""}`,
          "",
          ...rows.map((r) => `${r.login} · ${r.starredAt.slice(0, 10)} · ${r.avatar}`),
        ].join("\n"),
      );
    },
  },

  {
    name: "project_overview",
    description:
      "The composition as the editor sees it: dimensions, fps, running order with durations and timecodes, and which scenes currently fail to build.",
    shape: {},
    readOnly: true,
    async run(session) {
      const project = await session.load();
      if (project.manifestError) return failure(`project.json is invalid:\n${project.manifestError}`);
      if (project.engine === "hyperframes" && project.hyperframes) {
        return text(describeComposition(project.name, project.fps, project.hyperframes));
      }

      const fps = project.fps;
      let at = 0;
      const rows = project.scenes.map((scene) => {
        const start = at;
        at += scene.durationInFrames;
        const bundle = project.bundles[scene.id];
        const state = bundle?.error ? "FAILS TO BUILD" : "ok";
        return `${scene.order + 1}. ${scene.name} — ${scene.id} · ${scene.durationInFrames}f (${(start / fps).toFixed(1)}s–${(at / fps).toFixed(1)}s) · ${state}`;
      });

      const failures = project.scenes
        .filter((s) => project.bundles[s.id]?.error)
        .map((s) => `\n${s.id}:\n${project.bundles[s.id]?.error}`);

      return text(
        [
          `${project.name} — ${project.width}×${project.height} @ ${fps}fps, ${(at / fps).toFixed(1)}s total`,
          "",
          rows.length ? rows.join("\n") : "(no scenes yet)",
          project.missing.length
            ? `\nListed in project.json but missing on disk: ${project.missing.join(", ")}`
            : "",
          project.audioClips.length
            ? `\nAudio: ${project.audioClips
                .map((c) => {
                  const level = c.muted
                    ? "muted"
                    : `vol ${c.volume.toFixed(2)}`;
                  const fades = [
                    c.fadeInFrames ? `in ${c.fadeInFrames}f` : null,
                    c.fadeOutFrames ? `out ${c.fadeOutFrames}f` : null,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return `${c.name} (track ${c.track} @ ${c.startFrame}f, ${level}${fades ? `, fade ${fades}` : ""})`;
                })
                .join(", ")}`
            : "",
          failures.length ? `\nBuild errors:${failures.join("\n")}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    },
  },

  {
    name: "save_asset",
    description:
      "Download an image, video, audio file, or font into the project's assets/ folder and return the path to import. Use this for every remote file a scene needs — logos especially. Never reference a remote URL from scene code.",
    shape: {
      url: z.string().describe("Direct https URL to the file itself, not a page containing it"),
      filename: z
        .string()
        .optional()
        .describe('Preferred filename, e.g. "lovable-logo.svg". Extension inferred if omitted.'),
    },
    async run(session, args) {
      const { url, filename } = args as unknown as { url: string; filename?: string };
      try {
        const saved = await downloadAsset(session.dir, url, filename);
        return text(`Saved to ${saved}\n\n${usageFor(saved)}`);
      } catch (err) {
        return failure(`FAILED — ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },

  {
    name: "generate_voiceover",
    description:
      "Generate a spoken voiceover from a script and save it into the project's assets/, returning the path to place on the timeline. This is how you create narration: write the script, get back an mp3, then add it to project.json's audio array. Speech runs about 2.5 words per second, so size the script to the time you need to cover. Use the SAME voice across a project.",
    shape: {
      // Bounds match the API's schema, so the model is told the limit up front
      // rather than discovering it as a rejected call.
      text: z
        .string()
        .min(3)
        .max(5000)
        .describe(
          "The script to speak. Speech runs ~2.5 words/second — size it to how long you need the audio.",
        ),
      voice: z
        .string()
        .max(64)
        .optional()
        .describe("Voice id. Omit for the default narrator, and keep it consistent across a project."),
      filename: z
        .string()
        .optional()
        .describe('Preferred filename, e.g. "intro-narration.mp3"'),
    },
    async run(session, args) {
      const { text: script, voice, filename } = args as unknown as {
        text: string;
        voice?: string;
        filename?: string;
      };
      return generateMedia(session, {
        label: "Voiceover",
        path: "/api/plugins/voiceover",
        json: { text: script, ...(voice ? { voice } : {}) },
        filename: filename ?? "narration",
        fallbackExt: ".mp3",
      });
    },
  },

  {
    name: "pick_voice",
    description:
      "Ask the user to choose a narrator. Shows the available voices in the chat with a play button on each, and returns the one they picked, with its id — pass that id as `voice` to generate_voiceover for every narration in this project. Call it before the first voiceover of a project unless the user has already named a voice; do not call it again once one is chosen. The user may also decline, in which case use the default.",
    shape: {
      question: z
        .string()
        .max(200)
        .optional()
        .describe('What to ask, e.g. "Which voice should narrate the launch video?"'),
      // Filled in by the app once the user has clicked — the harness parks
      // the call until then (see `canUseTool`). The model never sets these.
      voiceId: z.string().optional().describe("Set by the app. Leave empty."),
      voiceName: z.string().optional().describe("Set by the app. Leave empty."),
    },
    readOnly: true,
    async run(_session, args) {
      const { voiceId, voiceName } = args as unknown as { voiceId?: string; voiceName?: string };
      if (voiceId) {
        return text(
          `The user chose ${voiceName ?? "a voice"} (id ${voiceId}). Use voice "${voiceId}" for every generate_voiceover call in this project.`,
        );
      }
      return text(
        "The user did not pick a voice. Use the default narrator (omit `voice`), and don't ask again this turn.",
      );
    },
  },

  {
    name: "generate_sfx",
    description:
      "Generate a sound effect from a short description and save it into the project's assets/, returning the path to place on the timeline. For the whoosh on a transition, a click on a button, a rising swell under a reveal, rain behind a scene. Describe the sound itself, not the picture — 'a soft airy whoosh, rising, 1 second', 'rain on a window, steady, no thunder'. Leave the duration out unless the cue has to fit an exact moment; the model picks a natural length. One effect per call.",
    shape: {
      text: z
        .string()
        .min(3)
        .max(450)
        .describe("The sound, described plainly: what makes it, its character, how it moves."),
      durationSeconds: z
        .number()
        .min(0.5)
        .max(30)
        .optional()
        .describe("Seconds, 0.5–30. Omit to let the model choose a length that fits the sound."),
      loop: z
        .boolean()
        .optional()
        .describe("Ask for a seamless loop — ambience or a drone that runs under a whole scene."),
      filename: z.string().optional().describe('Preferred filename, e.g. "whoosh-1.mp3"'),
    },
    async run(session, args) {
      const { text: description, durationSeconds, loop, filename } = args as unknown as {
        text: string;
        durationSeconds?: number;
        loop?: boolean;
        filename?: string;
      };
      return generateMedia(session, {
        label: "Sound effects",
        path: "/api/plugins/sfx",
        json: {
          text: description,
          ...(durationSeconds !== undefined ? { durationSeconds } : {}),
          ...(loop ? { loop } : {}),
        },
        filename: filename ?? "sfx",
        fallbackExt: ".mp3",
      });
    },
  },

  {
    name: "generate_image",
    description:
      "Generate a bespoke image from a text prompt and save it into the project's assets/, returning the path to import. Good for illustrations, backgrounds, textures, product shots, or icons a scene needs. Write a precise prompt: subject, art style, composition, colour palette, lighting, and background — specify a solid or plain background when the image will be composited into a scene. One image per call.",
    shape: {
      prompt: z
        .string()
        .min(3)
        .max(2000)
        .describe("Detailed description of the image to generate"),
      filename: z.string().optional().describe('Preferred filename, e.g. "hero-bg.png"'),
    },
    async run(session, args) {
      const { prompt, filename } = args as unknown as { prompt: string; filename?: string };
      return generateMedia(session, {
        label: "Image generation",
        path: "/api/plugins/image",
        json: { prompt },
        filename: filename ?? "generated",
        fallbackExt: ".png",
      });
    },
  },
];

/**
 * How wide a captured frame is kept.
 *
 * A vision model resolves nothing close to 1920, let alone the 2× a Retina
 * `capturePage` returns, and every extra pixel is base64 in the model's
 * context. 1024 keeps text in a lower-third legible at roughly a tenth of the
 * bytes.
 */
const SNAPSHOT_WIDTH = 1024;

/**
 * `capture_frames` for a HyperFrames project.
 *
 * `scene` names a scene slot — by file (`scenes/02-hero.html`) or
 * by id — and `at` is then measured from its start; without one, from the
 * start of the video. The default is the same 60% mark the React path uses.
 */
async function captureComposition(
  session: ProjectSession,
  input: { scene?: string; at?: string },
): Promise<ToolResult> {
  const state = session.hyperframes.state();
  if (state.compileError) return failure(`FAILED — the composition does not compile: ${state.compileError}`);
  const total = state.durationSeconds;
  if (total <= 0) return failure("FAILED — the composition has no duration yet");

  let window = { label: "the video", start: 0, length: total };
  if (input.scene) {
    const wanted = input.scene.replace(/^\.?\//, "");
    const found = state.timeline.scenes.find((s) => s.file === wanted || s.id === wanted);
    if (!found) {
      const known = state.timeline.scenes.map((s) => s.file).join(", ") || "(none)";
      return failure(`FAILED — no scene "${input.scene}". Mounted scenes: ${known}`);
    }
    window = {
      label: found.file,
      start: found.start,
      length: found.duration ?? Math.max(0, total - found.start),
    };
  }

  let offset = window.length * SAMPLE_AT;
  if (input.at !== undefined) {
    const raw = input.at.trim();
    const seconds = /^(\d+(?:\.\d+)?)s$/.exec(raw);
    const frames = /^\d+$/.test(raw) ? Number(raw) : null;
    if (seconds) offset = Number(seconds[1]);
    else if (frames !== null) offset = frames / (await readManifest(session.dir)).fps;
    else return failure(`FAILED — "${input.at}" is not a time: use seconds like "1.5s" or a frame number like "45"`);
    if (offset < 0 || offset > window.length) {
      return failure(`FAILED — ${raw} is outside ${window.label} (${window.length.toFixed(2)}s long)`);
    }
  }
  const time = window.start + offset;

  let captured;
  try {
    captured = await captureCompositionFrame(session, time);
  } catch (err) {
    return failure(`FAILED — ${err instanceof Error ? err.message : String(err)}`);
  }

  const jpeg = captured.image
    .resize({ width: Math.min(captured.width, SNAPSHOT_WIDTH), quality: "good" })
    .toJPEG(SNAPSHOT_QUALITY);
  const stem = input.scene ? window.label : "index.html";
  const saved = await writeSnapshot(session.dir, stem, Math.round(time * 1000), jpeg);
  return {
    text: [
      `${window.label} — ${offset.toFixed(2)}s in${input.scene ? ` (${time.toFixed(2)}s of ${total.toFixed(2)}s on the timeline)` : ` of ${total.toFixed(2)}s`} · ${captured.width}×${captured.height}`,
      `Saved to ${saved}`,
    ].join("\n"),
    image: { base64: jpeg.toString("base64"), mimeType: "image/jpeg" },
  };
}

/** `project_overview` for a HyperFrames project, from the last compile. */
function describeComposition(
  name: string,
  fps: number,
  hf: import("../shared").HyperframesState,
): string {
  const lines: string[] = [];
  const size = hf.width && hf.height ? `${hf.width}×${hf.height}` : "size unknown";
  lines.push(
    `${name} — HyperFrames ${hf.runtime.version}, ${size} @ ${fps}fps, ${hf.durationSeconds.toFixed(1)}s total`,
  );
  if (hf.compileError) lines.push("", `DOES NOT COMPILE: ${hf.compileError}`);
  if (hf.runtime.note) lines.push("", hf.runtime.note);

  lines.push("", "Files: " + hf.files.map((f) => f.path).join(", "));

  const { scenes, clips, audio } = hf.timeline;
  if (scenes.length) {
    lines.push("", "Sub-compositions:");
    scenes.forEach((s, i) => {
      const end = s.duration === null ? "?" : (s.start + s.duration).toFixed(1);
      lines.push(`${i + 1}. ${s.label} — ${s.file} · ${s.start.toFixed(1)}s–${end}s`);
    });
  }
  const rootClips = clips.filter((c) => c.depth === 0 && c.kind !== "composition" && c.kind !== "audio");
  if (rootClips.length) {
    lines.push(
      "",
      "Root clips: " +
        rootClips
          .map((c) => `#${c.id} (${c.start.toFixed(1)}s${c.duration === null ? "" : `–${(c.start + c.duration).toFixed(1)}s`})`)
          .join(", "),
    );
  }
  if (audio.length) {
    lines.push(
      "",
      "Audio: " +
        audio
          .map((a) => `#${a.id} ${a.src} @ ${a.start.toFixed(1)}s${a.duration === null ? "" : ` for ${a.duration.toFixed(1)}s`}, vol ${a.volume}`)
          .join(", "),
    );
  }
  const errors = hf.lint.findings.filter((f) => f.severity === "error");
  const warnings = hf.lint.findings.filter((f) => f.severity !== "error");
  if (errors.length || warnings.length) {
    lines.push("", `Lint: ${errors.length} error(s), ${warnings.length} warning(s)`);
    for (const f of [...errors, ...warnings].slice(0, 20)) lines.push(formatFinding(f));
  } else {
    lines.push("", "Lint: clean");
  }
  return lines.join("\n");
}
const SNAPSHOT_QUALITY = 80;

/**
 * Where captured frames land.
 *
 * Under `.genmotion/cache/`, which the file watcher ignores and the scaffolded
 * `.gitignore` already excludes — so a capture never looks like a project edit
 * and never ends up committed.
 */
const SNAPSHOT_DIR = [".genmotion", "cache", "snapshots"];

/** Frames kept on disk before the oldest are dropped. */
const SNAPSHOT_KEEP = 20;

/** Save a captured frame and return its project-relative path. */
async function writeSnapshot(
  projectDir: string,
  sceneFile: string,
  frame: number,
  jpeg: Buffer,
): Promise<string> {
  const dir = path.join(projectDir, ...SNAPSHOT_DIR);
  await fs.mkdir(dir, { recursive: true });

  const stem = (sceneFile.split("/").pop() ?? sceneFile)
    .replace(/\.(?:[jt]sx?|html?)$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-");
  // Zero-padded so the folder sorts the way the timeline runs.
  const name = `${stem}-f${String(frame).padStart(4, "0")}.jpg`;
  await fs.writeFile(path.join(dir, name), jpeg);

  // Best-effort: a folder that failed to prune is not a reason to fail a
  // capture the model is waiting on.
  await prune(dir).catch(() => {});

  return [...SNAPSHOT_DIR, name].join("/");
}

async function prune(dir: string): Promise<void> {
  const files = await fs.readdir(dir);
  if (files.length <= SNAPSHOT_KEEP) return;
  const stamped = await Promise.all(
    files.map(async (file) => ({
      file,
      at: await fs
        .stat(path.join(dir, file))
        .then((s) => s.mtimeMs)
        .catch(() => 0),
    })),
  );
  stamped.sort((a, b) => b.at - a.at);
  await Promise.all(
    stamped.slice(SNAPSHOT_KEEP).map(({ file }) => fs.rm(path.join(dir, file), { force: true })),
  );
}

/** A frame count as the seconds a person reads off the timeline. */
function seconds(frame: number, fps: number): string {
  return `${(frame / fps).toFixed(1)}s`;
}

/**
 * Ask the hosted API for generated media and land it in `assets/`.
 *
 * The providers are ours, not the user's — we hold the ElevenLabs and Gemini
 * keys and the signed-in session is the authorisation — so this is the one
 * place a tool leaves the machine for anything but a plain file download. The
 * bearer token stays inside `DesktopAuth`; this only ever hands it a path.
 */
async function generateMedia(
  session: ProjectSession,
  opts: {
    label: string;
    path: string;
    json: Record<string, unknown>;
    filename: string;
    fallbackExt: string;
  },
): Promise<ToolResult> {
  const res = await desktopAuth
    .requestBinary(opts.path, { json: opts.json })
    .catch((err: unknown) => ({
      ok: false as const,
      status: 0,
      body: { error: err instanceof Error ? err.message : String(err) },
    }));

  if (!res.ok) return failure(describeGenerationFailure(opts.label, res.status, res.body));

  const ext = ASSET_TYPES[res.mime] ?? opts.fallbackExt;
  const saved = await saveAssetBytes(session.dir, res.bytes, opts.filename, ext);
  return text(`Saved to ${saved}\n\n${usageFor(saved)}`);
}

/**
 * Why a generation was refused, phrased so the model tells the user something
 * actionable and then carries on rather than retrying a call that cannot work.
 */
function describeGenerationFailure(label: string, status: number, body: unknown): string {
  const parsed = body as { error?: string; paywall?: { message?: string } } | null;
  const detail = parsed?.error ?? (typeof body === "string" ? body : "");

  if (status === 0) {
    return `FAILED — could not reach GenMotion${detail ? `: ${detail}` : "."} Tell the user, and continue without the file.`;
  }
  if (status === 401) {
    return `FAILED — ${label} needs a signed-in GenMotion account. Tell the user to sign in from the account menu, and continue without the file.`;
  }
  if (status === PAYWALL_STATUS) {
    return `FAILED — ${parsed?.paywall?.message ?? `${label} is a Pro feature.`} Tell the user plainly and continue without the file; do not call this tool again this turn.`;
  }
  if (status === 503) {
    return `FAILED — ${label} is not available on this server${detail ? `: ${detail}` : "."} Tell the user, and continue without the file.`;
  }
  if (status === 400) {
    // The prompt or the voice is what is wrong, so a corrected retry can work.
    return `FAILED — ${detail || "the request was rejected."} Adjust and try once more.`;
  }
  return `FAILED — ${detail || `${label} failed (${status}).`}`;
}

/**
 * Run a tool against a project, unless that project has been closed.
 *
 * A tab can close while its agent is still winding down after an abort, and a
 * call landing then would hit a disposed esbuild context — an opaque "service
 * is no longer running" from deep inside the bundler. A sentence the model
 * can narrate is better. Both transports go through here so neither can
 * differ.
 */
export async function runTool(
  spec: GenmotionTool,
  session: ProjectSession,
  args: Record<string, never>,
): Promise<ToolResult> {
  if (session.disposed) return failure("This project was closed.");
  return spec.run(session, args);
}

/** The Claude-side transport: the same tools as an in-process MCP server. */
export function createGenmotionTools(sdk: AgentSdkModule, session: ProjectSession) {
  const { createSdkMcpServer, tool } = sdk;

  return createSdkMcpServer({
    name: "genmotion",
    version: "0.1.0",
    tools: GENMOTION_TOOLS.map((spec) =>
      tool(
        spec.name,
        spec.description,
        spec.shape,
        async (args: Record<string, never>) => toMcpContent(await runTool(spec, session, args)),
        spec.readOnly ? { annotations: { readOnlyHint: true } } : undefined,
      ),
    ),
  });
}

/**
 * Deliberately empty.
 *
 * `allowedTools` is an auto-approve list, and a bare name there approves the
 * tool *before* `canUseTool` is consulted — which silently disabled the
 * containment check that keeps writes inside the project. Leaving it empty
 * routes every call through that callback instead, which is the only place
 * the decision should be made. Availability is controlled by DISALLOWED_TOOLS.
 */
export const ALLOWED_TOOLS: string[] = [];

/**
 * The harness tools that only ever look.
 *
 * This is the list that decides what a folder the user has shared outside the
 * project buys them: a grant widens reading, so only a tool on this list can
 * act on a path outside the project folder, and only within a granted root.
 * Anything that can modify a file is absent on purpose — writes stay inside
 * the project whatever the user has shared.
 */
export const READ_ONLY_TOOLS = new Set(["Read", "Glob", "Grep", "NotebookRead"]);

/**
 * Everything the video agent has no business reaching.
 *
 * The CLI's built-in toolset grows on its own schedule, and anything it adds
 * arrives switched ON: this list is what stands between a scene-writing agent
 * and the rest of the user's machine. Names that a given CLI version doesn't
 * ship are simply ignored, so listing a tool defensively costs nothing.
 *
 * Web search and fetch are the deliberate exception. Matching a real brand is
 * most of what makes a product video look right, and without research the
 * agent invents a palette and writes placeholder copy. Anything it finds still
 * has to come into the project through `save_asset` — see the hot-linking rule
 * in the prompt.
 */
export const DISALLOWED_TOOLS = [
  // Bash is deliberately NOT on this list. It used to be: a shell reaches
  // past every containment rule below, since `canUseTool`'s path check has
  // nothing to inspect on a command string, and `agentEnv()` hands it the
  // user's real environment — network, other directories, credentials, all of
  // it. It is on so the agent can reach ffmpeg (see `bundledBinDir()` in
  // `agent/detect.ts`) for media work no scene-authoring tool covers. There is
  // still no `add_package` approval flow, so treat anything it installs as
  // unreviewed.
  // Delegation. A subagent inherits none of the containment below, and one
  // `Workflow` call can fan out to hundreds of agents on the user's plan. The
  // subagent tool has been called both `Task` and `Agent`; name both.
  "Task",
  "Agent",
  "TaskOutput",
  "TaskStop",
  "Workflow",
  // Reaching other sessions. The user's other Claude Code sessions are not
  // part of this project, and a video agent has no reason to enumerate or
  // message them.
  "ListAgents",
  "SendMessage",
  // Work that outlives the turn. The editor's contract is that closing the app
  // ends the agent; a scheduled wake-up or cron entry quietly breaks it.
  "CronCreate",
  "CronDelete",
  "CronList",
  "ScheduleWakeup",
  "RemoteTrigger",
  "PushNotification",
  "Monitor",
  // Git plumbing. A project folder isn't required to be a repo at all.
  "EnterWorktree",
  "ExitWorktree",
  // Tools with no meaning here: notebooks, the user's own skills (the same
  // reason `settingSources` is empty — their coding setup would only confuse a
  // video agent), and code-review reporting surfaces.
  "NotebookEdit",
  "Skill",
  "DesignSync",
  "ReportFindings",
];

/**
 * The same list for a HyperFrames project, where `Skill` is the point: the
 * HyperFrames pack arrives as a plugin this app ships (see `pluginDir()` in
 * `claude-code.ts`), and with `settingSources` empty it is the only pack
 * the session can see — so allowing the tool allows exactly those skills.
 */
export const DISALLOWED_TOOLS_HYPERFRAMES = DISALLOWED_TOOLS.filter((name) => name !== "Skill");

/**
 * What to do with a file once it's saved — which differs by kind, and getting
 * it wrong is expensive: audio dropped into a scene as `<Audio>` plays in the
 * preview but is silent in the export, because only manifest audio is muxed.
 */
function usageFor(rel: string): string {
  const ext = path.extname(rel).toLowerCase();
  if ([".mp3", ".wav", ".m4a", ".ogg", ".aac", ".flac"].includes(ext)) {
    return [
      "This is audio, so put it on the TIMELINE — add an entry to project.json's",
      '`audio` array with a unique `id`, the `file` path, a `track` (0-3),',
      "`startFrame`, `durationInFrames`, `startFrom` and `volume`.",
      "",
      "`volume` is linear gain: 1 is unity, 0.5 is about -6dB, 2 is the ceiling.",
      "Music under a voiceover usually wants 0.2-0.4 — at 1 it competes with the",
      "narration instead of sitting behind it.",
      "",
      "`fadeInFrames` and `fadeOutFrames` ramp from and to silence. Give music a",
      "fade out rather than letting it stop dead at the end of the video: half a",
      "second (fps/2) is the smallest fade that does not sound like a cut, and a",
      "second reads as deliberate. Both default to 0.",
      "",
      "`muted` silences a clip without discarding its volume. Prefer removing the",
      "entry to muting one the user cannot see.",
      "",
      "Do NOT import it into a scene and render `<Audio>`: that plays in the",
      "preview but is dropped from the exported video, which only mixes audio",
      "listed in project.json.",
    ].join("\n");
  }
  if ([".mp4", ".webm", ".mov"].includes(ext)) {
    return `Import it: import clip from "../${rel}";  then <Video src={clip} />`;
  }
  return `Import it: import asset from "../${rel}";  then <Img src={asset} />`;
}

const MAX_ASSET_BYTES = 25 * 1024 * 1024;

/** content-type → extension, for URLs that don't carry a usable one. */
const ASSET_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/mp4": ".m4a",
  "font/woff2": ".woff2",
};

/**
 * Fetch a remote file into `assets/`.
 *
 * A hot-linked URL in scene code is the most common way a finished video ends
 * up with a hole in it: the link rots, or the host blocks the renderer, and the
 * frame renders empty. Copying the bytes in makes the project self-contained —
 * and means an export works offline.
 */
async function downloadAsset(
  projectDir: string,
  url: string,
  preferred?: string,
): Promise<string> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Only http(s) URLs can be saved, got ${parsed.protocol}`);
  }

  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
    headers: { accept: "image/*,video/*,audio/*,font/*,*/*;q=0.5" },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);

  const contentType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
  const known = ASSET_TYPES[contentType];
  if (!known && !/^(image|video|audio|font)\//.test(contentType)) {
    throw new Error(
      `${url} is ${contentType || "an unknown type"}, not a media file. If this is a page, find the direct file URL first.`,
    );
  }

  const body = Buffer.from(await response.arrayBuffer());
  if (body.byteLength === 0) throw new Error("The file was empty");
  if (body.byteLength > MAX_ASSET_BYTES) {
    throw new Error(`The file is ${(body.byteLength / 1024 / 1024).toFixed(1)}MB, over the 25MB limit`);
  }

  const fromUrl = path.basename(decodeURIComponent(parsed.pathname));
  return saveAssetBytes(projectDir, body, preferred || fromUrl || "asset", known ?? "");
}

/**
 * Write bytes into `assets/` under a free name, and return the project-relative
 * path.
 *
 * Shared by everything that lands a file in the project — the downloader and
 * both generators — so there is one containment check and one collision rule
 * rather than three. `fallbackExt` is used only when the preferred name carries
 * no extension of its own.
 */
async function saveAssetBytes(
  projectDir: string,
  body: Buffer,
  preferred: string,
  fallbackExt: string,
): Promise<string> {
  const base = (preferred || "asset").replace(/[^\w.\- ]+/g, "_").slice(0, 80);
  const ext = path.extname(base) || fallbackExt || "";
  const stem = ext ? base.slice(0, base.length - path.extname(base).length) || "asset" : base;

  await fs.mkdir(path.join(projectDir, "assets"), { recursive: true });
  for (let n = 0; n < 200; n++) {
    const rel = `assets/${stem}${n === 0 ? "" : `-${n + 1}`}${ext}`;
    const target = path.join(projectDir, rel);
    if (!isInsideProject(projectDir, rel)) throw new Error("Refusing to write outside the project");
    const taken = await fs
      .access(target)
      .then(() => true)
      .catch(() => false);
    if (taken) continue;
    await fs.writeFile(target, body);
    return rel;
  }
  throw new Error("Could not find a free filename in assets/");
}

/** Keep writes inside the project folder, whatever the model asks for. */
export function isInsideProject(projectDir: string, candidate: string): boolean {
  const rel = path.relative(projectDir, path.resolve(projectDir, candidate));
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}
