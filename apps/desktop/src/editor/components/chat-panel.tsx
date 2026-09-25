"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Streamdown } from "streamdown";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AudioClipData,
  type SceneData,
  type ChatPlugin,
} from "@genmotion/shared";
import { limitsQueryKey } from "@/components/upgrade-modal";
import { API_URL, api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { useEditorStore, useEditorStoreApi, type MarkupContext } from "@/stores/editor-store";
import { useTabActive } from "../../tabs/active-tab";
import { reportTabBusy } from "../../tabs/tabs-store";
import { projectQueryKey } from "@/hooks/use-project";
import { useProjectAssets, uploadProjectAsset } from "@/hooks/use-assets";
import {
  SceneChips,
  AssetChips,
  AudioClipChips,
  ElementChips,
  MarkupChips,
  PluginChips,
  MessageContextPills,
  type MessageContextData,
} from "./scene-chip";
import { PluginMenu } from "./plugin-menu";
import { useShareFolder } from "../../folder-access";
import { ToolRun, type RunItem, type ToolPartLike } from "./tool-card";
import { AskQuestionPanel, questionsOf } from "./ask-question-panel";
import { VoicePickerPanel } from "./voice-picker";
import { Spinner, cx } from "@/components/ui";

/**
 * A page of transcript.
 *
 * The desktop app reads its transcript out of a JSONL file and pages it,
 * because it is not small — 388KB for fifty messages on a real project, three
 * quarters of that tool payloads. The hosted API still answers with a plain
 * array, which normalises to a single page with nothing before it.
 */
interface ChatPage {
  messages: UIMessage[];
  hasMore: boolean;
  cursor: string | null;
  /**
   * Where the harness's context stood at the end of the last turn, sent with
   * the newest page only. `usage: null` means it has never reported one.
   */
  context?: { usage: ContextUsage | null };
}

const HISTORY_PAGE = 30;

/** How close to the top counts as "show me the older messages". */
const LOAD_OLDER_SLOP = 240;

async function fetchChatPage(projectId: string, before?: string): Promise<ChatPage> {
  const params = new URLSearchParams({ limit: String(HISTORY_PAGE) });
  if (before) params.set("before", before);
  const result = await api<UIMessage[] | ChatPage>(
    `/api/chat/${projectId}?${params.toString()}`,
  );
  return Array.isArray(result)
    ? { messages: result, hasMore: false, cursor: null }
    : result;
}

/**
 * An extra control for the composer's action row, rendered beside the attach
 * button. The hosted app has nothing to put there; the desktop app uses it for
 * the agent-harness picker, which only exists where there is a local harness to
 * pick. Registered rather than passed as a prop because ChatPanel is mounted by
 * the editor page, not by the host.
 */
let ComposerAccessory: ComponentType<{ projectId: string }> | null = null;

export function registerComposerAccessory(
  component: ComponentType<{ projectId: string }> | null,
): void {
  ComposerAccessory = component;
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V6M6 12l6-6 6 6" />
    </svg>
  );
}

function RetryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" />
    </svg>
  );
}

export interface ContextUsage {
  usedTokens: number;
  maxTokens: number;
}

/** "29,938 / 1,000,000 tokens" reads worse than "30k / 1M". */
function compactTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/**
 * Context-capacity ring, left of the send button.
 *
 * It shows ONE number: how full the harness says its context is. It used to
 * fall back to counting messages in our transcript against
 * COMPACTION_MESSAGE_LIMIT, which the hosted API folded at — but the hosted
 * studio is retired, and here the app hands the harness a single message and
 * lets the CLI own the conversation. Our transcript length says nothing about
 * the model's context, so a project with thirty-odd messages showed a full
 * ring for ever, next to a tooltip promising an auto-compaction that was never
 * ours to do. An unknown number now reads as unknown.
 */
function CapacityRing({ usage }: { usage?: ContextUsage | null }) {
  const pct = usage ? Math.min(usage.usedTokens / Math.max(1, usage.maxTokens), 1) : 0;
  const r = 8.5;
  const circ = 2 * Math.PI * r;
  const near = pct >= 0.8;
  const stroke = near ? "var(--color-warning)" : "var(--color-accent)";
  return (
    <div
      className="flex size-8 shrink-0 items-center justify-center"
      title={
        usage
          ? `${compactTokens(usage.usedTokens)} / ${compactTokens(usage.maxTokens)} tokens of context — the agent compacts on its own when it fills`
          : "Context usage is reported by the agent after its next message"
      }
      aria-label={
        usage
          ? `Context ${compactTokens(usage.usedTokens)} of ${compactTokens(usage.maxTokens)} tokens`
          : "Context usage not reported yet"
      }
      role="img"
    >
      <svg viewBox="0 0 24 24" className="size-6 -rotate-90">
        <circle cx="12" cy="12" r={r} fill="none" stroke="var(--color-border)" strokeWidth="2.5" />
        {usage && (
          <circle
            cx="12"
            cy="12"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.3s ease" }}
          />
        )}
      </svg>
    </div>
  );
}

