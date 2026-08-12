"use client";

import { useRef, useState } from "react";
import { usePlaybackStore, type CompiledScene } from "@genmotion/player";
import { framesToTimecode, globalToLocal } from "@genmotion/shared";
import { useEditorStore, type ElementContext } from "@/stores/editor-store";

/** Purple, react-grab style. */
const HILITE = "#a855f7";
/** Pointer travel (px) before a press becomes a marquee drag rather than a click. */
const DRAG_THRESHOLD = 5;

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

/**
 * Wraps the preview and lets you inspect it like a browser: hover highlights
 * the element under the cursor; click attaches it (with its scene + timecode)
 * to the chat as context. Dragging a marquee box attaches EVERY id'd element
 * inside the box at once.
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
  const addElement = useEditorStore((s) => s.addElement);

  // Drag bookkeeping (refs so it survives re-renders without re-binding).
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

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

  /** Add `el` unless an equivalent element is already in context. */
  function addUnique(el: HTMLElement, taken: Set<string>) {
    const ctx = buildContext(el);
    const key = contextKey(ctx);
    if (taken.has(key)) return;
    taken.add(key);
    addElement(ctx);
  }

  function takenIds(): Set<string> {
    return new Set(
      useEditorStore.getState().selectedElements.map(contextKey),
    );
  }

  return (
    <div
      ref={ref}
      className="relative h-full cursor-crosshair select-none overflow-hidden rounded-xl border border-border bg-black shadow-[0_8px_40px_rgba(20,20,40,0.16)]"
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
          // Marquee drag → attach every id'd element inside it.
          const area = rectFromPoints(start, relPoint(e.clientX, e.clientY));
          const taken = takenIds();
          for (const { el } of collect(area)) addUnique(el, taken);
        } else if (start) {
          // Plain click → attach the single element under the cursor. (Pointer
          // capture retargets the event, so resolve the real element by point.)
          const target = document.elementFromPoint(e.clientX, e.clientY);
          const m = measure(target);
          if (m) addUnique(m.el, takenIds());
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
    </div>
  );
}
