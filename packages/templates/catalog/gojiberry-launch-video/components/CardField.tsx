import React from "react";
import { interpolate, Easing } from "@genmotion/motion";
import { MiniCard, MINI_W, MINI_H } from "./MiniCard";
import { Cursor } from "./Cursor";

// The scattered field of sent DMs (ref 2.9–4.5s) that scenes 02 and 03 share.
// `t` is the clock relative to the cut between them (ref 3.0s), so both scenes
// render the identical picture at the boundary. The camera pulls back over the
// first 20 frames (everything converges toward centre and shrinks), then the
// field drifts and fades.
//
// Layout in frame fractions at t=24, with depth (1 = screen plane; >1 further).
const CARDS: { x: number; y: number; d: number; rot: number; avatar: number }[] = [
  { x: 0.15, y: 0.06, d: 1.0, rot: -7, avatar: 2 },
  { x: 0.52, y: 0.03, d: 0.85, rot: 4, avatar: 0 },
  { x: 0.98, y: 0.09, d: 0.9, rot: 5, avatar: 4 },
  { x: 0.02, y: 0.4, d: 1.4, rot: -3, avatar: 1 },
  { x: 0.1, y: 0.74, d: 0.8, rot: -6, avatar: 5 },
  { x: 0.97, y: 0.66, d: 0.95, rot: 6, avatar: 2 },
  { x: 0.64, y: 0.97, d: 0.75, rot: 3, avatar: 3 },
  { x: 0.35, y: 0.99, d: 1.3, rot: -4, avatar: 0 },
  { x: 0.8, y: 0.36, d: 1.9, rot: 2, avatar: 1 },
];
const CURSORS: { x: number; y: number; rot: number; d: number }[] = [
  { x: 0.33, y: 0.62, rot: 8, d: 0.9 },
  { x: 0.87, y: 0.06, rot: -6, d: 1.0 },
  { x: 0.66, y: 0.04, rot: 12, d: 1.2 },
  { x: 0.72, y: 0.6, rot: -10, d: 1.5 },
  { x: 0.09, y: 0.52, rot: 5, d: 1.1 },
];

export function CardField({ t }: { t: number }) {
  // pull-back: 1.55 → 1 over the first 20 frames, then a slow creep to 0.96
  const S = interpolate(t, [-6, 20, 60], [1.55, 1, 0.96], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeIn = interpolate(t, [-6, 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(t, [33, 48], [1, 0], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = fadeIn * fadeOut;
  if (opacity <= 0) return null;

  return (
    <div id="card-field" style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}>
      {CARDS.map((c, i) => {
        // parallax: nearer cards (d<1) move more on the pull-back
        const k = (S - 1) / c.d + 1;
        const cx = 960 + (c.x - 0.5) * 1920 * k;
        const cy = 540 + (c.y - 0.5) * 1080 * k;
        const scale = (1 / c.d) * 0.95 * k;
        const drift = Math.sin((t + i * 17) / 40) * 6;
        const blur = c.d < 0.85 ? (0.85 - c.d) * 18 : c.d > 1.6 ? (c.d - 1.6) * 6 : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cx - MINI_W / 2,
              top: cy - MINI_H / 2 + drift,
              transform: `perspective(1600px) rotateX(12deg) rotate(${c.rot}deg) scale(${scale})`,
              filter: blur > 0 ? `blur(${blur}px)` : undefined,
              opacity: c.d < 0.85 ? 0.75 : 1,
            }}
          >
            <MiniCard avatar={c.avatar} />
          </div>
        );
      })}
      {CURSORS.map((c, i) => {
        const k = (S - 1) / c.d + 1;
        const cx = 960 + (c.x - 0.5) * 1920 * k + Math.sin((t + i * 23) / 30) * 14;
        const cy = 540 + (c.y - 0.5) * 1080 * k + Math.cos((t + i * 11) / 34) * 10;
        return <Cursor key={i} id={`field-cursor-${i}`} x={cx} y={cy} rotation={c.rot} size={54 / c.d} opacity={0.9} />;
      })}
    </div>
  );
}
