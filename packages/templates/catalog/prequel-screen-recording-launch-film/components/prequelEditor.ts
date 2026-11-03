/**
 * Prequel's editor, rebuilt from the user's three screenshots: title bar with
 * Recordings / take name and the green Export button, the FRAME pill, the
 * preview canvas (background + the recorded window + the camera), the tool
 * rail, the Camera and Background panels, the timeline (tools, ruler, text
 * track, the purple take, the yellow 2.0× zoom), and the export modal whose
 * Export button doubles as the progress bar. Everything is in page px on a
 * 1440 × 900 page; the parts that change are overlays.
 */
import * as THREE from "three";
import type { LoadingManager } from "three";
import { rng } from "./core";
import { makePage, Kit, type Page, type Rect } from "./page";
import { SW, SH, MENU_H, sprite, type Sprite } from "./mac";
import photoUrl from "../assets/webcam-man.jpg";
/* Prequel's own backgrounds (from the app repo's backgrounds/), as 192 px tiles, in the picker's order */
import bgW0 from "../assets/bg/wallpapers-alpenglow.jpg";
import bgW1 from "../assets/bg/wallpapers-canyon.jpg";
import bgW2 from "../assets/bg/wallpapers-cirrus.jpg";
import bgW3 from "../assets/bg/wallpapers-dune.jpg";
import bgW4 from "../assets/bg/wallpapers-monterey.jpg";
import bgW5 from "../assets/bg/wallpapers-sequoia.jpg";
import bgW6 from "../assets/bg/wallpapers-shore.jpg";
import bgA0 from "../assets/bg/aurora-aurora.jpg";
import bgA1 from "../assets/bg/aurora-blush.jpg";
import bgA2 from "../assets/bg/aurora-cobalt.jpg";
import bgA3 from "../assets/bg/aurora-dusk.jpg";
import bgA4 from "../assets/bg/aurora-ember.jpg";
import bgA5 from "../assets/bg/aurora-indigo.jpg";
import bgA6 from "../assets/bg/aurora-iris.jpg";
import bgA7 from "../assets/bg/aurora-lilac.jpg";
import bgA8 from "../assets/bg/aurora-nebula.jpg";
import bgA9 from "../assets/bg/aurora-sage.jpg";
import bgS0 from "../assets/bg/softlight-apricot.jpg";
import bgS1 from "../assets/bg/softlight-bluebell.jpg";
import bgS2 from "../assets/bg/softlight-fern.jpg";
import bgS3 from "../assets/bg/softlight-glacier.jpg";
import bgS4 from "../assets/bg/softlight-linen.jpg";
import cobaltUrl from "../assets/bg/preview-cobalt.jpg";
const WALLPAPERS = [bgW0, bgW1, bgW2, bgW3, bgW4, bgW5, bgW6];
const AURORA_TILES = [bgA0, bgA1, bgA2, bgA3, bgA4, bgA5, bgA6, bgA7, bgA8, bgA9];
const SOFTLIGHT = [bgS0, bgS1, bgS2, bgS3, bgS4];

/** Load several images through the frame barrier, then draw once with all of them. */
function withImages(manager: LoadingManager, urls: string[], draw: (imgs: HTMLImageElement[]) => void) {
  const imgs: HTMLImageElement[] = new Array(urls.length);
  let left = urls.length;
  const loader = new THREE.ImageLoader(manager);
  urls.forEach((u, i) => loader.load(u, (img) => {
    imgs[i] = img;
    if (--left === 0) draw(imgs);
  }));
}

/** Draw an image to cover a rect (centre crop), clipped to rounded corners. */
function cover(g: G, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.max(w / img.width, h / img.height);
  const sw = w / k;
  const sh = h / k;
  g.save();
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.clip();
  g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  g.restore();
}

type G = OffscreenCanvasRenderingContext2D;

export const PE = {
  win: "#1c1d20",
  panel: "#232428",
  raised: "#2c2d31",
  line: "rgba(255,255,255,0.08)",
  ink: "#e9e9ec",
  dim: "#9a9ba1",
  blue: "#3b82f6",
  green: "#2f9e5e",
};

/* layout, page px */
export const PV: Rect = { x: 150, y: 140, w: 720, h: 450 };           // the preview canvas
export const REC: Rect = { x: 205, y: 176, w: 610, h: 378 };          // the recorded window inside it
export const RAIL = { x: 978, y: 92, w: 40, h: 430, icon0: 114, step: 42 };
export const PANEL: Rect = { x: 1030, y: 92, w: 398, h: 522 };
export const TOP_EXPORT: Rect = { x: 1300, y: 37, w: 118, h: 30 };
export const TILE = { x0: 20, step: 64, size: 56 };
export const MODAL: Rect = { x: 510, y: 196, w: 420, h: 458 };
export const MODAL_BTN: Rect = { x: MODAL.x + 12, y: MODAL.y + 404, w: 396, h: 42 };

