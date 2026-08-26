"use client";

import {
  memo,
  useEffect,
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
  COMPACTION_MESSAGE_LIMIT,
  parseLimitFromText,
} from "@genmotion/shared";
import { limitsQueryKey, useUpgrade } from "@/components/upgrade-modal";
import { API_URL, api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { useEditorStore } from "@/stores/editor-store";
import { projectQueryKey } from "@/hooks/use-project";
import { useProjectAssets, uploadProjectAsset } from "@/hooks/use-assets";
import {
  SceneChips,
  AssetChips,
  AudioClipChips,
  ElementChips,
  MessageContextPills,
  type MessageContextData,
} from "./scene-chip";
import { ToolCard, type ToolPartLike } from "./tool-card";
import { Spinner, cx } from "@/components/ui";

/**
 * An extra control for the composer's action row, rendered beside the attach
 * button. The hosted app has nothing to put there; the desktop app uses it for
 * the agent-harness picker, which only exists where there is a local harness to
 * pick. Registered rather than passed as a prop because ChatPanel is mounted by
 * the editor page, not by the host.
 */
let ComposerAccessory: ComponentType | null = null;

export function registerComposerAccessory(component: ComponentType | null): void {
  ComposerAccessory = component;
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
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

/**
 * Context-capacity ring left of the send button: fills as the live window
 * approaches COMPACTION_MESSAGE_LIMIT. When full, the next message auto-compacts
 * the earlier history (then it resets). Turns amber as it nears the limit.
 */
function CapacityRing({ count }: { count: number }) {
  const limit = COMPACTION_MESSAGE_LIMIT;
  const pct = Math.min(count / limit, 1);
  const r = 8.5;
  const circ = 2 * Math.PI * r;
  const near = pct >= 0.8;
  const stroke = near ? "var(--color-warning)" : "var(--color-accent)";
  return (
    <div
      className="flex size-8 shrink-0 items-center justify-center"
      title={`${count} / ${limit} messages in context — auto-compacts when full`}
      aria-label={`Context capacity ${count} of ${limit} messages`}
      role="img"
    >
      <svg viewBox="0 0 24 24" className="size-6 -rotate-90">
        <circle cx="12" cy="12" r={r} fill="none" stroke="var(--color-border)" strokeWidth="2.5" />
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
): string | null {
  const lines: string[] = [];
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
    if (p.type === "text") return Boolean(p.text.trim());
    if (p.type === "reasoning") return Boolean((p as { text?: string }).text?.trim());
    return p.type.startsWith("tool-") || p.type === "dynamic-tool";
  });
  for (let i = 0; i < parts.length; ) {
    const part = parts[i]!;
    if (part.type === "reasoning") {
      const isLast = i === parts.length - 1;
      elements.push(
        <ReasoningBlock
          key={i}
          text={(part as { text?: string }).text ?? ""}
          streaming={live && isLast}
        />,
      );
      i++;
      continue;
    }
    if (part.type === "text") {
      elements.push(<ChatMarkdown key={i}>{part.text}</ChatMarkdown>);
      i++;
      continue;
    }
    if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
      // Collapse consecutive calls of the SAME tool into one accordion.
      const group: ToolPartLike[] = [part as unknown as ToolPartLike];
      let j = i + 1;
      while (j < parts.length && parts[j]!.type === part.type) {
        group.push(parts[j] as unknown as ToolPartLike);
        j++;
      }
      elements.push(
        <ToolCard key={i} parts={group} scenes={scenes} live={live} />,
      );
      i = j;
      continue;
    }
    i++;
  }

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
}: {
  projectId: string;
  scenes: SceneData[];
  audioClips: AudioClipData[];
  initialMessages: UIMessage[];
}) {
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();
  const { openUpgrade, isExhausted } = useUpgrade();
  const { data: assets } = useProjectAssets(projectId);
  const selectAsset = useEditorStore((s) => s.selectAsset);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Files being uploaded from a chat-composer drop — shown as loading chips
  // until they resolve into real assets and land as context.
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  // `windowDragActive`: a file is being dragged somewhere in the window (cue the
  // composer as a target). `chatDragOver`: it's directly over the composer.
  const [windowDragActive, setWindowDragActive] = useState(false);
  const [chatDragOver, setChatDragOver] = useState(false);
  const selectedSceneIds = useEditorStore((s) => s.selectedSceneIds);
  const selectedAssetIds = useEditorStore((s) => s.selectedAssetIds);
  const selectedAudioClipIds = useEditorStore((s) => s.selectedAudioClipIds);
  const selectedElements = useEditorStore((s) => s.selectedElements);
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
    selectedElements.length;
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
  }, []);

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

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: `${API_URL}/api/chat/${projectId}`,
        credentials: "include",
      }),
  );

  const { messages, sendMessage, status, error, setMessages, regenerate } = useChat({
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
      }
      // Live progress from a long-running tool (e.g. each parallel scene).
      if (dataPart.type === "data-status") {
        const text = (dataPart as { data?: { text?: string } }).data?.text;
        if (text) setLiveStatus(text);
      }
      // Backend auto-compacted this turn — clear old bubbles once it settles.
      if (dataPart.type === "data-compacted") {
        pendingCompactionClear.current = true;
      }
    },
    onError: (err) => {
      // The transport surfaces a non-2xx as an Error carrying the raw body, so
      // the quota rejection has to be dug out of the message text rather than
      // read off a status code.
      const hit = parseLimitFromText(err.message ?? "");
      if (hit) openUpgrade(hit.limit.kind);
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
  // Messages typed while a turn is streaming — sent one at a time as the stream
  // frees up. Each carries a `send` closure snapshotting its context.
  const [queue, setQueue] = useState<
    { id: string; text: string; send: () => void }[]
  >([]);

  const busy = status === "submitted" || status === "streaming";

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

  // Escape clears all attached context pills (scenes, assets, elements) —
  // unless a modal is open, where Escape should close that instead.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.querySelector('[role="dialog"]')) return;
      const s = useEditorStore.getState();
      if (
        s.selectedSceneIds.length ||
        s.selectedAssetIds.length ||
        s.selectedAudioClipIds.length ||
        s.selectedElements.length
      ) {
        s.clearSelection();
        s.clearAssetSelection();
        s.clearAudioClipSelection();
        s.clearElements();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    const setEditing = useEditorStore.getState().setEditingSceneIds;
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
  }, [messages, busy]);

  // Auto-send the prompt the user typed on the home page (new-project flow).
  useEffect(() => {
    const key = `gm-initial-prompt-${projectId}`;
    const prompt = sessionStorage.getItem(key);
    if (prompt && messages.length === 0) {
      sessionStorage.removeItem(key);
      sendMessage({ text: prompt }, { body: { selectedSceneIds: [] } });
    }
    // Run once on mount; messages start from persisted history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Consume "Fix with AI" requests issued from the preview/timeline.
  useEffect(() => {
    if (!fixRequest || busy) return;
    const request = useEditorStore.getState().consumeFixRequest();
    if (request) {
      sendMessage(
        { text: request.message },
        { body: { selectedSceneIds: [request.sceneId] } },
      );
    }
  }, [fixRequest, busy, sendMessage]);

  // Breathing room left above a focused message, so it reads as the top of the
  // turn rather than being flush against the panel's edge.
  const FOCUS_GAP = 12;
  // How close to the bottom counts as "following along".
  const STICK_SLOP = 80;
  // Slack left below the focused turn, and the reason it is more than
  // STICK_SLOP: without it the scroll lands flush against the bottom, `onScroll`
  // reads that as the user following along, and the next token pins the view to
  // the bottom again — undoing the focus a frame after it happened.
  const FOCUS_SLACK = STICK_SLOP + 24;

  // Pin to bottom as messages stream in — but only while the user is already at
  // the bottom, and batched into a rAF so a burst of tokens coalesces to one
  // scroll per frame instead of a synchronous reflow on every token.
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const scrollRaf = useRef<number | null>(null);

  const handleMessagesScroll = () => {
    const el = scrollRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_SLOP;
  };

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
  }, [messages]);

  /**
   * Bring a newly sent message to the top of the view and hold it there.
   *
   * Pinning to the bottom alone reads badly on a long turn: the question the
   * user just asked scrolls away the moment the answer starts arriving, and
   * they end up watching tool cards with no idea what prompted them. Lifting it
   * to the top instead puts the question and the start of the reply on screen
   * together, which is where the interesting part is.
   *
   * The last turn is usually shorter than the panel, so there is nothing below
   * it to scroll against — hence the tail spacer, sized to whatever is missing.
   */
  const [tailSpace, setTailSpace] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  // Mirrored, because the measurement below has to discount the spacer left
  // over from the previous turn — it is part of `scrollHeight` but isn't
  // content, and counting it would leave the new message short of the top.
  const tailSpaceRef = useRef(0);
  const focusedUserId = useRef<string | null>(null);

  useEffect(() => {
    const last = [...messages].reverse().find((m) => m.role === "user");
    if (!last) return;
    const first = focusedUserId.current === null;
    if (last.id === focusedUserId.current) return;
    focusedUserId.current = last.id;
    // On mount the transcript is restored whole; its last question is old news,
    // and the useful view is the bottom, where the conversation left off.
    if (first) return;

    const el = scrollRef.current;
    const list = listRef.current;
    const node = el?.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(last.id)}"]`);
    if (!el || !list || !node) return;

    const top = node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
    // Measured off the list, not the scroller: a conversation shorter than the
    // panel has `scrollHeight === clientHeight`, which overstates what is below
    // the message and leaves the spacer too short to lift it to the top.
    const below = list.getBoundingClientRect().height - top - tailSpaceRef.current;
    tailSpaceRef.current = Math.max(0, el.clientHeight - below - FOCUS_GAP + FOCUS_SLACK);
    setTailSpace(tailSpaceRef.current);
    // Following the bottom would undo this on the next token; the user scrolling
    // back down turns it on again through `handleMessagesScroll`.
    stickToBottom.current = false;
    // Let the spacer land before scrolling, or the target is still out of reach.
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ top: Math.max(0, top - FOCUS_GAP), behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
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
      audioClips: selClips.map((c) => ({ name: c.name })),
      elements: selectedElements.map((e) => ({
        label: e.label,
        sceneName: e.sceneName,
        timecode: e.timecode,
      })),
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

    // Gate before clearing the composer: if there's no quota left, the user
    // keeps what they typed and sees the upgrade modal instead of losing the
    // message to a rejected request.
    if (isExhausted("aiTurns")) {
      openUpgrade("aiTurns");
      return;
    }
    if (override === undefined) setInput("");

    track("chat_message_sent", {
      length: text.length,
      hasSelection: useEditorStore.getState().selectedSceneIds.length > 0,
    });

    const send = buildSendPayload(text);

    // Context is consumed by this message (queued or sent) — clear the pills.
    const store = useEditorStore.getState();
    store.clearSelection();
    store.clearAssetSelection();
    store.clearAudioClipSelection();
    store.clearElements();

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
    const text = useEditorStore.getState().consumePrompt();
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
          <div ref={listRef} className="flex min-w-0 max-w-full flex-col px-4 pb-40 pt-4">
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
                  onClick={() => regenerate()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-danger/40 px-2.5 py-1 text-[0.786rem] font-medium text-danger transition-colors hover:bg-danger/15"
                >
                  <RetryIcon className="size-3.5" />
                  Retry
                </button>
              </div>
            )}
            {!error && canRetry && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => regenerate()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[0.786rem] text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
                >
                  <RetryIcon className="size-3.5" />
                  Retry
                </button>
              </div>
            )}
            {/* Scroll room for the focused message; see the tail-spacer note. */}
            {tailSpace > 0 && <div aria-hidden style={{ height: tailSpace }} />}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background from-60% to-transparent px-3 pb-3 pt-12">
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
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
            chatDragOver
              ? "border-accent bg-accent-muted/40 ring-2 ring-accent/30"
              : windowDragActive
                ? "border-accent/60 bg-accent-muted/15"
                : "border-[#1f1f24] focus-within:border-[#2a2a31]",
          )}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              scenes.length === 0
                ? "Describe the video you want to make…"
                : "Ask for changes or new scenes…"
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
            <button
              type="button"
              title="Attach image, video, or audio (or drag files here)"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <PlusIcon className="size-[1.15rem]" />
            </button>
            {ComposerAccessory && <ComposerAccessory />}
            <span className="min-w-0 flex-1 truncate text-center text-[0.786rem] text-text-tertiary">
              {selectedSceneIds.length > 0
                ? `${selectedSceneIds.length} scene${selectedSceneIds.length > 1 ? "s" : ""} in context`
                : assets && assets.length > 0
                  ? `${assets.length} asset${assets.length > 1 ? "s" : ""} available`
                  : busy
                    ? "⏎ to queue"
                    : "⏎ to send"}
            </span>
            {messages.length > 0 && <CapacityRing count={messages.length} />}
            <button
              type="submit"
              aria-label={busy ? "Queue message" : "Send"}
              disabled={!input.trim()}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cta text-background outline-none transition-all hover:bg-cta-hover focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy && !input.trim() ? (
                <Spinner className="size-4 text-background" />
              ) : (
                <ArrowUpIcon className="size-[1.05rem]" />
              )}
            </button>
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
    queryFn: () => api<UIMessage[]>(`/api/chat/${projectId}`),
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
      initialMessages={history ?? []}
    />
  );
}
