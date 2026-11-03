/**
 * GenMotion's on-preview feedback tools, rebuilt at 3x their CSS pixel sizes:
 * the click-to-comment bubble (apps/desktop/src/editor/components/
 * preview-inspector.tsx: HILITE #a855f7, 300px bubble, rounded-xl, surface/95,
 * label #cba3f5 + timecode #a855f7/70, cta send button) and the Draw tool
 * (pink marks, numbered badge, "N mark · time · keep drawing, or send" card —
 * styled from the app screenshot, pink sampled at #e54373).
 */
import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";
import { APP, FONT } from "./brand";
import type { G } from "./screen";
import { rr } from "./ui";

export const K = 3;
export const HILITE = "#a855f7";
export const MARK = "#e54373";
export const CTA = "#ededef";

/** A canvas-backed plane that redraws only when its key changes. */
export function layer(ctx: ThreeSceneContext, wPx: number, hPx: number, name: string, ppu = 1000) {
  const c = new OffscreenCanvas(wPx, hPx);
  const g = c.getContext("2d")!;
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wPx / ppu, hPx / ppu), mat);
  mesh.name = name;
  let last = "";
  return {
    mesh,
    mat,
    w: wPx,
    h: hPx,
    draw(key: string, paint: (g: G) => void) {
      if (key === last) return;
      last = key;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, wPx, hPx);
      paint(g);
      t.needsUpdate = true;
    },
  };
}

/** The preview's crosshair pointer (the inspector is `cursor-crosshair`). Origin at its centre. */
export function crosshair(ctx: ThreeSceneContext, name = "cursor"): THREE.Mesh {
  const S = 96;
  const c = new OffscreenCanvas(S, S);
  const g = c.getContext("2d")!;
  const m = S / 2;
  const arm = 30;
  for (const [w, col] of [[9, "#ffffff"], [3.5, "#0a0a0a"]] as const) {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.lineCap = "square";
    g.beginPath();
    g.moveTo(m - arm, m);
    g.lineTo(m + arm, m);
    g.moveTo(m, m - arm);
    g.lineTo(m, m + arm);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(S / 1000, S / 1000),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }),
  );
  mesh.name = name;
  mesh.renderOrder = 9;
  return mesh;
}

/** Hover / selected outline: 1.5px HILITE border, tinted fill, 1px outer ring, radius 3. */
export function paintHighlight(g: G, w: number, h: number, selected: boolean) {
  const pad = 8;
  rr(g, pad - 3, pad - 3, w - 2 * pad + 6, h - 2 * pad + 6, 3 * K + 3);
  g.lineWidth = 1 * K;
  g.strokeStyle = `${HILITE}55`;
  g.stroke();
  rr(g, pad, pad, w - 2 * pad, h - 2 * pad, 3 * K);
  g.fillStyle = selected ? `${HILITE}1a` : `${HILITE}22`;
  g.fill();
  g.lineWidth = 1.5 * K;
  g.strokeStyle = HILITE;
  g.stroke();
}

/** The comment anchor: a 10px HILITE dot with a 3px halo. Canvas is 48 css px square. */
export function paintPin(g: G, size: number) {
  const c = size / 2;
  g.beginPath();
  g.arc(c, c, 5 * K + 3 * K, 0, Math.PI * 2);
  g.fillStyle = `${HILITE}44`;
  g.fill();
  g.beginPath();
  g.arc(c, c, 5 * K, 0, Math.PI * 2);
  g.fillStyle = HILITE;
  g.fill();
}

/** Margin around the bubble inside its canvas, for the drop shadow. */
export const BUBBLE_PAD = 48 * K;
export const BUBBLE_W = 300 * K;
export const BUBBLE_H = 66 * K;

function sendButton(g: G, cx: number, cy: number) {
  g.beginPath();
  g.arc(cx, cy, 14 * K, 0, Math.PI * 2);
  g.fillStyle = CTA;
  g.fill();
  // SendGlyph: an up arrow, 16px, stroke 2.2.
  g.strokeStyle = APP.background;
  g.lineWidth = 2.2 * (16 / 24) * K;
  g.lineCap = "round";
  g.lineJoin = "round";
  const s = (16 * K) / 24;
  g.beginPath();
  g.moveTo(cx, cy + 7 * s);
  g.lineTo(cx, cy - 7 * s);
  g.moveTo(cx - 6 * s, cy - 1 * s);
  g.lineTo(cx, cy - 7 * s);
  g.lineTo(cx + 6 * s, cy - 1 * s);
  g.stroke();
}

