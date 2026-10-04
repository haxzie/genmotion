import * as THREE from "three";
import { PX } from "./stage";
import { FONT, MONO } from "./type";

/**
 * The Assemble agent transcript, drawn block by block at 1:1 frame px (column x 145..1775).
 * Each block is its own canvas plane so it can stream in; `layout` stacks them.
 */
export const COL_X = 145;
export const COL_W = 1630;
const RES = 1.5;
const INK = "#24292d";
const GREY = "#6b7378";
const CARD_BG = "#f2f5f7";
const CARD_BORDER = "#e1e6e9";

type G = OffscreenCanvasRenderingContext2D;
type Run = { t: string; mono?: boolean; bold?: boolean };

export interface Block {
  id: string;
  h: number;
  mesh: THREE.Mesh;
  gapAfter: number;
}

function font(g: G, size: number, weight = 400, mono = false) {
  g.font = `${weight} ${size}px ${mono ? MONO : FONT}`;
}

function wrap(g: G, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (g.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function rr(g: G, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); }
}

/** inline runs (prose with `code` and **bold**) laid on one line, wrapping at maxW */
function runs(g: G, rs: Run[], x0: number, y0: number, maxW: number, size: number, lh: number, colour = INK) {
  let x = x0, y = y0;
  for (const r of rs) {
    const parts = r.t.split(/(\s+)/);
    for (const p of parts) {
      if (!p) continue;
      if (r.mono) {
        font(g, size * 0.82, 400, true);
      } else font(g, size, r.bold ? 600 : 400);
      const w = g.measureText(p).width + (r.mono ? 12 : 0);
      if (x + w > x0 + maxW && /\S/.test(p) && x > x0) { x = x0; y += lh; }
      if (r.mono && /\S/.test(p)) {
        rr(g, x, y - size * 0.62, w, size * 1.24, 4, "#eef1f3");
        g.fillStyle = "#3b4146";
        g.fillText(p, x + 6, y);
      } else {
        g.fillStyle = colour;
        g.fillText(p, x, y);
      }
      x += w;
    }
  }
  return y - y0 + lh;
}

function make(id: string, h: number, draw: (g: G) => void, gapAfter = 40): Block {
  const c = new OffscreenCanvas(Math.ceil(COL_W * RES), Math.ceil(h * RES));
  const g = c.getContext("2d")!;
  g.scale(RES, RES);
  g.textBaseline = "middle";
  draw(g);
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(COL_W * PX, h * PX), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  mesh.name = id;
  return { id, h, mesh, gapAfter };
}

function measureLines(text: string, size: number, maxW: number, mono = false) {
  const g = new OffscreenCanvas(4, 4).getContext("2d")!;
  font(g, size, 400, mono);
  return text.split("\n").flatMap((l) => (l === "" ? [""] : wrap(g, l, maxW)));
}

/* ------------------------------------------------------------------ blocks */

export function bubble(id: string, text: string) {
  const x = 472 - COL_X, w = 1775 - 472;
  const lines = measureLines(text, 21.5, w - 46);
  const h = 46 + lines.length * 33.5;
  return make(id, h, (g) => {
    rr(g, x, 0, w, h, 12, "#e8eef2");
    font(g, 21.5);
    g.fillStyle = "#2c3a44";
    lines.forEach((l, i) => g.fillText(l, x + 23, 31 + i * 33.5));
  }, 32);
}

