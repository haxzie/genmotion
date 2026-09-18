import React from "react";
import { random, useVideoConfig } from "@genmotion/motion";

/**
 * Pixel-block wipe. As `progress` goes 0 → 1 a grid of square cells switches
 * on in a ragged sweep across the frame.
 *
 * `mode="reveal"` (default): children are the INCOMING surface, shown only in
 * the switched-on cells. `mode="cover"`: children are the OUTGOING surface,
 * shown only in the cells that have NOT switched on yet — use this when the
 * incoming surface holds a WebGL canvas, which must exist exactly once.
 *
 * No clip-path or mask-image: those blank the compositor when a WebGL canvas
 * is on the page. Instead the visible cells are merged into horizontal runs and
 * each run is an `overflow:hidden` viewport onto its own copy of the children.
 *
 * `direction` is the way the sweep TRAVELS. "left" (default) starts at the
 * right edge and swoops leftward — matching the paper world's leftward drift.
 */
export function BlockReveal({
  progress,
  seed = "blocks",
  cols = 12,
  rows = 7,
  direction = "left",
  mode = "reveal",
  swoop = 48,
  children,
  style,
}: {
  progress: number;
  seed?: string;
  cols?: number;
  rows?: number;
  direction?: "left" | "right";
  mode?: "reveal" | "cover";
  /** px the surface slides in the sweep direction during the wipe */
  swoop?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const { width, height } = useVideoConfig();
  const base: React.CSSProperties = { position: "absolute", inset: 0, overflow: "hidden", ...style };

  const showAll = mode === "reveal" ? progress >= 1 : progress <= 0;
  const showNone = mode === "reveal" ? progress <= 0 : progress >= 1;
  if (showNone) return null;
  if (showAll) return <div style={base}>{children}</div>;

  const eased = 1 - Math.pow(1 - progress, 3);
  // incoming slides in from the sweep origin; outgoing drifts away along the sweep
  const slide = mode === "reveal" ? (direction === "left" ? 1 : -1) * swoop * (1 - eased) : (direction === "left" ? -1 : 1) * swoop * 0.5 * eased;

  const cw = width / cols;
  const ch = height / rows;
  const runs: { x: number; y: number; w: number; h: number }[] = [];
  for (let r = 0; r < rows; r++) {
    let start = -1;
    for (let c = 0; c <= cols; c++) {
      let on = false;
      if (c < cols) {
        const sweep = direction === "left" ? (cols - 1 - c) / (cols - 1) : c / (cols - 1);
        const clump = random(`${seed}-c${Math.floor(c / 3)}-${Math.floor(r / 3)}`);
        const jitter = random(`${seed}-${c}-${r}`);
        const threshold = sweep * 0.62 + clump * 0.24 + jitter * 0.14;
        const lit = progress > threshold;
        on = mode === "reveal" ? lit : !lit;
      }
      if (on && start < 0) start = c;
      if (!on && start >= 0) {
        runs.push({ x: start * cw, y: r * ch, w: (c - start) * cw, h: ch });
        start = -1;
      }
    }
  }
  if (runs.length === 0) return null;
  // Merge vertically adjacent runs with the same horizontal extent into one viewport.
  const merged: typeof runs = [];
  for (const run of runs) {
    const prev = merged.find((m) => m.x === run.x && m.w === run.w && Math.abs(m.y + m.h - run.y) < 0.01);
    if (prev) prev.h += run.h;
    else merged.push({ ...run });
  }

  return (
    <div style={base}>
      {merged.map((run, i) => (
        <div key={i} style={{ position: "absolute", left: run.x, top: run.y, width: run.w + 0.5, height: run.h + 0.5, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: -run.x + slide, top: -run.y, width, height }}>{children}</div>
        </div>
      ))}
    </div>
  );
}
