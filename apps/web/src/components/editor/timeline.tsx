"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePlaybackStore } from "@genmotion/player";
import {
  framesToTimecode,
  sceneStartFrames,
  totalDurationInFrames,
  MAX_AUDIO_TRACKS,
  type AudioClipData,
  type SceneData,
} from "@genmotion/shared";
import { useEditorStore } from "@/stores/editor-store";
import { cx } from "@/components/ui";
import { SceneIcon } from "./scene-icon";
import { Waveform } from "./waveform";
import { useProjectAssets } from "@/hooks/use-assets";
import { AudioLanes, AUDIO_LANE_HEIGHT } from "./audio-lanes";

/** Fixed timeline scale: one second of video occupies exactly this many pixels. */
const PX_PER_SECOND = 60;
/** Breathing room at both ends of the track; every time→pixel mapping adds it. */
const TRACK_PADDING = 12;
/** Row heights that make up the timeline's total height. */
const RULER_HEIGHT = 18;
const SCENE_TRACK_HEIGHT = 76;
/** Tight bottom padding on the scene track so the audio lanes sit close under it. */
const SCENE_TRACK_PAD_BOTTOM = 4;

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" />
    </svg>
  );
}
function SpeakerMutedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </svg>
  );
}
function MusicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

/** Left-side sticky track headers: an icon per lane group, aligned to row heights. */
function TrackHeaders({ audioHeight }: { audioHeight: number }) {
  return (
    <div className="z-20 flex w-10 shrink-0 flex-col border-r border-border bg-surface">
      <div style={{ height: RULER_HEIGHT }} />
      <div
        className="flex shrink-0 items-center justify-center text-text-tertiary"
        style={{ height: SCENE_TRACK_HEIGHT }}
        title="Scenes"
      >
        <SceneIcon className="size-4" />
      </div>
      <div
        className="flex shrink-0 items-center justify-center border-t border-border/60 text-text-tertiary"
        style={{ height: audioHeight }}
        title="Audio"
      >
        <MusicIcon className="size-4" />
      </div>
    </div>
  );
}

/** Voiceover amplitude strip shown at the bottom of a scene block. */
function SceneWaveform({
  url,
  widthPx,
  durationSec,
  selected,
  muted,
}: {
  url: string;
  widthPx: number;
  /** Scene length in seconds — the waveform maps to real time within this. */
  durationSec: number;
  selected: boolean;
  muted: boolean;
}) {
  // Full-width strip pinned to the card's bottom; the mute button lives at the
  // card's top-right (rendered by SceneBlock), mirroring the audio clips.
  return (
    <Waveform
      url={url}
      widthPx={widthPx}
      durationSec={durationSec}
      selected={selected}
      selectedClassName="bg-purple"
      inactiveClassName="bg-purple/60"
      className={cx("pointer-events-none mt-auto shrink-0", muted && "opacity-40")}
    />
  );
}

/** Smallest a scene can be trimmed to by dragging — a fifth of a second. */
const MIN_SCENE_FRAMES_FACTOR = 0.2;

