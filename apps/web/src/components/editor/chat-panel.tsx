"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Streamdown } from "streamdown";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type SceneData, COMPACTION_MESSAGE_LIMIT } from "@genmotion/shared";
import { API_URL, api } from "@/lib/api";
import { useEditorStore } from "@/stores/editor-store";
import { projectQueryKey } from "@/hooks/use-project";
import { useProjectAssets, useUploadAsset } from "@/hooks/use-assets";
import {
  SceneChips,
  AssetChips,
  ElementChips,
  MessageContextPills,
  type MessageContextData,
} from "./scene-chip";
import { ToolCard, type ToolPartLike } from "./tool-card";
import { Spinner, cx } from "@/components/ui";

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
  if (lines.length === 0) return null;
  return `[Context attached to this message]\n${lines.join("\n")}`;
}

/** Lighter "Thinking…" indicator: soft shimmering word + animated ellipsis. */
function ThinkingIndicator() {
  return (
    <div
      className="mt-4 self-start pl-2 text-[0.95rem] font-medium text-text-tertiary"
      role="status"
    >
      <span className="thinking-shimmer thinking-shimmer-soft">Thinking</span>
      <span className="thinking-dots" aria-hidden="true">
        <i>.</i>
        <i>.</i>
        <i>.</i>
      </span>
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
      <div className={cx("ml-8 self-end rounded-2xl rounded-br-md bg-surface-raised px-3 py-2 text-text-primary", spacing)}>
        {ctxPart?.data && <MessageContextPills ctx={ctxPart.data} />}
        {userText && <p className="whitespace-pre-wrap">{userText}</p>}
      </div>
    );
  }

  const elements: ReactNode[] = [];
  // Keep only the parts this bubble actually renders — non-empty text and tool
  // calls. Multi-step turns interleave invisible `step-start`/`reasoning` parts
  // (and empty text) between tool calls; dropping them first means same-tool
  // calls split only by those still count as consecutive and club together.
  const parts = message.parts.filter((p) => {
    if (p.type === "text") return Boolean(p.text.trim());
    return p.type.startsWith("tool-") || p.type === "dynamic-tool";
  });
  for (let i = 0; i < parts.length; ) {
    const part = parts[i]!;
    if (part.type === "text") {
      elements.push(
        <Streamdown
          key={i}
          className="space-y-2 text-text-primary [&_a]:text-accent [&_code]:rounded [&_code]:bg-surface-raised [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.857rem] [&_li]:ml-4 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc"
        >
          {part.text}
        </Streamdown>,
      );
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

function ChatPanelInner({
  projectId,
  scenes,
  initialMessages,
}: {
  projectId: string;
  scenes: SceneData[];
  initialMessages: UIMessage[];
}) {
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: assets } = useProjectAssets(projectId);
  const uploadAsset = useUploadAsset(projectId);
  const selectedSceneIds = useEditorStore((s) => s.selectedSceneIds);
  const selectedAssetIds = useEditorStore((s) => s.selectedAssetIds);
  const selectedElements = useEditorStore((s) => s.selectedElements);
  const setAiBusy = useEditorStore((s) => s.setAiBusy);
  const fixRequest = useEditorStore((s) => s.fixRequest);

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
    onData: (dataPart) => {
      if (
        dataPart.type === "data-project-renamed" ||
        dataPart.type === "data-scenes-updated"
      ) {
        queryClient.invalidateQueries({ queryKey: projectQueryKey(projectId) });
      }
      // Backend auto-compacted this turn — clear old bubbles once it settles.
      if (dataPart.type === "data-compacted") {
        pendingCompactionClear.current = true;
      }
    },
  });
  // Set when a turn compacts (tool or auto); consumed on the busy falling edge.
  const pendingCompactionClear = useRef(false);

  const busy = status === "submitted" || status === "streaming";

  // Waiting states. Before the assistant produces anything (last message is
  // still the user's) → shimmering "Thinking…". Once it's running tools but
  // hasn't started its text yet → the orbit loader. Hidden once text streams.
  const lastMessage = messages[messages.length - 1];
  const lastPart = lastMessage?.parts[lastMessage.parts.length - 1];
  const streamingText =
    lastMessage?.role === "assistant" &&
    lastPart?.type === "text" &&
    lastPart.text.trim().length > 0;
  const waitingToStart = busy && lastMessage?.role === "user";
  const showOrbit = busy && !waitingToStart && !streamingText;
  // A trailing user message with nothing running means the assistant turn never
  // landed (failed/interrupted) — offer to retry it.
  const canRetry = !busy && lastMessage?.role === "user";

  useEffect(() => {
    setAiBusy(busy);
    if (!busy) {
      // Final settle: make sure the editor reflects every tool mutation.
      queryClient.invalidateQueries({ queryKey: projectQueryKey(projectId) });
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
        s.selectedElements.length
      ) {
        s.clearSelection();
        s.clearAssetSelection();
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

  // Pin to bottom as messages stream in.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");

    const selScenes = scenes.filter((s) => selectedSceneIds.includes(s.id));
    const selAssets = (assets ?? []).filter((a) =>
      selectedAssetIds.includes(a.id),
    );

    // Snapshot the attached context so it persists with (and renders inside) the message.
    const ctx: MessageContextData = {
      scenes: selScenes.map((s) => ({ name: s.name })),
      assets: selAssets.map((a) => ({ filename: a.filename })),
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
      selectedElements.map((e) => ({
        elementId: e.elementId,
        tag: e.tag,
        text: e.text,
        sceneName: e.sceneName,
        timecode: e.timecode,
      })),
    );

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
          selectedSceneIds,
          selectedAssetIds,
          selectedElements: selectedElements.map(
            ({ tag, text: elText, elementId, sceneId, sceneName, timecode }) => ({
              tag,
              text: elText,
              elementId,
              sceneId,
              sceneName,
              timecode,
            }),
          ),
        },
      },
    );
    // Context is now attached to the message — clear the pills.
    const store = useEditorStore.getState();
    store.clearSelection();
    store.clearAssetSelection();
    store.clearElements();
  }

  return (
    <aside className="relative flex min-h-0 flex-1 flex-col bg-background">
      {/* Fade messages into the background as they scroll under the top edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-background to-transparent" />

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
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
          <div className="flex min-w-0 max-w-full flex-col px-4 pb-40 pt-4">
            {messages.map((message, index) => {
              const grouped = messages[index - 1]?.role === message.role;
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  scenes={scenes}
                  live={busy && index === messages.length - 1}
                  spacing={index === 0 ? "" : grouped ? "mt-1.5" : "mt-4"}
                />
              );
            })}
            {(waitingToStart || showOrbit) && <ThinkingIndicator />}
            {error && (
              <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[0.857rem] text-danger">
                {error.message || "Something went wrong. Try again."}
              </p>
            )}
            {canRetry && (
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
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background from-60% to-transparent px-3 pb-3 pt-12">
        <div className="pointer-events-auto">
        <SceneChips scenes={scenes} />
        <AssetChips assets={assets ?? []} />
        <ElementChips />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="rounded-2xl border border-[#1f1f24] bg-surface px-3 py-2.5 transition-colors focus-within:border-[#2a2a31]"
        >
          <textarea
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadAsset.mutate(file);
              e.target.value = "";
            }}
          />
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              title="Attach image, video, or audio"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAsset.isPending}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
            >
              {uploadAsset.isPending ? (
                <Spinner className="size-4" />
              ) : (
                <PlusIcon className="size-[1.15rem]" />
              )}
            </button>
            <span className="min-w-0 flex-1 truncate text-center text-[0.786rem] text-text-tertiary">
              {uploadAsset.isPending
                ? "Uploading…"
                : uploadAsset.isError
                  ? "Upload failed"
                  : selectedSceneIds.length > 0
                    ? `${selectedSceneIds.length} scene${selectedSceneIds.length > 1 ? "s" : ""} in context`
                    : assets && assets.length > 0
                      ? `${assets.length} asset${assets.length > 1 ? "s" : ""} available`
                      : "⏎ to send"}
            </span>
            {messages.length > 0 && <CapacityRing count={messages.length} />}
            <button
              type="submit"
              aria-label="Send"
              disabled={busy || !input.trim()}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cta text-background outline-none transition-all hover:bg-cta-hover focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
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
}: {
  projectId: string;
  scenes: SceneData[];
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
      initialMessages={history ?? []}
    />
  );
}