const railY = (i: number) => RAIL.y + RAIL.icon0 - RAIL.y + i * RAIL.step;
export const RAIL_ICON = (i: number) => ({ x: RAIL.x + RAIL.w / 2, y: railY(i) });

function stroke(g: G, lw = 1.5, c = PE.ink) {
  g.strokeStyle = c;
  g.lineWidth = lw;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.stroke();
}

/** Abstract aurora wallpapers (not Prequel's own images): a dark base with two soft colour fields. */
export const AURORAS: [string, string, string][] = [
  ["#14102a", "#7b3fe4", "#e9a6ff"],
  ["#141418", "#3c3c52", "#f0c2c8"],
  ["#160c3a", "#6a35ff", "#2a62ff"],
  ["#140c18", "#7a1d3c", "#3b2a6a"],
  ["#1a0a0a", "#c2301c", "#5a0f1a"],
  ["#0f0d33", "#4a2fd8", "#1a1a6a"],
  ["#120a24", "#5b1fa8", "#2a0f4a"],
  ["#1a1730", "#b9a8ff", "#e9e4ff"],
  ["#0d0c14", "#2a2440", "#ff6ac2"],
  ["#0f1416", "#c9d2d6", "#2a3236"],
];
export function paintAurora(g: G, x: number, y: number, w: number, h: number, [base, a, b]: [string, string, string]) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  const blob = (cx: number, cy: number, r: number, c: string, alpha: number) => {
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, c);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = alpha;
    g.fillStyle = rg;
    g.fillRect(x, y, w, h);
  };
  blob(x + w * 0.78, y + h * 0.18, Math.max(w, h) * 0.75, a, 0.95);
  blob(x + w * 0.2, y + h * 0.95, Math.max(w, h) * 0.6, b, 0.7);
  blob(x + w * 0.55, y + h * 0.55, Math.max(w, h) * 0.35, a, 0.35);
  g.globalAlpha = 1;
  g.restore();
}
/** The wallpaper the cursor picks: Aurora, first row, third tile. */
export const PICKED = 2;

/** The lime pixel-pattern background the take opens with (as in the screenshots). */
export function paintLime(g: G, x: number, y: number, w: number, h: number) {
  g.fillStyle = "#c6df5c";
  g.fillRect(x, y, w, h);
  const r = rng(77);
  const s = 9;
  for (let yy = 0; yy < h; yy += s) {
    for (let xx = 0; xx < w; xx += s) {
      const n = Math.sin((xx + yy * 1.7) * 0.012) + Math.sin(yy * 0.02 - xx * 0.006);
      if (n > 0.9 && r() > 0.35) {
        g.fillStyle = "rgba(90,110,30,0.22)";
        g.fillRect(x + xx, y + yy, s - 1, s - 1);
      }
    }
  }
}