export function thought(id: string, secs: number) {
  return make(id, 40, (g) => {
    g.strokeStyle = GREY; g.lineWidth = 1.6;
    g.beginPath(); g.arc(12, 20, 10, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(12, 10); g.lineTo(12, 30); g.moveTo(5, 17); g.quadraticCurveTo(9, 20, 12, 17); g.moveTo(19, 23); g.quadraticCurveTo(15, 20, 12, 23); g.stroke();
    font(g, 21); g.fillStyle = GREY;
    g.fillText(`Thought for ${secs} seconds`, 36, 20);
    const w = g.measureText(`Thought for ${secs} seconds`).width;
    g.beginPath(); g.moveTo(36 + w + 13, 17); g.lineTo(36 + w + 19, 23); g.lineTo(36 + w + 25, 17); g.stroke();
  }, 36);
}

export function terminal(id: string, cmd: string, out: string) {
  const lines = measureLines(out, 16.5, COL_W - 50, true);
  const h = 60 + 30 + 26.4 + (out ? 26 + lines.length * 26.4 : 0) + 24;
  return make(id, h, (g) => {
    rr(g, 0.75, 0.75, COL_W - 1.5, h - 1.5, 10, CARD_BG, CARD_BORDER);
    g.fillStyle = CARD_BORDER; g.fillRect(0, 60, COL_W, 1.5);
    g.strokeStyle = GREY; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(26, 23); g.lineTo(32, 29); g.lineTo(26, 35); g.moveTo(34, 37); g.lineTo(42, 37); g.stroke();
    font(g, 18); g.fillStyle = GREY; g.fillText("Terminal", 57, 30);
    g.strokeRect(COL_W - 50, 22, 13, 13); g.strokeRect(COL_W - 45, 27, 13, 13);
    font(g, 16.5, 400, true); g.fillStyle = "#30363a";
    let y = 60 + 37;
    g.fillText("$ " + cmd, 24, y);
    y += 26.4 + 26;
    for (const l of lines) { g.fillText(l, 24, y); y += 26.4; }
  }, 50);
}

export function toolRow(id: string, title: string, sub: string, body: string, status = "DONE") {
  const h = 76 + 50;
  return make(id, h, (g) => {
    rr(g, 0.75, 0.75, COL_W - 1.5, h - 1.5, 10, "#fdfdfd", CARD_BORDER);
    g.save(); g.beginPath(); g.roundRect(0.75, 0.75, COL_W - 1.5, 76, [10, 10, 0, 0]); g.fillStyle = CARD_BG; g.fill(); g.restore();
    g.fillStyle = CARD_BORDER; g.fillRect(0, 76, COL_W, 1.5);
    rr(g, 19, 18, 40, 40, 7, "#e2e8ec");
    g.strokeStyle = "#5f7380"; g.lineWidth = 1.6;
    if (title === "Tool") { g.strokeRect(30, 29, 18, 18); g.beginPath(); g.moveTo(34, 34); g.lineTo(38, 38); g.lineTo(34, 42); g.stroke(); }
    else { g.beginPath(); g.moveTo(31, 27); g.lineTo(42, 27); g.lineTo(47, 32); g.lineTo(47, 49); g.lineTo(31, 49); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(35, 37); g.lineTo(43, 37); g.moveTo(35, 42); g.lineTo(43, 42); g.stroke(); }
    font(g, 18, 500); g.fillStyle = "#1f2428"; g.fillText(title, 78, 28);
    font(g, 14.5, 400, true); g.fillStyle = GREY; g.fillText(sub, 78, 50);
    g.letterSpacing = "3px"; font(g, 14.5, 400, true); g.fillStyle = status === "ERROR" ? "#9a6f6f" : "#8d969b";
    g.textAlign = "right"; g.fillText(status, COL_W - 52, 39); g.textAlign = "left"; g.letterSpacing = "0px";
    g.beginPath(); g.moveTo(COL_W - 35, 36); g.lineTo(COL_W - 29, 42); g.lineTo(COL_W - 23, 36); g.stroke();
    font(g, 16, 400, true); g.fillStyle = "#4a5156"; g.fillText(body, 18, 76 + 26);
  }, 50);
}

export function prose(id: string, rs: Run[] | string, size = 21, gapAfter = 30, colour = INK) {
  const arr: Run[] = typeof rs === "string" ? [{ t: rs }] : rs;
  const g0 = new OffscreenCanvas(4, 4).getContext("2d")!;
  const tmp = new OffscreenCanvas(COL_W, 600).getContext("2d")!;
  tmp.textBaseline = "middle";
  const h = runs(tmp, arr, 0, size * 0.8, COL_W - 10, size, size * 1.65, colour) + 6;
  void g0;
  return make(id, h, (g) => runs(g, arr, 0, size * 0.8, COL_W - 10, size, size * 1.65, colour), gapAfter);
}

export function bullets(id: string, items: Run[][], numbered = false, size = 21) {
  const tmp = new OffscreenCanvas(COL_W, 800).getContext("2d")!;
  tmp.textBaseline = "middle";
  const hs = items.map((rs) => runs(tmp, rs, 30, 0, COL_W - 60, size, size * 1.6) + 18);
  const h = hs.reduce((a, b) => a + b, 0);
  return make(id, h, (g) => {
    let y = size * 0.8;
    items.forEach((rs, i) => {
      font(g, size); g.fillStyle = INK;
      g.fillText(numbered ? `${i + 1}.` : "•", 2, y);
      runs(g, rs, numbered ? 26 : 30, y, COL_W - 60, size, size * 1.6);
      y += hs[i]!;
    });
  }, 26);
}

export function heading(id: string, text: string, size = 21) {
  return make(id, size * 1.6, (g) => { font(g, size, 600); g.fillStyle = "#1d2125"; g.fillText(text, 0, size * 0.8); }, 22);
}

export function codeCard(id: string, text: string, inset = true) {
  const lines = text.split("\n");
  const h = (inset ? 90 : 30) + lines.length * 29 + 30;
  return make(id, h, (g) => {
    rr(g, 0.75, 0.75, COL_W - 1.5, h - 1.5, 10, "#fdfdfd", CARD_BORDER);
    if (inset) rr(g, 14, 72, COL_W - 28, h - 86, 8, "#fbfcfc", "#e8ecee");
    g.strokeStyle = "#7b858b"; g.lineWidth = 1.6;
    g.strokeRect(COL_W - 98, 28, 14, 14); g.beginPath(); g.moveTo(COL_W - 50, 24); g.lineTo(COL_W - 50, 38); g.moveTo(COL_W - 56, 33); g.lineTo(COL_W - 50, 39); g.lineTo(COL_W - 44, 33); g.stroke();
    font(g, 17.5, 400, true); g.fillStyle = "#3a4146";
    lines.forEach((l, i) => g.fillText(l, inset ? 96 : 24, (inset ? 112 : 40) + i * 29.5));
  }, 40);
}

export function changeCard(id: string, kind: string, title: string, rows: [string, string, string][]) {
  const rowH = 157;
  const h = 78 + 72 + rows.length * rowH + 90;
  return make(id, h, (g) => {
    rr(g, 0.75, 0.75, COL_W - 1.5, h - 1.5, 10, "#fdfdfd", CARD_BORDER);
    g.fillStyle = CARD_BORDER; g.fillRect(0, 78, COL_W, 1.5);
    rr(g, 24, 20, 40, 40, 8, "#ffffff", "#e3e8eb");
    g.fillStyle = "#1798c1"; g.beginPath(); g.ellipse(44, 40, 13, 8, 0, 0, Math.PI * 2); g.fill();
    font(g, 18.5); g.fillStyle = "#1f2428"; g.fillText("Salesforce change", 80, 27);
    font(g, 16.5); g.fillStyle = GREY; g.fillText(kind, 80, 52);
    rr(g, COL_W - 137, 24, 112, 30, 5, "#eef7ef", "#bfe0c4");
    font(g, 15, 500); g.fillStyle = "#3f8a4d"; g.letterSpacing = "1px"; g.fillText("✓ APPLIED", COL_W - 124, 40); g.letterSpacing = "0px";
    font(g, 21); g.fillStyle = INK; g.fillText(title, 25, 115);
    let y = 150;
    const IDS = ["T120gIAB", "T0p3dIAB", "T11vtIAB", "T0aa1IAB", "T0bb2IAB", "T0cc3IAB"];
    rows.forEach(([label, before, after], ri) => {
      rr(g, 25, y, COL_W - 50, rowH - 12, 6, "#fdfdfd", "#e5e9ec");
      g.fillStyle = "#f4f7f9"; g.fillRect(26, y + 1, COL_W - 52, 40);
      font(g, 18.5, 500); g.fillStyle = INK; g.fillText(label, 44, y + 21);
      font(g, 14.5, 400, true); g.fillStyle = "#8d969b"; g.textAlign = "right"; g.fillText("001Bi00000" + IDS[ri % IDS.length]!, COL_W - 45, y + 21); g.textAlign = "left";
      font(g, 15.5); g.fillStyle = GREY; g.fillText("Before  −1", 44, y + 61); g.fillText("After  +1", 832, y + 61);
      g.fillStyle = "#fbe9eb"; g.fillRect(26, y + 79, (COL_W - 52) / 2, rowH - 92);
      g.fillStyle = "#eaf4ec"; g.fillRect(26 + (COL_W - 52) / 2, y + 79, (COL_W - 52) / 2, rowH - 92);
      font(g, 15.5); g.fillStyle = GREY; g.fillText("Rating", 44, y + 99); g.fillText("Rating", 832, y + 99);
      font(g, 16.5, 400, true); g.fillStyle = "#b03a48"; g.fillText(before, 44, y + 122); g.fillStyle = "#2f7d43"; g.fillText(after, 832, y + 122);
      y += rowH;
    });
    g.fillStyle = "#e6eaec"; g.fillRect(24, h - 82, COL_W - 48, 1.5);
    font(g, 16.5); g.fillStyle = GREY; g.fillText(`Reverting restores the previous field values for ${rows.length} records.`, 24, h - 40);
    rr(g, COL_W - 182, h - 62, 156, 44, 8, "#fdfdfd", "#e0e5e8");
    font(g, 18); g.fillStyle = "#2a3035"; g.fillText("↺  Revert", COL_W - 166, h - 40);
  }, 36);
}

export function table(id: string, head: string[], rows: string[][], colX: number[]) {
  const h = 72 + 56 + rows.length * 55 + 16;
  return make(id, h, (g) => {
    rr(g, 0.75, 0.75, COL_W - 1.5, h - 1.5, 10, "#fdfdfd", CARD_BORDER);
    rr(g, 14, 64, COL_W - 28, h - 80, 6, "#fdfdfd", "#e8ecee");
    g.fillStyle = "#f4f7f9"; g.fillRect(15, 65, COL_W - 30, 54);
    font(g, 20, 600); g.fillStyle = "#1f2428";
    head.forEach((t, i) => g.fillText(t, colX[i]!, 92));
    rows.forEach((r, j) => {
      const y = 119 + j * 55;
      g.fillStyle = "#eceff1"; g.fillRect(15, y, COL_W - 30, 1.2);
      font(g, 20); g.fillStyle = INK;
      r.forEach((t, i) => g.fillText(t, colX[i]!, y + 28));
    });
  }, 36);
}

/** Stack blocks top-down from y = 0 (frame px, y down); returns each block's top. */
export function layout(blocks: Block[]) {
  const tops: Record<string, number> = {};
  let y = 0;
  for (const b of blocks) {
    tops[b.id] = y;
    y += b.h + b.gapAfter;
  }
  return { tops, height: y };
}
