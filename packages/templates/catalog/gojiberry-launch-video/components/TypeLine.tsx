import React from "react";
import { useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { brand, type } from "./brand";

// The reference's signature copy treatment: a line arrives one unit at a time
// (word by word, or letter by letter for the emphasised word), each unit
// resolving out of a soft blur with a small rise. The whole line leaves by
// drifting up into a blur.
//
// segments: [{ text: "detects high-intent people " }, { text: "in your market", style: orangeText, by: "char" }]
// The unit clock is global across segments, so a char segment after a word
// segment keeps typing at the same cadence.

export type Segment = { text: string; style?: React.CSSProperties; by?: "word" | "char" };

type Props = {
  id?: string;
  segments: Segment[];
  startFrom?: number;
  each?: number; // frames between units
  duration?: number; // frames a unit takes to resolve
  exitAt?: number; // absolute frame the exit starts (in the enclosing clock)
  exitDuration?: number;
  float?: boolean; // 2px ambient rise/fall while holding
  style?: React.CSSProperties;
  as?: "h1" | "div" | "p";
  clock?: number; // override the frame clock (for components shared across a cut)
};

type Unit = { text: string; style?: React.CSSProperties; index: number; space: boolean };

function unitsOf(segments: Segment[]): Unit[] {
  const out: Unit[] = [];
  let i = 0;
  for (const seg of segments) {
    if ((seg.by ?? "word") === "char") {
      for (const ch of seg.text) {
        out.push({ text: ch, style: seg.style, index: i++, space: ch === " " });
      }
    } else {
      // keep the trailing spaces glued to the word so the line never reflows
      const parts = seg.text.match(/\S+\s*|\s+/g) ?? [];
      for (const p of parts) out.push({ text: p, style: seg.style, index: i++, space: p.trim() === "" });
    }
  }
  return out;
}

export function typeLineEnd(segments: Segment[], startFrom = 0, each = 5, duration = 8) {
  const n = unitsOf(segments).length;
  return startFrom + Math.max(0, n - 1) * each + duration;
}

export function TypeLine({ id, segments, startFrom = 0, each = 5, duration = 8, exitAt, exitDuration = 8, float = false, style, as = "div", clock }: Props) {
  const own = useCurrentFrame();
  const frame = clock ?? own;
  const units = unitsOf(segments);
  const Tag = as;

  const exitP = exitAt === undefined ? 0 : interpolate(frame, [exitAt, exitAt + exitDuration], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const floatY = float ? Math.sin(frame / 22) * 2 : 0;

  return (
    <Tag
      id={id}
      style={{
        ...type.line,
        whiteSpace: "pre",
        ...style,
        opacity: 1 - exitP,
        filter: exitP > 0 ? `blur(${exitP * 10}px)` : undefined,
        transform: `translateY(${floatY - exitP * 26}px)`,
      }}
    >
      {units.map((u) => {
        const t0 = startFrom + u.index * each;
        const p = interpolate(frame, [t0, t0 + duration], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (u.space) return <span key={u.index}>{u.text}</span>;
        return (
          <span
            key={u.index}
            style={{
              display: "inline-block",
              opacity: p,
              filter: p < 1 ? `blur(${(1 - p) * 6}px)` : undefined,
              transform: `translateY(${(1 - p) * 10}px)`,
              ...u.style,
            }}
          >
            {u.text}
          </span>
        );
      })}
    </Tag>
  );
}

// Centred headline wrapper used by most beats: full-width, horizontally centred at `top`.
export function Centered({ top, children, style }: { top: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "absolute", top, left: 0, width: 1920, display: "flex", justifyContent: "center", ...style }}>{children}</div>
  );
}

export const _brand = brand;
