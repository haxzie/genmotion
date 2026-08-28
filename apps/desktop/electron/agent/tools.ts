import path from "node:path";
import fs from "node:fs/promises";
import { z } from "zod";
import { readManifest, validateSceneFile } from "@genmotion/project";
import type { ProjectSession } from "../project-session";
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
    content: [{ type: "text" as const, text: result.text }],
    ...(result.isError ? { isError: true } : {}),
  };
}

/** What a tool call produced: text for the model, and whether it went wrong. */
export interface ToolResult {
  text: string;
  isError?: boolean;
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
export const GENMOTION_TOOLS: GenmotionTool[] = [
  {
    name: "validate_scene",
    description:
      "Compile, load, and smoke-render a scene the way the editor does. Returns the exact error when it fails. Run this on every scene you write or change.",
    shape: { file: z.string().describe('Project-relative path, e.g. "scenes/01-intro.tsx"') },
    readOnly: true,
    async run(session, args) {
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
    name: "project_overview",
    description:
      "The composition as the editor sees it: dimensions, fps, running order with durations and timecodes, and which scenes currently fail to build.",
    shape: {},
    readOnly: true,
    async run(session) {
      const project = await session.load();
      if (project.manifestError) return failure(`project.json is invalid:\n${project.manifestError}`);

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
        return text(
          `Saved to ${saved}\n\nImport it: import asset from "../${saved}";  then <Img src={asset} />`,
        );
      } catch (err) {
        return failure(`FAILED — ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },
];

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
        async (args: Record<string, never>) => toMcpContent(await spec.run(session, args)),
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
  // Shell. `add_package` and its approval flow don't exist yet, so there is no
  // sanctioned way to install anything, and an agent with a shell would simply
  // route around that.
  "Bash",
  "BashOutput",
  "KillShell",
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
  const base = (preferred || fromUrl || "asset").replace(/[^\w.\- ]+/g, "_").slice(0, 80);
  const ext = path.extname(base) || known || "";
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