function drawChrome(k: Kit, clock: string) {
  const g = k.g;
  g.fillStyle = "#121214";
  g.fillRect(0, 0, SW, SH);
  // menu bar
  k.rect(0, 0, SW, MENU_H, "#16161a");
  k.circle(20, 13, 6, "none", "#e6e6ea", 1.6);
  k.text("Prequel", 44, 13, { size: 13, weight: 700, color: "#f2f2f5" });
  ["File", "Edit", "View", "Window", "Help"].reduce((x, s) => {
    k.text(s, x, 13, { size: 13, color: "#e6e6ea" });
    return x + k.measure(s, 13) + 22;
  }, 44 + k.measure("Prequel", 13, 700) + 24);
  k.text(clock, SW - 16, 13, { size: 13, color: "#f2f2f5", align: "right" });

  // window
  k.rect(0, MENU_H, SW, SH - MENU_H, PE.win);
  for (const [i, c] of ["#ff5f57", "#febc2e", "#28c840"].entries()) k.circle(24 + i * 22, 52, 6.5, c);
  // breadcrumb
  g.beginPath(); g.roundRect(104, 46, 16, 12, 2); stroke(g, 1.3, PE.dim);
  k.text("Recordings", 128, 52, { size: 14, color: PE.dim });
  k.text("/", 214, 52, { size: 14, color: PE.dim });
  k.text("Prequel 2026-11-05 00-03-12", 230, 52, { size: 14, weight: 500, color: PE.ink });
  k.rect(432, 45, 11, 13, "none", 2, PE.dim, 1.3);
  // Found a bug? + Export
  k.circle(1160, 52, 6, "none", PE.ink, 1.3);
  k.text("Found a bug?", 1174, 52, { size: 14, color: PE.ink });
  k.rect(TOP_EXPORT.x, TOP_EXPORT.y, TOP_EXPORT.w, TOP_EXPORT.h, PE.green, 15);
  g.beginPath(); g.moveTo(1322, 57); g.lineTo(1322, 47); g.moveTo(1318, 51); g.lineTo(1322, 47); g.lineTo(1326, 51); stroke(g, 1.5, "#fff");
  g.beginPath(); g.moveTo(1316, 55); g.lineTo(1316, 59); g.lineTo(1328, 59); g.lineTo(1328, 55); stroke(g, 1.5, "#fff");
  k.text("Export", 1338, 52, { size: 14, weight: 600, color: "#ffffff" });
  k.mark("export", TOP_EXPORT);

  // FRAME pill
  k.rect(290, 82, 440, 40, "#18191b", 20);
  k.text("FRAME", 312, 102, { size: 12.5, weight: 500, color: PE.ink });
  k.rect(374, 96, 14, 11, "none", 2, PE.ink, 1.3);
  k.text("Automatic  2636 × 1646", 396, 102, { size: 13, color: PE.ink });
  k.text("2636    ×    1646", 600, 102, { size: 13, color: PE.ink });

  // the stage around the preview
  k.rect(PV.x - 1, PV.y - 1, PV.w + 2, PV.h + 2, "rgba(0,0,0,0.4)", 6);

  // tool rail
  k.rect(RAIL.x, RAIL.y, RAIL.w, RAIL.h, "#18191b", 20);
  const icons: ((x: number, y: number) => void)[] = [
    (x, y) => { g.beginPath(); g.moveTo(x - 6, y + 6); g.lineTo(x - 2, y - 7); g.lineTo(x + 6, y - 3); g.lineTo(x + 3, y + 7); g.closePath(); stroke(g); },
    (x, y) => { g.beginPath(); g.roundRect(x - 7, y - 7, 14, 6, 1.5); g.roundRect(x - 7, y + 1, 6, 6, 1.5); g.roundRect(x + 1, y + 1, 6, 6, 1.5); stroke(g, 1.4); },
    (x, y) => { g.beginPath(); g.roundRect(x - 7, y - 6, 14, 12, 2); stroke(g); g.beginPath(); g.moveTo(x - 6, y + 4); g.lineTo(x - 1, y); g.lineTo(x + 2, y + 2); g.lineTo(x + 6, y - 1); stroke(g, 1.3); },
    (x, y) => { g.beginPath(); g.roundRect(x - 8, y - 6, 16, 11, 2); stroke(g); g.beginPath(); g.moveTo(x - 3, y + 8); g.lineTo(x + 3, y + 8); stroke(g); },
    (x, y) => { k.circle(x, y, 7.5, "none", PE.ink, 1.5); k.circle(x - 2.5, y - 1, 1, PE.ink); k.circle(x + 2.5, y - 1, 1, PE.ink); },
    (x, y) => { g.beginPath(); g.moveTo(x - 7, y - 3); g.lineTo(x - 3, y - 3); g.lineTo(x + 1, y - 7); g.lineTo(x + 1, y + 7); g.lineTo(x - 3, y + 3); g.lineTo(x - 7, y + 3); g.closePath(); stroke(g, 1.4); },
    (x, y) => { g.beginPath(); g.moveTo(x - 6, y - 7); g.lineTo(x + 7, y - 1); g.lineTo(x + 1, y + 1); g.lineTo(x - 1, y + 7); g.closePath(); stroke(g, 1.4); },
    (x, y) => { g.beginPath(); g.roundRect(x - 8, y - 6, 16, 12, 2); stroke(g); g.beginPath(); g.moveTo(x - 5, y + 1); g.lineTo(x - 1, y + 1); g.moveTo(x + 1, y + 1); g.lineTo(x + 5, y + 1); stroke(g, 1.3); },
    (x, y) => { k.circle(x - 2.5, y - 2, 4.5, "none", PE.ink, 1.3); k.circle(x + 2.5, y - 2, 4.5, "none", PE.ink, 1.3); k.circle(x, y + 2.5, 4.5, "none", PE.ink, 1.3); },
    (x, y) => { g.beginPath(); g.moveTo(x - 7, y + 7); g.lineTo(x + 7, y + 7); g.moveTo(x - 5, y + 3); g.lineTo(x + 5, y + 3); g.moveTo(x - 2, y + 3); g.lineTo(x - 2, y - 2); g.moveTo(x + 2, y + 3); g.lineTo(x + 2, y - 2); stroke(g, 1.4); k.circle(x, y - 5, 3, "none", PE.ink, 1.4); },
  ];
  icons.forEach((draw, i) => draw(RAIL.x + RAIL.w / 2, railY(i)));

  // timeline
  k.line(0, 612, SW, 612, PE.line);
  k.rect(40, 626, 30, 30, PE.blue, 6);
  g.beginPath(); g.moveTo(50, 633); g.lineTo(62, 640); g.lineTo(56, 642); g.lineTo(53, 649); g.closePath(); g.fillStyle = "#fff"; g.fill();
  k.circle(84, 641, 3, "none", PE.dim, 1.3);
  k.rect(108, 633, 12, 14, "none", 2, PE.dim, 1.3);
  k.text("0:00.00", 168, 642, { size: 14, color: PE.ink });
  k.text("/ 0:05.40", 226, 642, { size: 14, color: PE.dim });
  k.circle(720, 641, 16, "#2fa865");
  g.beginPath(); g.moveTo(715, 634); g.lineTo(726, 641); g.lineTo(715, 648); g.closePath(); g.fillStyle = "#fff"; g.fill();
  k.text("|◀", 676, 641, { size: 12, weight: 700, color: PE.ink, align: "center" });
  k.text("▶|", 764, 641, { size: 12, weight: 700, color: PE.ink, align: "center" });
  k.rect(1290, 626, 130, 30, "#18191b", 8);
  // ruler
  for (let i = 0; i <= 10; i++) {
    const x = 100 + i * 130;
    k.line(x, 684, x, 694, "#5a5b60");
    k.text(`0:0${Math.floor(i / 2)}.${i % 2 ? 5 : 0}`, x, 704, { size: 10.5, color: PE.dim });
    if (i < 10) for (let j = 1; j < 5; j++) k.line(x + j * 26, 689, x + j * 26, 694, "#3a3b40");
  }
  k.rect(98, 670, 62, 20, PE.blue, 6);
  k.text("0:00.00", 129, 680, { size: 11.5, weight: 600, color: "#fff", align: "center" });
  k.line(100, 690, 100, 860, PE.blue, 1.4);
  k.text("T", 50, 724, { size: 15, color: PE.dim });
  k.rect(560, 714, 160, 22, "none", 4, "rgba(255,255,255,0.18)", 1);
  k.text("T  Click or drag to add text", 640, 725, { size: 11, color: PE.dim, align: "center" });
  // the take
  k.rect(102, 748, 1320, 40, "#4b3a8a", 8, "#a78bfa", 2);
  for (let x = 110; x < 1410; x += 22) k.rect(x, 772, 16, 10, "rgba(255,255,255,0.08)", 2);
  k.rect(112, 756, 22, 22, "#2a2244", 5);
  k.text("0:05.40", 160, 767, { size: 13, weight: 600, color: PE.ink });
  // the auto zoom
  k.rect(200, 800, 560, 40, "#c8a83c", 8);
  k.rect(206, 806, 28, 28, "rgba(0,0,0,0.18)", 6);
  k.text("2.0×", 248, 820, { size: 13, weight: 600, color: "#fff8e0" });
  [["▭", 768], ["⌕", 820]].forEach(([s, y]) => k.text(s as string, 50, y as number, { size: 16, color: PE.dim }));
}

