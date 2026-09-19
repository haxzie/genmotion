import React from "react";
import { Img } from "@genmotion/motion";
import cursorSvg from "../assets/FluentCursor16Filled.svg";

// The reference pointer: Fluent "Cursor 16 Filled" with a soft white halo so it
// reads over the card. `x`/`y` are the HOTSPOT (the tip of the arrow), not the
// box corner — the tip of this glyph sits at 25% / 19% of its viewBox, and
// rotation/scale pivot around that same point.
//
//  rotation  extra degrees, clockwise (default 0 = upright, tip up-left).
//            The pointer stays upright; while it moves it leans a few degrees
//            toward its direction of travel (derived from vx) and straightens
//            as it slows, so it is always square before a click.
//  vx / vy   px moved since the previous frame — drives the motion-blur ghosts.
//  ring      0..1 progress of the click ripple drawn at the tip.
//  press     0..1 scale-down for the click beat.
const TIP_X = 4 / 16;
const TIP_Y = 3 / 16;

type CursorProps = {
  id?: string;
  x: number;
  y: number;
  rotation?: number;
  vx?: number;
  vy?: number;
  ring?: number;
  press?: number;
  opacity?: number;
  size?: number;
};

export function Cursor({ id = "cursor", x, y, rotation = 0, vx = 0, vy = 0, ring = 0, press = 0, opacity = 1, size = 96 }: CursorProps) {
  const speed = Math.hypot(vx, vy);
  // ghost copies trail behind along the velocity vector — the reference's
  // light smear at high speed. Nothing renders once the cursor is slow.
  const ghosts = speed > 6 ? [0.3, 0.6, 0.9] : [];
  const ringR = 6 + ring * 34;
  // lean: up to ±14° toward the horizontal direction of travel, nothing at rest
  const lean = Math.max(-14, Math.min(14, vx * 0.12));
  const angle = rotation + lean;

  return (
    <div id={id} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity }}>
      {ghosts.map((k, i) => (
        <Glyph
          key={i}
          x={x - vx * k}
          y={y - vy * k}
          size={size}
          rotation={angle}
          scale={1 - press * 0.12}
          style={{ opacity: 0.22 - i * 0.06, filter: "blur(3px) brightness(3)" }}
        />
      ))}
      <Glyph
        x={x}
        y={y}
        size={size}
        rotation={angle}
        scale={1 - press * 0.12}
        style={{
          filter: `${speed > 10 ? `blur(${Math.min(speed / 40, 2)}px) ` : ""}drop-shadow(0 0 5px rgba(255,255,255,0.95)) drop-shadow(0 8px 14px rgba(0,0,0,0.28))`,
        }}
      />
      {ring > 0 && ring < 1 && (
        <div
          id={`${id}-click-ring`}
          style={{
            position: "absolute",
            left: x - ringR,
            top: y - ringR,
            width: ringR * 2,
            height: ringR * 2,
            borderRadius: 999,
            border: `${3 - ring * 1.5}px solid rgba(255,255,255,${1 - ring * 0.9})`,
            boxShadow: `0 0 0 1px rgba(0,0,0,${0.18 * (1 - ring)})`,
          }}
        />
      )}
    </div>
  );
}

function Glyph({ x, y, size, rotation, scale, style }: { x: number; y: number; size: number; rotation: number; scale: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x - size * TIP_X,
        top: y - size * TIP_Y,
        width: size,
        height: size,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        transformOrigin: `${TIP_X * 100}% ${TIP_Y * 100}%`,
        ...style,
      }}
    >
      <Img src={cursorSvg} style={{ width: size, height: size, display: "block" }} />
    </div>
  );
}