export interface BubbleContent {
  /** Coloured header spans, left to right. */
  header: { text: string; color: string }[];
  /** Border colour (the feature's hue at 50%). */
  border: string;
  typed: string;
  placeholder: string;
  caret: boolean;
}

/** Bubble card: rounded-xl, border 1px, surface/95, shadow 0 12 36 rgba(0,0,0,.5), px-2.5 py-2, gap-1. */
export function paintBubble(g: G, b: BubbleContent) {
  const x = BUBBLE_PAD;
  const y = BUBBLE_PAD * 0.6;
  g.save();
  g.shadowColor = "rgba(0,0,0,0.5)";
  g.shadowBlur = 36 * K;
  g.shadowOffsetY = 12 * K;
  rr(g, x, y, BUBBLE_W, BUBBLE_H, 12 * K);
  g.fillStyle = "#0f0f12";
  g.fill();
  g.restore();
  rr(g, x, y, BUBBLE_W, BUBBLE_H, 12 * K);
  g.lineWidth = K;
  g.strokeStyle = b.border;
  g.stroke();

  // Header line, 0.786rem (11px).
  g.font = `400 ${11 * K}px ${FONT}`;
  g.textBaseline = "middle";
  g.textAlign = "left";
  let hx = x + 10 * K;
  const hy = y + 8 * K + 8 * K;
  for (const span of b.header) {
    g.fillStyle = span.color;
    g.fillText(span.text, hx, hy);
    hx += g.measureText(span.text).width;
  }

  // Input row: 0.929rem (13px) text, send button size-7.
  const ry = y + 8 * K + 16 * K + 4 * K + 14 * K;
  g.font = `400 ${13 * K}px ${FONT}`;
  const tx = x + 10 * K;
  if (b.typed) {
    g.fillStyle = APP.textPrimary;
    g.fillText(b.typed, tx, ry);
  } else {
    g.fillStyle = APP.textTertiary;
    g.fillText(b.placeholder, tx, ry);
  }
  if (b.caret) {
    const cw = b.typed ? g.measureText(b.typed).width : 0;
    g.fillStyle = APP.textPrimary;
    g.fillRect(tx + cw + 1 * K, ry - 8 * K, 1 * K, 16 * K);
  }
  sendButton(g, x + BUBBLE_W - 10 * K - 14 * K, ry);
}

/** Numbered draw badge: pink disc with a soft ring and a white figure. */
export function paintBadge(g: G, size: number, n: number) {
  const c = size / 2;
  g.beginPath();
  g.arc(c, c, 9.5 * K + 3 * K, 0, Math.PI * 2);
  g.fillStyle = "rgba(229,67,115,0.3)";
  g.fill();
  g.beginPath();
  g.arc(c, c, 9.5 * K, 0, Math.PI * 2);
  g.fillStyle = MARK;
  g.fill();
  g.font = `500 ${11 * K}px ${FONT}`;
  g.fillStyle = "#ffffff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(n), c, c + 1);
}

/** mm:ss.ff, the app's framesToTimecode. */
export function timecode(frame: number, fps: number): string {
  const s = frame / fps;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}.${String(Math.floor(frame % fps)).padStart(2, "0")}`;
}

/**
 * Grow an image plane `k` times while keeping the picture at its original size
 * and place: the extra border samples the texture's clamped edge pixels, so
 * the frame simply continues outward and no dark edge ever comes into shot.
 */
export function bleedEdges(mesh: THREE.Mesh, w: number, h: number, k = 5): void {
  const geo = new THREE.PlaneGeometry(w * k, h * k);
  const uv = geo.attributes.uv!;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) - 0.5) * k + 0.5, (uv.getY(i) - 0.5) * k + 0.5);
  }
  mesh.geometry.dispose();
  mesh.geometry = geo;
}
