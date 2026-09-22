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
import { usePlaybackStore, usePlaybackStoreApi } from "@genmotion/player";
import { useTabActive } from "../../tabs/active-tab";
import { api } from "../../api";
import { TIMELINE_PX_PER_SECOND, type FilmstripData } from "../../../electron/shared";
import { useFilmstrip } from "../hooks/use-filmstrips";
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

/**
 * Fixed timeline scale: one second of video occupies exactly this many pixels.
 * Shared with the main process, which lays the scene filmstrips out to it.
 */
const PX_PER_SECOND = TIMELINE_PX_PER_SECOND;
/** Breathing room at both ends of the track; every time→pixel mapping adds it. */
const TRACK_PADDING = 12;
/** Row heights that make up the timeline's total height. */
const RULER_HEIGHT = 18;
/**
 * Scene track. Short on purpose: the timeline competes with the preview and
 * the chat for vertical space, and a scene card needs room for one line of
 * title and a waveform strip — not the two-and-a-half lines it used to have.
 */
const SCENE_TRACK_HEIGHT = 54;
/** Tight padding on the scene track so the audio lanes sit close under it. */
const SCENE_TRACK_PAD_TOP = 6;
const SCENE_TRACK_PAD_BOTTOM = 4;
/** Voiceover strip inside a scene card — the same height as an audio clip's. */
const SCENE_WAVEFORM_HEIGHT = 14;

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

/**
 * The scene's frames, behind everything else on the card.
 *
 * Drawn at the strip's natural size, left-aligned, so each tile sits over the
 * second it was sampled from — the card's `overflow-hidden` clips whatever
 * hangs past the end. While the right edge is being dragged the strip simply
 * gets clipped or leaves a gap; the main process rebuilds it for the new
 * length once the change lands, and the new image fades in over the old one
 * rather than popping — a rebuild happens after every edit the agent makes,
 * and a flicker on each would make the timeline the busiest thing on screen.
 */
function Filmstrip({ strip, selected }: { strip: FilmstripData; selected: boolean }) {
  // The URL that has finished decoding. The previous strip stays underneath
  // until the next one is ready to show.
  const [loaded, setLoaded] = useState<FilmstripData | null>(null);
  const shown = loaded && loaded.url !== strip.url ? loaded : null;
  const ready = loaded?.url === strip.url;
  const layer = (data: FilmstripData, className: string, onLoad?: () => void) => (
    <img
      key={data.url}
      src={data.url}
      alt=""
      draggable={false}
      decoding="async"
      onLoad={onLoad}
      className={cx(
        "pointer-events-none absolute left-0 top-0 h-full max-w-none select-none transition-opacity duration-300",
        className,
      )}
      style={{ width: data.count * data.tileWidth }}
    />
  );
  const tone = selected ? "opacity-45" : "opacity-35";
  return (
    <>
      {shown && layer(shown, tone)}
      {layer(strip, ready ? tone : "opacity-0", () => setLoaded(strip))}
    </>
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
      heightPx={SCENE_WAVEFORM_HEIGHT}
      selected={selected}
      selectedClassName="text-purple"
      inactiveClassName="text-purple/60"
      className={cx("pointer-events-none mt-auto shrink-0", muted && "opacity-40")}
    />
  );
}

/** Smallest a scene can be trimmed to by dragging — a fifth of a second. */
const MIN_SCENE_FRAMES_FACTOR = 0.2;