/** Selection context that gets PREPENDED to the user's message (model input). */
function buildContextNote(
  scenes: { id: string; name: string }[],
  assets: { filename: string; url: string; kind: string }[],
  audioClips: { id: string; name: string }[],
  elements: {
    elementId: string | null;
    tag: string;
    text: string;
    sceneName: string;
    timecode: string;
  }[],
  markups: MarkupContext[],
  plugins: ChatPlugin[],
): string | null {
  const lines: string[] = [];
  // First, because it says what to *do* — the rest of the note says what to do
  // it to. A steer rather than a bypass: the agent still runs its own loop, so
  // it can size a script to the scene and place the result on the timeline.
  for (const plugin of plugins) {
    if (plugin.directive) lines.push(plugin.directive);
  }
  if (elements.length > 0) {
    lines.push(
      "Selected element(s) — my request is about these. Find each in its scene's code by id (else by tag + text) and change THAT element:",
    );
    for (const e of elements) {
      const ref = e.elementId
        ? `#${e.elementId}`
        : `<${e.tag}>${e.text ? ` "${e.text}"` : ""}`;
      lines.push(`  • ${ref} — in scene "${e.sceneName}" at ${e.timecode}`);
    }
  }
  // The picture carries the intent; the numbers carry the precision. A model
  // reads "this is too low" off a circle well and "move it to y=340" off one
  // badly, so every mark is quoted in composition pixels, with whatever the
  // preview found underneath it.
  for (const m of markups) {
    lines.push(
      `Marked-up frame — I drew on the preview at ${m.timecode} (scene "${m.sceneName}"). Read the image at ${m.path}; each mark is numbered on it. The frame is ${m.width}×${m.height}; boxes below are in those pixels.`,
    );
    for (const mark of m.marks) {
      const b = mark.box;
      const at = `(${Math.round(b.left)}, ${Math.round(b.top)})–(${Math.round(b.left + b.width)}, ${Math.round(b.top + b.height)})`;
      const under =
        mark.elements.length > 0
          ? ` over ${mark.elements
              .map((e) => (e.elementId ? `#${e.elementId}` : `<${e.tag}>${e.text ? ` "${e.text}"` : ""}`))
              .join(", ")}`
          : "";
      lines.push(`  • Mark ${mark.n}: ${mark.kind === "rect" ? "rectangle" : "freehand stroke"} at ${at}${under}`);
    }
  }
  if (scenes.length > 0) {
    lines.push(
      `Selected scene(s): ${scenes.map((s) => `"${s.name}" [id: ${s.id}]`).join(", ")}`,
    );
  }
  if (assets.length > 0) {
    lines.push(
      `Selected asset(s): ${assets.map((a) => `${a.kind} "${a.filename}" — ${a.url}`).join(", ")}`,
    );
  }
  if (audioClips.length > 0) {
    lines.push(
      `Selected timeline audio clip(s) — my request is about these; update or remove them with updateAudio/removeAudio: ${audioClips
        .map((c) => `"${c.name}" [id: ${c.id}]`)
        .join(", ")}`,
    );
  }
  if (lines.length === 0) return null;
  return `[Context attached to this message]\n${lines.join("\n")}`;
}

// Playful working-status lines rotated while the agent runs tools (in place of
// a static "Thinking…").
const WORKING_PHRASES = [
  "Cooking up frames",
  "Choreographing motion",
  "Sketching the scene",
  "Composing the shot",
  "Wiring the timeline",
  "Animating pixels",
  "Directing the sequence",
  "Tuning the easing",
  "Rendering ideas",
  "Setting the stage",
  "Storyboarding",
  "Making it move",
  "Finding the rhythm",
  "Polishing the motion",
];

function randomPhrase(): string {
  return WORKING_PHRASES[Math.floor(Math.random() * WORKING_PHRASES.length)]!;
}

/** Soft shimmering status word + animated ellipsis. */
function ThinkingIndicator({
  label,
  dots = true,
}: {
  label?: string;
  dots?: boolean;
}) {
  return (
    <div
      className="mt-4 self-start pl-2 text-[0.95rem] font-medium text-text-tertiary"
      role="status"
    >
      <span className="thinking-shimmer thinking-shimmer-soft">
        {label ?? "Thinking"}
      </span>
      {dots && (
        <span className="thinking-dots" aria-hidden="true">
          <i>.</i>
          <i>.</i>
          <i>.</i>
        </span>
      )}
    </div>
  );
}

/**
 * The model's reasoning ("thinking") stream. While it's still streaming it's
 * shown live (auto-expanded, muted); once done it collapses to a toggle so the
 * long thought process doesn't dominate the transcript.
 */
function ReasoningBlock({ text, streaming }: { text: string; streaming: boolean }) {
  const [open, setOpen] = useState(false);
  const show = streaming || open;
  const scrollRef = useRef<HTMLDivElement>(null);
  // The top fade only makes sense once there is scrolled-past content above to
  // dissolve into. Applied unconditionally it eats the first line or two of
  // reasoning that's short enough not to scroll at all.
  const [scrolled, setScrolled] = useState(false);

  // Keep the newest reasoning in view — pin to the bottom as it streams (and
  // when first opened). Batch into a rAF and cancel any pending one so rapid
  // token updates coalesce to a single scroll per frame (no layout thrash).
  useEffect(() => {
    if (!show) {
      setScrolled(false);
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      // Programmatic scrolling fires onScroll too, but set it here as well so
      // content that never overflows resolves to `false` on the first frame.
      setScrolled(el.scrollTop > 0);
    });
    return () => cancelAnimationFrame(id);
  }, [text, show]);

  return (
    <div className="min-w-0 max-w-full self-start">
      <button
        type="button"
        onClick={() => !streaming && setOpen((o) => !o)}
        className={cx(
          "flex items-center gap-1 text-[0.857rem] text-text-tertiary transition-colors",
          !streaming && "hover:text-text-secondary",
        )}
      >
        {streaming ? (
          <span className="thinking-shimmer thinking-shimmer-soft">Thinking</span>
        ) : (
          <>
            <svg
              viewBox="0 0 16 16"
              className={cx("size-3 transition-transform duration-150", open && "rotate-90")}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M6 3.5L10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Thought process
          </>
        )}
      </button>
      {show && (
        <div className="relative mt-1.5 min-w-0 max-w-full">
          {/* Top fade so scrolled-past reasoning dissolves seamlessly — only
              once something is actually scrolled above it. */}
          <div
            ref={scrollRef}
            onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
            className={cx(
              "max-h-64 min-w-0 max-w-full overflow-y-auto overflow-x-hidden border-l-2 border-border pl-3",
              scrolled &&
                "[mask-image:linear-gradient(to_bottom,transparent,#000_2rem)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_2rem)]",
            )}
          >
            {/* While streaming, render cheap plain text — running the growing
                reasoning through the markdown pipeline on every token is what
                made it jittery. Format with Streamdown once it's complete. */}
            {streaming ? (
              <div className="whitespace-pre-wrap text-[0.857rem] leading-relaxed text-text-tertiary [overflow-wrap:anywhere]">
                {text}
              </div>
            ) : (
              <ChatMarkdown muted>{text}</ChatMarkdown>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Whether an assistant message ran the compaction tool to completion. */
function didCompact(message: UIMessage | undefined): boolean {
  if (!message || message.role !== "assistant") return false;
  return message.parts.some(
    (part) =>
      part.type === "tool-compactConversation" &&
      (part as { state?: string }).state === "output-available",
  );
}

// Shared prose styling for chat markdown. Streamdown wraps code blocks and
// tables in its own bordered, padded "card" (rounded-xl border bg-sidebar p-2)
// and adds copy/download buttons — we don't want either here, so `controls` is
// off and the wrappers are flattened. `:has()` targets those wrapper divs; the
// inline-code rule excludes block code (code inside <pre>).
const MD_BASE = cx(
  "min-w-0 max-w-full space-y-2 break-words [overflow-wrap:anywhere]",
  "[&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-surface-raised [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.857rem]",
  "[&_a]:text-accent [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4",
  // Flatten Streamdown's bordered/padded card around code blocks.
  "[&_div:has(pre)]:!m-0 [&_div:has(pre)]:!gap-0 [&_div:has(pre)]:!rounded-none [&_div:has(pre)]:!border-0 [&_div:has(pre)]:!bg-transparent [&_div:has(pre)]:!p-0",
  "[&_pre]:!my-1 [&_pre]:!overflow-x-auto [&_pre]:!rounded-md [&_pre]:!p-3",
  // Same for tables.
  "[&_div:has(table)]:!m-0 [&_div:has(table)]:!gap-0 [&_div:has(table)]:!border-0 [&_div:has(table)]:!bg-transparent [&_div:has(table)]:!p-0",
  "[&_table]:!my-2 [&_th]:border-border [&_td]:border-border",
);

/**
 * Chat markdown (assistant text and reasoning) — Streamdown with the built-in
 * code/table cards flattened and the copy/download controls removed.
 */
function ChatMarkdown({
  children,
  muted,
}: {
  children: string;
  muted?: boolean;
}) {
  return (
    <Streamdown
      controls={false}
      className={cx(
        MD_BASE,
        muted
          ? "text-[0.857rem] leading-relaxed text-text-tertiary [&_strong]:font-medium [&_strong]:text-text-secondary"
          : "text-text-primary [&_strong]:font-semibold",
      )}
    >
      {children}
    </Streamdown>
  );
}

function MessageBubble({
  message,
  scenes,
  live,
  spacing,
}: {
  message: UIMessage;
  scenes: SceneData[];
  live: boolean;
  /** Top-margin class — tighter when grouped with the previous same-role message. */
  spacing?: string;
}) {
  if (message.role === "user") {
    // The marker a retry sends to pick an interrupted turn back up. Not the
    // user's words, so not a bubble: a quiet line saying what happened.
    if ((message.metadata as { continuation?: unknown } | undefined)?.continuation === true) {
      return (
        <p
          data-message-id={message.id}
          className={cx("self-center text-[0.786rem] text-text-tertiary", spacing)}
        >
          Continuing after an interruption
        </p>
      );
    }
    const ctxPart = message.parts.find((p) => p.type === "data-context") as
      | { data?: MessageContextData }
      | undefined;
    // The user's text is the LAST text part; any earlier text part is the
    // prepended context note (shown as pills instead, not raw text).
    const textParts = message.parts.filter(
      (p): p is { type: "text"; text: string } => p.type === "text",
    );
    const userText = textParts[textParts.length - 1]?.text ?? "";
    return (
      <div
        data-message-id={message.id}
        className={cx("ml-8 self-end rounded-2xl rounded-br-md bg-surface-raised px-3 py-2 text-text-primary", spacing)}
      >
        {ctxPart?.data && <MessageContextPills ctx={ctxPart.data} />}
        {userText && <p className="whitespace-pre-wrap">{userText}</p>}
      </div>
    );
  }

  const elements: ReactNode[] = [];
  // Keep only the parts this bubble actually renders — reasoning, non-empty
  // text, and tool calls. Multi-step turns interleave invisible `step-start`
  // parts (and empty text) between tool calls; dropping them first means
  // same-tool calls split only by those still count as consecutive and club.
  const parts = message.parts.filter((p) => {
    // Whatever the turn is parked on lives above the composer, never in the
    // transcript — see `ComposerPanel`. A tool line here would duplicate it.
    if (p.type === "tool-AskUserQuestion") return false;
    if (p.type === "tool-mcp__genmotion__pick_voice") return false;
    if (p.type === "text") return Boolean(p.text.trim());
    if (p.type === "reasoning") return Boolean((p as { text?: string }).text?.trim());
    return p.type.startsWith("tool-") || p.type === "dynamic-tool";
  });
  const isTool = (p: (typeof parts)[number]) => p.type.startsWith("tool-") || p.type === "dynamic-tool";
  for (let i = 0; i < parts.length; ) {
    const part = parts[i]!;
    if (part.type === "text") {
      elements.push(<ChatMarkdown key={i}>{part.text}</ChatMarkdown>);
      i++;
      continue;
    }
    // A run: every tool call and stretch of reasoning up to the next text.
    // Consecutive calls of the SAME tool club into one card; the run as a
    // whole folds what has finished into one line (see `ToolRun`).
    const items: RunItem[] = [];
    let j = i;
    while (j < parts.length && parts[j]!.type !== "text") {
      const p = parts[j]!;
      if (p.type === "reasoning") {
        const isLast = j === parts.length - 1;
        items.push({ kind: "reasoning", text: (p as { text?: string }).text ?? "", streaming: live && isLast });
        j++;
        continue;
      }
      if (isTool(p)) {
        const group: ToolPartLike[] = [];
        while (j < parts.length && parts[j]!.type === p.type) {
          group.push(parts[j] as unknown as ToolPartLike);
          j++;
        }
        items.push({ kind: "tools", parts: group });
        continue;
      }
      j++;
    }
    if (items.length > 0) {
      elements.push(
        <ToolRun
          key={i}
          items={items}
          scenes={scenes}
          live={live}
          renderReasoning={(text, streaming, key) => <ReasoningBlock key={key} text={text} streaming={streaming} />}
        />,
      );
    }
    i = Math.max(j, i + 1);
  }

  // Nothing worth a bubble — a turn whose only part was the question now
  // rendered above the composer — so don't leave its margin behind.
  if (elements.length === 0) return null;

  return (
    <div className={cx("flex w-full min-w-0 max-w-full flex-col gap-1.5 self-start", spacing)}>
      {elements}
    </div>
  );
}

// Only the currently-streaming message changes each token; memoizing keeps the
// rest of the transcript from re-rendering (and re-parsing markdown) on every
// reasoning/text delta, which is what made streaming jittery.
const MemoMessageBubble = memo(MessageBubble);

/** An in-flight composer file upload, rendered as a loading context chip. */
type PendingUpload = {
  id: string;
  name: string;
  kind: string;
  progress: number;
  error?: string;
};

function fileKind(file: File): string {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

function ChatPanelInner({
  projectId,
  scenes,
  audioClips,
  initialMessages,
  initialCursor,
  initialHasMore,
  initialContextUsage,
}: {
  projectId: string;
  scenes: SceneData[];
  audioClips: AudioClipData[];
  initialMessages: UIMessage[];
  /** Oldest id loaded so far — where the next page back starts. */
  initialCursor: string | null;
  initialHasMore: boolean;
  /** Where the harness's context stood after the last turn, if it ever said. */
  initialContextUsage: ContextUsage | null;
}) {
  const [input, setInput] = useState("");
  // Chat plugins attached to the message being written. Composer-local rather
  // than in the editor store: every other kind of context is produced by
  // another panel, but these are picked and consumed here and nowhere else.
  const [plugins, setPlugins] = useState<ChatPlugin[]>([]);
  const queryClient = useQueryClient();
  const { data: assets } = useProjectAssets(projectId);
  const editorStore = useEditorStoreApi();
  // Window-level listeners below only act for the tab in front: every open
  // project's chat is mounted, and a keypress or a file drag reaches all of
  // them.
  const tabActive = useTabActive();
  const selectAsset = useEditorStore((s) => s.selectAsset);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Files being uploaded from a chat-composer drop — shown as loading chips
  // until they resolve into real assets and land as context.
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  // Offered from the `+` as well as from the Folders control beside it.
  const shareFolder = useShareFolder(projectId);
  // `windowDragActive`: a file is being dragged somewhere in the window (cue the
  // composer as a target). `chatDragOver`: it's directly over the composer.
  const [windowDragActive, setWindowDragActive] = useState(false);
  const [chatDragOver, setChatDragOver] = useState(false);
  const selectedSceneIds = useEditorStore((s) => s.selectedSceneIds);
  const selectedAssetIds = useEditorStore((s) => s.selectedAssetIds);
  const selectedAudioClipIds = useEditorStore((s) => s.selectedAudioClipIds);
  const selectedElements = useEditorStore((s) => s.selectedElements);
  const selectedMarkups = useEditorStore((s) => s.selectedMarkups);
  const setAiBusy = useEditorStore((s) => s.setAiBusy);
  const fixRequest = useEditorStore((s) => s.fixRequest);
  const promptRequest = useEditorStore((s) => s.promptRequest);

  // When a selection is made in the studio (scene, asset, or a preview element)
  // and its context chip appears, jump focus to the chat input so the user can
  // start typing right away.
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selectionCount =
    selectedSceneIds.length +
    selectedAssetIds.length +
    selectedAudioClipIds.length +
    selectedElements.length +
    selectedMarkups.length;
  const prevSelectionCount = useRef(selectionCount);
  useEffect(() => {
    if (selectionCount > prevSelectionCount.current) {
      inputRef.current?.focus();
    }
    prevSelectionCount.current = selectionCount;
  }, [selectionCount]);

  // Track file drags across the whole window so the composer lights up as a drop
  // target the moment a drag begins (not only when it's directly over it). A
  // depth counter handles dragenter/dragleave firing on nested elements. Also
  // swallows drops outside a drop zone so the browser doesn't open the file.
  useEffect(() => {
    if (!tabActive) return;
    const hasFiles = (e: DragEvent) =>
      Boolean(e.dataTransfer?.types?.includes("Files"));
    let depth = 0;
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth += 1;
      setWindowDragActive(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setWindowDragActive(false);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
      depth = 0;
      setWindowDragActive(false);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [tabActive]);

  // Upload dropped/attached files, showing a loading chip per file until it
  // resolves into an asset and is auto-added to the chat context.
  function handleFiles(files: FileList | File[] | null) {
    const list = Array.from(files ?? []);
    for (const file of list) {
      const id = crypto.randomUUID();
      setPendingUploads((p) => [
        ...p,
        { id, name: file.name, kind: fileKind(file), progress: 0 },
      ]);
      uploadProjectAsset(projectId, file, (percent) =>
        setPendingUploads((p) =>
          p.map((u) => (u.id === id ? { ...u, progress: percent } : u)),
        ),
      )
        .then((asset) => {
          setPendingUploads((p) => p.filter((u) => u.id !== id));
          queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
          selectAsset(asset.id, true); // land as a context chip
        })
        .catch((err) => {
          setPendingUploads((p) =>
            p.map((u) =>
              u.id === id
                ? { ...u, error: err instanceof Error ? err.message : "Upload failed" }
                : u,
            ),
          );
          // Clear the failed chip after a moment.
          setTimeout(
            () => setPendingUploads((p) => p.filter((u) => u.id !== id)),
            4000,
          );
        });
    }
  }

  /**
   * Paste an image or a video straight into the chat.
   *
   * A screenshot lives on the clipboard as a file with no name — `image.png`
   * for every one of them — so they are stamped with the time. Without that,
   * pasting three screenshots produces three assets called `image.png`, and
   * `uniqueAssetPath` silently turns them into image-1, image-2, image-3,
   * which is unreadable in the assets panel a day later.
   *
   * Only files are intercepted. A paste carrying text is left entirely alone,
   * so pasting a prompt still just types it.
   */
  function handlePaste(event: React.ClipboardEvent) {
    const items = Array.from(event.clipboardData?.items ?? []);
    const files = items
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => {
        if (!file) return false;
        return file.type.startsWith("image/") || file.type.startsWith("video/");
      })
      .map((file) => {
        if (file.name && file.name !== "image.png") return file;
        const stamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .slice(0, 19);
        const ext = file.type.split("/")[1]?.split("+")[0] ?? "png";
        return new File([file], `pasted-${stamp}.${ext}`, { type: file.type });
      });

    if (files.length === 0) return;
    // Only now: a paste we are not handling must keep its default behaviour.
    event.preventDefault();
    handleFiles(files);
  }

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: `${API_URL}/api/chat/${projectId}`,
        credentials: "include",
      }),
  );

  const { messages, sendMessage, status, error, setMessages, regenerate, stop } = useChat({
    id: projectId,
    transport,
    messages: initialMessages,
    // Coalesce token updates so React commits ~every 60ms instead of on every
    // delta — keeps streaming from saturating the main thread and starving the
    // player's animation frames.
    experimental_throttle: 60,
    onData: (dataPart) => {
      if (
        dataPart.type === "data-project-renamed" ||
        dataPart.type === "data-scenes-updated"
      ) {
        queryClient.invalidateQueries({ queryKey: projectQueryKey(projectId) });
        // The assets panel is a separate query over the assets/ directory, and
        // nothing else invalidates it for an agent-written file — so a
        // generated voiceover or image would sit on disk, in the timeline, and
        // still be missing from the picker until something unrelated refreshed.
        queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
      }
      // Live progress from a long-running tool (e.g. each parallel scene).
      if (dataPart.type === "data-context-usage") {
        const data = (dataPart as { data?: ContextUsage }).data;
        if (data && typeof data.usedTokens === "number") setContextUsage(data);
      }
      if (dataPart.type === "data-status") {
        const text = (dataPart as { data?: { text?: string } }).data?.text;
        if (text) setLiveStatus(text);
      }
      // Backend auto-compacted this turn — clear old bubbles once it settles.
      if (dataPart.type === "data-compacted") {
        pendingCompactionClear.current = true;
      }
    },
    onError: () => {
      // Nothing to do here: `error` from useChat is rendered under the thread.
      // This chat runs against the loopback server and the user's own agent,
      // so it is never paywalled — the plugin 402s surface inside the agent's
      // tool results, not as a failed turn.
    },
    onFinish: () => {
      // A turn was consumed — refresh the count that gates the composer.
      queryClient.invalidateQueries({ queryKey: limitsQueryKey });
    },
  });
  // Set when a turn compacts (tool or auto); consumed on the busy falling edge.
  const pendingCompactionClear = useRef(false);
  // Latest live progress line streamed from a long-running tool this turn.
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  // Only the desktop harness reports this; the hosted API never sends it, so
  // the ring falls back to counting messages there.
  // Seeded from the stored end-of-last-turn reading, so the ring is right on
  // open rather than a turn later.
  const [contextUsage, setContextUsage] = useState<ContextUsage | null>(
    initialContextUsage ?? null,
  );
  // Messages typed while a turn is streaming — sent one at a time as the stream
  // frees up. Each carries a `send` closure snapshotting its context.
  const [queue, setQueue] = useState<
    { id: string; text: string; send: () => void }[]
  >([]);

  const busy = status === "submitted" || status === "streaming";

  /**
   * The call the turn is parked on, if any — a question or the voice picker.
   *
   * `input-available` with no output is a call waiting on an answer — but only
   * while this window's turn is actually streaming: a restored transcript can
   * hold a part that was never answered, and there is no harness left behind it
   * to hear one. Dismissed ids are remembered so a skipped prompt does not come
   * back on the next render. Only one can be parked at a time, because the
   * harness itself is blocked while it waits.
   */
  const [dismissedPrompts, setDismissedPrompts] = useState<string[]>([]);
  const pendingPrompt = (() => {
    if (!busy) return null;
    const last = messages[messages.length - 1];
    if (last?.role !== "assistant") return null;
    for (let i = last.parts.length - 1; i >= 0; i--) {
      const part = last.parts[i]!;
      const isQuestion = part.type === "tool-AskUserQuestion";
      const isVoice = part.type === "tool-mcp__genmotion__pick_voice";
      if (!isQuestion && !isVoice) continue;
      if ((part as { state?: string }).state !== "input-available") return null;
      const id = (part as { toolCallId?: string }).toolCallId;
      if (!id || dismissedPrompts.includes(id)) return null;
      const input = (part as { input?: { question?: string } }).input;
      if (isVoice) {
        return {
          kind: "voice" as const,
          id,
          question: input?.question || "Which voice should narrate this video?",
        };
      }
      const questions = questionsOf(input);
      return questions.length > 0 ? { kind: "question" as const, id, questions } : null;
    }
    return null;
  })();
  const dismissPrompt = (id: string) =>
    setDismissedPrompts((ids) => [...ids.slice(-19), id]);

  // Flush the next queued message on the falling edge of `busy` (a turn just
  // finished). One per transition, so each queued message runs in its own turn.
  const prevBusyForQueue = useRef(busy);
  useEffect(() => {
    const wasBusy = prevBusyForQueue.current;
    prevBusyForQueue.current = busy;
    if (wasBusy && !busy && queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      next!.send();
    }
  }, [busy, queue]);

  // Waiting states. Before the assistant produces anything (last message is
  // still the user's) → shimmering "Thinking…". Once it's running tools but
  // hasn't started its text yet → the orbit loader. Hidden once text streams.
  const lastMessage = messages[messages.length - 1];
  const lastPart = lastMessage?.parts[lastMessage.parts.length - 1];
  // Either streamed text or streamed reasoning counts as visible activity, so
  // the orbit/"Thinking" loader gives way to the real content.
  const streamingText =
    lastMessage?.role === "assistant" &&
    (lastPart?.type === "text" || lastPart?.type === "reasoning") &&
    Boolean((lastPart as { text?: string }).text?.trim());
  const waitingToStart = busy && lastMessage?.role === "user";
  const showOrbit = busy && !waitingToStart && !streamingText;
  const showIndicator = waitingToStart || showOrbit;
  // A trailing user message with nothing running means the assistant turn never
  // landed (failed/interrupted) — offer to retry it.
  const canRetry = !busy && lastMessage?.role === "user";
  // An errored turn that had already produced something is continued, not
  // redone: the bubble stays and the agent picks up from where it stopped.
  const canContinue =
    !busy &&
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some(
      (p) => p.type.startsWith("tool-") || p.type === "dynamic-tool" || (p.type === "text" && p.text.trim()),
    );

  /**
   * `regenerate()` drops the trailing assistant message from `messages` the
   * moment it's called — right when nothing was produced, since the point is
   * to replace it. But when that message is what an interrupted turn already
   * streamed in, dropping it is dropping real, already-produced work (tool
   * calls included), and re-sending the same request asks the agent to do it
   * all again. So that case sends a continuation instead: a marker message
   * the server turns into "carry on from here" against the resumed session.
   * It's saved to disk first — `chat.jsonl` only gets a turn once it reaches
   * its own end, and `error` is precisely the case where it may not have —
   * and awaited, so it lands in the transcript ahead of the continuation.
   */
  async function handleRetry() {
    if (!canContinue) {
      regenerate();
      return;
    }
    await api(`/api/chat/${projectId}/save-partial`, { json: { message: lastMessage } }).catch(
      () => {
        // Best-effort — continuing is still the right next step either way.
      },
    );
    void sendMessage({ text: "Continue", metadata: { continuation: true } });
  }

  // Rotate a randomized working phrase while the loader is up (unless a concrete
  // live status like scene-writing progress is streaming).
  const [workingPhrase, setWorkingPhrase] = useState(WORKING_PHRASES[0]!);
  useEffect(() => {
    if (!showIndicator || liveStatus) return;
    setWorkingPhrase(randomPhrase());
    const id = setInterval(() => setWorkingPhrase(randomPhrase()), 2600);
    return () => clearInterval(id);
  }, [showIndicator, liveStatus]);

  useEffect(() => {
    setAiBusy(busy);
    // The tab strip shows a spinner while this runs and a mark once it ends
    // in a tab that is not in front.
    reportTabBusy(projectId, busy);
    if (!busy) {
      // Final settle: make sure the editor reflects every tool mutation.
      queryClient.invalidateQueries({ queryKey: projectQueryKey(projectId) });
      setLiveStatus(null);
    }
  }, [busy, setAiBusy, queryClient, projectId]);

  // When a turn compacts the conversation, drop the pre-compaction bubbles once
  // it settles — keep only from the last user message (the new task) onward, to
  // match the server, which now loads/sends only the post-compaction window.
  // Fire only on the falling edge of `busy` (a live turn just finished) so a
  // compaction already present in loaded history never re-triggers.
  const prevBusy = useRef(busy);
  const lastCompactedId = useRef<string | null>(null);
  useEffect(() => {
    const wasBusy = prevBusy.current;
    prevBusy.current = busy;
    if (!wasBusy || busy) return; // only when busy goes true → false
    const last = messages[messages.length - 1];
    if (!last) return;
    // Compacted this turn via the agent tool or the backend auto-trigger.
    const compacted = didCompact(last) || pendingCompactionClear.current;
    pendingCompactionClear.current = false;
    if (!compacted || lastCompactedId.current === last.id) return;
    lastCompactedId.current = last.id;
    const lastUserIdx = messages.map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx > 0) setMessages(messages.slice(lastUserIdx));
  }, [messages, busy, setMessages]);

  // Escape clears everything attached to the message being written (scenes,
  // assets, elements, plugins) — unless a modal is open, where Escape should
  // close that instead.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!tabActive || e.key !== "Escape") return;
      if (document.querySelector('[role="dialog"]')) return;
      const s = editorStore.getState();
      if (
        s.selectedSceneIds.length ||
        s.selectedAssetIds.length ||
        s.selectedAudioClipIds.length ||
        s.selectedElements.length ||
        s.selectedMarkups.length
      ) {
        s.clearSelection();
        s.clearAssetSelection();
        s.clearAudioClipSelection();
        s.clearElements();
        s.clearMarkups();
      }
      setPlugins([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editorStore, tabActive]);

  // Live updates mid-stream: whenever a new tool result lands, refetch scenes.
  const toolOutputCount = useRef(0);
  useEffect(() => {
    let count = 0;
    for (const message of messages) {
      for (const part of message.parts) {
        const state = (part as { state?: string }).state;
        if (state === "output-available") count++;
      }
    }
    if (count > toolOutputCount.current) {
      toolOutputCount.current = count;
      queryClient.invalidateQueries({ queryKey: projectQueryKey(projectId) });
    }
  }, [messages, queryClient, projectId]);

  // Shimmer scenes the AI is actively editing: scene-targeting tool calls in the
  // live turn that carry a sceneId but haven't produced output yet.
  useEffect(() => {
    const setEditing = editorStore.getState().setEditingSceneIds;
    if (!busy) {
      setEditing([]);
      return;
    }
    const EDIT_TOOLS = new Set([
      "tool-updateScene",
      "tool-editScene",
      "tool-updateSceneDuration",
    ]);
    const editing = new Set<string>();
    const last = messages[messages.length - 1];
    if (last?.role === "assistant") {
      for (const part of last.parts) {
        if (!EDIT_TOOLS.has(part.type)) continue;
        const state = (part as { state?: string }).state;
        if (state === "output-available" || state === "output-error") continue;
        const sceneId = (part as { input?: { sceneId?: string } }).input?.sceneId;
        if (sceneId) editing.add(sceneId);
      }
    }
    setEditing([...editing]);
  }, [messages, busy, editorStore]);

  // Auto-send the prompt the user typed on the home page (new-project flow).
  //
  // Files attached there were already uploaded into the project by the
  // shell, which left their asset ids beside the prompt. Those become context
  // chips on this first message the same way a drop into the chat would —
  // which means waiting for the asset list, selecting them, and only then
  // sending through the ordinary path so the note and the pills both carry
  // them. A prompt with nothing attached goes at once.
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  useEffect(() => {
    const key = `gm-initial-prompt-${projectId}`;
    const prompt = sessionStorage.getItem(key);
    if (!prompt || messages.length !== 0) return;
    const assetKey = `gm-initial-assets-${projectId}`;
    let wanted: string[] = [];
    try {
      wanted = JSON.parse(sessionStorage.getItem(assetKey) ?? "[]") as string[];
    } catch {
      wanted = [];
    }
    if (wanted.length === 0) {
      sessionStorage.removeItem(key);
      sendMessage({ text: prompt }, { body: { selectedSceneIds: [] } });
      return;
    }
    if (!assets) return; // the list is still loading; this effect re-runs when it lands
    sessionStorage.removeItem(key);
    sessionStorage.removeItem(assetKey);
    for (const id of wanted) {
      if (assets.some((a) => a.id === id)) selectAsset(id, true);
    }
    setInitialPrompt(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, assets]);

  // The selection above lands on the next render; send once it has.
  useEffect(() => {
    if (initialPrompt === null) return;
    setInitialPrompt(null);
    submit(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, selectedAssetIds]);

  // Consume "Fix with AI" requests issued from the preview/timeline.
  useEffect(() => {
    if (!fixRequest || busy) return;
    const request = editorStore.getState().consumeFixRequest();
    if (request) {
      sendMessage(
        { text: request.message },
        { body: { selectedSceneIds: [request.sceneId] } },
      );
    }
  }, [fixRequest, busy, sendMessage, editorStore]);

  // How close to the bottom counts as "following along".
  const STICK_SLOP = 80;

  // Pin to bottom as messages stream in — but only while the user is already at
  // the bottom, and batched into a rAF so a burst of tokens coalesces to one
  // scroll per frame instead of a synchronous reflow on every token.
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const scrollRaf = useRef<number | null>(null);

  // ── Older messages, fetched as they are scrolled to ──────────────────────
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadingOlderRef = useRef(false);
  /**
   * Distance from the bottom, captured before a prepend.
   *
   * Anchoring on that rather than on `scrollTop` is what keeps the view still:
   * inserting content above changes `scrollHeight`, so a restored `scrollTop`
   * would jump by exactly the height of whatever just arrived.
   */
  const anchorFromBottom = useRef<number | null>(null);

  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasMore || !cursor) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    const el = scrollRef.current;
    try {
      const page = await fetchChatPage(projectId, cursor);
      if (page.messages.length === 0) {
        setHasMore(false);
        return;
      }
      if (el) anchorFromBottom.current = el.scrollHeight - el.scrollTop;
      setMessages((prev) => [...page.messages, ...prev]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch {
      // Leave `hasMore` alone: a failed fetch is worth retrying on the next
      // scroll, unlike an exhausted history.
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [cursor, hasMore, projectId, setMessages]);

  // Before paint, so the restored position is never rendered as a jump.
  useLayoutEffect(() => {
    const anchor = anchorFromBottom.current;
    if (anchor == null) return;
    anchorFromBottom.current = null;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight - anchor;
  }, [messages]);

  const handleMessagesScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_SLOP;
    if (el.scrollTop < LOAD_OLDER_SLOP) void loadOlder();
  };

  /**
   * The composer floats over the list, so the list ends with padding the
   * composer's height — measured, because the composer grows: context
   * pills, queued messages, an error, the model hint. A fixed padding was
   * 140px against a composer that starts at 155px and goes up from there,
   * and the newest messages sat under it.
   */
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerHeight, setComposerHeight] = useState(160);
  useLayoutEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    // Border box, not `contentRect`: the overlay's own padding is part of
    // what covers the list.
    const observer = new ResizeObserver(() => setComposerHeight(Math.ceil(el.offsetHeight)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!stickToBottom.current) return;
    if (scrollRaf.current != null) cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = null;
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
    return () => {
      if (scrollRaf.current != null) {
        cancelAnimationFrame(scrollRaf.current);
        scrollRaf.current = null;
      }
    };
    // A taller composer pushes the end of the list up; stay pinned to it.
  }, [messages, composerHeight]);

  // Sending always follows the bottom, whatever the user had scrolled to: the
  // message they just wrote, and the reply arriving under it, are what they
  // want to see. (An earlier design lifted the question to the top of the
  // panel instead; the spacer that needed left a panel of empty scroll under
  // every turn, which read as a bug more than a feature.)
  const lastUserId = useRef<string | null>(null);
  useEffect(() => {
    const last = [...messages].reverse().find((m) => m.role === "user");
    if (!last) return;
    const first = lastUserId.current === null;
    if (last.id === lastUserId.current) return;
    lastUserId.current = last.id;
    // On mount the transcript is restored whole; the pin below handles it.
    if (first) return;
    stickToBottom.current = true;
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Build the exact (message, options) args for sendMessage from the current
  // input + attached context. Returned as a closure so a queued message replays
  // precisely what would have been sent at the moment it was typed.
  function buildSendPayload(text: string): () => void {
    const selScenes = scenes.filter((s) => selectedSceneIds.includes(s.id));
    const selAssets = (assets ?? []).filter((a) =>
      selectedAssetIds.includes(a.id),
    );
    const selClips = audioClips.filter((c) =>
      selectedAudioClipIds.includes(c.id),
    );

    // Snapshot the attached context so it persists with (and renders inside) the message.
    const ctx: MessageContextData = {
      scenes: selScenes.map((s) => ({ name: s.name })),
      assets: selAssets.map((a) => ({ filename: a.filename })),
      audioClips: selClips.map((c) => ({ name: c.name, track: c.track })),
      elements: selectedElements.map((e) => ({
        label: e.label,
        sceneName: e.sceneName,
        timecode: e.timecode,
      })),
      markups: selectedMarkups.map((m) => ({
        label: m.label,
        sceneName: m.sceneName,
        timecode: m.timecode,
      })),
      plugins: plugins.map((p) => ({ id: p.id, label: p.label, ...(p.iconUrl ? { iconUrl: p.iconUrl } : {}) })),
    };
    // The note prepended to the message (model input); pills (above) are display.
    const note = buildContextNote(
      selScenes.map((s) => ({ id: s.id, name: s.name })),
      selAssets.map((a) => ({ filename: a.filename, url: a.url, kind: a.kind })),
      selClips.map((c) => ({ id: c.id, name: c.name })),
      selectedElements.map((e) => ({
        elementId: e.elementId,
        tag: e.tag,
        text: e.text,
        sceneName: e.sceneName,
        timecode: e.timecode,
      })),
      selectedMarkups,
      plugins,
    );

    const snapshotSceneIds = [...selectedSceneIds];
    const snapshotAssetIds = [...selectedAssetIds];
    const snapshotAudioClipIds = [...selectedAudioClipIds];
    const snapshotElements = selectedElements.map(
      ({ tag, text: elText, elementId, sceneId, sceneName, timecode }) => ({
        tag,
        text: elText,
        elementId,
        sceneId,
        sceneName,
        timecode,
      }),
    );

    return () =>
      sendMessage(
        {
          role: "user",
          parts: [
            // Prepend the context so the agent reads it before the request.
            ...(note ? [{ type: "text" as const, text: note }] : []),
            { type: "text", text },
            ...(note ? [{ type: "data-context" as const, data: ctx }] : []),
          ],
        },
        {
          body: {
            selectedSceneIds: snapshotSceneIds,
            selectedAssetIds: snapshotAssetIds,
            selectedAudioClipIds: snapshotAudioClipIds,
            selectedElements: snapshotElements,
          },
        },
      );
  }

  /** Send `override` (the preview's comment bubble) or the composer's contents. */
  function submit(override?: string) {
    const text = (override ?? input).trim();
    if (!text) return;

    if (override === undefined) setInput("");

    track("chat_message_sent", {
      length: text.length,
      hasSelection: editorStore.getState().selectedSceneIds.length > 0,
      // Which plugins and connected servers the message was pointed at —
      // the "is the marketplace used" half of the marketplace's question.
      plugins: plugins.filter((p) => p.kind !== "mcp").map((p) => p.id),
      mcpServers: plugins.filter((p) => p.kind === "mcp").map((p) => p.id.replace(/^mcp:/, "")),
    });

    const send = buildSendPayload(text);

    // Context is consumed by this message (queued or sent) — clear the pills.
    const store = editorStore.getState();
    store.clearSelection();
    store.clearAssetSelection();
    store.clearAudioClipSelection();
    store.clearElements();
    store.clearMarkups();
    setPlugins([]);

    if (busy) {
      // A turn is in flight — queue this message and flush it when the stream
      // frees up (see the falling-edge effect above).
      setQueue((q) => [...q, { id: crypto.randomUUID(), text, send }]);
    } else {
      send();
    }
  }

  // Messages typed straight into the preview (the element comment bubble). The
  // bubble attaches its element context first, so this send picks it up like any
  // composer message — queueing behind a live turn included.
  useEffect(() => {
    if (!promptRequest) return;
    const text = editorStore.getState().consumePrompt();
    if (text) submit(text);
    // `submit` is rebuilt each render; the effect always runs the current one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptRequest]);

  return (
    <aside className="relative flex min-h-0 flex-1 flex-col bg-background">
      {/* Fade messages into the background as they scroll under the top edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-background to-transparent" />

      <div
        ref={scrollRef}
        onScroll={handleMessagesScroll}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-text-tertiary">
            <p className="font-display text-xl text-text-secondary">
              What are we making?
            </p>
            <p className="max-w-[260px] text-[0.857rem]">
              Describe your video — the AI writes the scenes, you watch them
              appear on the timeline.
            </p>
          </div>
        ) : (
          <div
            className="flex min-w-0 max-w-full flex-col px-4 pt-4"
            style={{ paddingBottom: composerHeight + 16 }}
          >
            {/* Scrolling here is what loads the next page; the button is for
                keyboards and for a trackpad that never quite reaches the top. */}
            {hasMore && (
              <div className="flex justify-center pb-3">
                {loadingOlder ? (
                  <Spinner className="size-4 text-text-tertiary" />
                ) : (
                  <button
                    type="button"
                    onClick={() => void loadOlder()}
                    className="rounded-full border border-border px-3 py-1 text-[0.786rem] text-text-tertiary transition-colors hover:border-border-strong hover:text-text-secondary"
                  >
                    Load earlier messages
                  </button>
                )}
              </div>
            )}
            {messages.map((message, index) => {
              const grouped = messages[index - 1]?.role === message.role;
              return (
                <MemoMessageBubble
                  key={message.id}
                  message={message}
                  scenes={scenes}
                  live={busy && index === messages.length - 1}
                  spacing={index === 0 ? "" : grouped ? "mt-1.5" : "mt-4"}
                />
              );
            })}
            {showIndicator &&
              (liveStatus ? (
                <ThinkingIndicator label={liveStatus} dots={false} />
              ) : (
                <ThinkingIndicator label={workingPhrase} />
              ))}
            {error && (
              <div className="mt-4 flex items-center gap-2.5 rounded-md border border-danger/30 bg-danger/10 px-3 py-2.5">
                <svg
                  viewBox="0 0 24 24"
                  className="size-4 shrink-0 text-danger"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4.5M12 16h.01" />
                </svg>
                <p className="min-w-0 flex-1 text-[0.857rem] text-danger">
                  {error.message || "Something went wrong. Try again."}
                </p>
                <button
                  type="button"
                  onClick={() => void handleRetry()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-danger/40 px-2.5 py-1 text-[0.786rem] font-medium text-danger transition-colors hover:bg-danger/15"
                >
                  <RetryIcon className="size-3.5" />
                  {canContinue ? "Continue" : "Retry"}
                </button>
              </div>
            )}
            {!error && canRetry && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleRetry()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[0.786rem] text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
                >
                  <RetryIcon className="size-3.5" />
                  Retry
                </button>
              </div>
            )}
            {/* Scroll room for the focused message; see the tail-spacer note. */}
          </div>
        )}
      </div>

      <div
        ref={composerRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background from-60% to-transparent px-3 pb-3 pt-12"
      >
        <div className="pointer-events-auto">
        {queue.length > 0 && (
          <div className="mb-2 flex flex-col gap-1.5">
            {queue.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2 text-[0.857rem] text-text-secondary"
              >
                <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-text-tertiary" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="5.5" />
                  <path d="M8 5v3l2 1.3" />
                </svg>
                <span className="min-w-0 flex-1 truncate">{q.text}</span>
                <span className="shrink-0 text-[0.714rem] text-text-tertiary">Queued</span>
                <button
                  type="button"
                  aria-label="Discard queued message"
                  onClick={() => setQueue((qs) => qs.filter((x) => x.id !== q.id))}
                  className="flex size-5 shrink-0 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <SceneChips scenes={scenes} />
        <AssetChips assets={assets ?? []} />
        {pendingUploads.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1 pb-2">
            {pendingUploads.map((u) => (
              <span
                key={u.id}
                title={u.error ?? `Uploading ${u.name}`}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-2 pr-2.5 text-[0.857rem] backdrop-blur-md",
                  u.error
                    ? "border-danger/40 bg-danger/10 text-danger"
                    : "border-accent/40 bg-accent-muted text-accent",
                )}
              >
                {u.error ? "⚠" : <Spinner className="size-3" />}
                <span className="max-w-[140px] truncate">{u.name}</span>
                {!u.error && (
                  <span className="tabular-nums text-accent/70">{u.progress}%</span>
                )}
              </span>
            ))}
          </div>
        )}
        <AudioClipChips clips={audioClips} />
        <ElementChips />
        <MarkupChips />
        {pendingPrompt?.kind === "question" && (
          <AskQuestionPanel
            key={pendingPrompt.id}
            toolCallId={pendingPrompt.id}
            questions={pendingPrompt.questions}
            onDone={() => dismissPrompt(pendingPrompt.id)}
          />
        )}
        {pendingPrompt?.kind === "voice" && (
          <VoicePickerPanel
            key={pendingPrompt.id}
            toolCallId={pendingPrompt.id}
            question={pendingPrompt.question}
            onDone={() => dismissPrompt(pendingPrompt.id)}
          />
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          onPaste={handlePaste}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setChatDragOver(true);
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setChatDragOver(false);
            }
          }}
          onDrop={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setChatDragOver(false);
              handleFiles(e.dataTransfer.files);
            }
          }}
          className={cx(
            "rounded-2xl border bg-surface px-3 py-2.5 transition-colors",
            // The question panel sits directly on top of the box; square off
            // the seam so the two read as one surface.
            pendingPrompt && "rounded-t-none",
            chatDragOver
              ? "border-accent bg-accent-muted/40 ring-2 ring-accent/30"
              : windowDragActive
                ? "border-accent/60 bg-accent-muted/15"
                : "border-[#1f1f24] focus-within:border-[#2a2a31]",
          )}
        >
          {/* Inside the border, unlike the selection pills above the form: a
              plugin is part of the message being written, not context picked
              from another panel. */}
          <PluginChips
            plugins={plugins}
            onRemove={(id) => {
              setPlugins((list) => list.filter((p) => p.id !== id));
              inputRef.current?.focus();
            }}
          />
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
              // Backspace against an empty box drops the last chip, the way it
              // would if the chip were a character in the input.
              if (
                e.key === "Backspace" &&
                !input &&
                plugins.length > 0 &&
                e.currentTarget.selectionStart === 0
              ) {
                e.preventDefault();
                setPlugins((list) => list.slice(0, -1));
              }
            }}
            placeholder={
              plugins.at(-1)?.placeholder ||
              (scenes.length === 0
                ? "Describe the video you want to make…"
                : "Ask for changes or new scenes…")
            }
            rows={2}
            className="w-full resize-none bg-transparent px-1 py-0.5 text-base text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <div className="flex items-center justify-between gap-2 pt-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <PluginMenu
              disabledIds={plugins.map((p) => p.id)}
              onPick={(plugin) => {
                setPlugins((list) =>
                  list.some((p) => p.id === plugin.id) ? list : [...list, plugin],
                );
                inputRef.current?.focus();
              }}
              onAttachFile={() => fileInputRef.current?.click()}
              // Same request the Folders control beside it makes, so a folder
              // added here appears there without a refetch.
              onShareFolder={() => shareFolder.mutate()}
              sharingFolder={shareFolder.isPending}
            />
            {ComposerAccessory && <ComposerAccessory projectId={projectId} />}
            <span className="min-w-0 flex-1 truncate text-center text-[0.786rem] text-text-tertiary">
              {selectedSceneIds.length > 0
                ? `${selectedSceneIds.length} scene${selectedSceneIds.length > 1 ? "s" : ""} in context`
                : busy
                  ? "⏎ to queue"
                  : "⏎ to send"}
            </span>
            {messages.length > 0 && (
              <CapacityRing usage={contextUsage} />
            )}
            {/*
              Three states in one slot. Idle: send. Busy with something typed:
              queue it for the next turn — the button used to say so and still
              does. Busy with an empty box: stop, which is where a plain
              spinner used to sit doing nothing.
            */}
            {busy && !input.trim() ? (
              <button
                type="button"
                aria-label="Stop generating"
                title="Stop generating"
                onClick={() => stop()}
                className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-cta text-background outline-none transition-all hover:bg-cta-hover focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {/* The ring turns around the icon rather than replacing it, so
                    the control reads as "working, and you may stop it" instead
                    of flipping between two different buttons mid-turn. */}
                <svg
                  className="absolute inset-0 size-full animate-spin"
                  viewBox="0 0 32 32"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="opacity-25"
                  />
                  <path
                    d="M16 2a14 14 0 0 1 14 14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="size-2.5 rounded-[2px] bg-background" />
              </button>
            ) : (
              <button
                type="submit"
                aria-label={busy ? "Queue message" : "Send"}
                disabled={!input.trim()}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cta text-background outline-none transition-all hover:bg-cta-hover focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUpIcon className="size-[1.05rem]" />
              </button>
            )}
          </div>
        </form>
        </div>
      </div>
    </aside>
  );
}

export function ChatPanel({
  projectId,
  scenes,
  audioClips,
}: {
  projectId: string;
  scenes: SceneData[];
  audioClips: AudioClipData[];
}) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["chat", projectId],
    // The newest page only. Older messages arrive when the user scrolls to
    // them, so opening a project costs the same whether its history is two
    // messages or two thousand.
    queryFn: () => fetchChatPage(projectId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <aside className="flex min-h-0 flex-1 items-center justify-center bg-background">
        <Spinner />
      </aside>
    );
  }

  return (
    <ChatPanelInner
      projectId={projectId}
      scenes={scenes}
      audioClips={audioClips}
      initialMessages={history?.messages ?? []}
      initialCursor={history?.cursor ?? null}
      initialHasMore={history?.hasMore ?? false}
      initialContextUsage={history?.context?.usage ?? null}
    />
  );
}