function SceneBlock({
  scene,
  fps,
  pxPerFrame,
  selected,
  hasError,
  editing,
  onSelect,
  onToggleMute,
  onResize,
}: {
  scene: SceneData;
  fps: number;
  pxPerFrame: number;
  selected: boolean;
  hasError: boolean;
  editing: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onToggleMute: (sceneId: string, muted: boolean) => void;
  onResize: (sceneId: string, durationInFrames: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });
  const muted = (scene.audioVolume ?? 1) <= 0;

  // While dragging the right edge, override the length locally so the card (and,
  // via flex reflow, every scene after it) resizes live before we commit.
  const [draftFrames, setDraftFrames] = useState<number | null>(null);
  const durationInFrames = draftFrames ?? scene.durationInFrames;
  const widthPx = durationInFrames * pxPerFrame;

  // Drop the draft once the committed length catches up (optimistic update
  // lands, or an error rolls it back) — avoids a one-frame snap on release.
  useEffect(() => {
    setDraftFrames(null);
  }, [scene.durationInFrames]);

  function beginResize(e: ReactPointerEvent<HTMLElement>) {
    // Keep the sortable/drag-to-reorder and the click-to-select from firing.
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const orig = scene.durationInFrames;
    const minFrames = Math.max(1, Math.round(fps * MIN_SCENE_FRAMES_FACTOR));
    let next = orig;

    const move = (ev: PointerEvent) => {
      const dxFrames = Math.round((ev.clientX - startX) / pxPerFrame);
      next = Math.max(minFrames, orig + dxFrames);
      setDraftFrames(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (next !== orig) {
        // Keep showing the dragged length; the effect above clears the draft
        // when the committed value updates.
        onResize(scene.id, next);
      } else {
        setDraftFrames(null);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        width: widthPx,
        flexShrink: 0,
      }}
      className={cx("h-full", isDragging && "z-10 opacity-80")}
      onClick={(e) => onSelect(scene.id, e.shiftKey)}
      {...attributes}
      {...listeners}
    >
      <div
        className={cx(
          "group relative mx-px flex h-full cursor-grab select-none flex-col overflow-hidden rounded-md border transition-colors duration-150",
          selected
            ? "border-purple bg-purple-muted"
            : hasError
              ? "border-danger/50 bg-danger/10 hover:border-danger"
              : "border-purple/25 bg-purple/[0.06] hover:border-purple/45 hover:bg-purple/12",
          isDragging && "shadow-lg",
          editing && "gm-card-shimmer border-accent/60",
        )}
      >
        {/* Title (left) + duration (top-right, aligned with the title) */}
        <div className="flex items-center justify-between gap-2 px-2 pt-2">
          <span
            className={cx(
              "flex min-w-0 items-center gap-1 text-[0.857rem] font-medium",
              selected ? "text-purple" : "text-purple/80",
            )}
          >
            <SceneIcon className="size-3.5 shrink-0" />
            <span className="truncate">
              {hasError && "⚠ "}
              {scene.name}
            </span>
          </span>
          <span
            className={cx(
              "shrink-0 font-mono text-[0.714rem] text-text-tertiary transition-opacity duration-150",
              // Fade the duration out when the mute button takes its corner.
              scene.audioUrl && (muted ? "opacity-0" : "group-hover:opacity-0"),
            )}
          >
            {(durationInFrames / fps).toFixed(1)}s
          </span>
        </div>

        {scene.audioUrl && (
          <>
            {/* Mute toggle at the top-right corner, same as audio clips. */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleMute(scene.id, !muted);
              }}
              title={muted ? "Unmute voiceover" : "Mute voiceover"}
              className={cx(
                "absolute right-2 top-2 z-10 flex items-center rounded text-purple/70 transition-opacity duration-150 hover:text-purple",
                muted ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            >
              {muted ? (
                <SpeakerMutedIcon className="size-3.5" />
              ) : (
                <SpeakerIcon className="size-3.5" />
              )}
            </button>
            <SceneWaveform
              url={scene.audioUrl}
              widthPx={widthPx}
              durationSec={durationInFrames / fps}
              selected={selected}
              muted={muted}
            />
          </>
        )}

        {/* Right-edge resize handle — drag to change the scene's length. */}
        <div
          onPointerDown={beginResize}
          onClick={(e) => e.stopPropagation()}
          title="Drag to change scene length"
          className={cx(
            "absolute inset-y-0 right-0 z-20 w-1.5 cursor-ew-resize transition-colors",
            draftFrames !== null ? "bg-purple" : "hover:bg-purple/60",
          )}
        />
      </div>
    </div>
  );
}

function Ruler({ totalSeconds, fps }: { totalSeconds: number; fps: number }) {
  const seconds = Math.max(1, Math.ceil(totalSeconds));
  const labelEvery = PX_PER_SECOND >= 48 ? 1 : 5;
  return (
    <>
      {Array.from({ length: seconds + 1 }, (_, s) => (
        <div
          key={s}
          className="absolute top-0 h-full"
          style={{ left: TRACK_PADDING + s * PX_PER_SECOND }}
        >
          <div className="h-1.5 w-px bg-border-strong" />
          {s % labelEvery === 0 && (
            <span className="absolute left-1 top-0 font-mono text-[0.643rem] leading-[14px] text-text-tertiary">
              {framesToTimecode(s * fps, fps).slice(0, 5)}
            </span>
          )}
          {/* half-second minor tick */}
          {s < seconds && (
            <div
              className="absolute top-0 h-1 w-px bg-border"
              style={{ left: PX_PER_SECOND / 2 }}
            />
          )}
        </div>
      ))}
    </>
  );
}

/**
 * Playhead indicator. Updates imperatively (no React re-render per frame):
 * while playing it runs its own rAF, deriving a CONTINUOUS sub-frame position
 * from the playback clock and writing a GPU `translateX` — smooth at the
 * display's refresh rate rather than stepping at the (lower) video fps. When
 * paused it snaps to the store frame. Also keeps itself in view.
 */
function Playhead({
  pxPerFrame,
  fps,
  totalFrames,
  scrollRef,
}: {
  pxPerFrame: number;
  fps: number;
  totalFrames: number;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const maxFrame = Math.max(0, totalFrames - 1);

    const apply = (f: number, smoothScroll: boolean) => {
      const x = TRACK_PADDING + f * pxPerFrame;
      el.style.transform = `translateX(${x}px)`;
      const scroller = scrollRef.current;
      if (scroller) {
        const margin = 80;
        if (
          x < scroller.scrollLeft + margin ||
          x > scroller.scrollLeft + scroller.clientWidth - margin
        ) {
          scroller.scrollTo({
            left: Math.max(0, x - margin),
            behavior: smoothScroll ? "smooth" : "auto",
          });
        }
      }
    };

    let raf = 0;
    let anchor = 0;
    let lastFrame = usePlaybackStore.getState().frame;
    let playing = usePlaybackStore.getState().isPlaying;

    const startLoop = () => {
      anchor = performance.now() - (usePlaybackStore.getState().frame / fps) * 1000;
      lastFrame = usePlaybackStore.getState().frame;
      const tick = () => {
        const s = usePlaybackStore.getState();
        if (!s.isPlaying) return;
        // Re-anchor if the frame was moved externally (seek/scrub mid-play).
        if (s.frame !== lastFrame) {
          anchor = performance.now() - (s.frame / fps) * 1000;
          lastFrame = s.frame;
        }
        const continuous = Math.min(((performance.now() - anchor) / 1000) * fps, maxFrame);
        apply(continuous, false);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    apply(usePlaybackStore.getState().frame, false);
    if (playing) startLoop();

    const unsubscribe = usePlaybackStore.subscribe((s) => {
      if (s.isPlaying && !playing) {
        playing = true;
        startLoop();
      } else if (!s.isPlaying && playing) {
        playing = false;
        cancelAnimationFrame(raf);
        apply(s.frame, true);
      } else if (!s.isPlaying) {
        // Paused scrubbing / jumps.
        apply(s.frame, true);
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      unsubscribe();
    };
  }, [pxPerFrame, fps, totalFrames, scrollRef]);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute left-0 top-0 z-10 h-full w-px bg-accent will-change-transform"
    >
      <div className="absolute -left-[5px] top-0 size-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-accent" />
    </div>
  );
}

export function Timeline({
  projectId,
  scenes,
  fps,
  sceneErrors,
  audioClips,
  onReorder,
  onDeleteScenes,
  onToggleMute,
  onResizeScene,
  onAddClip,
  onUpdateClip,
  onDeleteClip,
}: {
  projectId: string;
  scenes: SceneData[];
  fps: number;
  sceneErrors: Record<string, unknown>;
  audioClips: AudioClipData[];
  onReorder: (orderedIds: string[]) => void;
  onDeleteScenes: (ids: string[]) => void;
  onToggleMute: (sceneId: string, muted: boolean) => void;
  onResizeScene: (sceneId: string, durationInFrames: number) => void;
  onAddClip: (input: {
    url: string;
    assetId?: string;
    name?: string;
    startFrame: number;
    durationInFrames?: number;
    startFrom?: number;
    volume?: number;
    track: number;
  }) => void;
  onUpdateClip: (input: {
    clipId: string;
    startFrame?: number;
    durationInFrames?: number;
    startFrom?: number;
    volume?: number;
    track?: number;
  }) => void;
  onDeleteClip: (clipId: string) => void;
}) {
  const selectedSceneIds = useEditorStore((s) => s.selectedSceneIds);
  const selectScene = useEditorStore((s) => s.selectScene);
  const clearAllSelection = useEditorStore((s) => s.clearAllSelection);
  const pruneSelection = useEditorStore((s) => s.pruneSelection);
  const selectedAudioClipIds = useEditorStore((s) => s.selectedAudioClipIds);
  const pruneAudioClipSelection = useEditorStore(
    (s) => s.pruneAudioClipSelection,
  );
  const editingSceneIds = useEditorStore((s) => s.editingSceneIds);

  const seek = usePlaybackStore((s) => s.seek);
  const totalFrames = totalDurationInFrames(scenes);

  const { data: assets } = useProjectAssets(projectId);
  const audioAssets = (assets ?? [])
    .filter((a) => a.kind === "audio")
    .map((a) => ({
      id: a.id,
      url: a.url,
      filename: a.filename,
      durationSeconds: a.durationSeconds,
    }));

  const pxPerFrame = PX_PER_SECOND / fps;
  const trackWidth = Math.ceil(totalFrames * pxPerFrame) + TRACK_PADDING * 2;
  const sceneStarts = sceneStartFrames(scenes);
  // Pixel ranges of the selected scenes (timeline order). The first drives a
  // single persistent band that SLIDES between selections; any extras (from
  // multi-select) get their own static bands.
  const selectedRanges = scenes
    .map((s, i) => ({
      id: s.id,
      left: TRACK_PADDING + sceneStarts[i]! * pxPerFrame,
      width: s.durationInFrames * pxPerFrame,
    }))
    .filter((_, i) => selectedSceneIds.includes(scenes[i]!.id));
  const primaryBand = selectedRanges[0] ?? null;

  // Show every used audio lane plus one spare (to drop into), capped at the max.
  const usedTrack = audioClips.length
    ? Math.max(...audioClips.map((c) => c.track))
    : -1;
  const laneCount = Math.min(MAX_AUDIO_TRACKS, Math.max(1, usedTrack + 2));
  const timelineHeight =
    RULER_HEIGHT + SCENE_TRACK_HEIGHT + laneCount * AUDIO_LANE_HEIGHT + 2;

  useEffect(() => {
    pruneSelection(scenes.map((s) => s.id));
  }, [scenes, pruneSelection]);

  useEffect(() => {
    pruneAudioClipSelection(audioClips.map((c) => c.id));
  }, [audioClips, pruneAudioClipSelection]);

  // Delete/Backspace removes selected scenes and/or audio clips. Only bail when
  // the user is actively editing text — selecting a clip focuses the (empty)
  // chat input, and that shouldn't swallow the delete shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement;
      const isTextField =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const editing =
        target.isContentEditable ||
        (isTextField &&
          (target as HTMLInputElement | HTMLTextAreaElement).value.length > 0);
      if (editing) return;
      if (selectedAudioClipIds.length > 0) {
        e.preventDefault();
        for (const id of selectedAudioClipIds) onDeleteClip(id);
      }
      if (selectedSceneIds.length > 0) {
        e.preventDefault();
        onDeleteScenes(selectedSceneIds);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedSceneIds, selectedAudioClipIds, onDeleteScenes, onDeleteClip]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleSelect = useCallback(
    (id: string, additive: boolean) => {
      selectScene(id, additive);
      // Park the playhead at the start of the clicked scene.
      const index = scenes.findIndex((s) => s.id === id);
      if (index !== -1) {
        seek(sceneStartFrames(scenes)[index]!);
      }
    },
    [selectScene, scenes, seek],
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = scenes.findIndex((s) => s.id === active.id);
    const newIndex = scenes.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(scenes, oldIndex, newIndex).map((s) => s.id));
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const scrub = useCallback(
    (clientX: number) => {
      const content = contentRef.current;
      if (!content || totalFrames === 0) return;
      const rect = content.getBoundingClientRect();
      const x = clientX - rect.left - TRACK_PADDING;
      seek(Math.round(x / pxPerFrame));
    },
    [seek, totalFrames, pxPerFrame],
  );

  return (
    <div
      className="flex shrink-0 flex-row border-t border-border bg-surface"
      style={{ height: timelineHeight }}
    >
      {/* Sticky track headers — stay pinned while the track scrolls. */}
      <TrackHeaders audioHeight={laneCount * AUDIO_LANE_HEIGHT} />

      <div
        ref={scrollRef}
        className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
      >
        <div
          ref={contentRef}
          className="relative isolate flex h-full min-w-full flex-col"
          style={{ width: trackWidth || undefined }}
        >
          {/* Selected-scene highlight: one persistent purple band spanning the
              scene's time range across every track (sits behind the rows via
              -z-10). It animates left/width so selecting a different card slides
              the backdrop over instead of jumping. */}
          <div
            className="pointer-events-none absolute inset-y-0 -z-10 bg-purple/10 transition-[left,width,opacity] duration-300 ease-out"
            style={{
              left: primaryBand?.left ?? 0,
              width: primaryBand?.width ?? 0,
              opacity: primaryBand ? 1 : 0,
            }}
          />
          {/* Extra bands for any additional multi-selected scenes (static). */}
          {selectedRanges.slice(1).map((r) => (
            <div
              key={`hl-${r.id}`}
              className="pointer-events-none absolute inset-y-0 -z-10 bg-purple/10"
              style={{ left: r.left, width: r.width }}
            />
          ))}

          {/* Time scale */}
          <div
            className="relative shrink-0 cursor-col-resize"
            style={{ height: RULER_HEIGHT }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              scrub(e.clientX);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) scrub(e.clientX);
            }}
          >
            <Ruler totalSeconds={totalFrames / fps} fps={fps} />
          </div>

          {/* Scene track */}
          <div
            className="shrink-0 px-0"
            style={{ height: SCENE_TRACK_HEIGHT }}
            onClick={(e) => {
              if (e.target === e.currentTarget) clearAllSelection();
            }}
          >
            {scenes.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[0.857rem] text-text-tertiary">
                Scenes appear here as the AI creates them
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={scenes.map((s) => s.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div
                    className="flex h-full"
                    style={{
                      paddingLeft: TRACK_PADDING,
                      paddingRight: TRACK_PADDING,
                      paddingTop: TRACK_PADDING,
                      paddingBottom: SCENE_TRACK_PAD_BOTTOM,
                    }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) clearAllSelection();
                    }}
                  >
                    {scenes.map((scene) => (
                      <SceneBlock
                        key={scene.id}
                        scene={scene}
                        fps={fps}
                        pxPerFrame={pxPerFrame}
                        selected={selectedSceneIds.includes(scene.id)}
                        hasError={scene.id in sceneErrors}
                        editing={editingSceneIds.includes(scene.id)}
                        onSelect={handleSelect}
                        onToggleMute={onToggleMute}
                        onResize={onResizeScene}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Project-level audio lanes (music / ambience / sfx). */}
          <AudioLanes
            clips={audioClips}
            laneCount={laneCount}
            fps={fps}
            pxPerFrame={pxPerFrame}
            padding={TRACK_PADDING}
            totalFrames={totalFrames}
            audioAssets={audioAssets}
            onUpdate={onUpdateClip}
            onAdd={onAddClip}
          />

          {/* Playhead — self-updating, no per-frame Timeline re-render. */}
          {totalFrames > 0 && (
            <Playhead
              pxPerFrame={pxPerFrame}
              fps={fps}
              totalFrames={totalFrames}
              scrollRef={scrollRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}