export function makePrequelEditor(name = "prequel-editor", clock = "Wed Nov 5  12:04 AM"): Page {
  const p = makePage(name, SW, SH, 2, (k) => drawChrome(k, clock));
  p.u.bgLum.value = 0.08;
  p.u.tint.setRGB(0.94, 0.95, 1.0);
  return p;
}

/* -------------------------------------------------------------- overlays */

export function previewBackground(kind: "lime" | "aurora", manager?: LoadingManager): Sprite {
  const sp = sprite(`preview-background-${kind === "aurora" ? "cobalt" : kind}`, PV.w, PV.h, (k) => {
    const g = k.g;
    g.save();
    g.beginPath();
    g.roundRect(0, 0, PV.w, PV.h, 6);
    g.clip();
    if (kind === "lime") paintLime(g, 0, 0, PV.w, PV.h);
    else { g.fillStyle = "#14102a"; g.fillRect(0, 0, PV.w, PV.h); }
    g.restore();
  }, 2, 2);
  // the picked wallpaper is Prequel's own "Cobalt"
  if (kind === "aurora" && manager) withImages(manager, [cobaltUrl], ([img]) => {
    cover((sp.tex.image as OffscreenCanvas).getContext("2d")!, img!, 0, 0, PV.w, PV.h, 6);
    sp.tex.needsUpdate = true;
  });
  return sp;
}

