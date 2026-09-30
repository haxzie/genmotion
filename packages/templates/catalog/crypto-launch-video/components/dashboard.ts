/**
 * The referral dashboard of scene 5, laid out in its own pixel space
 * (D-space: top-left origin, y down) and drawn once into two canvases.
 * Numbers that count and bars that grow are separate meshes on top.
 */
import * as THREE from "three";
import { C, FONT_UI } from "./brand";
import type { Copy } from "./copy";
import { Counter, canvasMesh, rect, roundRect } from "./kit";

export const DW = 2408;
export const TOP_H = 1700;
export const TABLE_Y = 1700;
export const DH = 2880;
export const M = 70; // margin for the glow

export const STAT_X = (i: number) => 115 + i * 557;
export const REWARD_X = [173, 540, 905, 1265];
export const BAR = { x: 173, base: 1330, w: 22, gap: 9, n: 22 };
export const ROW_Y = (i: number) => 2010 + i * 97;
export const COL_X = [173, 835, 1240, 1520, 1860];

type G = OffscreenCanvasRenderingContext2D;

const f = (w: number, s: number) => `${w} ${s}px ${FONT_UI}`;
function text(g: G, s: string, x: number, y: number, size: number, color: string, weight = 400, align: CanvasTextAlign = "left") {
  g.font = f(weight, size);
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillText(s, x, y);
}
function box(g: G, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  roundRect(g, x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = 2;
    g.stroke();
  }
}
function avatar(g: G, x: number, y: number, r: number, a: string, b: string, angle = -0.8) {
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = a;
  g.fillRect(x - r, y - r, 2 * r, 2 * r);
  g.translate(x, y);
  g.rotate(angle);
  g.fillStyle = b;
  g.fillRect(0, -r, r, 2 * r);
  g.restore();
}

/** Card frame with the glow edge, drawn in both halves. */
function frame(g: G, y0: number, h: number) {
  g.save();
  roundRect(g, 0, 0, DW, DH, 60);
  g.fillStyle = "#030303";
  g.shadowColor = "rgba(242,208,95,0.55)";
  g.shadowBlur = 40;
  g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = "rgba(244,209,92,0.9)";
  g.lineWidth = 3;
  g.stroke();
  // inner vignette so the frame reads like the reference's dark glass
  const v = g.createRadialGradient(DW * 0.45, y0 + h / 2, 100, DW * 0.45, y0 + h / 2, DW * 0.8);
  v.addColorStop(0, "rgba(22,24,26,0.5)");
  v.addColorStop(1, "rgba(0,0,0,0)");
  roundRect(g, 2, 2, DW - 4, DH - 4, 58);
  g.fillStyle = v;
  g.fill();
  g.restore();
}

