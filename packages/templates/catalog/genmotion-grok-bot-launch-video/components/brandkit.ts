import * as THREE from "three";
import type { G } from "./glyphs";
import { play } from "./glyphs";

/**
 * A fictional customer brand ("halo", a skincare line) for the brand-assets
 * beat: the files the user drops in, and the ads the bot makes from them.
 * Both draw from the same palette and marks, so the output reads on-brand.
 */
export const HALO = {
  coral: "#ff7a59",
  cream: "#f7ead6",
  navy: "#1f2b4d",
  sage: "#9bb89a",
} as const;

const FONT = 'Inter, -apple-system, "Helvetica Neue", Arial, sans-serif';

function clipRound(g: G, w: number, h: number, r: number): void {
  g.beginPath();
  g.roundRect(0, 0, w, h, r);
  g.clip();
}

function haloMark(g: G, cx: number, cy: number, r: number, ring: string, dot: string): void {
  g.strokeStyle = ring;
  g.lineWidth = r * 0.34;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = dot;
  g.beginPath();
  g.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
  g.fill();
}

function wordmark(g: G, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "left"): void {
  g.fillStyle = color;
  g.font = `600 ${size}px ${FONT}`;
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillText("halo", x, y);
  g.textAlign = "left";
}

function bottle(g: G, cx: number, base: number, h: number, body: string, cap: string): void {
  const w = h * 0.42;
  g.fillStyle = body;
  g.beginPath();
  g.roundRect(cx - w / 2, base - h * 0.78, w, h * 0.78, w * 0.22);
  g.fill();
  g.fillStyle = cap;
  g.beginPath();
  g.roundRect(cx - w * 0.28, base - h, w * 0.56, h * 0.26, w * 0.08);
  g.fill();
  haloMark(g, cx, base - h * 0.42, w * 0.18, cap, cap);
}

function playBadge(g: G, w: number, h: number): void {
  const r = Math.min(w, h) * 0.15;
  const cx = r + h * 0.1;
  const cy = h - r - h * 0.1;
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  play(g, cx + r * 0.08, cy, r * 0.9, HALO.navy);
}

export type HaloKind = "logo" | "product" | "sun" | "swatch" | "product-cream";

/** One brand file / ad frame. `video` adds a play badge. */
export function drawHalo(g: G, w: number, h: number, kind: HaloKind, video = false, r = 12): void {
  g.save();
  clipRound(g, w, h, r);
  if (kind === "logo") {
    g.fillStyle = HALO.cream;
    g.fillRect(0, 0, w, h);
    haloMark(g, w * 0.25, h / 2, h * 0.15, HALO.coral, HALO.navy);
    wordmark(g, w * 0.42, h / 2, h * 0.3, HALO.navy);
  } else if (kind === "product" || kind === "product-cream") {
    const cream = kind === "product-cream";
    g.fillStyle = cream ? HALO.cream : HALO.coral;
    g.fillRect(0, 0, w, h);
    g.fillStyle = cream ? HALO.coral : HALO.cream;
    g.beginPath();
    g.arc(w * 0.68, h * 0.42, h * 0.32, 0, Math.PI * 2);
    g.fill();
    bottle(g, w * 0.66, h * 0.9, h * 0.72, HALO.navy, HALO.cream);
    if (cream) wordmark(g, w * 0.08, h * 0.2, h * 0.17, HALO.navy);
  } else if (kind === "sun") {
    g.fillStyle = HALO.navy;
    g.fillRect(0, 0, w, h);
    g.fillStyle = HALO.coral;
    g.beginPath();
    g.arc(w * 0.5, h * 0.78, h * 0.42, Math.PI, 0);
    g.fill();
    g.fillStyle = HALO.cream;
    g.fillRect(0, h * 0.78, w, h * 0.22);
    wordmark(g, w * 0.5, h * 0.3, h * 0.2, HALO.cream, "center");
  } else {
    g.fillStyle = HALO.cream;
    g.fillRect(0, 0, w, h);
    [HALO.coral, HALO.navy, HALO.sage].forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(w * (0.25 + i * 0.25), h * 0.5, h * 0.17, 0, Math.PI * 2);
      g.fill();
    });
  }
  if (video) playBadge(g, w, h);
  g.restore();
  // a thin white rim, like a file thumbnail
  g.strokeStyle = "rgba(255,255,255,0.9)";
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(1, 1, w - 2, h - 2, r - 1);
  g.stroke();
}

