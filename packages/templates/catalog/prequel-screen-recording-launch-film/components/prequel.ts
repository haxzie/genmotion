/**
 * Prequel's recording flow, rebuilt from the user's screenshots: the floating
 * capture toolbar (video | image · display | window | area · camera, mic and
 * system audio with their status dots · close), and the window picker's hover
 * overlay — dimmed window, blue edge, app icon, name, title, size, and the red
 * "Start recording" pill. Geometry is the screenshot's, scaled to desktop px.
 */
import * as THREE from "three";
import type { LoadingManager } from "three";
import { sprite, type Sprite } from "./mac";
import { FONT } from "./core";
import finderUrl from "../assets/dock_finder.png";

/* the toolbar screenshot is 880 px wide with the pill spanning 55..835; at
   0.47 it is the size it sits at on a 1440 px desktop */
const K = 0.47;
const X0 = 55;
const Y0 = 25;
const sx = (x: number) => (x - X0) * K;
const sy = (y: number) => (y - Y0) * K;

const INK = "#e8e8ea";
const DIMI = "#9a9aa0";

type G = OffscreenCanvasRenderingContext2D;

function stroke(g: G, lw = 1.5, c = INK) {
  g.strokeStyle = c;
  g.lineWidth = lw;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.stroke();
}

export function prequelToolbar(mode: "display" | "window" | "area" | "none"): Sprite {
  const W = sx(835);
  const H = sy(110);
  const cy = H / 2;
  return sprite(`prequel-toolbar${mode === "none" ? "" : `-${mode}`}`, W, H, (k) => {
    const g = k.g;
    // the pill
    g.beginPath();
    g.roundRect(0.5, 0.5, W - 1, H - 1, H / 2);
    g.fillStyle = "#1d1d1f";
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.12)";
    g.lineWidth = 1;
    g.stroke();
    // segment 1: video (selected) | image
    k.rect(sx(65), sy(35), sx(193) - sx(65), sy(100) - sy(35), "#2c2c2e", (sy(100) - sy(35)) / 2);
    k.circle(sx(95), cy, 14, "#48484a");
    // video camera
    g.beginPath(); g.roundRect(sx(95) - 8, cy - 5, 11, 10, 2); stroke(g);
    g.beginPath(); g.moveTo(sx(95) + 3, cy - 1.5); g.lineTo(sx(95) + 8, cy - 4); g.lineTo(sx(95) + 8, cy + 4); g.lineTo(sx(95) + 3, cy + 1.5); stroke(g);
    // image
    g.beginPath(); g.roundRect(sx(160) - 7.5, cy - 6, 15, 12, 2); stroke(g);
    g.beginPath(); g.moveTo(sx(160) - 7, cy + 4); g.lineTo(sx(160) - 2, cy); g.lineTo(sx(160) + 2, cy + 3); g.lineTo(sx(160) + 4, cy + 1); g.lineTo(sx(160) + 7, cy + 4); stroke(g, 1.3);
    k.circle(sx(160) + 3, cy - 2.5, 1.4, INK);
    // segment 2: display | window | area
    k.rect(sx(207), sy(35), sx(400) - sx(207), sy(100) - sy(35), "#2c2c2e", (sy(100) - sy(35)) / 2);
    const sel = { display: 240, window: 303, area: 368, none: -1 }[mode];
    if (sel > 0) k.circle(sx(sel), cy, 14, "#3d84f6");
    k.mark("display", { x: sx(240) - 14, y: cy - 14, w: 28, h: 28 });
    k.mark("window", { x: sx(303) - 14, y: cy - 14, w: 28, h: 28 });
    k.mark("area", { x: sx(368) - 14, y: cy - 14, w: 28, h: 28 });
    g.beginPath(); g.roundRect(sx(240) - 8, cy - 6.5, 16, 11, 2); stroke(g);
    g.beginPath(); g.moveTo(sx(240) - 4, cy + 7.5); g.lineTo(sx(240) + 4, cy + 7.5); stroke(g);
    g.beginPath(); g.roundRect(sx(303) - 8, cy - 6.5, 12, 9, 2); stroke(g, 1.3);
    g.beginPath(); g.roundRect(sx(303) - 4, cy - 2.5, 12, 9, 2); stroke(g, 1.5);
    g.setLineDash([2.5, 2.2]);
    g.beginPath(); g.roundRect(sx(368) - 7.5, cy - 7, 15, 14, 2); stroke(g);
    g.setLineDash([]);
    // camera (off) · mic (on) · system audio (off): icon, status dot, chevron
    const chev = (x: number) => { g.beginPath(); g.moveTo(x - 3, cy - 1.5); g.lineTo(x, cy + 1.5); g.lineTo(x + 3, cy - 1.5); stroke(g, 1.3, DIMI); };
    g.beginPath(); g.roundRect(sx(443) - 8, cy - 5, 11, 10, 2); stroke(g, 1.4, DIMI);
    g.beginPath(); g.moveTo(sx(443) + 3, cy - 1.5); g.lineTo(sx(443) + 8, cy - 4); g.lineTo(sx(443) + 8, cy + 4); g.lineTo(sx(443) + 3, cy + 1.5); stroke(g, 1.4, DIMI);
    g.beginPath(); g.moveTo(sx(443) - 9, cy + 7); g.lineTo(sx(443) + 9, cy - 7); stroke(g, 1.4, DIMI);
    k.circle(sx(476), cy, 2.6, "#7c7c80");
    chev(sx(499));
    g.beginPath(); g.roundRect(sx(552) - 3.5, cy - 8, 7, 11, 3.5); stroke(g, 1.5);
    g.beginPath(); g.arc(sx(552), cy - 1, 6.5, 0.15 * Math.PI, 0.85 * Math.PI); stroke(g, 1.4);
    g.beginPath(); g.moveTo(sx(552), cy + 5.5); g.lineTo(sx(552), cy + 8.5); stroke(g, 1.4);
    k.circle(sx(586), cy, 2.6, "#30d158");
    chev(sx(609));
    g.beginPath(); g.moveTo(sx(662) - 8, cy - 7); g.lineTo(sx(662) + 8, cy - 7); stroke(g, 1.4, DIMI);
    g.beginPath(); g.roundRect(sx(662) - 6, cy - 4, 12, 10, 2); stroke(g, 1.4, DIMI);
    g.beginPath(); g.moveTo(sx(662) - 8, cy + 8); g.lineTo(sx(662) + 8, cy - 8); stroke(g, 1.4, DIMI);
    k.circle(sx(696), cy, 2.6, "#7c7c80");
    chev(sx(718));
    // separator, close
    k.line(sx(753), sy(42), sx(753), sy(93), "rgba(255,255,255,0.16)");
    g.beginPath(); g.moveTo(sx(796) - 5.5, cy - 5.5); g.lineTo(sx(796) + 5.5, cy + 5.5); g.moveTo(sx(796) + 5.5, cy - 5.5); g.lineTo(sx(796) - 5.5, cy + 5.5); stroke(g, 1.6);
  });
}

