import * as THREE from "three";
import { SANS } from "./brand";
import { canvasPlane, place, rr } from "./stage";

type G = OffscreenCanvasRenderingContext2D;

/**
 * A realistic modern phone, front-on, in design px. Shared by scenes 04 and 05
 * so they cut on the identical device.
 *  body   470 × 966 (ratio 2.06), corner 78
 *  band   6 px brushed-titanium edge
 *  bezel  14 px black → screen inset 20, screen radius = 78 − 20 = 58 (concentric)
 */
export const PHONE = { cx: 540, cy: 540, w: 470, h: 966, r: 78 };
const INSET = 20;
export const SCREEN = {
  cx: PHONE.cx,
  cy: PHONE.cy,
  w: PHONE.w - INSET * 2,
  h: PHONE.h - INSET * 2,
  r: PHONE.r - INSET,
  left: PHONE.cx - (PHONE.w - INSET * 2) / 2,
  top: PHONE.cy - (PHONE.h - INSET * 2) / 2,
};
/** Screen px (top-left of the glass) → design px. */
export const SX = (x: number) => SCREEN.left + x;
export const SY = (y: number) => SCREEN.top + y;

function titanium(g: G, x0: number, x1: number) {
  const t = g.createLinearGradient(x0, 0, x1, 0);
  t.addColorStop(0, "#5f5d5a");
  t.addColorStop(0.04, "#c9c5be");
  t.addColorStop(0.1, "#8e8a84");
  t.addColorStop(0.5, "#a19d96");
  t.addColorStop(0.9, "#8e8a84");
  t.addColorStop(0.96, "#d6d2cb");
  t.addColorStop(1, "#5f5d5a");
  return t;
}

/**
 * The hardware: band, bezel, side buttons, dynamic island and a faint glass
 * sheen, with the screen area cut out so whatever sits behind shows through.
 */
export function deviceFrame() {
  const BTN = 5; // side buttons protrude this far
  const W = PHONE.w + BTN * 2;
  const H = PHONE.h;
  const mesh = canvasPlane("phone-frame", W, H, (g) => {
    const ox = BTN;
    // Side buttons (behind the band): action + volume on the left, power on the right.
    g.fillStyle = titanium(g, 0, W);
    const btn = (x: number, y: number, h: number) => { rr(g, x, y, BTN + 4, h, 2.5); g.fill(); };
    btn(0, 178, 46);
    btn(0, 262, 82);
    btn(0, 364, 82);
    btn(W - BTN - 4, 290, 128);
    // Body: dark outer edge, titanium band, black bezel.
    rr(g, ox, 0, PHONE.w, H, PHONE.r); g.fillStyle = "#1c1c1e"; g.fill();
    rr(g, ox + 1.5, 1.5, PHONE.w - 3, H - 3, PHONE.r - 1.5); g.fillStyle = titanium(g, ox, ox + PHONE.w); g.fill();
    // Specular line along the top of the band.
    const spec = g.createLinearGradient(0, 0, 0, H);
    spec.addColorStop(0, "rgba(255,255,255,0.55)"); spec.addColorStop(0.08, "rgba(255,255,255,0)");
    spec.addColorStop(0.92, "rgba(255,255,255,0)"); spec.addColorStop(1, "rgba(255,255,255,0.25)");
    rr(g, ox + 1.5, 1.5, PHONE.w - 3, H - 3, PHONE.r - 1.5); g.strokeStyle = spec; g.lineWidth = 1.5; g.stroke();
    rr(g, ox + 7.5, 7.5, PHONE.w - 15, H - 15, PHONE.r - 7.5); g.fillStyle = "#050505"; g.fill();
    rr(g, ox + 7.5, 7.5, PHONE.w - 15, H - 15, PHONE.r - 7.5); g.strokeStyle = "#2a2a2c"; g.lineWidth = 1; g.stroke();
    // Antenna lines in the band.
    g.fillStyle = "#4a4845";
    g.fillRect(ox + 110, 0, 5, 7.5); g.fillRect(ox + PHONE.w - 115, H - 7.5, 5, 7.5);
    // Cut the screen out.
    g.globalCompositeOperation = "destination-out";
    rr(g, ox + INSET, INSET, SCREEN.w, SCREEN.h, SCREEN.r); g.fill();
    g.globalCompositeOperation = "source-over";
    // Dynamic island with a camera lens.
    const iw = 118, ih = 34, ix = ox + PHONE.w / 2 - iw / 2, iy = INSET + 14;
    rr(g, ix, iy, iw, ih, ih / 2); g.fillStyle = "#000"; g.fill();
    const lx = ix + iw - 22, ly = iy + ih / 2;
    const lens = g.createRadialGradient(lx - 2, ly - 2, 0, lx, ly, 8);
    lens.addColorStop(0, "#2b3550"); lens.addColorStop(0.5, "#0d1020"); lens.addColorStop(1, "#000");
    g.fillStyle = lens; g.beginPath(); g.arc(lx, ly, 7, 0, Math.PI * 2); g.fill();
  });
  place(mesh, PHONE.cx, PHONE.cy, 0.8);
  mesh.userData.pickable = false;
  return mesh;
}

/** A faint diagonal glass reflection over the screen. */
export function glassSheen() {
  const mesh = canvasPlane("phone-glass", SCREEN.w, SCREEN.h, (g, w, h) => {
    rr(g, 0, 0, w, h, SCREEN.r); g.clip();
    const s = g.createLinearGradient(0, 0, w, h * 0.55);
    s.addColorStop(0, "rgba(255,255,255,0.10)");
    s.addColorStop(0.42, "rgba(255,255,255,0.03)");
    s.addColorStop(0.43, "rgba(255,255,255,0)");
    s.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = s; g.fillRect(0, 0, w, h);
  });
  place(mesh, SCREEN.cx, SCREEN.cy, 0.75);
  mesh.userData.pickable = false;
  return mesh;
}

