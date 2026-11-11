import { canvasMesh } from "./stage";

export type BotKind = "blue" | "purple" | "teal" | "red" | "orange" | "black";

export const BOT_COLOR: Record<BotKind, string> = {
  blue: "#1e88f5",
  purple: "#7a4ae6",
  teal: "#16cf9f",
  red: "#eb0d3c",
  orange: "#ef5f0e",
  black: "#0a0a0a",
};

type G = OffscreenCanvasRenderingContext2D;

function circle(g: G, x: number, y: number, r: number) {
  g.moveTo(x + r, y);
  g.arc(x, y, r, 0, Math.PI * 2);
}

/** The body silhouette at unit size, centred on 0. */
export function bodyPath(g: G, kind: BotKind) {
  g.beginPath();
  switch (kind) {
    case "blue":
      circle(g, -0.2, -0.1, 0.27);
      circle(g, 0.12, -0.2, 0.28);
      circle(g, 0.27, 0.07, 0.23);
      circle(g, -0.26, 0.15, 0.22);
      circle(g, 0.02, 0.14, 0.3);
      break;
    case "teal": {
      circle(g, 0, 0.02, 0.33);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.3;
        circle(g, Math.cos(a) * 0.29, 0.02 + Math.sin(a) * 0.27, 0.2);
      }
      break;
    }
    case "red": {
      // a soft tilted heart
      g.save();
      g.rotate(-0.22);
      g.moveTo(0, 0.44);
      g.bezierCurveTo(-0.18, 0.32, -0.5, 0.12, -0.48, -0.12);
      g.bezierCurveTo(-0.46, -0.36, -0.2, -0.46, 0, -0.26);
      g.bezierCurveTo(0.2, -0.46, 0.46, -0.36, 0.48, -0.12);
      g.bezierCurveTo(0.5, 0.12, 0.18, 0.32, 0, 0.44);
      g.restore();
      break;
    }
    case "orange":
      g.save();
      g.translate(0, 0.07);
      g.rotate(Math.PI / 4);
      g.roundRect(-0.32, -0.32, 0.64, 0.64, [0.05, 0.32, 0.32, 0.32]);
      g.restore();
      break;
    default:
      circle(g, 0, 0, 0.5);
  }
}

function capsule(g: G, x: number, y: number, w: number, h: number, rot: number) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  g.roundRect(-w / 2, -h / 2, w, h, w / 2);
  g.fill();
  g.restore();
}

export type EyeStyle = { dx?: number; dy?: number; rot?: number; w?: number; h?: number; gap?: number; happy?: boolean };

const EYES: Record<BotKind, EyeStyle> = {
  blue: { dx: 0.04, dy: 0.02, rot: -0.3, w: 0.1, h: 0.22, gap: 0.2 },
  purple: { dx: 0.0, dy: 0.08, rot: 0.55, w: 0.1, h: 0.22, gap: 0.2 },
  teal: { dx: 0.02, dy: 0.04, rot: -0.3, w: 0.09, h: 0.2, gap: 0.19 },
  red: { dx: 0.04, dy: 0.0, rot: -0.2, w: 0.1, h: 0.22, gap: 0.2 },
  orange: { dx: 0.0, dy: 0.12, rot: 0.0, w: 0.1, h: 0.24, gap: 0.2 },
  black: { dx: 0.0, dy: 0.04, rot: -0.12, w: 0.09, h: 0.2, gap: 0.2 },
};

export function drawEyes(g: G, kind: BotKind, eyes?: EyeStyle) {
  const e = { ...EYES[kind], ...(eyes ?? {}) };
  g.fillStyle = "#ffffff";
  if (e.happy) {
    g.strokeStyle = "#ffffff";
    g.lineWidth = 0.085;
    g.lineCap = "round";
    for (const sx of [-0.12, 0.12]) {
      g.beginPath();
      g.arc(sx + (e.dx ?? 0), (e.dy ?? 0) + 0.05, 0.075, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
    return;
  }
  const rot = e.rot ?? 0.3;
  const gap = e.gap ?? 0.2;
  capsule(g, (e.dx ?? 0) - gap / 2, e.dy ?? 0, e.w ?? 0.1, e.h ?? 0.24, -rot);
  capsule(g, (e.dx ?? 0) + gap / 2, (e.dy ?? 0) - 0.03, e.w ?? 0.1, e.h ?? 0.24, -rot);
}

/** Draw a bot of diameter `s` centred at (cx, cy). */
export function drawBot(g: G, kind: BotKind, cx: number, cy: number, s: number, opts: { eyes?: EyeStyle | false; color?: string } = {}) {
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  bodyPath(g, kind);
  g.fillStyle = opts.color ?? BOT_COLOR[kind];
  g.fill("nonzero");
  if (opts.eyes !== false) drawEyes(g, kind, opts.eyes || undefined);
  g.restore();
}

/** One bot as its own plane. `size` is its diameter in ref px. */
export function botMesh(kind: BotKind, size: number, name = `${kind}-bot`, opts: { eyes?: EyeStyle | false; res?: number } = {}) {
  return canvasMesh(name, size, size, (g) => drawBot(g, kind, size / 2, size / 2, size * 0.98, opts), {
    pad: size * 0.05,
    res: opts.res ?? 3,
  });
}

/** The Grok mark used in the final lockup: black disc with a white slash. */
export function grokMark(size: number, name = "grok-mark", res = 4) {
  return canvasMesh(
    name,
    size,
    size,
    (g) => {
      g.translate(size / 2, size / 2);
      g.scale(size, size);
      g.beginPath();
      g.arc(0, 0, 0.5, 0, Math.PI * 2);
      g.fillStyle = "#000";
      g.fill();
      g.save();
      g.rotate(-0.75);
      g.fillStyle = "#fff";
      g.beginPath();
      g.roundRect(-0.045, -0.36, 0.09, 0.2, 0.045);
      g.fill();
      g.restore();
    },
    { res, pad: 2 },
  );
}
