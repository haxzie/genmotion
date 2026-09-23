import React from "react";
import { CursorGlyph, CURSOR_TIP, CURSOR_VIEWBOX, CURSOR_SIZE_COMP } from "./cursorGlyph";

/**
 * The project cursor (Fluent cursor-16-filled — dark, white border, soft shadow).
 * Positioned by its TIP at (x, y); rotation and press pivot on the tip.
 */
export function Cursor({ x, y, size = 80, rotate = 0, press = 0, blur = 0, style, id = "cursor" }: {
  x: number; y: number; size?: number; rotate?: number; press?: number; blur?: number; style?: React.CSSProperties; id?: string;
}) {
  const box = size * CURSOR_SIZE_COMP;
  const k = box / CURSOR_VIEWBOX;
  const tx = CURSOR_TIP.x * k;
  const ty = CURSOR_TIP.y * k;
  return (
    <svg
      id={id}
      width={box}
      height={box}
      viewBox={`0 0 ${CURSOR_VIEWBOX} ${CURSOR_VIEWBOX}`}
      style={{
        position: "absolute",
        left: x - tx,
        top: y - ty,
        overflow: "visible",
        transformOrigin: `${tx}px ${ty}px`,
        transform: `rotate(${rotate}deg) scale(${1 - press * 0.14})`,
        filter: `drop-shadow(0 ${size * 0.07}px ${size * 0.11}px rgba(0,0,0,0.3))${blur ? ` blur(${blur}px)` : ""}`,
        ...style,
      }}
    >
      <CursorGlyph />
    </svg>
  );
}
