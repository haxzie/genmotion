import React from "react";
import type { LucideIcon } from "lucide-react";
import { brand } from "./brand";
import { Pop } from "./Scatter";

/** Grey square "object cutout" tile — an icon standing in for the product photos. */
export function IconTile({
  frame,
  at,
  until,
  x,
  y,
  size = 200,
  icon: Icon,
  color = "#2b2b28",
  accent,
  id,
}: {
  frame: number;
  at: number;
  until?: number;
  x: number;
  y: number;
  size?: number;
  icon: LucideIcon;
  color?: string;
  accent?: string;
  id?: string;
}) {
  return (
    <Pop frame={frame} at={at} until={until} x={x} y={y} id={id}>
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: brand.tile,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={size * 0.56} color={accent ?? color} strokeWidth={1.4} />
      </div>
    </Pop>
  );
}

/** A square of the dither pattern, scattered on the paper like a torn-off swatch.
 *  Dots are a repeating background (no mask-image): masks over a live WebGL
 *  canvas blank the compositor, and these tiles sit inside the block wipe. */
export function DitherTile({
  frame,
  at,
  until,
  x,
  y,
  w = 160,
  h = 160,
  gradient = brand.ditherGreen,
  id,
}: {
  frame: number;
  at: number;
  until?: number;
  x: number;
  y: number;
  w?: number;
  h?: number;
  gradient?: string;
  id?: string;
}) {
  const t = frame * 0.02;
  const gx = 50 + Math.sin(t) * 30;
  const gy = 50 + Math.cos(t * 0.8) * 30;
  return (
    <Pop frame={frame} at={at} until={until} x={x} y={y} id={id}>
      <div
        style={{
          width: w,
          height: h,
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.9) 1.3px, transparent 1.7px), radial-gradient(${Math.max(w, h)}px ${Math.max(w, h)}px at ${gx}% ${gy}%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 70%), ${gradient}`,
          backgroundSize: "7px 7px, 100% 100%, 100% 100%",
        }}
      />
    </Pop>
  );
}
