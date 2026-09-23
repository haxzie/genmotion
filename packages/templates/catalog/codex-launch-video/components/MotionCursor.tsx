import { useCurrentFrame, useVideoConfig } from "@genmotion/motion";
import { CursorGlyph, CURSOR_TIP, CURSOR_VIEWBOX, CURSOR_SIZE_COMP, CURSOR_REST_HEADING } from "./cursorGlyph";

export type Pt = { x: number; y: number };

/** Quadratic Bézier point. */
export const bez = (a: Pt, c: Pt, b: Pt, t: number): Pt => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});

export type Key = { t: number; x: number; y: number; /** 0..1 — slow down through this key */ damp?: number };

/**
 * Smooth time-based path through keys (cubic Hermite / Catmull-Rom in time).
 * Position AND velocity are continuous everywhere — no stop-start lurches.
 * `damp` < 1 lets the pointer ease down through a key without stopping dead.
 * `vIn` / `vOut` set the velocity (px/frame) at the first / last key.
 */
export function splinePath(keys: Key[], vIn?: Pt, vOut?: Pt) {
  const n = keys.length;
  const tan = keys.map((k, i) => {
    if (i === 0) return vIn ?? { x: (keys[1].x - k.x) / (keys[1].t - k.t), y: (keys[1].y - k.y) / (keys[1].t - k.t) };
    if (i === n - 1) {
      const p = keys[i - 1];
      return vOut ?? { x: (k.x - p.x) / (k.t - p.t), y: (k.y - p.y) / (k.t - p.t) };
    }
    const a = keys[i - 1];
    const b = keys[i + 1];
    const d = k.damp ?? 1;
    return { x: ((b.x - a.x) / (b.t - a.t)) * d, y: ((b.y - a.y) / (b.t - a.t)) * d };
  });
  return (f: number): Pt => {
    if (f <= keys[0].t) return { x: keys[0].x + tan[0].x * (f - keys[0].t), y: keys[0].y + tan[0].y * (f - keys[0].t) };
    if (f >= keys[n - 1].t) {
      const k = keys[n - 1];
      return { x: k.x + tan[n - 1].x * (f - k.t), y: k.y + tan[n - 1].y * (f - k.t) };
    }
    let i = 0;
    while (f > keys[i + 1].t) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const h = b.t - a.t;
    const s = (f - a.t) / h;
    const h00 = 2 * s ** 3 - 3 * s ** 2 + 1;
    const h10 = s ** 3 - 2 * s ** 2 + s;
    const h01 = -2 * s ** 3 + 3 * s ** 2;
    const h11 = s ** 3 - s ** 2;
    return {
      x: h00 * a.x + h10 * h * tan[i].x + h01 * b.x + h11 * h * tan[i + 1].x,
      y: h00 * a.y + h10 * h * tan[i].y + h01 * b.y + h11 * h * tan[i + 1].y,
    };
  };
}

// The glyph's own axis (tail → tip) — see cursorGlyph.tsx.
const REST_HEADING = CURSOR_REST_HEADING;
const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

/**
 * The project pointer (Fluent cursor-16-filled) that follows `path(frame)` (screen px, tip position), turns to
 * face its direction of travel, relaxes upright as it slows, and smears with a
 * directional motion blur aligned to its velocity.
 *
 * Heading, turn amount and blur all come from velocity averaged over a
 * ±`smooth`-frame triangular window, so the pointer turns gradually instead of
 * snapping on every speed change.
 */
export function MotionCursor({
  path, anchor, press = 0, faceWeight, restRotate = 0, size = 190, opacity = 1, id = "cursor", blurPerPx = 0.32, maxBlur = 26, turnSpeed = 22, smooth = 5,
}: {
  path: (frame: number) => Pt;
  /**
   * Optional moving origin added to `path` for POSITION only. Use it when the
   * cursor rides on panning content: the pan moves the pointer but doesn't count
   * as its own travel, so it doesn't turn or blur because of it.
   */
  anchor?: (frame: number) => Pt;
  /** 0..1 click press — scales the glyph down around its tip */ press?: number;
  /**
   * Optional 0..1 override for how much the pointer faces its direction of travel
   * (default: derived from speed). Drive it by time when a hard stop would
   * otherwise make the pointer straighten up too abruptly.
   */
  faceWeight?: number;
  /** Rotation (deg) the pointer settles to at rest. */ restRotate?: number;
  size?: number; opacity?: number; id?: string;
  /** blur (px std-dev) per px/frame of speed */ blurPerPx?: number; maxBlur?: number;
  /** speed (px/frame) at which the pointer fully faces its heading */ turnSpeed?: number;
  /** half-width (frames) of the velocity smoothing window */ smooth?: number;
}) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const rel = path(f);
  const org = anchor ? anchor(f) : { x: 0, y: 0 };
  const p = { x: rel.x + org.x, y: rel.y + org.y };

  // Triangular-weighted average velocity around f.
  let vx = 0;
  let vy = 0;
  let wsum = 0;
  for (let k = -smooth; k <= smooth; k++) {
    const w = smooth + 1 - Math.abs(k);
    const a = path(f + k - 0.5);
    const b = path(f + k + 0.5);
    vx += (b.x - a.x) * w;
    vy += (b.y - a.y) * w;
    wsum += w;
  }
  vx /= wsum;
  vy /= wsum;
  // Blur follows the instantaneous speed (a still frame shows what's moving now),
  // lightly smoothed; heading follows the averaged velocity.
  const a0 = path(f - 0.5);
  const b0 = path(f + 0.5);
  const inst = Math.hypot(b0.x - a0.x, b0.y - a0.y);
  const avgSpeed = Math.hypot(vx, vy);
  const speed = 0.5 * inst + 0.5 * avgSpeed;

  const heading = avgSpeed > 0.01 ? (Math.atan2(vy, vx) * 180) / Math.PI : 0;
  const ws = Math.min(1, avgSpeed / turnSpeed);
  const w = faceWeight ?? ws * ws * (3 - 2 * ws);
  const rot = restRotate + wrap(heading - REST_HEADING - restRotate) * w;

  const blur = Math.min(maxBlur, speed * blurPerPx);
  const blurAngle = inst > 0.01 ? (Math.atan2(b0.y - a0.y, b0.x - a0.x) * 180) / Math.PI : heading;
  const k = ((size * CURSOR_SIZE_COMP) / CURSOR_VIEWBOX) * (1 - press * 0.14);
  const fid = `${id}-mb`;

  if (opacity <= 0) return null;
  return (
    <svg
      id={id}
      width={width}
      height={height}
      style={{
        position: "absolute", left: 0, top: 0, overflow: "visible", opacity,
        filter: `drop-shadow(0 ${size * 0.07}px ${size * 0.1}px rgba(0,0,0,0.28))`,
      }}
    >
      <defs>
        <filter id={fid} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
          {/* x in this filter's space is the direction of travel */}
          <feGaussianBlur stdDeviation={`${blur} ${blur * 0.06}`} />
        </filter>
      </defs>
      <g transform={`translate(${p.x} ${p.y}) rotate(${blurAngle})`}>
        <g filter={blur > 0.4 ? `url(#${fid})` : undefined}>
          <g transform={`rotate(${-blurAngle}) rotate(${rot}) scale(${k}) translate(${-CURSOR_TIP.x} ${-CURSOR_TIP.y})`}>
            <CursorGlyph />
          </g>
        </g>
      </g>
    </svg>
  );
}
