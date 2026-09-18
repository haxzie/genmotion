"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePlaybackStore, usePlaybackStoreApi } from "@genmotion/player";
import { framesToTimecode, globalToLocal } from "@genmotion/shared";
import { api } from "@/lib/api";
import {
  useEditorStore,
  type ElementContext,
  type MarkupContext,
  type MarkupMarkContext,
} from "@/stores/editor-store";

/** Hot pink: the Draw tool's ink, the same colour the saved picture wears. */
const INK = "#ff2d75";
/** Comment-bubble footprint, used to keep it inside the preview. */
const BUBBLE_W = 300;
const BUBBLE_H = 68;
/** Pointer travel (composition px) before a press counts as a stroke. */
const MIN_STROKE = 4;

interface Point {
  x: number;
  y: number;
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** One stroke, in composition pixels. */
interface Mark {
  n: number;
  kind: "pen" | "rect";
  points: Point[];
}

/** Where the frame's pixels land inside the layer: centred, scaled to fit. */
interface Placement {
  scale: number;
  box: Box;
}

function bounds(points: Point[]): Box {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
}

function SendGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

/**
 * The Draw tool: mark the frame up, then say what the marks mean.
 *
 * Lays over the stage and takes the pointer while it is up. A drag is a
 * freehand stroke (a rectangle with Shift held); each one is numbered as it
 * lands. The first stroke opens the same comment bubble the inspector uses;
 * sending asks the main process to render the frame with the marks burned
 * in, attaches the picture — plus each mark's box and whatever the stage
 * found under it — as chat context, and sends the note.
 *
 * Strokes are kept in composition pixels from the first point, so a window
 * resize mid-thought re-scales them with the frame instead of drifting.
 * `resolveElements` is the stage's own hit test, in stage pixels — the React
 * preview can walk its DOM, the HyperFrames iframe cannot, so it is optional.
 */
export function PreviewMarkup({
  projectId,
  width,
  height,
  fps,
  scenes,
  resolveElements,
}: {
  projectId: string;
  width: number;
  height: number;
  fps: number;
  /** The scene chips, in order — a mark is attributed to the one under the playhead. */
  scenes: { id: string; name: string; durationInFrames: number }[];
  resolveElements?: (area: Box) => Pick<ElementContext, "elementId" | "tag" | "text">[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [current, setCurrent] = useState<Mark | null>(null);
  const [anchor, setAnchor] = useState<Point | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noteRef = useRef<HTMLInputElement>(null);

  const addMarkup = useEditorStore((s) => s.addMarkup);
  const requestPrompt = useEditorStore((s) => s.requestPrompt);
  const playback = usePlaybackStoreApi();
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const frame = usePlaybackStore((s) => s.frame);

  // The same fit the Player and the HyperFrames stage compute for the frame,
  // measured off this layer since it fills the same box they do.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width: cw, height: ch } = entry.contentRect;
      const scale = Math.min(cw / width, ch / height);
      setPlacement({
        scale,
        box: {
          left: (cw - width * scale) / 2,
          top: (ch - height * scale) / 2,
          width: width * scale,
          height: height * scale,
        },
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height]);

  // Playback resumed under the marks — they no longer sit on the frame they
  // were drawn on, so drop them.
  useEffect(() => {
    if (isPlaying) reset();
  }, [isPlaying]);

  useEffect(() => {
    if (anchor) noteRef.current?.focus();
  }, [anchor]);

  function reset() {
    setMarks([]);
    setCurrent(null);
    setAnchor(null);
    setNote("");
    setError(null);
  }

  /** Pointer → composition pixels, clamped to the frame. */
  function toComposition(clientX: number, clientY: number): Point {
    const c = ref.current!.getBoundingClientRect();
    const p = placement!;
    return {
      x: Math.max(0, Math.min(width, (clientX - c.left - p.box.left) / p.scale)),
      y: Math.max(0, Math.min(height, (clientY - c.top - p.box.top) / p.scale)),
    };
  }

  /** Composition → stage pixels (this layer's own coordinate space). */
  function toStage(p: Point): Point {
    const { scale, box } = placement!;
    return { x: box.left + p.x * scale, y: box.top + p.y * scale };
  }

  function stageBox(b: Box): Box {
    const { scale } = placement!;
    const o = toStage({ x: b.left, y: b.top });
    return { left: o.x, top: o.y, width: b.width * scale, height: b.height * scale };
  }

  function finishStroke(mark: Mark, at: Point) {
    const b = bounds(mark.points);
    // A press that never travelled is a click, not a mark.
    if (Math.max(b.width, b.height) < MIN_STROKE) return;
    setMarks((prev) => [...prev, { ...mark, n: prev.length + 1 }]);
    setAnchor(at);
    setError(null);
  }

  async function commit() {
    if (marks.length === 0 || sending || !placement) return;
    setSending(true);
    setError(null);
    try {
      const saved = await api<{ path: string; width: number; height: number }>(
        `/api/projects/${projectId}/markup`,
        { json: { frame, marks } },
      );
      const mapping = globalToLocal(scenes, frame);
      const scene = mapping ? scenes[mapping.sceneIndex] : null;
      const context: MarkupContext = {
        id: crypto.randomUUID(),
        label: `Markup · ${marks.length} mark${marks.length === 1 ? "" : "s"}`,
        path: saved.path,
        width: saved.width,
        height: saved.height,
        sceneId: scene?.id ?? null,
        sceneName: scene?.name ?? "scene",
        timecode: framesToTimecode(frame, fps),
        marks: marks.map((mark): MarkupMarkContext => {
          const box = bounds(mark.points);
          const found = resolveElements?.(stageBox(box)) ?? [];
          // One element once, however many strokes crossed it.
          const seen = new Set<string>();
          const elements = found.filter((e) => {
            const key = e.elementId ? `#${e.elementId}` : `${e.tag}|${e.text}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return { n: mark.n, kind: mark.kind, box, elements };
        }),
      };
      addMarkup(context);
      const text = note.trim();
      if (text) requestPrompt(text);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't capture the frame");
    } finally {
      setSending(false);
    }
  }

  const ready = placement !== null && placement.scale > 0;
  const bubble = (() => {
    if (!anchor || !ref.current) return null;
    const c = ref.current.getBoundingClientRect();
    const at = toStage(anchor);
    const left = Math.max(8, Math.min(at.x + 10, c.width - BUBBLE_W - 8));
    const below = at.y + 14;
    const top = below + BUBBLE_H + 8 <= c.height ? below : Math.max(8, at.y - BUBBLE_H - 14);
    return { left, top };
  })();
  const timecode = framesToTimecode(frame, fps);
  const strokeProps = {
    fill: "none",
    stroke: INK,
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke",
  };

  return (
    <div
      ref={ref}
      data-gm-markup
      className="absolute inset-0 z-30 cursor-crosshair select-none touch-none"
      onPointerDown={(e) => {
        if (e.button !== 0 || !ready) return;
        // Hold the frame still under the strokes.
        playback.getState().pause();
        const p = toComposition(e.clientX, e.clientY);
        setCurrent({ n: 0, kind: e.shiftKey ? "rect" : "pen", points: [p] });
        ref.current?.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!current) return;
        const p = toComposition(e.clientX, e.clientY);
        setCurrent((m) => {
          if (!m) return m;
          // A rectangle is its two corners; a pen stroke is every point.
          return m.kind === "rect"
            ? { ...m, points: [m.points[0]!, p] }
            : { ...m, points: [...m.points, p] };
        });
      }}
      onPointerUp={(e) => {
        try {
          ref.current?.releasePointerCapture(e.pointerId);
        } catch {
          /* capture may already be gone */
        }
        if (!current) return;
        const last = current.points[current.points.length - 1]!;
        finishStroke(current, last);
        setCurrent(null);
      }}
    >
      {ready && (
        <svg
          className="pointer-events-none absolute"
          style={{
            left: placement.box.left,
            top: placement.box.top,
            width: placement.box.width,
            height: placement.box.height,
          }}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          {[...marks, ...(current ? [current] : [])].map((mark, i) => {
            if (mark.kind === "rect" && mark.points.length >= 2) {
              const b = bounds(mark.points);
              return <rect key={i} {...strokeProps} x={b.left} y={b.top} width={b.width} height={b.height} />;
            }
            return (
              <path
                key={i}
                {...strokeProps}
                d={mark.points.map((p, j) => `${j === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ")}
              />
            );
          })}
        </svg>
      )}

      {/* Each mark's number, at its top-left — the same badge the saved picture carries. */}
      {ready &&
        marks.map((mark) => {
          const b = bounds(mark.points);
          const at = toStage({ x: b.left, y: b.top });
          return (
            <div
              key={mark.n}
              className="pointer-events-none absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[0.7rem] font-bold text-white"
              style={{ left: at.x, top: at.y, background: INK, boxShadow: `0 0 0 2px ${INK}44` }}
            >
              {mark.n}
            </div>
          );
        })}

      {bubble && (
        <form
          style={{ left: bubble.left, top: bubble.top, width: BUBBLE_W, borderColor: `${INK}80` }}
          className="absolute z-40 flex cursor-auto select-text flex-col gap-1 rounded-xl border bg-surface/95 px-2.5 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-md"
          // The bubble sits inside the layer — keep its pointer events from
          // starting a stroke underneath.
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onSubmit={(e) => {
            e.preventDefault();
            void commit();
          }}
        >
          <span className="truncate text-[0.786rem]" style={{ color: INK }}>
            {marks.length} mark{marks.length === 1 ? "" : "s"}
            <span className="opacity-70"> · {timecode} · keep drawing, or send</span>
          </span>
          <div className="flex items-center gap-2">
            <input
              ref={noteRef}
              value={note}
              disabled={sending}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation(); // don't let Escape clear the chat's pills
                if (e.key === "Escape") reset();
              }}
              placeholder="What should change here?"
              className="min-w-0 flex-1 bg-transparent text-[0.929rem] text-text-primary outline-none placeholder:text-text-tertiary disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending}
              aria-label={note.trim() ? "Send" : "Add to chat context"}
              title={note.trim() ? "Send (⏎)" : "Add to chat context (⏎)"}
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cta text-background transition-colors hover:bg-cta-hover disabled:opacity-60"
            >
              {sending ? (
                <span className="size-3.5 animate-spin rounded-full border-2 border-background/40 border-t-background" />
              ) : (
                <SendGlyph />
              )}
            </button>
          </div>
          {error && <span className="text-[0.786rem] text-danger">{error}</span>}
        </form>
      )}
    </div>
  );
}
