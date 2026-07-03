"use client";

import {
  use,
  useCallback,
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useProject, useProjectMutations } from "@/hooks/use-project";
import { useCompiledScenes } from "@/hooks/use-compiled-scenes";
import { Topbar } from "@/components/editor/topbar";
import { ExportButton } from "@/components/editor/export-button";
import { ChatPanel } from "@/components/editor/chat-panel";
import { PreviewStage } from "@/components/editor/preview";
import { Timeline } from "@/components/editor/timeline";
import { AssetsView } from "@/components/editor/assets-view";
import { CodeView } from "@/components/editor/code-view";
import { Button, Spinner, cx } from "@/components/ui";
import { useEditorStore } from "@/stores/editor-store";
import { formatCompileError } from "@genmotion/compiler";

const CHAT_WIDTH_KEY = "gm-chat-width";
const CHAT_MIN = 300;
const CHAT_MAX = 640;

function PreviewTabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 5l11 7-11 7z" />
    </svg>
  );
}
function AssetsTabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="M21 15l-5-4-9 7" />
    </svg>
  );
}
function CodeTabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 7l-4 5 4 5M15 7l4 5-4 5" />
    </svg>
  );
}

const VIEW_TABS = [
  { id: "preview", label: "Preview", Icon: PreviewTabIcon },
  { id: "assets", label: "Assets", Icon: AssetsTabIcon },
  { id: "code", label: "Code", Icon: CodeTabIcon },
] as const;

type ViewTab = (typeof VIEW_TABS)[number]["id"];

function resolveTab(param: string | null): ViewTab {
  return param === "assets" || param === "code" ? param : "preview";
}

/** URL-controlled Preview/Code/Assets switch. Default (no param) = preview. */
function ViewTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = resolveTab(params.get("tab"));
  const go = (next: ViewTab) =>
    router.replace(next === "preview" ? pathname : `${pathname}?tab=${next}`, {
      scroll: false,
    });

  return (
    <div className="flex items-center rounded-md border border-border bg-surface-raised p-0.5 text-[0.857rem]">
      {VIEW_TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => go(id)}
          className={cx(
            "inline-flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors",
            tab === id
              ? "bg-surface text-text-primary"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

export default function EditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = resolveTab(searchParams.get("tab"));
  const [chatWidth, setChatWidth] = useState(380);
  const [resizing, setResizing] = useState(false);
  const { data: session, isPending: sessionPending } = useSession();

  // Restore the saved chat width after mount (avoids SSR/localStorage issues).
  useEffect(() => {
    const saved = Number(localStorage.getItem(CHAT_WIDTH_KEY));
    if (saved >= CHAT_MIN && saved <= CHAT_MAX) setChatWidth(saved);
  }, []);

  useEffect(() => {
    if (!sessionPending && !session) router.replace("/login");
  }, [session, sessionPending, router]);

  const { data: project, isLoading, error } = useProject(projectId);
  const {
    renameProject,
    reorderScenes,
    deleteScene,
    updateScene,
    addAudioClip,
    updateAudioClip,
    deleteAudioClip,
  } = useProjectMutations(projectId);

  const { compiled, errors, initializing } = useCompiledScenes(project?.scenes);
  const requestFix = useEditorStore((s) => s.requestFix);
  const aiBusy = useEditorStore((s) => s.aiBusy);

  const handleDeleteScenes = useCallback(
    (ids: string[]) => {
      if (useEditorStore.getState().aiBusy) return;
      for (const id of ids) deleteScene.mutate(id);
    },
    [deleteScene],
  );

  const firstError = project?.scenes.find((s) => s.id in errors);

  if (sessionPending || isLoading) {
    return (
      <main className="flex h-screen items-center justify-center">
        <Spinner />
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">Project not found.</p>
        <Button onClick={() => router.push("/dashboard")}>Back to dashboard</Button>
      </main>
    );
  }

  function startResize(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = chatWidth;
    const clamp = (w: number) => Math.min(CHAT_MAX, Math.max(CHAT_MIN, w));
    setResizing(true);
    const onMove = (ev: PointerEvent) => setChatWidth(clamp(startW + ev.clientX - startX));
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setResizing(false);
      try {
        localStorage.setItem(CHAT_WIDTH_KEY, String(clamp(startW + ev.clientX - startX)));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1">
        {/* Left column: project header (over the chat) + chat */}
        <div
          className="relative flex shrink-0 flex-col"
          style={{ width: chatWidth }}
        >
          <Topbar
            projectName={project.name}
            onRename={(name) => renameProject.mutate(name)}
          />
          <ChatPanel
            projectId={projectId}
            scenes={project.scenes}
            audioClips={project.audioClips ?? []}
          />
          <div
            onPointerDown={startResize}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat panel"
            className="absolute right-0 top-0 z-30 h-full w-1 cursor-col-resize transition-colors hover:bg-border-strong"
          />
        </div>
        {resizing && <div className="fixed inset-0 z-[100] cursor-col-resize" />}

        {/* Right column: tabs/export header (over the preview) + preview */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between pr-3">
            <ViewTabs />
            <ExportButton
              projectId={projectId}
              project={project}
              disabled={project.scenes.length === 0}
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-lg border-l border-t border-border bg-surface">
              {tab === "assets" ? (
                <AssetsView projectId={projectId} />
              ) : tab === "code" ? (
                <CodeView scenes={project.scenes} />
              ) : (
                <>
                  {firstError && (
                    <div className="flex items-center justify-between gap-3 border-b border-danger/30 bg-danger/10 px-4 py-1.5 text-[0.857rem]">
                      <span className="truncate text-danger">
                        “{firstError.name}” has an error:{" "}
                        {formatCompileError(errors[firstError.id]!)}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={aiBusy}
                        onClick={() =>
                          requestFix({
                            sceneId: firstError.id,
                            message: `The scene "${firstError.name}" fails to compile with this error:\n\n${formatCompileError(errors[firstError.id]!)}\n\nPlease fix it.`,
                          })
                        }
                      >
                        Fix with AI
                      </Button>
                    </div>
                  )}
                  <PreviewStage
                    scenes={compiled}
                    fps={project.fps}
                    width={project.width}
                    height={project.height}
                    audioClips={project.audioClips}
                    initializing={initializing && project.scenes.length > 0}
                  />
                  <Timeline
                    projectId={projectId}
                    scenes={project.scenes}
                    fps={project.fps}
                    sceneErrors={errors}
                    audioClips={project.audioClips ?? []}
                    onReorder={(ids) => reorderScenes.mutate(ids)}
                    onDeleteScenes={handleDeleteScenes}
                    onToggleMute={(sceneId, muted) =>
                      updateScene.mutate({ sceneId, audioVolume: muted ? 0 : 1 })
                    }
                    onResizeScene={(sceneId, durationInFrames) =>
                      updateScene.mutate({ sceneId, durationInFrames })
                    }
                    onAddClip={(input) => addAudioClip.mutate(input)}
                    onUpdateClip={(input) => updateAudioClip.mutate(input)}
                    onDeleteClip={(clipId) => deleteAudioClip.mutate(clipId)}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