/** Status bar icons (signal, wi-fi, battery) and optionally the time, in screen px. */
export function statusBar(g: G, w: number, ink: string, time: boolean) {
  g.fillStyle = ink; g.strokeStyle = ink;
  const y = 44;
  if (time) {
    g.font = `600 24px ${SANS}`; g.textBaseline = "middle"; g.textAlign = "center";
    g.fillText("11:58", 74, y + 1); g.textAlign = "left";
  }
  // Battery.
  const bx = w - 66;
  g.globalAlpha = 0.4; rr(g, bx, y - 7, 28, 14, 4); g.lineWidth = 1.5; g.stroke(); g.globalAlpha = 1;
  rr(g, bx + 2.5, y - 4.5, 19, 9, 2); g.fill();
  rr(g, bx + 29.5, y - 2.5, 2, 5, 1); g.globalAlpha = 0.4; g.fill(); g.globalAlpha = 1;
  // Wi-fi.
  const wx = bx - 20;
  g.lineWidth = 2.4; g.lineCap = "round";
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(wx, y + 6, 4 + i * 4.5, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke(); }
  // Signal bars.
  const sx = wx - 38;
  for (let i = 0; i < 4; i++) { rr(g, sx + i * 6, y + 5 - (4 + i * 3), 4, 4 + i * 3, 1); g.fill(); }
}

/** Glassy dark-green lock screen, sized to the screen. */
export function lockScreen() {
  const { w, h, r } = SCREEN;
  const mesh = canvasPlane("phone-lock-screen", w, h, (g) => {
    rr(g, 0, 0, w, h, r);
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#062512"); bg.addColorStop(1, "#0a3117");
    g.fillStyle = bg; g.fill();
    g.save(); rr(g, 0, 0, w, h, r); g.clip();
    g.beginPath();
    g.moveTo(0, 300); g.bezierCurveTo(125, 270, 180, 420, 250, 520); g.bezierCurveTo(320, 620, 380, 640, w, 640);
    g.lineTo(w, h); g.lineTo(0, h); g.closePath();
    g.fillStyle = "rgba(160,220,180,0.06)"; g.fill();
    g.strokeStyle = "rgba(190,240,205,0.22)"; g.lineWidth = 1.5; g.stroke();
    g.beginPath();
    g.moveTo(0, 760); g.bezierCurveTo(110, 760, 180, 690, 250, 600); g.bezierCurveTo(305, 530, 360, 505, w, 505);
    g.lineTo(w, h); g.lineTo(0, h); g.closePath();
    g.fillStyle = "rgba(160,220,180,0.07)"; g.fill(); g.stroke();
    g.restore();
    statusBar(g, w, "rgba(225,240,230,0.9)", false);
    // Lock glyph under the island, date, time.
    g.strokeStyle = "#b9c9be"; g.fillStyle = "#b9c9be"; g.lineWidth = 2;
    g.beginPath(); g.arc(w / 2, 92, 5.5, Math.PI, 0); g.stroke();
    rr(g, w / 2 - 8, 92, 16, 12, 2.5); g.fill();
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `500 28px ${SANS}`; g.fillText("Thu Apr 2", w / 2, 140);
    (g as unknown as { letterSpacing: string }).letterSpacing = "-3px";
    g.font = `400 104px ${SANS}`; g.fillText("11:58", w / 2, 206);
    (g as unknown as { letterSpacing: string }).letterSpacing = "0px";
    rr(g, w / 2 - 70, h - 18, 140, 5.5, 3); g.fillStyle = "rgba(235,255,240,0.85)"; g.fill();
  });
  place(mesh, SCREEN.cx, SCREEN.cy);
  return mesh;
}

/** A plain screen-shaped sheet (white app screen, dim overlay). */
export function phoneSheet(name: string, fill: string, chrome?: { ink: string }) {
  const { w, h, r } = SCREEN;
  const mesh = canvasPlane(name, w, h, (g) => {
    rr(g, 0, 0, w, h, r);
    g.fillStyle = fill; g.fill();
    if (chrome) {
      statusBar(g, w, chrome.ink, true);
      rr(g, w / 2 - 70, h - 18, 140, 5.5, 3); g.fillStyle = chrome.ink; g.fill();
    }
  });
  place(mesh, SCREEN.cx, SCREEN.cy);
  return mesh;
}

/** Soft two-layer shadow under the device. */
export function phoneShadow() {
  const pad = 90;
  const mesh = canvasPlane("phone-shadow", PHONE.w + pad * 2, PHONE.h + pad * 2, (g) => {
    g.shadowColor = "rgba(0,0,0,0.55)"; g.shadowBlur = 70; g.shadowOffsetY = 26;
    rr(g, pad, pad, PHONE.w, PHONE.h, PHONE.r); g.fillStyle = "rgba(0,0,0,0.45)"; g.fill();
    g.shadowColor = "rgba(0,0,0,0.5)"; g.shadowBlur = 16; g.shadowOffsetY = 8;
    g.fill();
  });
  mesh.userData.pickable = false;
  place(mesh, PHONE.cx, PHONE.cy, -0.5);
  return mesh;
}

/** A rounded-rect alpha mask, for putting a square image on a rounded tile. */
export function roundedMask(radiusFrac: number) {
  const c = new OffscreenCanvas(128, 128);
  const g = c.getContext("2d")!;
  g.fillStyle = "#000"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#fff"; g.beginPath(); g.roundRect(0, 0, 128, 128, 128 * radiusFrac); g.fill();
  return new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
}