/** The recorded take: the Finder "Recordings" window, as it appears in the preview. */
export function recordedWindow(): Sprite {
  const W = REC.w;
  const H = REC.h;
  return sprite("recorded-window", W, H, (k) => {
    const g = k.g;
    g.shadowColor = "rgba(0,0,0,0.45)";
    g.shadowBlur = 18;
    g.shadowOffsetY = 6;
    k.rect(6, 4, W - 12, H - 12, "#1f2026", 10);
    g.shadowColor = "transparent";
    k.rect(6, 4, 160, H - 12, "#26272e", 10);
    for (const [i, c] of ["#ff5f57", "#febc2e", "#28c840"].entries()) k.circle(24 + i * 16, 22, 5, c);
    k.text("Recordings", 184, 22, { size: 12, weight: 600, color: "#e6e6ea" });
    ["Recents", "Applications", "Desktop", "Documents", "Downloads", "Movies"].forEach((s, i) =>
      k.text(s, 24, 60 + i * 26, { size: 11, color: i === 5 ? "#fff" : "#a4a5ad" }),
    );
    const rows = ["Screen Recording 2026-10-28 at 3.02.11 PM.mov", "Screen Recording 2026-10-28 at 3.09.40 PM.mov", "demo take 3 (audio broken).mov",
      "demo take 4.mov", "voiceover_retry.m4a", "voiceover_retry_2.m4a", "export_final.mp4", "export_final_v2.mp4", "export_final_v2_REAL.mp4"];
    rows.forEach((n, i) => {
      const y = 56 + i * 30;
      if (i % 2) k.rect(170, y - 13, W - 182, 26, "rgba(255,255,255,0.03)", 3);
      k.rect(184, y - 6, 10, 12, "#d6d7de", 2);
      k.text(n, 202, y, { size: 11, color: "#d4d4da" });
    });
  }, 3, 3);
}

/** The selection box around the camera: blue edge and eight handles, drawn for a 100 px box. */
export function selectionBox(): Sprite {
  const M = 8;
  const S = 100 + M * 2;
  return sprite("camera-selection", S, S, (k) => {
    const g = k.g;
    g.strokeStyle = PE.blue;
    g.lineWidth = 1.2;
    g.strokeRect(M, M, 100, 100);
    for (const [x, y] of [[0, 0], [50, 0], [100, 0], [0, 50], [100, 50], [0, 100], [50, 100], [100, 100]] as const) {
      k.rect(M + x - 3, M + y - 3, 6, 6, "#ffffff", 1.2, PE.blue, 1.2);
    }
  }, 4, 6);
}

/** The blue disc behind the selected rail icon. */
/** The blue disc behind the selected rail tool, with that tool's icon in white on top (as in the app). */
export function railSelect(tool: "camera" | "image"): Sprite {
  return sprite(`rail-selected-${tool}`, 36, 36, (k) => {
    const g = k.g;
    const x = 18;
    const y = 18;
    k.circle(x, y, 17, PE.blue);
    if (tool === "camera") {
      k.circle(x, y, 7.5, "none", "#ffffff", 1.6);
      k.circle(x - 2.5, y - 1, 1.1, "#ffffff");
      k.circle(x + 2.5, y - 1, 1.1, "#ffffff");
      g.beginPath(); g.arc(x, y + 1.2, 3, 0.2 * Math.PI, 0.8 * Math.PI); stroke(g, 1.3, "#ffffff");
    } else {
      // a picture: frame, a mountain line, the sun
      g.beginPath(); g.roundRect(x - 7.5, y - 6.5, 15, 13, 2.5); stroke(g, 1.6, "#ffffff");
      g.beginPath(); g.moveTo(x - 6.5, y + 4.5); g.lineTo(x - 1.5, y - 0.5); g.lineTo(x + 1.5, y + 2.5); g.lineTo(x + 3.5, y + 0.5); g.lineTo(x + 6.5, y + 3.5); stroke(g, 1.4, "#ffffff");
      k.circle(x + 3, y - 2.8, 1.5, "#ffffff");
    }
  }, 4, 3);
}

