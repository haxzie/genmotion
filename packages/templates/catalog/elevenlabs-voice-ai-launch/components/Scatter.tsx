import React from "react";
import { interpolate, Easing } from "@genmotion/motion";
import { Phone } from "lucide-react";
import { brand, headline } from "./brand";

/**
 * Hard "pop" — the poster-collage entrance from the reference. Two frames of
 * opacity, a four-frame settle from 0.9 scale, and a matching pop out.
 * `at` is the entrance frame, `until` the frame it has fully left by.
 */
export function Pop({
  frame,
  at,
  until = Infinity,
  x,
  y,
  children,
  id,
  style,
}: {
  frame: number;
  at: number;
  until?: number;
  x: number;
  y: number;
  children: React.ReactNode;
  id?: string;
  style?: React.CSSProperties;
}) {
  const inP = interpolate(frame, [at, at + 4], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outP = until === Infinity ? 0 : interpolate(frame, [until - 4, until], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = (frame >= at + 1 ? 1 : frame >= at ? 0.5 : 0) * (1 - outP);
  if (opacity <= 0) return null;
  const scale = 0.9 + inP * 0.1 - outP * 0.06;
  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "center",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export type ScatterWord = { t: string; x: number; y: number; size?: number };

/** Scattered kinetic type: one word per position, popping in `gap` frames apart. */
export function ScatterWords({
  frame,
  words,
  start = 0,
  gap = 6,
  until = Infinity,
  color = brand.ink,
  size = 96,
  idPrefix = "word",
}: {
  frame: number;
  words: ScatterWord[];
  start?: number;
  gap?: number;
  until?: number;
  color?: string;
  size?: number;
  idPrefix?: string;
}) {
  return (
    <>
      {words.map((w, i) => (
        <Pop key={w.t + i} frame={frame} at={start + i * gap} until={until} x={w.x} y={w.y} id={`${idPrefix}-${i}`}>
          <span style={{ ...headline, fontSize: w.size ?? size, color, whiteSpace: "nowrap" }}>{w.t}</span>
        </Pop>
      ))}
    </>
  );
}

/** The small black handset glyph that dots the paper scenes. */
export function PhoneMark({ frame, at, until, x, y, id, size = 64 }: { frame: number; at: number; until?: number; x: number; y: number; id?: string; size?: number }) {
  return (
    <Pop frame={frame} at={at} until={until} x={x} y={y} id={id}>
      <Phone size={size} color={brand.ink} fill={brand.ink} strokeWidth={0} />
    </Pop>
  );
}
