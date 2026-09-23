import { useCallback, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useProject, useProjectMutations } from "@/hooks/use-project";
import { useCompiledScenes } from "@/hooks/use-compiled-scenes";
import { Topbar } from "@/components/editor/topbar";
import { ExportButton } from "@/components/editor/export-button";
import { ChatPanel } from "@/components/editor/chat-panel";
import { PreviewStage, PreviewTransport } from "@/components/editor/preview";
import { Timeline } from "@/components/editor/timeline";
import { AssetsView } from "@/components/editor/assets-view";
import { CodeView } from "@/components/editor/code-view";
import { Button, Spinner, cx } from "@/components/ui";
import { useEditorStore, useEditorStoreApi } from "@/stores/editor-store";
import { formatCompileError } from "@genmotion/compiler";
import { api } from "../api";
import type { DesktopProject } from "../../electron/shared";
import { ProjectBundlesProvider } from "../lib/project-bundles";
import { HyperframesStage } from "@/components/editor/hyperframes/stage";
import { ScaffoldBanner } from "@/components/editor/hyperframes/scaffold-banner";
import { ScaffoldScreen } from "@/components/editor/hyperframes/scaffold-screen";
import { formatFinding } from "@genmotion/hyperframes/shared";

const CHAT_WIDTH_KEY = "gm-chat-width";

