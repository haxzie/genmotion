"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { SceneData } from "@genmotion/shared";
import { Spinner, cx } from "@/components/ui";
import { SceneIcon } from "./scene-icon";

const CodeBlock = dynamic(() => import("./code-block"), {
  ssr: false,
  loading: () => (
    <div className="flex h-16 items-center justify-center">
      <Spinner className="size-3" />
    </div>
  ),
});

const TOOL_LABELS: Record<string, { active: string; done: string }> = {
  createScene: { active: "Creating scene", done: "Created scene" },
  createScenes: { active: "Writing scenes in parallel", done: "Created scenes" },
  updateScene: { active: "Updating scene", done: "Updated scene" },
  editScene: { active: "Editing scene", done: "Edited scene" },
  updateSceneDuration: { active: "Adjusting duration", done: "Adjusted duration" },
  deleteScene: { active: "Deleting scene", done: "Deleted scene" },
  reorderScenes: { active: "Reordering timeline", done: "Reordered timeline" },
  renameProject: { active: "Naming project", done: "Renamed project" },
  getSceneCode: { active: "Reading scene", done: "Read scene" },
  analyzeWebsiteBranding: { active: "Analyzing brand", done: "Analyzed brand" },
  readWebsite: { active: "Reading website", done: "Read website" },
  searchWeb: { active: "Searching the web", done: "Searched the web" },
  CreateVoiceOverAudio: { active: "Generating voiceover", done: "Generated voiceover" },
  generateImage: { active: "Generating image", done: "Generated image" },
  workbench: { active: "Running workbench", done: "Ran workbench" },
  saveImageToProject: { active: "Saving image", done: "Saved image" },
  compactConversation: {
    active: "Compacting conversation",
    done: "Compacted earlier conversation",
  },
};

/**
 * Presentation for a tool this component doesn't know about natively.
 *
 * The editor agent's toolset depends on which harness is driving it — the
 * hosted agent has `createScene`, a coding harness has `Write` and `Edit` — so
 * hosts register their own vocabulary rather than this file enumerating every
 * possibility. Without an entry a tool still renders, just with its raw name.
 */
export interface ToolPresentation {
  labels: { active: string; done: string };
  icon?: Glyph;
  /** Short descriptor shown after the label, e.g. the file being written. */
  subject?: (part: ToolPartLike) => string | undefined;
  /** Expanded content. Falls back to the built-in body when omitted. */
  body?: (part: ToolPartLike) => ReactNode;
  /**
   * Show the body while the call is still running, and keep it toggleable.
   * For tools whose body is the point of the call rather than a record of it —
   * a question waiting on an answer, work you watch as it lands.
   */
  expandWhileRunning?: boolean;
}

const REGISTERED: Record<string, ToolPresentation> = {};

/** Teach the tool cards about a host's own tools. Merges; call once at startup. */
export function registerToolPresentation(
  entries: Record<string, ToolPresentation>,
): void {
  Object.assign(REGISTERED, entries);
}

const RESEARCH_TOOLS = new Set([
  "analyzeWebsiteBranding",
  "readWebsite",
  "searchWeb",
]);

/**
 * The tools `ExpandedBody` draws a purpose-built body for.
 *
 * Anything outside this set — a harness tool nobody has registered a
 * presentation for yet, or one a newer CLI added — falls through to the raw
 * input/output dump. Without it an unknown tool expands to an empty box, which
 * reads as "the tool did nothing" rather than "we don't know this tool".
 */
const NATIVE_TOOLS = new Set([
  ...RESEARCH_TOOLS,
  "createScene",
  "updateScene",
  "createScenes",
  "getSceneCode",
  "updateSceneDuration",
  "reorderScenes",
  "renameProject",
  "deleteScene",
  "CreateVoiceOverAudio",
  "editScene",
  "workbench",
  "saveImageToProject",
  "generateImage",
  "compactConversation",
]);