function panelHead(k: Kit, title: string, icon: (g: G, x: number, y: number) => void) {
  const g = k.g;
  k.rect(0, 0, PANEL.w, PANEL.h, PE.panel, 14);
  icon(g, 24, 30);
  k.text(title, 46, 30, { size: 16, weight: 500, color: PE.ink });
  k.circle(PANEL.w - 64, 30, 6, "none", PE.dim, 1.3);
  g.beginPath(); g.moveTo(PANEL.w - 30, 25); g.lineTo(PANEL.w - 20, 35); g.moveTo(PANEL.w - 20, 25); g.lineTo(PANEL.w - 30, 35); stroke(g, 1.4, PE.dim);
  k.line(0, 58, PANEL.w, 58, PE.line);
}

function slider(k: Kit, y: number, label: string, value: string, t: number) {
  k.rect(54, y, PANEL.w - 74, 32, PE.raised, 10);
  k.rect(54, y, (PANEL.w - 74) * t, 32, "#3a3b40", 10);
  k.rect(54 + (PANEL.w - 74) * t - 2, y + 8, 2.5, 16, PE.ink, 1);
  k.text(label, 68, y + 16, { size: 13.5, color: PE.ink });
  k.text(value, PANEL.w - 32, y + 16, { size: 13.5, color: PE.ink, align: "right" });
}

export function cameraPanel(): Sprite {
  return sprite("camera-panel", PANEL.w, PANEL.h, (k) => {
    const g = k.g;
    panelHead(k, "Camera", (gg, x, y) => { k.circle(x, y, 8, "none", PE.ink, 1.5); void gg; });
    k.circle(24, 92, 7, "none", PE.dim, 1.3);
    k.text("Camera", 46, 92, { size: 14, color: PE.ink });
    k.rect(PANEL.w - 64, 80, 44, 24, "#34c759", 12);
    k.circle(PANEL.w - 32, 92, 9.5, "#ffffff");
    k.rect(54, 120, PANEL.w - 74, 40, PE.raised, 12);
    const shapes = 7;
    for (let i = 0; i < shapes; i++) {
      const cx = 54 + 26 + i * ((PANEL.w - 74 - 52) / (shapes - 1));
      if (i === 3) k.circle(cx, 140, 17, "#3a3b40");
      g.beginPath();
      if (i === 0) g.roundRect(cx - 6, 134, 12, 12, 2);
      else if (i === 1) { g.moveTo(cx - 7, 147); g.lineTo(cx - 7, 140); g.arc(cx, 140, 7, Math.PI, 0); g.lineTo(cx + 7, 147); g.closePath(); }
      else if (i === 2) g.arc(cx, 140, 7.5, 0, Math.PI * 2);
      else if (i === 3) g.roundRect(cx - 7.5, 132.5, 15, 15, 5);
      else if (i === 4) g.roundRect(cx - 7.5, 132.5, 15, 15, 2.5);
      else if (i === 5) g.roundRect(cx - 9, 135, 18, 10, 2.5);
      else g.roundRect(cx - 5, 131, 10, 18, 2.5);
      stroke(g, 1.4, i === 3 ? PE.ink : PE.dim);
    }
    k.rect(18, 133, 14, 14, "none", 3, PE.dim, 1.3);
    slider(k, 178, "Roundness", "59%", 0.59);
    slider(k, 222, "Size", "35%", 0.35);
    slider(k, 266, "Zoom", "1.00×", 0.01);
    k.line(0, 318, PANEL.w, 318, PE.line);
    k.text("EFFECTS", 20, 344, { size: 13, weight: 600, color: PE.ink });
    k.rect(54, 362, PANEL.w - 74, 32, PE.raised, 10);
    k.text("None", 68, 378, { size: 14, color: PE.ink });
    k.text("›", PANEL.w - 34, 377, { size: 16, color: PE.dim });
    k.text("Edge", 46, 414, { size: 13.5, color: PE.dim });
    k.rect(54, 430, PANEL.w - 74, 34, PE.raised, 10);
    k.rect(58, 433, (PANEL.w - 82) / 2, 28, "#3a3b40", 8);
    k.text("None", 58 + (PANEL.w - 82) / 4, 447, { size: 13.5, color: PE.ink, align: "center" });
    k.text("Glass", 58 + ((PANEL.w - 82) * 3) / 4, 447, { size: 13.5, color: PE.dim, align: "center" });
    k.line(0, 480, PANEL.w, 480, PE.line);
    k.text("POSITION", 20, 500, { size: 13, weight: 600, color: PE.ink });
  }, 3, 4);
}

/** Tile rect inside the Background panel: row r of a section starting at y0. */
export const tileRect = (y0: number, col: number, row: number): Rect => ({
  x: TILE.x0 + col * TILE.step, y: y0 + row * TILE.step, w: TILE.size, h: TILE.size,
});
export const AURORA_Y = 282;