/**
 * The window picker's hover state over a window of `w` × `h` desktop px:
 * the window dimmed, a blue edge, and the app card with Start recording.
 */
export function windowPicker(w: number, h: number, app: string, title: string, size: string, manager: LoadingManager): Sprite {
  const ICON = 50;
  const cx = w / 2;
  const top = h / 2 - 92;
  const s = sprite("prequel-window-picker", w, h, (k) => {
    const g = k.g;
    g.beginPath();
    g.roundRect(1, 1, w - 2, h - 2, 12);
    g.fillStyle = "rgba(8,10,18,0.66)";
    g.fill();
    g.strokeStyle = "#3d84f6";
    g.lineWidth = 2;
    g.stroke();
    k.text(app, cx, top + ICON + 26, { size: 19, weight: 600, color: "#ffffff", align: "center" });
    k.text(title, cx, top + ICON + 50, { size: 14, color: "#f2f2f5", align: "center" });
    k.text(size, cx, top + ICON + 70, { size: 14, color: "#f2f2f5", align: "center" });
    const pw = 150;
    const ph = 34;
    const py = top + ICON + 92;
    k.rect(cx - pw / 2, py, pw, ph, "#ef5a4f", ph / 2);
    k.circle(cx - pw / 2 + 22, py + ph / 2, 5, "#ffffff");
    k.text("Start recording", cx - pw / 2 + 36, py + ph / 2 + 0.5, { size: 14, weight: 600, color: "#ffffff" });
    k.mark("start", { x: cx - pw / 2, y: py, w: pw, h: ph });
  });
  new THREE.ImageLoader(manager).load(finderUrl, (img) => {
    const g = (s.tex.image as OffscreenCanvas).getContext("2d")!;
    g.drawImage(img, cx - ICON / 2, top, ICON, ICON);
    s.tex.needsUpdate = true;
  });
  return s;
}

