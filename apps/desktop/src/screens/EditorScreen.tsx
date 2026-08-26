import { useCallback, useState, type PointerEvent as ReactPointerEvent } from "react";
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
import type { DesktopProject } from "../../electron/shared";
import { ProjectBundlesProvider } from "../lib/project-bundles";

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

/**
 * The editor shell, mirroring `apps/web/src/app/p/[projectId]/page.tsx`. Only
 * the app-shell concerns differ: no auth gate, and the Preview/Assets/Code
 * switch is local state rather than a URL parameter, since there is no router.
 */
export function EditorScreen({
  project: initial,
  onClose,
}: {
  project: DesktopProject;
  onClose: () => void;
}) {
  const projectId = initial.dir;
  const [tab, setTab] = useState<ViewTab>("preview");
  const [chatWidth, setChatWidth] = useState(() => {
    const saved = Number(localStorage.getItem(CHAT_WIDTH_KEY));
    return saved >= CHAT_MIN && saved <= CHAT_MAX ? saved : 380;
  });
  const [resizing, setResizing] = useState(false);

  const { data, isLoading } = useProject(projectId);
  // The IPC payload seeds the first render so the editor never flashes empty.
  const project = (data as DesktopProject | undefined) ?? initial;

  const {
    renameProject,
    reorderScenes,
    deleteScene,
    updateScene,
    addAudioClip,
    updateAudioClip,
    deleteAudioClip,
  } = useProjectMutations(projectId);

  const requestFix = useEditorStore((s) => s.requestFix);
  const aiBusy = useEditorStore((s) => s.aiBusy);

  const handleDeleteScenes = useCallback(
    (ids: string[]) => {
      if (useEditorStore.getState().aiBusy) return;
      for (const id of ids) deleteScene.mutate(id);
    },
    [deleteScene],
  );

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
    <ProjectBundlesProvider bundles={project.bundles} ready={!isLoading}>
      <EditorBody
        project={project}
        tab={tab}
        setTab={setTab}
        chatWidth={chatWidth}
        resizing={resizing}
        startResize={startResize}
        onClose={onClose}
        onRename={(name) => renameProject.mutate(name)}
        onReorder={(ids) => reorderScenes.mutate(ids)}
        onDeleteScenes={handleDeleteScenes}
        onToggleMute={(sceneId, muted) => updateScene.mutate({ sceneId, audioVolume: muted ? 0 : 1 })}
        onResizeScene={(sceneId, durationInFrames) => updateScene.mutate({ sceneId, durationInFrames })}
        onAddClip={(input) => addAudioClip.mutate(input)}
        onUpdateClip={(input) => updateAudioClip.mutate(input)}
        onDeleteClip={(clipId) => deleteAudioClip.mutate(clipId)}
        requestFix={requestFix}
        aiBusy={aiBusy}
      />
    </ProjectBundlesProvider>
  );
}

/** Split out so the compile hook runs inside the bundles provider. */
function EditorBody({
  project,
  tab,
  setTab,
  chatWidth,
  resizing,
  startResize,
  onClose,
  onRename,
  onReorder,
  onDeleteScenes,
  onToggleMute,
  onResizeScene,
  onAddClip,
  onUpdateClip,
  onDeleteClip,
  requestFix,
  aiBusy,
}: {
  project: DesktopProject;
  tab: ViewTab;
  setTab: (tab: ViewTab) => void;
  chatWidth: number;
  resizing: boolean;
  startResize: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onClose: () => void;
  onRename: (name: string) => void;
  onReorder: (ids: string[]) => void;
  onDeleteScenes: (ids: string[]) => void;
  onToggleMute: (sceneId: string, muted: boolean) => void;
  onResizeScene: (sceneId: string, durationInFrames: number) => void;
  onAddClip: (input: Parameters<ReturnType<typeof useProjectMutations>["addAudioClip"]["mutate"]>[0]) => void;
  onUpdateClip: (input: Parameters<ReturnType<typeof useProjectMutations>["updateAudioClip"]["mutate"]>[0]) => void;
  onDeleteClip: (clipId: string) => void;
  requestFix: (request: { sceneId: string; message: string }) => void;
  aiBusy: boolean;
}) {
  const { compiled, errors, initializing } = useCompiledScenes(project.scenes);
  const firstError = project.scenes.find((s) => s.id in errors);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Clears the traffic lights, and gives the frameless window a drag strip. */}
      <div className="titlebar-drag flex h-9 shrink-0 items-center justify-end border-b border-border pr-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-0.5 text-[0.786rem] text-text-tertiary transition-colors hover:text-text-primary"
        >
          Close project
        </button>
      </div>
      <div className="flex min-h-0 flex-1">
        {/* Left column: project header (over the chat) + chat */}
        <div className="relative flex shrink-0 flex-col" style={{ width: chatWidth }}>
          <Topbar projectName={project.name} onRename={onRename} />
          <ChatPanel
            projectId={project.dir}
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
            <div className="flex items-center rounded-md border border-border bg-surface-raised p-0.5 text-[0.857rem]">
              {VIEW_TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
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
            <ExportButton
              projectId={project.dir}
              project={project}
              disabled={project.scenes.length === 0}
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-lg border-l border-t border-border bg-surface">
              {project.manifestError && (
                <div className="border-b border-danger/30 bg-danger/10 px-4 py-1.5 text-[0.857rem] text-danger">
                  project.json: {project.manifestError}
                </div>
              )}
              {tab === "assets" ? (
                <AssetsView projectId={project.dir} />
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
                    projectId={project.dir}
                    scenes={project.scenes}
                    fps={project.fps}
                    sceneErrors={errors}
                    audioClips={project.audioClips ?? []}
                    onReorder={onReorder}
                    onDeleteScenes={onDeleteScenes}
                    onToggleMute={onToggleMute}
                    onResizeScene={onResizeScene}
                    onAddClip={onAddClip}
                    onUpdateClip={onUpdateClip}
                    onDeleteClip={onDeleteClip}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {initializing && project.scenes.length === 0 && <Spinner className="hidden" />}
    </main>
  );
}