/** Tool results arrive as a string, as MCP content blocks, or as a plain object. */
function readableOutput(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const blocks = value.map((block) =>
      block && typeof block === "object" && "text" in block
        ? String((block as { text: unknown }).text)
        : "",
    );
    // Only treat it as content blocks when every entry actually carried text;
    // a plain array of data reads better as JSON than as a run of blanks.
    if (blocks.every(Boolean)) return blocks.join("\n");
  }
  if (typeof value === "object" && "text" in (value as object)) {
    return String((value as { text: unknown }).text);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Last resort: show what went in and what came back, rather than nothing. */
function GenericBody({ part }: { part: ToolPartLike }) {
  const input = readableOutput(part.input);
  const output = readableOutput((part as { output?: unknown }).output);
  if (!input.trim() && !output.trim()) {
    return (
      <p className="px-3 py-2 text-[0.786rem] text-text-tertiary">No details.</p>
    );
  }
  return (
    <>
      {input.trim() && (
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[0.714rem] leading-relaxed text-text-tertiary">
          {input.slice(0, 3000)}
        </pre>
      )}
      {output.trim() && (
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[0.714rem] leading-relaxed text-text-secondary">
          {output.slice(0, 3000)}
        </pre>
      )}
    </>
  );
}

type Glyph = (props: { className?: string }) => ReactNode;

function ToolGlyph({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cx("size-3.5 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const SceneGlyph: Glyph = (p) => (
  <SceneIcon className={cx("size-3.5 shrink-0", p.className)} />
);
const ClockIcon: Glyph = (p) => (
  <ToolGlyph {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 5v3l2 1.3" />
  </ToolGlyph>
);
const TrashIcon: Glyph = (p) => (
  <ToolGlyph {...p}>
    <path d="M3 4.5h10M6.3 4.5v-1.2h3.4v1.2M4.7 4.5l.5 8.3h5.6l.5-8.3" />
  </ToolGlyph>
);
const ReorderIcon: Glyph = (p) => (
  <ToolGlyph {...p}>
    <path d="M5 12.5V4M5 4L3.2 5.8M5 4l1.8 1.8M11 3.5V12M11 12l-1.8-1.8M11 12l1.8-1.8" />
  </ToolGlyph>
);
const TagIcon: Glyph = (p) => (
  <ToolGlyph {...p}>
    <path d="M7.7 2.5H13a.5.5 0 0 1 .5.5v5.3a1 1 0 0 1-.3.7l-5 5a1 1 0 0 1-1.4 0L2.5 9.2a1 1 0 0 1 0-1.4l4.5-5a1 1 0 0 1 .7-.3Z" />
    <circle cx="10.7" cy="5.3" r=".7" fill="currentColor" stroke="none" />
  </ToolGlyph>
);
const CodeIcon: Glyph = (p) => (
  <ToolGlyph {...p}>
    <path d="M6 5L3 8l3 3M10 5l3 3-3 3" />
  </ToolGlyph>
);
const PaletteGlyphIcon: Glyph = (p) => (
  <ToolGlyph {...p}>
    <path d="M8 2a6 6 0 1 0 0 12c.7 0 1.1-.5 1.1-1.1 0-.3-.1-.6-.3-.8-.2-.2-.3-.5-.3-.8 0-.6.5-1.1 1.1-1.1H11A3.3 3.3 0 0 0 14.3 7C14.3 4.4 11.5 2 8 2Z" />
    <circle cx="5" cy="7" r=".7" fill="currentColor" stroke="none" />
    <circle cx="8" cy="5" r=".7" fill="currentColor" stroke="none" />
    <circle cx="11" cy="7" r=".7" fill="currentColor" stroke="none" />
  </ToolGlyph>
);
const GlobeIcon: Glyph = (p) => (
  <ToolGlyph {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M2.5 8h11M8 2.5c1.7 1.6 1.7 9.4 0 11M8 2.5c-1.7 1.6-1.7 9.4 0 11" />
  </ToolGlyph>
);
const SearchIcon: Glyph = (p) => (
  <ToolGlyph {...p}>
    <circle cx="7" cy="7" r="4" />
    <path d="M10 10l3.3 3.3" />
  </ToolGlyph>
);
const MicIcon: Glyph = (p) => (
  <ToolGlyph {...p}>
    <rect x="6" y="2.3" width="4" height="7" rx="2" />
    <path d="M4 7.5a4 4 0 0 0 8 0M8 11.5V13.5M6 13.5h4" />
  </ToolGlyph>
);
const TerminalIcon: Glyph = (p) => (
  <ToolGlyph {...p}>
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <path d="M4.7 6.5L6.7 8l-2 1.5M8.5 9.7h3" />
  </ToolGlyph>
);
const ImageIcon: Glyph = (p) => (
  <ToolGlyph {...p}>
    <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
    <circle cx="6" cy="6.3" r="1.1" />
    <path d="M3 11.5l3.2-2.7 2.3 1.9 2.2-1.6 2.3 1.9" />
  </ToolGlyph>
);
const ArchiveIcon: Glyph = (p) => (
  <ToolGlyph {...p}>
    <rect x="2.5" y="3" width="11" height="3" rx="1" />
    <path d="M3.5 6v6.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V6M6.5 9h3" />
  </ToolGlyph>
);
const DotIcon: Glyph = (p) => (
  <ToolGlyph {...p}>
    <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
  </ToolGlyph>
);

const TOOL_ICONS: Record<string, Glyph> = {
  createScene: SceneGlyph,
  createScenes: SceneGlyph,
  updateScene: SceneGlyph,
  editScene: SceneGlyph,
  updateSceneDuration: ClockIcon,
  deleteScene: TrashIcon,
  reorderScenes: ReorderIcon,
  renameProject: TagIcon,
  getSceneCode: CodeIcon,
  analyzeWebsiteBranding: PaletteGlyphIcon,
  readWebsite: GlobeIcon,
  searchWeb: SearchIcon,
  CreateVoiceOverAudio: MicIcon,
  generateImage: ImageIcon,
  workbench: TerminalIcon,
  saveImageToProject: ImageIcon,
  compactConversation: ArchiveIcon,
};

interface SceneBriefInput {
  name?: string;
  durationInFrames?: number;
  brief?: string;
}

export interface ToolPartLike {
  type: string;
  state?: string;
  /** The harness's id for this call — how a host addresses the call it belongs to. */
  toolCallId?: string;
  input?: {
    name?: string;
    code?: string;
    sceneId?: string;
    durationInFrames?: number;
    scenes?: SceneBriefInput[];
    orderedSceneIds?: string[];
    url?: string;
    query?: string;
    script?: string;
    text?: string;
    voice?: string;
    // editScene
    edits?: Array<{ oldText?: string; newText?: string; replaceAll?: boolean }>;
    // workbench
    language?: string;
    // saveImageToProject
    filename?: string;
    // generateImage
    prompt?: string;
  };
  output?: {
    ok?: boolean;
    error?: string;
    name?: string;
    code?: string;
    sceneId?: string;
    created?: Array<{ sceneId?: string; name?: string }>;
    audioUrl?: string;
    durationSeconds?: number | null;
    // editScene
    editsApplied?: number;
    // workbench
    exitCode?: number;
    stdout?: string;
    stderr?: string;
    files?: Array<{ name?: string; url?: string }>;
    // saveImageToProject
    url?: string;
    filename?: string;
    // compactConversation
    note?: string;
  };
}

type ToolStatus = "running" | "done" | "failed" | "interrupted";

/**
 * A part stuck without an output (stream aborted, reload mid-generation)
 * would otherwise spin forever. Check what actually happened against the
 * live timeline where we can; otherwise report it as interrupted.
 */
function inferStaleStatus(
  toolName: string,
  part: ToolPartLike,
  scenes: SceneData[],
): ToolStatus {
  const input = part.input;
  switch (toolName) {
    case "createScene":
      if (!input?.name) return "interrupted";
      return scenes.some((s) => s.name === input.name) ? "done" : "failed";
    case "createScenes": {
      const names = (input?.scenes ?? [])
        .map((s) => s.name)
        .filter((n): n is string => !!n);
      if (names.length === 0) return "interrupted";
      return names.every((n) => scenes.some((s) => s.name === n))
        ? "done"
        : "failed";
    }
    case "deleteScene":
      if (!input?.sceneId) return "interrupted";
      return scenes.some((s) => s.id === input.sceneId) ? "failed" : "done";
    case "CreateVoiceOverAudio":
      // No timeline side-effect to probe (the audio lands as an asset), so an
      // interrupted call with no output can't be confirmed either way.
      return "interrupted";
    case "getSceneCode":
    case "analyzeWebsiteBranding":
    case "readWebsite":
    case "searchWeb":
      // Read-only: whether it finished has no user-visible consequence.
      return "done";
    default:
      return "interrupted";
  }
}

function StatusIcon({ status }: { status: ToolStatus }) {
  if (status === "running") return <Spinner className="size-3 shrink-0" />;
  if (status === "interrupted") {
    return (
      <svg viewBox="0 0 16 16" className="size-3 shrink-0 text-text-tertiary" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="8" cy="8" r="6" />
        <path d="M5.5 8h5" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <svg viewBox="0 0 16 16" className="size-3 shrink-0 text-warning" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M8 5v3.5M8 11v.5" strokeLinecap="round" />
        <path d="M7.13 1.9a1 1 0 0 1 1.74 0l5.7 9.95A1 1 0 0 1 13.7 13.4H2.3a1 1 0 0 1-.87-1.55l5.7-9.95Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="size-3 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8.5l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cx(
        "size-3 shrink-0 text-text-tertiary transition-transform duration-150",
        open && "rotate-90",
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 3.5L10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetaRow({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 px-3 py-1.5 text-[0.786rem] text-text-tertiary">
      {items.map(([key, value]) => (
        <span key={key}>
          <span className="text-text-secondary">{key}</span> {value}
        </span>
      ))}
    </div>
  );
}

/** Find the freshest code for a created scene (the live timeline copy beats the tool input). */
function liveCode(scenes: SceneData[], sceneId?: string): string | undefined {
  return scenes.find((s) => s.id === sceneId)?.code;
}

/** One scene inside a createScenes call — its own accordion with live status. */
function CreateSceneItem({
  brief,
  index,
  scenes,
  output,
  live,
}: {
  brief: SceneBriefInput;
  index: number;
  scenes: SceneData[];
  output: ToolPartLike["output"];
  live: boolean;
}) {
  const [open, setOpen] = useState(false);
  const createdId = output?.created?.find((c) => c.name === brief.name)?.sceneId;
  const code =
    liveCode(scenes, createdId) ??
    scenes.find((s) => s.name === brief.name)?.code;
  const status: ToolStatus = code ? "done" : live ? "running" : "failed";
  const canOpen = status !== "running" && Boolean(code || brief.brief);

  return (
    <div>
      <button
        type="button"
        onClick={() => canOpen && setOpen((v) => !v)}
        className={cx(
          "group flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.786rem]",
          status === "running" && "cursor-default",
        )}
      >
        <StatusIcon status={status} />
        <span
          className={cx(
            "truncate",
            status === "failed" ? "text-warning" : "text-text-secondary",
          )}
        >
          {brief.name ?? `Scene ${index + 1}`}
        </span>
        {typeof brief.durationInFrames === "number" && (
          <span className="shrink-0 font-mono text-[0.714rem] text-text-tertiary">
            {brief.durationInFrames}f
          </span>
        )}
        {canOpen && (
          <span className="ml-auto opacity-60 transition-opacity group-hover:opacity-100">
            <Chevron open={open} />
          </span>
        )}
      </button>
      {open && (
        <div className="border-t border-border">
          {brief.brief && !code && (
            <p className="px-3 py-2 text-[0.786rem] leading-relaxed text-text-tertiary">
              {brief.brief}
            </p>
          )}
          {code && <CodeBlock code={code} />}
        </div>
      )}
    </div>
  );
}

function ExpandedBody({
  toolName,
  part,
  scenes,
  live,
}: {
  toolName: string;
  part: ToolPartLike;
  scenes: SceneData[];
  live: boolean;
}) {
  const { input, output } = part;
  const failed = part.state === "output-error" || output?.ok === false;

  return (
    <div className="min-w-0 max-w-full divide-y divide-border">
      {failed && output?.error && (
        <p className="whitespace-pre-wrap px-3 py-2 font-mono text-[0.786rem] text-warning">
          {output.error}
        </p>
      )}

      {(toolName === "createScene" || toolName === "updateScene") && (
        <>
          <MetaRow
            items={[
              ...(input?.name ? [["scene", input.name] as [string, string]] : []),
              ...(input?.durationInFrames
                ? [["duration", `${input.durationInFrames} frames`] as [string, string]]
                : []),
            ]}
          />
          {(liveCode(scenes, output?.sceneId ?? input?.sceneId) ?? input?.code) && (
            <CodeBlock
              code={liveCode(scenes, output?.sceneId ?? input?.sceneId) ?? input!.code!}
            />
          )}
        </>
      )}

      {toolName === "createScenes" &&
        (input?.scenes ?? []).map((brief, i) => (
          <CreateSceneItem
            key={i}
            brief={brief}
            index={i}
            scenes={scenes}
            output={output}
            live={live}
          />
        ))}

      {toolName === "getSceneCode" && output?.code && (
        <CodeBlock code={output.code} />
      )}

      {toolName === "updateSceneDuration" && input?.durationInFrames && (
        <MetaRow items={[["new duration", `${input.durationInFrames} frames`]]} />
      )}

      {toolName === "reorderScenes" && input?.orderedSceneIds && (
        <MetaRow items={[["new order", input.orderedSceneIds.map((id) => scenes.find((s) => s.id === id)?.name ?? "?").join(" → ")]]} />
      )}

      {toolName === "renameProject" && input?.name && (
        <MetaRow items={[["title", input.name]]} />
      )}

      {toolName === "deleteScene" && input?.sceneId && (
        <MetaRow
          items={[["scene", scenes.find((s) => s.id === input.sceneId)?.name ?? input.sceneId]]}
        />
      )}

      {toolName === "CreateVoiceOverAudio" && (
        <>
          <MetaRow
            items={[
              ...(input?.voice ? [["voice", input.voice] as [string, string]] : []),
              ...(output?.filename ? [["file", output.filename] as [string, string]] : []),
              ...(output?.durationSeconds
                ? [["duration", `${output.durationSeconds.toFixed(1)}s`] as [string, string]]
                : []),
            ]}
          />
          {input?.text && (
            <p className="px-3 py-2 text-[0.786rem] leading-relaxed text-text-secondary">
              “{input.text}”
            </p>
          )}
          {output?.url && (
            <div className="px-3 py-2">
              <audio controls src={output.url} className="h-8 w-full" />
            </div>
          )}
        </>
      )}

      {toolName === "editScene" && (
        <>
          <MetaRow
            items={[
              ...(input?.sceneId
                ? [["scene", scenes.find((s) => s.id === input.sceneId)?.name ?? "?"] as [string, string]]
                : []),
              ...(output?.editsApplied ?? input?.edits?.length
                ? [["edits", String(output?.editsApplied ?? input?.edits?.length)] as [string, string]]
                : []),
            ]}
          />
          {(input?.edits ?? []).map((edit, i) => (
            <div
              key={i}
              className="max-h-40 overflow-auto px-3 py-1.5 font-mono text-[0.714rem] leading-relaxed"
            >
              {edit.oldText && (
                <pre className="whitespace-pre-wrap text-danger/80">- {edit.oldText}</pre>
              )}
              {edit.newText && (
                <pre className="whitespace-pre-wrap text-success">+ {edit.newText}</pre>
              )}
            </div>
          ))}
        </>
      )}

      {toolName === "workbench" && (
        <>
          <MetaRow
            items={[
              ...(input?.language ? [["language", input.language] as [string, string]] : []),
              ...(typeof output?.exitCode === "number"
                ? [["exit", String(output.exitCode)] as [string, string]]
                : []),
            ]}
          />
          {input?.code && (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[0.714rem] leading-relaxed text-text-secondary">
              {input.code}
            </pre>
          )}
          {(output?.stdout || output?.stderr) && (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap bg-[#0b0b0d] px-3 py-2 font-mono text-[0.714rem] leading-relaxed text-text-tertiary">
              {[output?.stdout, output?.stderr].filter(Boolean).join("\n")}
            </pre>
          )}
          {output?.files && output.files.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 text-[0.786rem]">
              {output.files.map((file, i) => (
                <a
                  key={i}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-accent hover:underline"
                >
                  {file.name}
                </a>
              ))}
            </div>
          )}
        </>
      )}

      {toolName === "saveImageToProject" && (
        <>
          <MetaRow
            items={[
              ...(output?.filename || input?.filename
                ? [["file", (output?.filename ?? input?.filename)!] as [string, string]]
                : []),
            ]}
          />
          {(output?.url || input?.url) && (
            <div className="px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={output?.url ?? input?.url}
                alt={output?.filename ?? "saved image"}
                className="max-h-44 rounded border border-border bg-[#0b0b0d] object-contain"
              />
            </div>
          )}
        </>
      )}

      {toolName === "generateImage" && (
        <>
          {input?.prompt && (
            <p className="px-3 py-2 text-[0.786rem] leading-relaxed text-text-secondary">
              {input.prompt}
            </p>
          )}
          {output?.url && (
            <div className="px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={output.url}
                alt={output.filename ?? "generated image"}
                className="max-h-52 rounded border border-border bg-[#0b0b0d] object-contain"
              />
            </div>
          )}
        </>
      )}

      {toolName === "compactConversation" && output?.note && (
        <p className="px-3 py-2 text-[0.786rem] leading-relaxed text-text-tertiary">
          {output.note}
        </p>
      )}

      {RESEARCH_TOOLS.has(toolName) && !failed && output && (
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[0.714rem] leading-relaxed text-text-secondary">
          {JSON.stringify(output, null, 2).slice(0, 3000)}
        </pre>
      )}

      {!NATIVE_TOOLS.has(toolName) && <GenericBody part={part} />}
    </div>
  );
}

function computeStatus(
  part: ToolPartLike,
  toolName: string,
  scenes: SceneData[],
  live: boolean,
): ToolStatus {
  if (part.state === "output-error" || part.output?.ok === false) return "failed";
  if (part.state === "output-available") return "done";
  if (live) return "running";
  // No result recorded and nothing is streaming: the call was cut short.
  return inferStaleStatus(toolName, part, scenes);
}

function aggregateStatus(statuses: ToolStatus[]): ToolStatus {
  if (statuses.includes("running")) return "running";
  if (statuses.includes("failed")) return "failed";
  if (statuses.includes("interrupted")) return "interrupted";
  return "done";
}

function partSubject(part: ToolPartLike, scenes: SceneData[]): string {
  return (
    part.input?.scenes?.map((s) => s.name).filter(Boolean).join(", ") ??
    part.input?.name ??
    part.output?.filename ??
    part.input?.filename ??
    part.input?.url ??
    part.input?.query ??
    part.input?.language ??
    (part.input?.sceneId
      ? scenes.find((s) => s.id === part.input!.sceneId)?.name
      : undefined) ??
    part.output?.name ??
    ""
  );
}

export function ToolCard({
  parts,
  scenes,
  live,
}: {
  /** One or more consecutive calls of the SAME tool, shown as one accordion. */
  parts: ToolPartLike[];
  scenes: SceneData[];
  /** True only while this group's message is the one currently streaming. */
  live: boolean;
}) {
  const [open, setOpen] = useState(false);
  const toolName = parts[0]!.type.replace(/^tool-/, "");
  const registered = REGISTERED[toolName];
  const labels =
    registered?.labels ?? TOOL_LABELS[toolName] ?? { active: toolName, done: toolName };
  const ToolIcon = registered?.icon ?? TOOL_ICONS[toolName] ?? DotIcon;

  const statuses = parts.map((p) => computeStatus(p, toolName, scenes, live));
  const status = aggregateStatus(statuses);
  const count = parts.length;

  const subjectOf = (part: ToolPartLike) =>
    registered?.subject?.(part) ?? partSubject(part, scenes);
  const subject =
    count === 1
      ? subjectOf(parts[0]!)
      : parts.map(subjectOf).filter(Boolean).join(", ");

  // Most cards seal shut while they run — there is nothing to see yet. Some
  // are the opposite: createScenes auto-shows its scene list so you can watch
  // the scenes being written in parallel, and a question card is useless
  // unless you can answer it where it stands.
  const isCreateScenes = toolName === "createScenes";
  const liveBody = isCreateScenes || registered?.expandWhileRunning === true;
  const running = status === "running";
  const toggleable = !running || liveBody;
  const showBody = open || (liveBody && running);

  return (
    <div className="w-full min-w-0 max-w-full">
      <button
        type="button"
        onClick={() => toggleable && setOpen((v) => !v)}
        className={cx(
          "group flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-[0.857rem]",
          !toggleable && "cursor-default",
        )}
      >
        <StatusIcon status={status} />
        <ToolIcon className="text-text-tertiary" />
        <span
          className={cx(
            "truncate",
            status === "failed"
              ? "text-warning"
              : status === "interrupted"
                ? "text-text-tertiary"
                : "text-text-secondary",
          )}
        >
          {status === "running" ? labels.active : labels.done}
          {count > 1 && (
            <span className="ml-1.5 inline-flex h-[1.05rem] min-w-[1.05rem] items-center justify-center rounded-full bg-surface-raised px-1 align-middle text-[0.7rem] font-medium text-text-secondary">
              {count}
            </span>
          )}
          {subject && <span className="text-text-tertiary"> · {subject}</span>}
          {status === "failed" && live && !open && (
            <span className="text-text-tertiary"> — retrying</span>
          )}
          {status === "interrupted" && (
            <span className="text-text-tertiary"> — interrupted</span>
          )}
        </span>
        {toggleable && (
          <span className="ml-auto opacity-60 transition-opacity group-hover:opacity-100">
            <Chevron open={open} />
          </span>
        )}
      </button>
      {showBody && (
        <div
          className={cx(
            "mt-1 overflow-hidden rounded-md border",
            status === "failed" ? "border-warning/30" : "border-border",
          )}
        >
          {count === 1 ? (
            registered?.body ? (
              registered.body(parts[0]!)
            ) : (
              <ExpandedBody toolName={toolName} part={parts[0]!} scenes={scenes} live={live} />
            )
          ) : (
            parts.map((p, i) => (
              <div key={i} className={cx(i > 0 && "border-t border-border")}>
                <div className="flex items-center gap-2 bg-surface-raised/40 px-3 py-1.5 text-[0.786rem]">
                  <StatusIcon status={statuses[i]!} />
                  <span className="truncate text-text-secondary">
                    {subjectOf(p) || `#${i + 1}`}
                  </span>
                </div>
                {registered?.body ? (
                  registered.body(p)
                ) : (
                  <ExpandedBody toolName={toolName} part={p} scenes={scenes} live={live} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