/**
 * A two-tone icon from an SVG file in assets/ (Phosphor's duotone hand /
 * hand-grabbing), drawn from the file's own <path> data onto a canvas at high
 * resolution. Phosphor ships the fill layer as a path at opacity 0.2; it is
 * painted opaque white here so the cursor reads solid over imagery, and the
 * outline path dark. Loaded through `manager` so the export waits for it.
 */
export function svgIconPlane(manager: THREE.LoadingManager, url: string, size: number): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const PX = 256;
  const canvas = new OffscreenCanvas(PX, PX);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  new THREE.FileLoader(manager).load(url, (svg) => {
    const src = String(svg);
    const vb = /viewBox="([\d.\s-]+)"/.exec(src)?.[1]?.split(/\s+/).map(Number) ?? [0, 0, 256, 256];
    const g = canvas.getContext("2d")!;
    const k = PX / vb[2]!;
    g.setTransform(k, 0, 0, k, -vb[0]! * k, -vb[1]! * k);
    for (const m of src.matchAll(/<path([^>]*)>/g)) {
      const attrs = m[1]!;
      const d = /\sd="([^"]+)"/.exec(attrs)?.[1];
      if (!d) continue;
      g.fillStyle = /opacity=/.test(attrs) ? "#ffffff" : "#111114";
      g.fill(new Path2D(d));
    }
    tex.needsUpdate = true;
  });
  return mesh;
}

/**
 * Ten small "sale ad" video frames for the render grid in scene 1: varied
 * backgrounds, a product, a discount or tag, and a tiny play badge so each
 * reads as a finished video at thumbnail size.
 */
export function drawSaleAd(g: G, w: number, h: number, i: number): void {
  const looks = [
    { bg: ["#ff7a59", "#ffb36b"], fg: "#1f2b4d", kind: "bottle" },
    { bg: ["#1f2b4d", "#3b4f8a"], fg: "#ffd166", kind: "pct" },
    { bg: ["#16c98f", "#c6f91e"], fg: "#0a0b0d", kind: "bag" },
    { bg: ["#f7ead6", "#ffd6c2"], fg: "#ff5a36", kind: "sale" },
    { bg: ["#7b5cff", "#c084fc"], fg: "#ffffff", kind: "bottle" },
    { bg: ["#0a0b0d", "#2b2b30"], fg: "#c6f91e", kind: "pct" },
    { bg: ["#ffd166", "#ffb36b"], fg: "#1f2b4d", kind: "bag" },
    { bg: ["#e24245", "#ff7a59"], fg: "#ffffff", kind: "sale" },
    { bg: ["#9bb89a", "#d9e8c4"], fg: "#1f2b4d", kind: "bottle" },
    { bg: ["#2ea0f5", "#7cd4ff"], fg: "#ffffff", kind: "pct" },
  ];
  const L = looks[i % looks.length]!;
  const r = Math.min(w, h) * 0.22;
  g.save();
  clipRound(g, w, h, r);
  const lg = g.createLinearGradient(0, 0, w, h);
  lg.addColorStop(0, L.bg[0]!);
  lg.addColorStop(1, L.bg[1]!);
  g.fillStyle = lg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = L.fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (L.kind === "bottle") {
    g.globalAlpha = 0.25;
    g.beginPath();
    g.arc(w * 0.62, h * 0.48, h * 0.36, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    bottle(g, w * 0.62, h * 0.9, h * 0.72, L.fg, L.bg[0]!);
  } else if (L.kind === "pct") {
    g.font = `800 ${h * 0.62}px ${FONT}`;
    g.fillText("%", w * 0.58, h * 0.52);
  } else if (L.kind === "bag") {
    const bw = h * 0.5;
    g.lineWidth = h * 0.07;
    g.strokeStyle = L.fg;
    g.beginPath();
    g.arc(w * 0.6, h * 0.36, bw * 0.24, Math.PI, 0);
    g.stroke();
    g.beginPath();
    g.roundRect(w * 0.6 - bw / 2, h * 0.36, bw, bw * 0.95, h * 0.06);
    g.fill();
  } else {
    g.font = `800 ${h * 0.34}px ${FONT}`;
    g.fillText("SALE", w * 0.56, h * 0.5);
  }
  // play badge, bottom-left
  const pr = h * 0.17;
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.beginPath();
  g.arc(pr + h * 0.1, h - pr - h * 0.1, pr, 0, Math.PI * 2);
  g.fill();
  play(g, pr + h * 0.1 + pr * 0.08, h - pr - h * 0.1, pr * 0.9, "#0a0b0d");
  g.restore();
}
