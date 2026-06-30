"use client";

import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "../context";
import { interpolate } from "../interpolate";
import { random } from "../random";

/**
 * Frame-deterministic confetti. The popular libraries (canvas-confetti,
 * react-confetti) drive their own requestAnimationFrame loop and use
 * Math.random, so they can't render identically in the preview and the headless
 * export. This reimplements the classic canvas-confetti look as a pure function
 * of the current frame: every particle's path is computed from its index via
 * `random(seed)`, so scrubbing and rendering always agree.
 */

const DEFAULT_COLORS = [
  "#ff3b30",
  "#ff9500",
  "#ffcc00",
  "#34c759",
  "#5ac8fa",
  "#af52de",
  "#ff2d55",
];

export interface ConfettiProps {
  /** Frame the burst starts on. */
  startFrom?: number;
  /** How many frames particles live before fully fading. */
  duration?: number;
  /** Number of particles. */
  count?: number;
  /** Colors cycled across particles. */
  colors?: string[];
  /** "burst" explodes from a point; "rain" falls from above. */
  mode?: "burst" | "rain";
  /** Burst origin in normalized [0..1] coords of the composition (any point — center, a corner, an edge). */
  origin?: { x: number; y: number };
  /** Launch direction in degrees (canvas-confetti convention: 90 = up, 0 = right, 180 = left, 270 = down). */
  angle?: number;
  /** Cone width in degrees around `angle`. Use 360 for an all-directions firework. */
  spread?: number;
  /** Initial launch speed in px/frame for the burst. */
  power?: number;
  /** Downward acceleration in px/frame². */
  gravity?: number;
  /** Vary this to make multiple Confetti instances differ. */
  seed?: string;
  style?: React.CSSProperties;
  className?: string;
}

interface Particle {
  color: string;
  /** px */
  size: number;
  /** height/width ratio — <1 makes confetti strips, 1 makes squares. */
  aspect: number;
  /** deg/frame */
  spin: number;
  /** initial rotation, deg */
  rot0: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  /** flutter amplitude/frequency/phase */
  wob: number;
  wobFreq: number;
  phase: number;
  /** rain only */
  fall: number;
}

export function Confetti({
  startFrom = 0,
  duration = 90,
  count = 80,
  colors = DEFAULT_COLORS,
  mode = "burst",
  origin = { x: 0.5, y: 0.5 },
  angle = 90,
  spread = 90,
  power = 14,
  gravity = 0.3,
  seed = "confetti",
  style,
  className,
}: ConfettiProps) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;

  // Per-particle constants are independent of the frame — compute once.
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => {
      const r = (k: string) => random(`${seed}-${k}-${i}`);
      const color = palette[Math.floor(r("c") * palette.length) % palette.length]!;
      const size = 6 + r("s") * 10;
      const aspect = r("a") < 0.5 ? 0.4 : 1;
      const spin = (r("sp") - 0.5) * 26;
      const rot0 = r("r") * 360;

      if (mode === "rain") {
        return {
          color,
          size,
          aspect,
          spin,
          rot0,
          ox: r("x") * width,
          oy: -40 - r("y") * height * 0.4,
          vx: 0,
          vy: 0,
          wob: 14 + r("wob") * 26,
          wobFreq: 0.05 + r("wf") * 0.06,
          phase: r("p") * Math.PI * 2,
          fall: ((height + 120) / duration) * (0.7 + r("f") * 0.7),
        };
      }

      // Burst: launch toward `angle` within a cone of `spread` degrees. Screen
      // y points down, so negate the (canvas-confetti style) direction.
      const dir = (-angle + (r("ang") - 0.5) * spread) * (Math.PI / 180);
      const speed = power * (0.5 + r("v") * 0.7);
      return {
        color,
        size,
        aspect,
        spin,
        rot0,
        ox: origin.x * width,
        oy: origin.y * height,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        wob: 4 + r("wob") * 9,
        wobFreq: 0.1 + r("wf") * 0.12,
        phase: r("p") * Math.PI * 2,
        fall: 0,
      };
    });
  }, [count, palette, mode, width, height, angle, spread, power, origin.x, origin.y, seed, duration]);

  const t = frame - startFrom;
  if (t < 0 || t > duration) return null;

  const life = t / duration;
  const opacity = interpolate(life, [0, 0.06, 0.78, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        ...style,
      }}
    >
      {particles.map((p, i) => {
        const x =
          mode === "rain"
            ? p.ox + Math.sin(t * p.wobFreq + p.phase) * p.wob
            : p.ox + p.vx * t + Math.sin(t * p.wobFreq + p.phase) * p.wob;
        const y =
          mode === "rain"
            ? p.oy + t * p.fall
            : p.oy + p.vy * t + 0.5 * gravity * t * t;
        const rot = p.rot0 + t * p.spin;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: p.size,
              height: p.size * p.aspect,
              background: p.color,
              borderRadius: p.aspect === 1 ? 2 : 1,
              opacity,
              transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
              willChange: "transform, opacity",
            }}
          />
        );
      })}
    </div>
  );
}
