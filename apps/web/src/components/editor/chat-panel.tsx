"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Streamdown } from "streamdown";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SceneData } from "@genmotion/shared";
import { API_URL, api } from "@/lib/api";
import { useEditorStore } from "@/stores/editor-store";
import { projectQueryKey } from "@/hooks/use-project";
import { useProjectAssets, useUploadAsset } from "@/hooks/use-assets";
import { SceneChips, AssetChips } from "./scene-chip";
import { ToolCard, type ToolPartLike } from "./tool-card";
import { Spinner, cx } from "@/components/ui";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
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
    return (
      <div className={cx("ml-8 self-end rounded-2xl rounded-br-md bg-surface-raised px-3 py-2 text-text-primary", spacing)}>
        {message.parts.map((part, i) =>
          part.type === "text" ? (
            <p key={i} className="whitespace-pre-wrap">{part.text}</p>
          ) : null,
        )}
      </div>
    );
  }

  const elements: ReactNode[] = [];
  const parts = message.parts;
  for (let i = 0; i < parts.length; ) {
    const part = parts[i]!;
    if (part.type === "text") {
      if (part.text.trim()) {
        elements.push(
          <Streamdown
            key={i}
            className="space-y-2 text-text-primary [&_a]:text-accent [&_code]:rounded [&_code]:bg-surface-raised [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.857rem] [&_li]:ml-4 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc"
          >
            {part.text}
          </Streamdown>,
        );
      }
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
  const setAiBusy = useEditorStore((s) => s.setAiBusy);
  const fixRequest = useEditorStore((s) => s.fixRequest);

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: `${API_URL}/api/chat/${projectId}`,
        credentials: "include",
      }),
  );

  const { messages, sendMessage, status, error } = useChat({
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
    },
  });

  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    setAiBusy(busy);
    if (!busy) {
      // Final settle: make sure the editor reflects every tool mutation.
      queryClient.invalidateQueries({ queryKey: projectQueryKey(projectId) });
    }
  }, [busy, setAiBusy, queryClient, projectId]);

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
    sendMessage({ text }, { body: { selectedSceneIds, selectedAssetIds } });
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
            {error && (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[0.857rem] text-danger">
                {error.message || "Something went wrong. Try again."}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background from-60% to-transparent px-3 pb-3 pt-12">
        <div className="pointer-events-auto">
        <SceneChips scenes={scenes} />
        <AssetChips assets={assets ?? []} />
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
            <button
              type="submit"
              aria-label="Send"
              disabled={busy || !input.trim()}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cta text-background outline-none transition-all hover:bg-cta-hover focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <Spinner className="size-4 text-background" />
              ) : (
                <ArrowRightIcon className="size-[1.05rem]" />
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