export function buildDashboard(T: Copy, res = 1.4) {
  const d = T.dash;
  const group = new THREE.Group();
  group.name = "dashboard";

  const topCanvas = canvasMesh(DW + 2 * M, TOP_H + M, (g) => {
    g.translate(M, M);
    frame(g, 0, TOP_H);
    avatar(g, 142, 98, 26, "#3b6fd8", "#d63b8f", 0.9);
    text(g, d.wallet, 185, 96, 38, "#f1f1f3", 700);
    text(g, d.rate, 185, 134, 25, "#8d8d94", 400);
    for (let i = 0; i < 4; i++) {
      const x = STAT_X(i);
      box(g, x, 192, 507, 271, 12, "#0b0c0e", "#1a1b1f");
      text(g, [d.stat1, d.stat2, d.stat3, d.stat4][i]!, x + 50, 256, 29, "#a2a2a8", 400);
      if (i === 2) text(g, d.stat3Sub, x + 50, 392, 29, "#7c7c83", 400);
      if (i === 3) text(g, d.stat4Val, x + 48, 323, 58, "#f1f1f3", 700);
    }
    // referral link
    box(g, 115, 502, DW - 230, 283, 14, "#070708", "#141518");
    text(g, d.linkTitle, 173, 588, 40, "#e8e8ea", 700);
    box(g, 173, 642, DW - 346, 91, 10, "#0c0d0e", "#18191c");
    g.font = f(400, 32);
    const baseW = g.measureText(T.urlBase).width;
    text(g, T.urlBase, 213, 690, 32, "#8b8b92", 400);
    text(g, T.urlCode, 213 + baseW, 690, 32, "#f4f4f6", 700);
    box(g, DW - 115 - 60 - 190, 540, 190, 54, 8, C.yellow);
    text(g, d.copy, DW - 115 - 60 - 95, 568, 24, "#200607", 600, "center");
    // rewards
    text(g, d.rewards, 173, 870, 40, "#e8e8ea", 700);
    [d.r1, d.r2, d.r3, d.r4].forEach((s, i) => text(g, s, REWARD_X[i]!, 928, 29, "#8e8e95", 400));
    box(g, 1720, 860, 520, 100, 8, "#f2d05f");
    text(g, d.claim, 1980, 912, 40, "#200506", 700, "center");
    // payments
    text(g, d.payments, 173, 1450, 32, "#dcdcdf", 700);
    d.payRows.forEach((s, i) => {
      box(g, 173, 1490 + i * 72, DW - 346, 58, 8, "#0d0e0f", "#16171a");
      text(g, s, 200, 1519 + i * 72, 30, "#b8b8be", 400);
    });
  }, { res, name: "dashboard-top", anchor: "left" });
  topCanvas.geometry.translate(0, -(TOP_H + M) / 2, 0);
  topCanvas.position.set(-M, M, 0);

  const tableCanvas = canvasMesh(DW + 2 * M, DH - TABLE_Y + M, (g) => {
    g.translate(M, -TABLE_Y);
    frame(g, TABLE_Y, DH - TABLE_Y);
    text(g, d.tableTitle, 173, 1800, 46, "#cfcfd3", 700);
    // filters
    box(g, DW - 115 - 420, 1765, 420, 70, 12, "#0e0f11", "#1b1c20");
    box(g, DW - 115 - 410, 1773, 90, 54, 8, "#1c1d21");
    d.filters.forEach((s, i) => text(g, s, DW - 115 - 365 + i * 100, 1800, 28, i === 0 ? "#e4e4e8" : "#77777e", 400, "center"));
    d.cols.forEach((s, i) => text(g, s, COL_X[i]!, 1905, 26, "#6c6c74", 400));
    const cols = [["#3b5bd6", "#c23a3a"], ["#e0782f", "#3b5bd6"], ["#c23a8f", "#c23a3a"], ["#be950f", "#e0b43a"], ["#e0782f", "#3b5bd6"], ["#3b5bd6", "#e0b43a"], ["#c23a3a", "#3b5bd6"], ["#3b5bd6", "#be950f"]];
    d.rows.forEach((r, i) => {
      const y = ROW_Y(i);
      avatar(g, 193, y, 23, cols[i]![0]!, cols[i]![1]!, Math.PI / 2 * (i % 2 ? 1 : 0.0) + 1.57);
      text(g, r[0]!, 235, y, 32, "#d0d0d4", 400);
      text(g, r[1]!, 835, y, 32, "#e2e2e6", 400);
      text(g, r[3]!, 1520, y, 32, "#e8e8ec", 400);
      text(g, r[4]!, 1860, y, 32, "#9c9ca3", 400);
    });
  }, { res, name: "dashboard-table", anchor: "left" });
  tableCanvas.geometry.translate(0, -(DH - TABLE_Y + M) / 2, 0);
  tableCanvas.position.set(-M, -TABLE_Y, 0);

  topCanvas.renderOrder = tableCanvas.renderOrder = -2;
  group.add(topCanvas, tableCanvas);

  // live numbers
  const statFont = { weight: 700, font: FONT_UI, res: 2, tabular: true } as const;
  const unclaimed = new Counter(`-0123456789,${d.unit}`, { ...statFont, size: 58, color: C.loss, maxLen: 12, name: "stat-unclaimed" });
  unclaimed.group.position.set(STAT_X(0) + 48, -323, 1);
  const volume = new Counter("-$0123456789,", { ...statFont, size: 58, color: C.loss, maxLen: 13, name: "stat-volume" });
  volume.group.position.set(STAT_X(1) + 48, -323, 1);
  const refs = new Counter("0123456789", { ...statFont, size: 58, color: C.loss, maxLen: 5, name: "stat-referrals" });
  refs.group.position.set(STAT_X(2) + 48, -323, 1);
  const rewards = [0, 1, 2, 3].map((i) => {
    const c = new Counter(`-0123456789,${d.unit}`, { ...statFont, size: 44, color: C.loss, maxLen: 12, name: `reward-${i + 1}` });
    c.group.position.set(REWARD_X[i]!, -995, 1);
    return c;
  });
  group.add(unclaimed.group, volume.group, refs.group, ...rewards.map((r) => r.group));

  // bar chart
  const barMat = new THREE.MeshBasicMaterial({ color: C.loss, transparent: true, depthWrite: false });
  const bars: THREE.Mesh[] = [];
  const barGeo = new THREE.PlaneGeometry(BAR.w, 1);
  barGeo.translate(0, 0.5, 0);
  for (let i = 0; i < BAR.n; i++) {
    const b = new THREE.Mesh(barGeo, barMat);
    b.position.set(BAR.x + i * (BAR.w + BAR.gap) + BAR.w / 2, -BAR.base, 1);
    b.name = `chart-bar-${i + 1}`;
    bars.push(b);
    group.add(b);
  }
  const barUp = (i: number) => 22 + Math.pow(i / (BAR.n - 1), 1.6) * 230 + (i % 3 === 1 ? -12 : 0) + (i === BAR.n - 1 ? 40 : 0);
  /** Loss chart: the same shape, mirrored, so it only ever goes down. */
  const barH = (i: number) => barUp(BAR.n - 1 - i);

  // type badges (stamped in row by row) + their flash
  const badges: THREE.Mesh[] = [];
  const flashes: THREE.Mesh[] = [];
  d.rows.forEach((r, i) => {
    const b = canvasMesh(263, 60, (g) => {
      const gr = g.createLinearGradient(4, 0, 259, 0);
      gr.addColorStop(0, "#6a1a1e");
      gr.addColorStop(1, "#2c0b0d");
      roundRect(g, 4, 4, 255, 52, 6);
      g.fillStyle = gr;
      g.fill();
      g.strokeStyle = "#a8343a";
      g.lineWidth = 1.5;
      g.stroke();
      text(g, r[2]!, 30, 27, 30, "#ffd9d9", 400);
    }, { res: 2, name: `type-badge-${i + 1}` });
    b.position.set(1237 + 127.5, -(ROW_Y(i) - 1), 1);
    const fl = rect(257, 60, "#f2d05f", 0, `type-badge-flash-${i + 1}`);
    fl.position.set(1237 + 128, -ROW_Y(i) + 2, 1.2);
    badges.push(b);
    flashes.push(fl);
    group.add(b, fl);
  });
  // stat card highlight
  const statFlash = [0, 1, 2].map((i) => {
    const r = rect(507, 271, "#6e1418", 0, `stat-flash-${i + 1}`);
    r.position.set(STAT_X(i) + 253.5, -(192 + 135.5), 0.5);
    group.add(r);
    return r;
  });

  // draw order is fixed, not depth-sorted: the tilted card must never cover its own numbers
  for (const r of statFlash) r.renderOrder = 1;
  for (const b of bars) b.renderOrder = 2;
  for (const b of badges) b.renderOrder = 2;
  for (const f of flashes) f.renderOrder = 3;
  for (const c of [unclaimed, volume, refs, ...rewards]) c.group.traverse((o) => (o.renderOrder = 4));
  return { group, unclaimed, volume, refs, rewards, bars, barH, badges, flashes, statFlash, barMat };
}