export function backgroundPanel(manager: LoadingManager): Sprite {
  const sp = sprite("background-panel", PANEL.w, PANEL.h, (k) => {
    const g = k.g;
    panelHead(k, "Background", (gg, x, y) => { gg.beginPath(); gg.roundRect(x - 8, y - 7, 16, 14, 2); stroke(gg, 1.5); });
    k.rect(20, 72, 80, 32, "#3a3b40", 16);
    k.text("Image", 60, 88, { size: 14.5, weight: 500, color: PE.ink, align: "center" });
    [["Pattern", 150], ["Solid", 236], ["Gradient", 322]].forEach(([s, x]) => k.text(s as string, x as number, 88, { size: 14.5, color: PE.dim, align: "center" }));
    k.text("Wallpapers", 20, 120, { size: 12.5, color: PE.dim });
    // the upload slot (dashed, an image glyph) and "none", then the wallpapers
    const up = tileRect(132, 0, 0);
    g.setLineDash([4, 3]);
    k.rect(up.x + 0.5, up.y + 0.5, up.w - 1, up.h - 1, "none", 8, "rgba(255,255,255,0.3)", 1);
    g.setLineDash([]);
    g.beginPath(); g.roundRect(up.x + up.w / 2 - 9, up.y + up.h / 2 - 8, 18, 16, 2.5); stroke(g, 1.4, PE.dim);
    const none = tileRect(132, 1, 0);
    k.rect(none.x, none.y, none.w, none.h, "#2c2d31", 8);
    for (let i = 0; i < WALLPAPERS.length; i++) {
      const r = tileRect(132, (i + 2) % 5, Math.floor((i + 2) / 5));
      k.rect(r.x, r.y, r.w, r.h, "#2c2d31", 8);
    }
    k.text("Aurora", 20, AURORA_Y - 12, { size: 12.5, color: PE.dim });
    k.text("Soft Light", 20, 422, { size: 12.5, color: PE.dim });
    slider(k, 482, "Blur", "0%", 0.005);
  }, 3, 4);
  // the tiles are Prequel's own backgrounds, painted in once they load
  withImages(manager, [...WALLPAPERS, ...AURORA_TILES, ...SOFTLIGHT], (imgs) => {
    const g = (sp.tex.image as OffscreenCanvas).getContext("2d")!;
    imgs.forEach((img, j) => {
      let r: Rect;
      let h = TILE.size;
      if (j < WALLPAPERS.length) r = tileRect(132, (j + 2) % 5, Math.floor((j + 2) / 5));
      else if (j < WALLPAPERS.length + AURORA_TILES.length) {
        const i = j - WALLPAPERS.length;
        r = tileRect(AURORA_Y, i % 5, Math.floor(i / 5));
      } else {
        r = tileRect(434, j - WALLPAPERS.length - AURORA_TILES.length, 0);
        h = 40; // the row runs off the panel's bottom edge, as in the app
      }
      cover(g, img, r.x, r.y, r.w, h, 8);
    });
    sp.tex.needsUpdate = true;
  });
  return sp;
}

/** The ring that marks the chosen wallpaper. */
export function tileRing(): Sprite {
  return sprite("wallpaper-selected", TILE.size + 8, TILE.size + 8, (k) => {
    k.rect(1.5, 1.5, TILE.size + 5, TILE.size + 5, "none", 11, PE.blue, 2.5);
  }, 4, 5);
}

/* ------------------------------------------------------------- export modal */

function seg(k: Kit, x: number, y: number, w: number, label: string, on: boolean) {
  k.rect(x, y, w, 38, on ? "#1e2633" : PE.raised, 9, on ? "#5b8ff0" : undefined, on ? 1.6 : 1);
  k.text(label, x + w / 2, y + 19, { size: 14, weight: on ? 600 : 400, color: on ? "#ffffff" : PE.dim, align: "center" });
}

