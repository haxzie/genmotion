import React from "react";
import { useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { clamp } from "./brand";

const hex = (h: string) =>
  h.startsWith("rgb")
    ? h.replace(/[^\d,.]/g, "").split(",").slice(0, 3).map(Number)
    : [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function mix(a: string, b: string, t: number) {
  const A = hex(a), B = hex(b);
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(",")})`;
}

/**
 * A word that resolves out of blur while its colour settles from `from` to `to`.
 * Used where the reference's colour-shift reveal (light blue → ink) can't be
 * expressed by a TextAnimation preset.
 */
export function BlurWord({
  text, start, dur = 9, from, to, blur = 12, dx = 0, dy = 0, style, id,
}: {
  text: string; start: number; dur?: number; from: string; to: string;
  blur?: number; dx?: number; dy?: number; style?: React.CSSProperties; id?: string;
}) {
  const f = useCurrentFrame();
  const p = interpolate(f, [start, start + dur], [0, 1], { ...clamp, easing: Easing.outSmooth });
  const c = interpolate(f, [start, start + dur * 1.6], [0, 1], { ...clamp, easing: Easing.inOutCubic });
  return (
    <span
      id={id}
      style={{
        display: "inline-block",
        whiteSpace: "pre",
        opacity: interpolate(p, [0, 0.35], [0, 1], clamp),
        filter: `blur(${(1 - p) * blur}px)`,
        transform: `translate(${(1 - p) * dx}px, ${(1 - p) * dy}px)`,
        color: mix(from, to, c),
        ...style,
      }}
    >
      {text}
    </span>
  );
}