function SceneBlock({
  projectId,
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
  projectId: string;
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
  const filmstrip = useFilmstrip(projectId, scene.id);

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
        {filmstrip && <Filmstrip strip={filmstrip} selected={selected} />}

        {/* Title (left) + duration (top-right, aligned with the title) */}
        <div className="relative flex items-center justify-between gap-2 px-2 pt-1">
          {/* White over the filmstrip: the frames underneath are any colour,
              and the purple the card used to carry vanished into them. The
              shadow keeps it legible over a light frame. */}
          <span
            className={cx(
              "flex min-w-0 items-center gap-1 text-[0.857rem] font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]",
              selected ? "text-white" : "text-white/85",
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
              "shrink-0 font-mono text-[0.714rem] text-white/70 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] transition-opacity duration-150",
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
                "absolute right-2 top-1 z-10 flex items-center rounded text-purple/70 transition-opacity duration-150 hover:text-purple",
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
  const trailRef = useRef<HTMLDivElement>(null);
  const playback = usePlaybackStoreApi();

  // Length of the light trail: a bit over a third of a second of travel,
  // derived from the scale rather than hardcoded so it still reads right if
  // PX_PER_SECOND changes. Enough to register as motion out of the corner of
  // your eye, short enough that it never reads as a smear following the head.
  const trailPx = Math.round(pxPerFrame * fps * 0.36);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const maxFrame = Math.max(0, totalFrames - 1);

    // The trail is decoration on top of motion the user already asked for, so
    // it's the first thing to drop when they've asked for less of it.
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    /** Light up the head while it's travelling; go flat the moment it stops. */
    const setMoving = (on: boolean) => {
      const lit = on && !reduceMotion;
      if (trailRef.current) trailRef.current.style.opacity = lit ? "1" : "0";
      el.style.boxShadow = lit
        ? "0 0 10px 0 color-mix(in srgb, var(--color-accent) 55%, transparent)"
        : "none";
    };

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
    let lastFrame = playback.getState().frame;
    let playing = playback.getState().isPlaying;

    const startLoop = () => {
      setMoving(true);
      anchor = performance.now() - (playback.getState().frame / fps) * 1000;
      lastFrame = playback.getState().frame;
      const tick = () => {
        const s = playback.getState();
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

    apply(playback.getState().frame, false);
    if (playing) startLoop();

    // Fires on EVERY store write, not just this component's slice of it — so
    // the paused branch has to check that the frame actually moved. Hovering
    // the timeline writes `hoverFrame` every couple of pixels, and without this
    // each of those (and the reset when the pointer leaves) would scroll the
    // playhead back into view, dragging the track out from under whatever the
    // user had scrolled to look at.
    const unsubscribe = playback.subscribe((s) => {
      if (s.isPlaying && !playing) {
        playing = true;
        startLoop();
      } else if (!s.isPlaying && playing) {
        playing = false;
        cancelAnimationFrame(raf);
        setMoving(false);
        lastFrame = s.frame;
        apply(s.frame, true);
      } else if (!s.isPlaying && s.frame !== lastFrame) {
        // Paused scrubbing / jumps.
        lastFrame = s.frame;
        apply(s.frame, true);
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      setMoving(false);
      unsubscribe();
    };
  }, [pxPerFrame, fps, totalFrames, scrollRef, playback]);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute left-0 top-0 z-10 h-full w-px bg-accent transition-shadow duration-200 will-change-transform"
    >
      {/* Light trail. It rides the same transform as the head, so it costs no
          per-frame work — only the opacity flips, on play and on pause. It
          extends left because playback only ever travels right; `transition-
          shadow` above is deliberate, since transitioning transform would
          fight the rAF loop. */}
      <div
        ref={trailRef}
        aria-hidden
        className="absolute right-0 top-0 h-full opacity-0 transition-opacity duration-200 ease-out"
        style={{
          width: trailPx,
          background:
            "linear-gradient(to left, color-mix(in srgb, var(--color-accent) 20%, transparent), transparent)",
        }}
      />
      <div className="absolute -left-[5px] top-0 size-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-accent" />
    </div>
  );
}

/** Width of the hover timecode badge, near enough for the edge-flip test. */
const HOVER_BADGE_WIDTH = 40;

/**
 * Ghost playhead: where the pointer is, in red, distinct from the accent-blue
 * playhead that marks where time actually is. Quantised to the frame it names,
 * so the line sits exactly on the frame the preview is showing.
 *
 * It subscribes to the store itself rather than taking the frame as a prop.
 * Hovering crosses a frame boundary every couple of pixels, and reading it in
 * Timeline would re-render every scene block and every audio clip that often —
 * the same reason the playhead moves itself.
 */
function HoverIndicator({
  pxPerFrame,
  fps,
  trackWidth,
}: {
  pxPerFrame: number;
  fps: number;
  trackWidth: number;
}) {
  const frame = usePlaybackStore((s) => s.hoverFrame);
  if (frame === null) return null;

  const x = TRACK_PADDING + frame * pxPerFrame;
  // Near the right edge the badge would be cut off by the track, so it hangs
  // off the other side of the line instead.
  const flip = x + HOVER_BADGE_WIDTH + 6 > trackWidth;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-10 h-full w-px bg-scrub"
      style={{ transform: `translateX(${x}px)` }}
    >
      <div className="absolute -left-[4px] top-0 size-0 border-x-[4px] border-t-[5px] border-x-transparent border-t-scrub" />
      {/* The time under the pointer, offset off the line so the cursor doesn't
          cover it. */}
      <span
        className="absolute top-0 whitespace-nowrap rounded-sm bg-scrub px-1 font-mono text-[0.643rem] leading-[14px] text-background"
        style={flip ? { right: 4 } : { left: 4 }}
      >
        {framesToTimecode(frame, fps).slice(0, 5)}
      </span>
    </div>
  );
}

/** What the slice tool is pointing at: the clip, its box, and where the cut would land. */
interface SliceTarget {
  kind: "scene" | "clip";
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Frames from the clip's start to the cut. */
  atFrame: number;
  /** Pixel offset of the cut within the box. */
  cutX: number;
}

/**
 * The slice tool's surface: a sheet over the scene track and audio lanes
 * that reads the pointer, shows what a click would cut, and makes the cut.
 *
 * A sheet rather than handlers on each block, because a block's pointer is
 * already spoken for — sortable drag on a scene, move and trim on a clip —
 * and slicing should replace all of that while the tool is active, not
 * compete with it. Everything under the sheet keeps rendering; only the
 * pointer changes hands.
 *
 * The marking is in the scrub red, the colour the timeline already uses for
 * "where the pointer is": a frame around the clip, a line at the cut, and a
 * tint over the part that becomes the new clip.
 */
function SliceOverlay({
  scenes,
  audioClips,
  pxPerFrame,
  laneCount,
  onSplitScene,
  onSplitClip,
}: {
  scenes: SceneData[];
  audioClips: AudioClipData[];
  pxPerFrame: number;
  laneCount: number;
  onSplitScene: (sceneId: string, atFrame: number) => void;
  onSplitClip: (clipId: string, atFrame: number) => void;
}) {
  const [target, setTarget] = useState<SliceTarget | null>(null);
  const sceneStarts = sceneStartFrames(scenes);

  function locate(e: { currentTarget: HTMLDivElement; clientX: number; clientY: number }): SliceTarget | null {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const frame = Math.round((x - TRACK_PADDING) / pxPerFrame);

    if (y < SCENE_TRACK_HEIGHT) {
      const index = scenes.findIndex(
        (scene, i) => frame >= sceneStarts[i]! && frame < sceneStarts[i]! + scene.durationInFrames,
      );
      const scene = scenes[index];
      if (!scene) return null;
      const atFrame = frame - sceneStarts[index]!;
      if (atFrame < 1 || atFrame >= scene.durationInFrames) return null;
      return {
        kind: "scene",
        id: scene.id,
        left: TRACK_PADDING + sceneStarts[index]! * pxPerFrame,
        top: SCENE_TRACK_PAD_TOP,
        width: scene.durationInFrames * pxPerFrame,
        height: SCENE_TRACK_HEIGHT - SCENE_TRACK_PAD_TOP - SCENE_TRACK_PAD_BOTTOM,
        atFrame,
        cutX: atFrame * pxPerFrame,
      };
    }

    const lane = Math.floor((y - SCENE_TRACK_HEIGHT) / AUDIO_LANE_HEIGHT);
    if (lane < 0 || lane >= laneCount) return null;
    const clip = audioClips.find(
      (c) => c.track === lane && frame >= c.startFrame && frame < c.startFrame + c.durationInFrames,
    );
    if (!clip) return null;
    const atFrame = frame - clip.startFrame;
    if (atFrame < 1 || atFrame >= clip.durationInFrames) return null;
    return {
      kind: "clip",
      id: clip.id,
      left: TRACK_PADDING + clip.startFrame * pxPerFrame,
      top: SCENE_TRACK_HEIGHT + lane * AUDIO_LANE_HEIGHT + 2,
      width: clip.durationInFrames * pxPerFrame,
      height: AUDIO_LANE_HEIGHT - 4,
      atFrame,
      cutX: atFrame * pxPerFrame,
    };
  }

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-[5] cursor-crosshair"
      style={{ top: RULER_HEIGHT }}
      onPointerMove={(e) => setTarget(locate(e))}
      onPointerLeave={() => setTarget(null)}
      onClick={(e) => {
        const hit = locate(e);
        if (!hit) return;
        setTarget(null);
        if (hit.kind === "scene") onSplitScene(hit.id, hit.atFrame);
        else onSplitClip(hit.id, hit.atFrame);
      }}
    >
      {target && (
        <div
          className="pointer-events-none absolute overflow-hidden rounded-md border border-scrub"
          style={{
            left: target.left,
            top: target.top,
            width: target.width,
            height: target.height,
          }}
        >
          {/* The half that becomes a new clip. */}
          <div
            className="absolute inset-y-0 right-0 bg-scrub/20"
            style={{ left: target.cutX }}
          />
          {/* The cut itself. */}
          <div
            className="absolute inset-y-0 w-0.5 -translate-x-px bg-scrub"
            style={{ left: target.cutX }}
          />
        </div>
      )}
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
  onSplitScene,
  onSplitClip,
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
    fadeInFrames?: number;
    fadeOutFrames?: number;
    muted?: boolean;
    track?: number;
  }) => void;
  onDeleteClip: (clipId: string) => void;
  onSplitScene: (sceneId: string, atFrame: number) => void;
  onSplitClip: (clipId: string, atFrame: number) => void;
}) {
  const timelineTool = useEditorStore((s) => s.timelineTool);
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
  const tabActive = useTabActive();
  const totalFrames = totalDurationInFrames(scenes);

  // Tell the main process when this project is playing. Its background
  // rendering — the scene filmstrips — waits for a pause, so it never fights
  // playback for the GPU. Subscribed rather than selected: a play/pause must
  // not re-render the whole timeline.
  const playback = usePlaybackStoreApi();
  useEffect(() => {
    let playing = playback.getState().isPlaying;
    api.setPlaybackState(projectId, playing);
    const unsubscribe = playback.subscribe((state) => {
      if (state.isPlaying === playing) return;
      playing = state.isPlaying;
      api.setPlaybackState(projectId, playing);
    });
    return () => {
      unsubscribe();
      api.setPlaybackState(projectId, false);
    };
  }, [playback, projectId]);

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
  // chat input, and that shouldn't swallow the delete shortcut. And only in
  // the tab in front: every open project's timeline is mounted, each keeping
  // its own selection, and one press must not delete across all of them.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!tabActive) return;
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
  }, [selectedSceneIds, selectedAudioClipIds, onDeleteScenes, onDeleteClip, tabActive]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Selecting a scene deliberately leaves the playhead alone — picking a scene
  // to edit is not a request to move the preview off wherever you had it.
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

  const frameAt = useCallback(
    (clientX: number): number | null => {
      const content = contentRef.current;
      if (!content || totalFrames === 0) return null;
      const rect = content.getBoundingClientRect();
      return Math.round((clientX - rect.left - TRACK_PADDING) / pxPerFrame);
    },
    [totalFrames, pxPerFrame],
  );

  const scrub = useCallback(
    (clientX: number) => {
      const frame = frameAt(clientX);
      if (frame !== null) seek(frame);
    },
    [seek, frameAt],
  );

  const setHoverFrame = usePlaybackStore((s) => s.setHoverFrame);

  // The pointer leaving the window (or the timeline unmounting mid-hover) never
  // fires pointerleave, and a stale hover frame would pin the preview to it.
  useEffect(() => () => setHoverFrame(null), [setHoverFrame]);

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
          onPointerMove={(e) => setHoverFrame(frameAt(e.clientX))}
          onPointerLeave={() => setHoverFrame(null)}
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
            // select-none: this row is a scrub surface, and a drag across it
            // would otherwise highlight the timecode labels it passes over.
            className="relative shrink-0 cursor-col-resize select-none"
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
                      paddingTop: SCENE_TRACK_PAD_TOP,
                      paddingBottom: SCENE_TRACK_PAD_BOTTOM,
                    }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) clearAllSelection();
                    }}
                  >
                    {scenes.map((scene) => (
                      <SceneBlock
                        key={scene.id}
                        projectId={projectId}
                        scene={scene}
                        fps={fps}
                        pxPerFrame={pxPerFrame}
                        selected={selectedSceneIds.includes(scene.id)}
                        hasError={scene.id in sceneErrors}
                        editing={editingSceneIds.includes(scene.id)}
                        onSelect={selectScene}
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
            projectId={projectId}
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

          {/* Slicing takes the pointer over from the blocks while its tool is up. */}
          {timelineTool === "slice" && totalFrames > 0 && (
            <SliceOverlay
              scenes={scenes}
              audioClips={audioClips}
              pxPerFrame={pxPerFrame}
              laneCount={laneCount}
              onSplitScene={onSplitScene}
              onSplitClip={onSplitClip}
            />
          )}

          {/* Ghost playhead under the pointer. Above the tracks, below the real
              playhead — where they coincide, the one that owns the time wins. */}
          {totalFrames > 0 && (
            <HoverIndicator
              pxPerFrame={pxPerFrame}
              fps={fps}
              trackWidth={trackWidth}
            />
          )}

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