/** The modal without its Export button (that one is the progress bar, drawn separately). */
export function exportModal(manager: LoadingManager): Sprite {
  const W = MODAL.w;
  const H = MODAL.h;
  const TH = 230;
  const s = sprite("export-modal", W, H, (k) => {
    const g = k.g;
    g.shadowColor = "rgba(0,0,0,0.55)";
    g.shadowBlur = 30;
    g.shadowOffsetY = 10;
    k.rect(0, 0, W, H, "#26272b", 16);
    g.shadowColor = "transparent";
    k.rect(0.5, 0.5, W - 1, H - 1, "none", 16, "rgba(255,255,255,0.1)", 1);
    // thumbnail of the composition, as it will export
    g.save(); g.beginPath(); g.roundRect(12, 12, W - 24, TH, 10); g.clip();
    g.fillStyle = "#14102a";
    g.fillRect(12, 12, W - 24, TH);
    g.restore();
    k.circle(W - 34, 34, 13, "rgba(0,0,0,0.55)");
    g.beginPath(); g.moveTo(W - 39, 29); g.lineTo(W - 29, 39); g.moveTo(W - 29, 29); g.lineTo(W - 39, 39); stroke(g, 1.6, "#fff");
    k.text("Video format", 12, 266, { size: 13.5, color: PE.dim });
    k.text("Frame rate", 272, 266, { size: 13.5, color: PE.dim });
    seg(k, 12, 282, 76, "MP4", true);
    seg(k, 94, 282, 76, "HEVC", false);
    seg(k, 176, 282, 76, "GIF", false);
    seg(k, 272, 282, 66, "60 fps", true);
    seg(k, 344, 282, 64, "30 fps", false);
    k.text("Video quality", 12, 344, { size: 13.5, color: PE.dim });
    k.text("2636 × 1646", W - 12, 344, { size: 13.5, color: PE.dim, align: "right" });
    const qw = (W - 24 - 24) / 4;
    ["Full", "1080p", "720p", "480p"].forEach((q, i) => seg(k, 12 + i * (qw + 8), 358, qw, q, i === 0));
  }, 3, 7);
  // the thumbnail, as it will export: Cobalt behind, the window, the camera top-left where it was moved
  withImages(manager, [cobaltUrl, photoUrl], ([bg, img]) => {
    const g = (s.tex.image as OffscreenCanvas).getContext("2d")!;
    const k = new Kit(g, W, H);
    cover(g, bg!, 12, 12, W - 24, TH, 10);
    k.rect(48, 34, W - 96, TH - 44, "#1f2026", 6);
    k.rect(48, 34, 92, TH - 44, "#26272e", 6);
    for (let i = 0; i < 7; i++) k.rect(152, 56 + i * 20, 150 - (i % 3) * 30, 5, "rgba(255,255,255,0.22)", 2);
    g.save();
    g.beginPath();
    g.roundRect(36, 24, 66, 66, 18);
    g.clip();
    g.drawImage(img!, img!.width * 0.18, img!.height * 0.05, img!.width * 0.64, img!.height * 0.64, 36, 24, 66, 66);
    g.restore();
    // the close button sits over the thumbnail
    k.circle(W - 34, 34, 13, "rgba(0,0,0,0.55)");
    g.beginPath(); g.moveTo(W - 39, 29); g.lineTo(W - 29, 39); g.moveTo(W - 29, 29); g.lineTo(W - 39, 39); stroke(g, 1.6, "#fff");
    s.tex.needsUpdate = true;
  });
  return s;
}

/** The modal's Export button: `fill` is the bar's colour (drawn full, cropped by the scene), or the idle/done state. */
export function modalButton(kind: "idle" | "track" | "fill" | "done"): Sprite {
  const W = MODAL_BTN.w;
  const H = MODAL_BTN.h;
  return sprite(`export-button-${kind}`, W, H, (k) => {
    const col = { idle: PE.blue, track: "#1d2b45", fill: PE.blue, done: PE.green }[kind];
    k.rect(0, 0, W, H, col, 10);
    if (kind === "idle") k.text("Export", W / 2, H / 2 + 0.5, { size: 15, weight: 600, color: "#ffffff", align: "center" });
    if (kind === "done") {
      const g = k.g;
      g.beginPath(); g.moveTo(W / 2 - 52, H / 2); g.lineTo(W / 2 - 47, H / 2 + 5); g.lineTo(W / 2 - 39, H / 2 - 5); stroke(g, 2.2, "#fff");
      k.text("Exported", W / 2 - 30, H / 2 + 0.5, { size: 15, weight: 600, color: "#ffffff" });
    }
    k.mark("button", { x: 0, y: 0, w: W, h: H });
  }, 3, 8);
}

/** "Exporting… 40%", one sprite per step. */
export function exportingLabel(pct: number): Sprite {
  const W = MODAL_BTN.w;
  const H = MODAL_BTN.h;
  return sprite(`exporting-${pct}`, W, H, (k) => {
    const m = `Exporting…  ${pct}%`;
    k.text(m, W / 2, H / 2 + 0.5, { size: 15, weight: 600, color: "#ffffff", align: "center" });
  }, 3, 9);
}

