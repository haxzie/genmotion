"use client";

import { useEffect, useRef, useState } from "react";
import { usePlaybackStore, type CompiledScene } from "@genmotion/player";
import { framesToTimecode, globalToLocal } from "@genmotion/shared";
import { useEditorStore, type ElementContext } from "@/stores/editor-store";

/** Purple, react-grab style. */
const HILITE = "#a855f7";
/** Pointer travel (px) before a press becomes a marquee drag rather than a click. */
const DRAG_THRESHOLD = 5;
/** Comment-bubble footprint, used to keep it inside the preview. */
const BUBBLE_W = 300;
const BUBBLE_H = 68;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

function rectFromPoints(a: { x: number; y: number }, b: { x: number; y: number }): Box {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

function intersects(a: Box, b: Box): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

/** Does `a` fully enclose `b`? (background/ancestor containers wrapping the drag). */
function contains(a: Box, b: Box): boolean {
  return (
    a.left <= b.left &&
    a.top <= b.top &&
    a.left + a.width >= b.left + b.width &&
    a.top + a.height >= b.top + b.height
  );
}

/**
 * Whether an element is the scene's root background (AbsoluteFill, or a
 * <Camera>'s viewport/world/layer boxes). We never want to select those, only
 * the elements inside them.
 *
 * Measured with offsetWidth/offsetHeight against the composition's own
 * dimensions, NOT with getBoundingClientRect against the container: rendered
 * rects include every ancestor transform, so under a camera zoom an ordinary
 * card reports a bigger-than-frame box and would be misread as the background —
 * making the one element the camera pushed into unclickable. Layout sizes are
 * transform-immune, so this holds at any zoom.
 */
function isFullFrame(el: HTMLElement, frameW: number, frameH: number): boolean {
  const margin = 8; // px slack for borders/rounding
  // The camera's own structural boxes are world-sized, so they clear the frame
  // test on size, but tag them explicitly since the world may be larger.
  if (el.dataset.cameraDepth !== undefined) return true;
  return (
    el.offsetWidth >= frameW - margin * 2 && el.offsetHeight >= frameH - margin * 2
  );
}

/** An open comment bubble: what was picked, where to draw it. */
interface Draft {
  elements: ElementContext[];
  /** Outlines pinned over the picked elements while the bubble is open. */
  boxes: Box[];
  /** The clicked point (the bubble's little anchor dot). */
  anchor: { x: number; y: number };
  /** Bubble position, clamped to the preview at open time. */
  place: { left: number; top: number };
  label: string;
}

function SendGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

/**
 * Wraps the preview and lets you inspect it like a browser: hover highlights
 * the element under the cursor; clicking opens a Figma-style comment bubble
 * right where you clicked. What you type there is sent to the chat with the
 * element (plus its scene + timecode) attached as context; submitting empty
 * just parks the element as a context pill. Dragging a marquee box picks EVERY
 * id'd element inside it at once.
 */
export function PreviewInspector({
  scenes,
  fps,
  width,
  height,
  children,
}: {
  scenes: CompiledScene[];
  fps: number;
  /** Composition dimensions — the frame test measures against these, not the
   * on-screen container, so it survives a camera zoom. */
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [marqueeHits, setMarqueeHits] = useState<Box[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState("");
  const addElement = useEditorStore((s) => s.addElement);
  const requestPrompt = useEditorStore((s) => s.requestPrompt);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);

  // Drag bookkeeping (refs so it survives re-renders without re-binding).
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  // Clicking the preview again to re-target blurs the bubble's input (the
  // preview isn't focusable), so put the caret back on every open.
  const noteRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (draft) noteRef.current?.focus();
  }, [draft]);

  // Playback resumed under an open bubble — its pinned outlines no longer match
  // what's on screen, so drop it.
  useEffect(() => {
    if (isPlaying) setDraft(null);
  }, [isPlaying]);

  function relPoint(clientX: number, clientY: number) {
    const c = ref.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(clientX - c.left, c.width)),
      y: Math.max(0, Math.min(clientY - c.top, c.height)),
    };
  }

  function measure(target: EventTarget | null): { box: Box; el: HTMLElement } | null {
    if (!(target instanceof HTMLElement) || !ref.current || target === ref.current) {
      return null;
    }
    const container = ref.current.getBoundingClientRect();
    const toBox = (n: HTMLElement): Box => {
      const r = n.getBoundingClientRect();
      return {
        left: r.left - container.left,
        top: r.top - container.top,
        width: r.width,
        height: r.height,
      };
    };

    // Prefer the nearest element that carries an id (the meaningful element the
    // scene tagged), so hovering/clicking snaps to it rather than a deep span —
    // but skip any full-frame element (the root background): only inner elements
    // are selectable.
    let el: HTMLElement | null = null;
    let node: HTMLElement | null = target;
    while (node && node !== ref.current) {
      if (node.id && !isFullFrame(node, width, height)) {
        el = node;
        break;
      }
      node = node.parentElement;
    }
    // No id'd inner element on the path; fall back to the raw target unless it
    // (too) covers the whole frame — clicking empty background selects nothing.
    if (!el) {
      if (isFullFrame(target, width, height)) return null;
      el = target;
    }

    const box = toBox(el);
    if (box.width === 0 || box.height === 0) return null;
    return { el, box };
  }

  /** Every id'd element whose box falls inside the marquee (deepest only). */
  function collect(area: Box): Array<{ el: HTMLElement; box: Box }> {
    const root = ref.current;
    if (!root) return [];
    const c = root.getBoundingClientRect();
    const hits = Array.from(root.querySelectorAll<HTMLElement>("[id]"))
      // Never grab the scene's root background, only inner elements.
      .filter((el) => !isFullFrame(el, width, height))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          el,
          box: {
            left: r.left - c.left,
            top: r.top - c.top,
            width: r.width,
            height: r.height,
          } as Box,
        };
      })
      .filter(({ box }) => box.width > 0 && box.height > 0)
      .filter(({ box }) => intersects(box, area))
      // Drop ancestors that merely wrap the whole drag area.
      .filter(({ box }) => !contains(box, area));
    // Keep only the deepest tagged elements (drop id'd ancestors of other hits).
    return hits.filter(({ el }) => !hits.some((o) => o.el !== el && el.contains(o.el)));
  }

  function buildContext(el: HTMLElement): ElementContext {
    const tag = el.tagName.toLowerCase();
    const elementId = el.id || null;
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
    const frame = usePlaybackStore.getState().frame;
    const mapping = globalToLocal(scenes, frame);
    const scene = mapping ? scenes[mapping.sceneIndex] : null;
    const short = text.length > 24 ? `${text.slice(0, 24)}…` : text;
    return {
      id: crypto.randomUUID(),
      label: elementId ? `#${elementId}` : text ? `"${short}"` : `<${tag}>`,
      tag,
      text,
      elementId,
      sceneId: scene?.id ?? null,
      sceneName: scene?.name ?? "scene",
      timecode: framesToTimecode(frame, fps),
    };
  }

  /** Stable identity for a selected element — its id, or scene+tag+text when it
   *  has none — so the same element never produces two pills. */
  function contextKey(c: ElementContext): string {
    return c.elementId
      ? `#${c.elementId}`
      : `${c.sceneId ?? ""}|${c.tag}|${c.text}`;
  }

  function takenIds(): Set<string> {
    return new Set(
      useEditorStore.getState().selectedElements.map(contextKey),
    );
  }

  /**
   * Open the comment bubble over what the user just picked. Playback is paused
   * so the frame they're asking about — and the outlines pinned over it — hold
   * still while they type.
   */
  function openDraft(hits: Array<{ el: HTMLElement; box: Box }>, at: { x: number; y: number }) {
    if (hits.length === 0) {
      setDraft(null);
      return;
    }
    usePlaybackStore.getState().pause();
    const seen = new Set<string>();
    const elements: ElementContext[] = [];
    for (const { el } of hits) {
      const ctx = buildContext(el);
      const key = contextKey(ctx);
      if (seen.has(key)) continue;
      seen.add(key);
      elements.push(ctx);
    }

    const c = ref.current!.getBoundingClientRect();
    const left = Math.max(8, Math.min(at.x + 10, c.width - BUBBLE_W - 8));
    // Below the click, or above it when there's no room left underneath.
    const below = at.y + 14;
    const top =
      below + BUBBLE_H + 8 <= c.height ? below : Math.max(8, at.y - BUBBLE_H - 14);

    setNote("");
    setDraft({
      elements,
      boxes: hits.map((h) => h.box),
      anchor: at,
      place: { left, top },
      label:
        elements.length > 1
          ? `${elements.length} elements`
          : (elements[0]?.label ?? ""),
    });
  }

  /** Attach the draft's elements as chat context, skipping any already there. */
  function attachDraft(d: Draft) {
    const taken = takenIds();
    for (const ctx of d.elements) {
      const key = contextKey(ctx);
      if (taken.has(key)) continue;
      taken.add(key);
      addElement(ctx);
    }
  }

  /** Enter in the bubble: attach the context, and send the note if there is one. */
  function commitDraft() {
    if (!draft) return;
    attachDraft(draft);
    const text = note.trim();
    if (text) requestPrompt(text);
    setDraft(null);
    setNote("");
  }

  return (
    <div
      ref={ref}
      // Transparent: the dotted stage behind shows through wherever the frame
      // doesn't reach, which on any window that isn't the composition's aspect
      // ratio is most of two sides. The frame paints its own black.
      className="relative h-full cursor-crosshair select-none overflow-hidden"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        startRef.current = relPoint(e.clientX, e.clientY);
        movedRef.current = false;
        setBox(null);
        ref.current?.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        // Not pressing: plain hover highlight.
        if (!startRef.current) {
          setBox(measure(e.target)?.box ?? null);
          return;
        }
        const start = startRef.current;
        const p = relPoint(e.clientX, e.clientY);
        if (!movedRef.current && Math.hypot(p.x - start.x, p.y - start.y) < DRAG_THRESHOLD) {
          return;
        }
        movedRef.current = true;
        const area = rectFromPoints(start, p);
        setMarquee(area);
        setMarqueeHits(collect(area).map((h) => h.box));
      }}
      onPointerUp={(e) => {
        const start = startRef.current;
        startRef.current = null;
        try {
          ref.current?.releasePointerCapture(e.pointerId);
        } catch {
          /* capture may already be gone */
        }

        if (start && movedRef.current) {
          // Marquee drag → ask about every id'd element inside it.
          const end = relPoint(e.clientX, e.clientY);
          openDraft(collect(rectFromPoints(start, end)), end);
        } else if (start) {
          // Plain click → ask about the single element under the cursor.
          // (Pointer capture retargets the event, so resolve it by point.)
          const target = document.elementFromPoint(e.clientX, e.clientY);
          const m = measure(target);
          openDraft(m ? [m] : [], relPoint(e.clientX, e.clientY));
        }

        movedRef.current = false;
        setMarquee(null);
        setMarqueeHits([]);
      }}
      onPointerLeave={() => {
        if (!startRef.current) setBox(null);
      }}
    >
      {children}

      {/* Elements the open bubble is about, held under a solid outline. */}
      {draft?.boxes.map((hit, i) => (
        <div
          key={i}
          className="pointer-events-none absolute z-20 rounded-[3px]"
          style={{
            left: hit.left,
            top: hit.top,
            width: hit.width,
            height: hit.height,
            border: `1.5px solid ${HILITE}`,
            background: `${HILITE}1a`,
            boxShadow: `0 0 0 1px ${HILITE}55`,
          }}
        />
      ))}

      {/* Hover highlight (only when not dragging). */}
      {box && !marquee && (
        <div
          className="pointer-events-none absolute z-20 rounded-[3px]"
          style={{
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
            border: `1.5px solid ${HILITE}`,
            background: `${HILITE}22`,
            boxShadow: `0 0 0 1px ${HILITE}55`,
          }}
        />
      )}

      {/* Live highlight of elements the marquee will grab. */}
      {marquee &&
        marqueeHits.map((hit, i) => (
          <div
            key={i}
            className="pointer-events-none absolute z-20 rounded-[3px]"
            style={{
              left: hit.left,
              top: hit.top,
              width: hit.width,
              height: hit.height,
              border: `1.5px solid ${HILITE}`,
              background: `${HILITE}22`,
            }}
          />
        ))}

      {/* The marquee box itself. */}
      {marquee && (
        <div
          className="pointer-events-none absolute z-30 rounded-[2px]"
          style={{
            left: marquee.left,
            top: marquee.top,
            width: marquee.width,
            height: marquee.height,
            border: `1px dashed ${HILITE}`,
            background: `${HILITE}14`,
          }}
        />
      )}

      {/* Figma-style comment bubble, anchored where the user clicked. */}
      {draft && (
        <>
          <div
            className="pointer-events-none absolute z-40 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: draft.anchor.x,
              top: draft.anchor.y,
              background: HILITE,
              boxShadow: `0 0 0 3px ${HILITE}44`,
            }}
          />
          <form
            style={{ left: draft.place.left, top: draft.place.top, width: BUBBLE_W }}
            className="absolute z-40 flex cursor-auto select-text flex-col gap-1 rounded-xl border border-[#a855f7]/50 bg-surface/95 px-2.5 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-md"
            // The bubble sits inside the inspector — keep its pointer events from
            // re-triggering hover/marquee/reselect on the layer underneath.
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerMove={(e) => {
              e.stopPropagation();
              setBox(null);
            }}
            onSubmit={(e) => {
              e.preventDefault();
              commitDraft();
            }}
          >
            {/* What's targeted, then the note under it — same shape as the
                chat's element pill. */}
            <span
              className="truncate text-[0.786rem]"
              style={{ color: "#cba3f5" }}
              title={draft.label}
            >
              {draft.label}
              <span className="text-[#a855f7]/70">
                {" "}
                · {draft.elements[0]?.timecode}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <input
                ref={noteRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation(); // don't let Escape clear the chat's pills
                  if (e.key === "Escape") setDraft(null);
                }}
                placeholder="Ask for a change…"
                className="min-w-0 flex-1 bg-transparent text-[0.929rem] text-text-primary outline-none placeholder:text-text-tertiary"
              />
              <button
                type="submit"
                aria-label={note.trim() ? "Send" : "Add to chat context"}
                title={note.trim() ? "Send (⏎)" : "Add to chat context (⏎)"}
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cta text-background transition-colors hover:bg-cta-hover"
              >
                <SendGlyph />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
