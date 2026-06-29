"use client";

import { useCallback, useEffect, useRef } from "react";
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

/** Fixed timeline scale: one second of video occupies exactly this many pixels. */
const PX_PER_SECOND = 60;
/** Breathing room at both ends of the track; every time→pixel mapping adds it. */
const TRACK_PADDING = 12;

function SceneBlock({
  scene,
  widthPx,
  fps,
  selected,
  hasError,
  onSelect,
}: {
  scene: SceneData;
  widthPx: number;
  fps: number;
  selected: boolean;
  hasError: boolean;
  onSelect: (id: string, additive: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        width: widthPx,
        flexShrink: 0,
      }}
      className={cx("h-full py-1", isDragging && "z-10 opacity-80")}
      onClick={(e) => onSelect(scene.id, e.shiftKey)}
      {...attributes}
      {...listeners}
    >
      <div
        className={cx(
          "mx-px flex h-full cursor-grab select-none flex-col justify-between overflow-hidden rounded-md border p-2 transition-colors duration-150",
          selected
            ? "border-green bg-green-muted"
            : hasError
              ? "border-danger/50 bg-danger/10 hover:border-danger"
              : "border-border bg-surface-raised hover:border-border-strong hover:bg-surface-hover",
          isDragging && "shadow-lg",
        )}
      >
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
        <span className="flex items-center gap-1 truncate font-mono text-[0.714rem] text-text-tertiary">
          {(scene.durationInFrames / fps).toFixed(1)}s
          {scene.audioUrl && (
            <svg viewBox="0 0 16 16" className="size-3 shrink-0" fill="currentColor" aria-label="Has voiceover">
              <path d="M8 2.5a.6.6 0 0 0-1 .45L4.8 5H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1.8L7 13.05a.6.6 0 0 0 1-.45V2.5Z" />
              <path d="M10.2 5.6a.55.55 0 0 1 .78 0 3.4 3.4 0 0 1 0 4.8.55.55 0 1 1-.78-.78 2.3 2.3 0 0 0 0-3.24.55.55 0 0 1 0-.78Z" />
              <path d="M11.9 3.9a.55.55 0 0 1 .78 0 5.8 5.8 0 0 1 0 8.2.55.55 0 1 1-.78-.78 4.7 4.7 0 0 0 0-6.64.55.55 0 0 1 0-.78Z" />
            </svg>
          )}
        </span>
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

export function Timeline({
  scenes,
  fps,
  sceneErrors,
  onReorder,
  onDeleteScenes,
}: {
  scenes: SceneData[];
  fps: number;
  sceneErrors: Record<string, unknown>;
  onReorder: (orderedIds: string[]) => void;
  onDeleteScenes: (ids: string[]) => void;
}) {
  const selectedSceneIds = useEditorStore((s) => s.selectedSceneIds);
  const selectScene = useEditorStore((s) => s.selectScene);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const pruneSelection = useEditorStore((s) => s.pruneSelection);

  const frame = usePlaybackStore((s) => s.frame);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const seek = usePlaybackStore((s) => s.seek);
  const totalFrames = totalDurationInFrames(scenes);

  const pxPerFrame = PX_PER_SECOND / fps;
  const trackWidth = Math.ceil(totalFrames * pxPerFrame) + TRACK_PADDING * 2;
  const playheadX = TRACK_PADDING + frame * pxPerFrame;

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

  // Keep the playhead in view: smooth-scroll on seeks/jumps, follow during playback.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const margin = 80;
    if (
      playheadX < scroller.scrollLeft + margin ||
      playheadX > scroller.scrollLeft + scroller.clientWidth - margin
    ) {
      scroller.scrollTo({
        left: Math.max(0, playheadX - margin),
        // Smooth for deliberate seeks; instant while following live playback
        // (re-issuing smooth scrolls every frame would stutter).
        behavior: isPlaying ? "auto" : "smooth",
      });
    }
  }, [playheadX, isPlaying]);

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
            className="relative h-[18px] shrink-0 cursor-col-resize border-b border-border"
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
                    style={{ paddingLeft: TRACK_PADDING, paddingRight: TRACK_PADDING }}
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
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Playhead */}
          {totalFrames > 0 && (
            <div
              className="pointer-events-none absolute top-0 z-10 h-full w-px bg-accent"
              style={{ left: playheadX }}
            >
              <div className="absolute -left-[5px] top-0 size-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-accent" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