/** FNV-1a, for a cheap content fingerprint the export button compares. */
function hashOf(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
const noop = () => {};
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
 *
 * Fills whatever the tab host gives it; the window's drag strip and the way
 * out (the tab's close button) belong to the strip above, not to the editor.
 */
export function EditorScreen({
  project: initial,
  onClose,
}: {
  project: DesktopProject;
  /** The project is gone (deleted from here); drop its tab. */
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
    splitScene,
    splitAudioClip,
  } = useProjectMutations(projectId);

  const editorStore = useEditorStoreApi();
  const requestFix = useEditorStore((s) => s.requestFix);
  const aiBusy = useEditorStore((s) => s.aiBusy);

  const handleDeleteScenes = useCallback(
    (ids: string[]) => {
      if (editorStore.getState().aiBusy) return;
      for (const id of ids) deleteScene.mutate(id);
    },
    [deleteScene, editorStore],
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
        onSplitScene={(sceneId, atFrame) => {
          if (!editorStore.getState().aiBusy) splitScene.mutate({ sceneId, atFrame });
        }}
        onSplitClip={(clipId, atFrame) => {
          if (!editorStore.getState().aiBusy) splitAudioClip.mutate({ clipId, atFrame });
        }}
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
  onSplitScene,
  onSplitClip,
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
  onSplitScene: (sceneId: string, atFrame: number) => void;
  onSplitClip: (clipId: string, atFrame: number) => void;
  requestFix: (request: { sceneId: string; message: string }) => void;
  aiBusy: boolean;
}) {
  const { compiled, errors, initializing } = useCompiledScenes(project.scenes);
  const firstError = project.scenes.find((s) => s.id in errors);

  // The HyperFrames half. Null for a React project, and every branch below
  // reads as "the composition" rather than "the scenes" when it is set.
  const hf = project.engine === "hyperframes" ? project.hyperframes : null;
  const hfProblem = hf
    ? hf.compileError
      ? { title: "The composition doesn't compile", detail: hf.compileError }
      : (() => {
          const error = hf.lint.findings.find((f) => f.severity === "error");
          return error ? { title: "Lint error", detail: formatFinding(error) } : null;
        })()
    : null;
  const hfFrames = hf ? Math.round(hf.durationSeconds * project.fps) : 0;
  const hfSignature = hf
    ? `${project.fps}x${hf.width}x${hf.height}:${hf.files.map((f) => `${f.path}:${f.code.length}:${hashOf(f.code)}`).join("|")}`
    : "";

  return (
    <main className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1">
        {/* Left column: project header (over the chat) + chat */}
        <div className="relative flex shrink-0 flex-col" style={{ width: chatWidth }}>
          <Topbar
            projectName={project.name}
            onRename={onRename}
            action={
              <button
                type="button"
                aria-label="Delete project"
                title="Delete project"
                onClick={() => {
                  void api.deleteProject(project.dir).then(({ deleted }) => {
                    // The main process has already released the session; this
                    // is only the renderer catching up to an editor whose
                    // project no longer exists.
                    if (deleted) void onClose();
                  });
                }}
                className={cx(
                  "rounded p-1.5 text-text-tertiary transition-colors duration-150",
                  "hover:bg-danger/10 hover:text-danger",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40",
                )}
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M4 7h16M10 4h4M9.5 7l.6 12M14.5 7l-.6 12M6.5 7l.8 13.2a1 1 0 0 0 1 .8h7.4a1 1 0 0 0 1-.8L17.5 7" />
                </svg>
              </button>
            }
          />
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
          <div className="flex h-12 shrink-0 items-end justify-between pr-3">
            {/* File-folder tabs: the active one is cut from the same cloth as
                the pane below — its colour, its border on three sides — and
                hangs a pixel over the pane's top edge to cover the line
                between them, so tab and page read as one surface. Flush with
                the pane's left edge: the first tab's border is the pane's. */}
            <div className="relative z-10 -mb-px flex items-end gap-0.5 text-[0.857rem]">
              {VIEW_TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-selected={tab === id}
                  role="tab"
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 px-3 transition-colors",
                    tab === id
                      ? "h-9 border-border bg-surface text-text-primary"
                      : "mb-px h-8 border-transparent text-text-secondary hover:bg-white/[0.05] hover:text-text-primary",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <div className="mb-1.5">
            <ExportButton
              projectId={project.dir}
              project={project}
              disabled={hf ? hfFrames === 0 || !!hf.compileError : project.scenes.length === 0}
              composition={
                hf
                  ? {
                      totalFrames: hfFrames,
                      signature: hfSignature,
                      sceneCount: project.scenes.length,
                      width: hf.width ?? project.width,
                      height: hf.height ?? project.height,
                    }
                  : undefined
              }
            />
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-l border-t border-border bg-surface">
              {project.manifestError && (
                <div className="border-b border-danger/30 bg-danger/10 px-4 py-1.5 text-[0.857rem] text-danger">
                  project.json: {project.manifestError}
                </div>
              )}
              {tab === "assets" ? (
                <AssetsView projectId={project.dir} />
              ) : tab === "code" ? (
                <CodeView
                  files={
                    hf
                      ? hf.files.map((f) => ({ id: f.path, name: f.path, code: f.code }))
                      : project.scenes.map((s) => ({ id: s.id, name: s.name, code: s.code }))
                  }
                  heading={hf ? "Composition" : "Scenes"}
                  language={hf ? "html" : "tsx"}
                />
              ) : hf && (hf.scaffold?.step === "resolving" || hf.scaffold?.step === "installing") ? (
                // The install behind a brand-new project. The preview would
                // only reload under the user as packages land, so it waits.
                <ScaffoldScreen state={hf.scaffold} engineLabel="HyperFrames" mark="/hyperframes-mark.png" />
              ) : hf ? (
                <>
                  <ScaffoldBanner dir={project.dir} scaffold={hf.scaffold} runtime={hf.runtime} />
                  {hfProblem && (
                    <div className="flex items-center justify-between gap-3 border-b border-danger/30 bg-danger/10 px-4 py-1.5 text-[0.857rem]">
                      <span className="truncate text-danger" title={hfProblem.detail}>
                        {hfProblem.title}: {hfProblem.detail.split("\n")[0]}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={aiBusy}
                        onClick={() =>
                          requestFix({
                            sceneId: "index.html",
                            message: `The composition has a problem:\n\n${hfProblem.detail}\n\nPlease fix it and run validate_composition.`,
                          })
                        }
                      >
                        Fix with AI
                      </Button>
                    </div>
                  )}
                  <div className="flex min-h-0 flex-1 flex-col">
                    <div className="relative min-h-0 flex-1 p-4">
                      <div className="gm-dot-canvas relative h-full overflow-hidden rounded-xl border border-border p-6 shadow-[0_8px_40px_rgba(20,20,40,0.16)]">
                        {/* A compile error alone does not take the stage away: the
                            last good page stays up under the banner above, since
                            the agent breaks and mends the folder several times a
                            turn. Only a project that has never compiled has
                            nothing to show. */}
                        {hf.width === null || hf.height === null ? (
                          <div className="flex h-full items-center justify-center">
                            <div className="max-w-md text-center text-text-tertiary">
                              <p className="text-lg">Nothing to show yet</p>
                              <p className="mt-1">
                                {hf.compileError
                                  ? "The composition doesn't compile. Fix it, or ask the agent to."
                                  : "The composition is being compiled…"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <HyperframesStage
                            dir={project.dir}
                            revision={hf.revision}
                            fps={project.fps}
                            width={hf.width}
                            height={hf.height}
                            scenes={project.scenes}
                          />
                        )}
                      </div>
                    </div>
                    <PreviewTransport projectId={project.dir} fps={project.fps} />
                  </div>
                  {/* The same timeline as a React project: sub-compositions are
                      the scenes, `<audio>` elements the clips. Slicing an
                      audio clip writes back into index.html (`data-media-start`
                      on the new half), the same "cut into source ranges"
                      pattern video/audio clips already use. Everything else
                      here — reorder, delete, resize, mute, scene slicing — has
                      no write-back yet: a sub-composition mount has no
                      equivalent of `data-media-start` to resume from, so those
                      stay inert and the composition stays the source of truth. */}
                  <Timeline
                    projectId={project.dir}
                    scenes={project.scenes}
                    fps={project.fps}
                    sceneErrors={{}}
                    audioClips={project.audioClips ?? []}
                    onReorder={noop}
                    onDeleteScenes={noop}
                    onToggleMute={noop}
                    onResizeScene={noop}
                    onAddClip={noop}
                    onUpdateClip={noop}
                    onDeleteClip={noop}
                    onSplitScene={noop}
                    onSplitClip={onSplitClip}
                  />
                </>
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
                    projectId={project.dir}
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
                    onSplitScene={onSplitScene}
                    onSplitClip={onSplitClip}
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
