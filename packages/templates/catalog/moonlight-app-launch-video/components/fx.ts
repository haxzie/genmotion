/** Shared motion + chat building blocks used across scenes. */
import { E, iv, drawText, measure, type Layer, type Stage, type Draw } from "./kit";
import { C, rr, cursorArrow, bubbleSize, drawBubble, phoneBody, statusBar, keyboard, avatar, appAvatar, type BubbleSpec } from "./ui";

/* ───────────── reveals ───────────── */

export interface RevealOpts {
  dur?: number;
  dy?: number;
  blur?: number;
  outAt?: number;
  outDur?: number;
  outDy?: number;
  s?: number;
  fromS?: number;
}

/** Blur + rise + fade in at `at`, optional mirrored exit at `outAt`. */
export function blurUp(l: Layer, f: number, at: number, x: number, y: number, o: RevealOpts = {}) {
  const dur = o.dur ?? 10;
  const dy = o.dy ?? 30;
  const blur = o.blur ?? 18;
  const p = iv(f, [at, at + dur], [0, 1], E.outCubic);
  const q = o.outAt === undefined ? 0 : iv(f, [o.outAt, o.outAt + (o.outDur ?? 7)], [0, 1], E.inCubic);
  const s = (o.s ?? 1) * (o.fromS === undefined ? 1 : o.fromS + (1 - o.fromS) * p);
  l.set({
    x,
    y: y + (1 - p) * dy - q * (o.outDy ?? dy),
    op: p * (1 - q),
    bx: 0,
    by: (1 - p) * blur + q * blur,
    s,
  });
}

/** Pop in with overshoot from `from` scale. */
export function popIn(l: Layer, f: number, at: number, x: number, y: number, dur = 10, from = 0.4) {
  const p = iv(f, [at, at + dur], [0, 1], E.outBack);
  const o = iv(f, [at, at + dur * 0.5], [0, 1], E.outCubic);
  l.set({ x, y, s: from + (1 - from) * p, op: o, bx: (1 - o) * 10, by: (1 - o) * 10 });
}

/* ───────────── cursor ───────────── */

export function cursorLayer(st: Stage) {
  return st.layer(40, 52, (g) => cursorArrow(g, 1.15), { pad: 12 });
}

/** Put the arrow's tip at (px, py). `s` scales it, `press` 0..1 dips it on a click. */
export function placeCursor(l: Layer, px: number, py: number, s = 1, op = 1, press = 0) {
  const k = s * (1 - press * 0.15);
  l.set({ x: px + 20 * k, y: py + 26 * k, s: k, op, bx: 0, by: 0 });
}

/** 0→1→0 bump centred on `at` (used for click presses). */
export const bump = (f: number, at: number, w = 4) => iv(f, [at - w, at, at + w], [0, 1, 0], E.inOutSine);

/* ───────────── chat pieces ───────────── */

export function bubbleLayer(st: Stage, b: BubbleSpec, glow = false) {
  const m = bubbleSize(b);
  const layer = st.layer(m.w, m.h, (g) => {
    if (glow) {
      g.save();
      g.shadowColor = "rgba(236,120,230,0.85)";
      g.shadowBlur = 22;
      g.shadowOffsetX = 6;
      rr(g, 0, 0, m.w, m.h, Math.min(m.size * 0.9, m.h / 2));
      g.fillStyle = C.bubbleBlue;
      g.fill();
      g.restore();
    }
    drawBubble(g, b, 0, 0);
  }, { pad: 40 });
  return { layer, w: m.w, h: m.h };
}

/** A row of reply chips; the last one gets the Moonlight gradient. */
export function chipsLayer(st: Stage, labels: string[], size = 19) {
  const padX = size * 0.75;
  const h = Math.round(size * 1.9);
  const gap = size * 0.55;
  const ws = labels.map((l) => Math.ceil(measure(l, { size }) + padX * 2));
  const w = ws.reduce((a, b) => a + b, 0) + gap * (labels.length - 1);
  const centers: number[] = [];
  const layer = st.layer(w, h, (g) => {
    let x = 0;
    labels.forEach((l, i) => {
      rr(g, x, 0, ws[i]!, h, size * 0.4);
      if (i === labels.length - 1) {
        const gr = g.createLinearGradient(x, 0, x + ws[i]!, h);
        gr.addColorStop(0, "#e3b8f5");
        gr.addColorStop(0.55, "#f3c6ee");
        gr.addColorStop(1, "#bfe3fb");
        g.fillStyle = gr;
      } else g.fillStyle = "#d1d1d6";
      g.fill();
      drawText(g, l, x + ws[i]! / 2, h / 2 + 1, { size, color: C.ink, align: "center" });
      x += ws[i]! + gap;
    });
  }, { pad: 30 });
  let x = 0;
  ws.forEach((cw) => {
    centers.push(x + cw / 2);
    x += cw + gap;
  });
  return { layer, w, h, centers };
}

/* ───────────── the chat phone ───────────── */

/** World geometry of the chat phone, shared by both chat scenes. */
export const PH = { w: 470, h: 960, left: 305, top: 60 };
export const SCREEN = { left: PH.left + 16.5, right: PH.left + PH.w - 16.5 };
export const MSG = { left: SCREEN.left + 16, right: SCREEN.right - 18 };
export const KB = { y: 745, h: 196 };

/** Phone body with status bar, chat header and input bar (keyboard is separate). */
export function chatPhone(st: Stage, who: { name: string; av?: string; app?: boolean }, images: Record<string, string>) {
  const draw: Draw = (g, img) => {
    phoneBody(g, PH.w, PH.h);
    statusBar(g, 52, 44, 366, "7:13", 0.55);
    if (who.app) appAvatar(g, PH.w / 2, 104, 30);
    else avatar(g, img[who.av!], PH.w / 2, 104, 30, "#a3d0ee");
    drawText(g, `${who.name} ›`, PH.w / 2, 152, { size: 15, weight: 500, color: C.ink, align: "center" });
    g.fillStyle = "#e5e5ea";
    g.fillRect(16.5, 176, PH.w - 33, 1);
    // input bar
    g.strokeStyle = "#c7c7cc";
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(44, KB.y - 34, 17, 0, Math.PI * 2);
    g.stroke();
    drawText(g, "+", 44, KB.y - 35, { size: 24, color: "#8e8e93", align: "center" });
    rr(g, 72, KB.y - 53, 370, 38, 19);
    g.stroke();
    drawText(g, "iMessage", 88, KB.y - 34, { size: 16, color: "#8e8e93" });
  };
  const layer = st.layer(PH.w, PH.h, draw, { images, pad: 40 });
  layer.set({ x: PH.left + PH.w / 2, y: PH.top + PH.h / 2 });
  return layer;
}

export function keyboardLayer(st: Stage) {
  const w = SCREEN.right - SCREEN.left;
  const layer = st.layer(w, KB.h, (g) => {
    g.save();
    g.beginPath();
    g.roundRect(0, 0, w, KB.h, [0, 0, 58, 58]);
    g.clip();
    keyboard(g, 0, 0, w, 0.68);
    g.restore();
  }, { pad: 10 });
  const pos = { x: SCREEN.left + w / 2, y: PH.top + KB.y + KB.h / 2 };
  layer.set(pos);
  return { layer, ...pos };
}