/**
 * The panel while recording, from the user's screenshot (666 px wide, the pill
 * spanning 90..535): level dots · system audio · delete · pause · the red stop
 * button with the running time. One sprite per second of the timer.
 */
export function recordingPanel(seconds: number): Sprite {
  const R = 0.47;
  const PX0 = 90;
  const PY0 = 37;
  const rx = (x: number) => (x - PX0) * R;
  // the stop button is sized to what it holds: equal padding either side of
  // the square + time, and the panel ends a few px after it
  const m = new OffscreenCanvas(8, 8).getContext("2d")!;
  m.font = `600 13px ${FONT}`;
  const TIME_W = m.measureText("0:00").width;
  const PAD = 12;
  const STOP_X = rx(372);
  const STOP_W = PAD + 7 + 7 + TIME_W + PAD;
  const W = STOP_X + STOP_W + (535 - 526) * R;
  const H = (123 - PY0) * R;
  const cy = H / 2;
  const s = `0:${String(seconds).padStart(2, "0")}`;
  return sprite(`prequel-recording-panel-${s}`, W, H, (k) => {
    const g = k.g;
    g.beginPath();
    g.roundRect(0.5, 0.5, W - 1, H - 1, H / 2);
    g.fillStyle = "#1d1d1f";
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.12)";
    g.lineWidth = 1;
    g.stroke();
    // input level: a round cluster of dim red dots
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) {
        if (i * i + j * j > 10) continue;
        k.circle(rx(133) + i * 3.4, cy + j * 3.4, 1.15, "rgba(150,58,58,0.85)");
      }
    }
    // system audio (off)
    g.beginPath(); g.moveTo(rx(198) - 7, cy - 6); g.lineTo(rx(198) + 7, cy - 6); stroke(g, 1.3, "#7c7c80");
    g.beginPath(); g.roundRect(rx(198) - 5, cy - 3, 10, 8, 1.5); stroke(g, 1.3, "#7c7c80");
    g.beginPath(); g.moveTo(rx(198) - 7, cy + 7); g.lineTo(rx(198) + 7, cy - 7); stroke(g, 1.3, "#7c7c80");
    // delete
    g.beginPath(); g.moveTo(rx(265) - 6, cy - 5); g.lineTo(rx(265) + 6, cy - 5); stroke(g, 1.5);
    g.beginPath(); g.moveTo(rx(265) - 2, cy - 5); g.lineTo(rx(265) - 2, cy - 7); g.lineTo(rx(265) + 2, cy - 7); g.lineTo(rx(265) + 2, cy - 5); stroke(g, 1.3);
    g.beginPath(); g.moveTo(rx(265) - 4.5, cy - 3); g.lineTo(rx(265) - 3.5, cy + 7); g.lineTo(rx(265) + 3.5, cy + 7); g.lineTo(rx(265) + 4.5, cy - 3); stroke(g, 1.5);
    // pause
    k.rect(rx(333) - 4, cy - 6, 2.8, 12, INK, 1.2);
    k.rect(rx(333) + 1.2, cy - 6, 2.8, 12, INK, 1.2);
    // stop + time
    const sh = (110 - 50) * R;
    k.rect(STOP_X, cy - sh / 2, STOP_W, sh, "#d95550", sh / 2);
    k.rect(STOP_X + PAD, cy - 3.5, 7, 7, "#ffffff", 1.5);
    k.text(s, STOP_X + PAD + 14, cy + 0.5, { size: 13, weight: 600, color: "#ffffff" });
    k.mark("stop", { x: STOP_X, y: cy - sh / 2, w: STOP_W, h: sh });
  });
}

/** A squircle mask (white inside) for the camera bubble, as an alpha map. */
export function squircleMask(size = 256): THREE.CanvasTexture {
  const c = new OffscreenCanvas(size, size);
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, size, size);
  // a superellipse, |x|^4 + |y|^4 = 1, like macOS's squircle
  g.beginPath();
  for (let i = 0; i <= 256; i++) {
    const a = (i / 256) * Math.PI * 2;
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    const x = Math.sign(cs) * Math.pow(Math.abs(cs), 0.5);
    const y = Math.sign(sn) * Math.pow(Math.abs(sn), 0.5);
    const px = size / 2 + x * (size / 2 - 1);
    const py = size / 2 + y * (size / 2 - 1);
    if (i) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.closePath();
  g.fillStyle = "#fff";
  g.fill();
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  return t;
}
