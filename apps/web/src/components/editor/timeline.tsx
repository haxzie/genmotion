"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
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
  type SceneData,
} from "@genmotion/shared";
import { useEditorStore } from "@/stores/editor-store";
import { cx } from "@/components/ui";
import { SceneIcon } from "./scene-icon";
import { useWaveform } from "@/hooks/use-waveform";

/** Fixed timeline scale: one second of video occupies exactly this many pixels. */
const PX_PER_SECOND = 60;
/** Breathing room at both ends of the track; every time→pixel mapping adds it. */
const TRACK_PADDING = 12;

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

/** Voiceover amplitude strip shown at the bottom of a scene block. */
function SceneWaveform({
  url,
  widthPx,
  selected,
  muted,
  onToggleMute,
}: {
  url: string;
  widthPx: number;
  selected: boolean;
  muted: boolean;
  onToggleMute: () => void;
}) {
  // One line per ~2.5px of block width, so longer scenes show more detail.
  const barCount = Math.max(8, Math.min(160, Math.floor((widthPx - 12) / 2.5)));
  const peaks = useWaveform(url, barCount);
  const bars = peaks ?? Array.from({ length: barCount }, () => 0.06);
  return (
    <div className="mt-auto flex h-7 shrink-0 items-stretch gap-1 overflow-hidden p-1.5">
      <div className={cx("flex flex-1 items-stretch", muted && "opacity-40")}>
        {bars.map((p, i) => (
          <div key={i} className="flex flex-1 items-center justify-center">
            <span
              className={cx(
                "w-px rounded-full",
                selected ? "bg-green" : "bg-text-tertiary",
              )}
              style={{ height: `${Math.max(7, p * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}
        title={muted ? "Unmute voiceover" : "Mute voiceover"}
        className={cx(
          "flex shrink-0 items-center self-center text-text-tertiary transition-opacity duration-150 hover:text-text-primary",
          muted ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        {muted ? (
          <SpeakerMutedIcon className="size-3.5" />
        ) : (
          <SpeakerIcon className="size-3.5" />
        )}
      </button>
    </div>
  );
}

function SceneBlock({
  scene,
  widthPx,
  fps,
  selected,
  hasError,
  onSelect,
  onToggleMute,
}: {
  scene: SceneData;
  widthPx: number;
  fps: number;
  selected: boolean;
  hasError: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onToggleMute: (sceneId: string, muted: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });
  const muted = (scene.audioVolume ?? 1) <= 0;

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
          "group mx-px flex h-full cursor-grab select-none flex-col overflow-hidden rounded-md border transition-colors duration-150",
          selected
            ? "border-green bg-green-muted"
            : hasError
              ? "border-danger/50 bg-danger/10 hover:border-danger"
              : "border-border bg-surface-raised hover:border-border-strong hover:bg-surface-hover",
          isDragging && "shadow-lg",
        )}
      >
        {/* Title (left) + duration (top-right, aligned with the title) */}
        <div className="flex items-center justify-between gap-2 px-2 pt-2">
          <span
            className={cx(
              "flex min-w-0 items-center gap-1 text-[0.857rem] font-medium",
              selected ? "text-green" : "text-text-primary",
            )}
          >
            <SceneIcon className="size-3.5 shrink-0" />
            <span className="truncate">
              {hasError && "⚠ "}
              {scene.name}
            </span>
          </span>
          <span className="shrink-0 font-mono text-[0.714rem] text-text-tertiary">
            {(scene.durationInFrames / fps).toFixed(1)}s
          </span>
        </div>

        {scene.audioUrl && (
          <SceneWaveform
            url={scene.audioUrl}
            widthPx={widthPx}
            selected={selected}
            muted={muted}
            onToggleMute={() => onToggleMute(scene.id, !muted)}
          />
        )}
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
  scenes,
  fps,
  sceneErrors,
  onReorder,
  onDeleteScenes,
  onToggleMute,
}: {
  scenes: SceneData[];
  fps: number;
  sceneErrors: Record<string, unknown>;
  onReorder: (orderedIds: string[]) => void;
  onDeleteScenes: (ids: string[]) => void;
  onToggleMute: (sceneId: string, muted: boolean) => void;
}) {
  const selectedSceneIds = useEditorStore((s) => s.selectedSceneIds);
  const selectScene = useEditorStore((s) => s.selectScene);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const pruneSelection = useEditorStore((s) => s.pruneSelection);

  const seek = usePlaybackStore((s) => s.seek);
  const totalFrames = totalDurationInFrames(scenes);

  const pxPerFrame = PX_PER_SECOND / fps;
  const trackWidth = Math.ceil(totalFrames * pxPerFrame) + TRACK_PADDING * 2;

  useEffect(() => {
    pruneSelection(scenes.map((s) => s.id));
  }, [scenes, pruneSelection]);

  // Delete/Backspace removes selected scenes (when not typing).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedSceneIds.length > 0
      ) {
        e.preventDefault();
        onDeleteScenes(selectedSceneIds);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedSceneIds, onDeleteScenes]);

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
    <div className="flex h-40 shrink-0 flex-col border-t border-border bg-surface">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden"
      >
        <div
          ref={contentRef}
          className="relative flex h-full min-w-full flex-col"
          style={{ width: trackWidth || undefined }}
        >
          {/* Time scale */}
          <div
            className="relative h-[18px] shrink-0 cursor-col-resize"
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
            className="min-h-0 flex-1 px-0"
            onClick={(e) => {
              if (e.target === e.currentTarget) clearSelection();
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
                    style={{ padding: TRACK_PADDING }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) clearSelection();
                    }}
                  >
                    {scenes.map((scene) => (
                      <SceneBlock
                        key={scene.id}
                        scene={scene}
                        fps={fps}
                        widthPx={scene.durationInFrames * pxPerFrame}
                        selected={selectedSceneIds.includes(scene.id)}
                        hasError={scene.id in sceneErrors}
                        onSelect={handleSelect}
                        onToggleMute={onToggleMute}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

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
