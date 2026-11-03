/**
 * The Mac the whole film happens on: one desktop (wallpaper, menu bar, dock,
 * the pile of old takes), and the props that land on it as sharp overlays —
 * the screenshot toolbar, the recording pill, the floating thumbnail, the
 * Trash, a QuickTime audio window, a rename field, the erase alert, a Slack
 * banner. Everything is in desktop px (1440 × 900); overlays are planes
 * parented to the desktop page, so the lens blurs the desktop but never them.
 */
import * as THREE from "three";
import type { LoadingManager } from "three";
import { FONT, PX, rng } from "./core";
import { Kit, makePage, type Page, type Rect } from "./page";
import slackLogoUrl from "../assets/slack-logo.png";
import finderUrl from "../assets/dock_finder.png";
import chromeUrl from "../assets/dock_chrome.png";
import musicUrl from "../assets/dock_music.png";
import notionUrl from "../assets/dock_notion.png";
import figmaUrl from "../assets/dock_figma.png";
import vscodeUrl from "../assets/dock_vscode.png";
import premiereUrl from "../assets/dock_premiere-pro.png";

export const SW = 1440;
export const SH = 900;
export const MENU_H = 26;

/* ------------------------------------------------------------------ dock */

/**
 * The real apps, in dock order. Each is the app's own icon file: `fit` is how
 * much of the 52 px slot it fills (macOS icons carry their own margin), `tile`
 * puts a bare mark on its app-icon squircle, `clip` rounds a square file.
 */
interface DockApp { name: string; url: string; fit: number; tile?: string; mark?: number; clip?: boolean; running?: boolean }
const APPS: DockApp[] = [
  { name: "finder", url: finderUrl, fit: 1.0, running: true },
  { name: "chrome", url: chromeUrl, fit: 0.84, running: true },
  { name: "slack", url: slackLogoUrl, fit: 0.9, tile: "#ffffff", mark: 0.56, running: true },
  { name: "music", url: musicUrl, fit: 0.9, clip: true },
  { name: "notion", url: notionUrl, fit: 0.9, tile: "#ffffff", mark: 0.6 },
  { name: "figma", url: figmaUrl, fit: 0.9, tile: "#1e1e1e", mark: 0.52 },
  { name: "vscode", url: vscodeUrl, fit: 0.8 },
  { name: "premiere-pro", url: premiereUrl, fit: 0.9, clip: true },
];

const TW = 52;
const GAP = 10;
const SEP = 22;
export const DOCK_W = 12 + APPS.length * TW + (APPS.length - 1) * GAP + SEP + TW + 12;
export const DOCK_X = (SW - DOCK_W) / 2;
export const DOCK_Y = SH - 76;
export const TRASH: Rect = { x: DOCK_X + DOCK_W - 12 - TW, y: SH - 67, w: TW, h: TW };

type G = OffscreenCanvasRenderingContext2D;

/** A generic wire bin (not Apple's icon), in a 52 × 52 box. */
export function drawTrash(g: G, x: number, y: number, full: boolean) {
  const top = y + 12;
  const bot = y + 50;
  g.beginPath();
  g.moveTo(x + 10, top);
  g.lineTo(x + 42, top);
  g.lineTo(x + 39, bot);
  g.lineTo(x + 13, bot);
  g.closePath();
  const lg = g.createLinearGradient(x, 0, x + 52, 0);
  lg.addColorStop(0, "rgba(205,210,222,0.55)");
  lg.addColorStop(0.5, "rgba(245,246,252,0.85)");
  lg.addColorStop(1, "rgba(195,200,212,0.55)");
  g.fillStyle = lg;
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.75)";
  g.lineWidth = 1;
  g.stroke();
  g.strokeStyle = "rgba(120,126,140,0.6)";
  for (let i = 0; i < 5; i++) {
    const t = (i + 1) / 6;
    g.beginPath();
    g.moveTo(x + 10 + 32 * t, top + 4);
    g.lineTo(x + 13 + 26 * t, bot - 3);
    g.stroke();
  }
  if (full) {
    for (const [cx, cy, r] of [[20, -1, 4.5], [29, -2.5, 5.5], [36, 0, 3.5]] as const) {
      g.beginPath();
      g.arc(x + cx, top + cy, r, 0, Math.PI * 2);
      g.fillStyle = "#f4f4f7";
      g.fill();
      g.strokeStyle = "#b9bac4";
      g.stroke();
    }
  }
  g.beginPath();
  g.ellipse(x + 26, top, 17, 3.5, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(235,238,246,0.92)";
  g.fill();
}

/* ---------------------------------------------------------------- icons */

export function fileIcon(k: Kit, cx: number, top: number, kind: "mov" | "folder", label: string[]) {
  const g = k.g;
  if (kind === "folder") {
    k.rect(cx - 30, top + 8, 26, 10, "#5aa6e8", 3);
    k.rect(cx - 32, top + 12, 64, 46, "#4b97dc", 5);
    k.rect(cx - 32, top + 20, 64, 38, "#6cb4f0", 5);
  } else {
    g.beginPath();
    g.moveTo(cx - 24, top);
    g.lineTo(cx + 12, top);
    g.lineTo(cx + 24, top + 12);
    g.lineTo(cx + 24, top + 60);
    g.lineTo(cx - 24, top + 60);
    g.closePath();
    g.fillStyle = "#e9e9ee";
    g.fill();
    k.rect(cx - 19, top + 18, 38, 26, "#1d2230", 2);
    g.beginPath();
    g.moveTo(cx - 4, top + 25);
    g.lineTo(cx + 6, top + 31);
    g.lineTo(cx - 4, top + 37);
    g.closePath();
    g.fillStyle = "#c9cbd4";
    g.fill();
    k.text("MOV", cx, top + 52, { size: 8, weight: 600, color: "#6b6e7a", align: "center" });
  }
  label.forEach((l, i) => k.text(l, cx, top + 76 + i * 15, { size: 12, weight: 500, color: "#f2f2f5", align: "center" }));
}

/* --------------------------------------------------------------- desktop */

export interface DesktopOpts {
  clock?: string;
  /** the Finder window of old recordings */
  finder?: boolean;
  /** the desktop column of demo files */
  mess?: boolean;
  /** app name in the menu bar */
  app?: string;
  menus?: string[];
}

export function drawDesktop(k: Kit, o: DesktopOpts = {}) {
  const g = k.g;
  const bg = g.createLinearGradient(0, 0, SW, SH);
  bg.addColorStop(0, "#141a33");
  bg.addColorStop(0.55, "#0c0f1e");
  bg.addColorStop(1, "#190f22");
  g.fillStyle = bg;
  g.fillRect(0, 0, SW, SH);
  const blob = (x: number, y: number, r: number, c: string) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, c);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg;
    g.fillRect(0, 0, SW, SH);
  };
  blob(260, 760, 720, "rgba(88,64,170,0.50)");
  blob(1180, 220, 640, "rgba(36,104,160,0.42)");
  blob(900, 820, 520, "rgba(150,58,104,0.28)");

  if (o.finder ?? true) {
    const wx = 150, wy = 150, ww = 700, wh = 430;
    k.rect(wx, wy, ww, wh, "#1f2026", 12, "rgba(255,255,255,0.12)");
    k.rect(wx, wy, 190, wh, "#26272e", 12);
    k.rect(wx + 178, wy, 12, wh, "#26272e");
    for (const [i, c] of ["#ff5f57", "#febc2e", "#28c840"].entries()) k.circle(wx + 22 + i * 20, wy + 22, 6, c);
    k.text("Recordings", wx + 214, wy + 24, { size: 14, weight: 600, color: "#e6e6ea" });
    ["Recents", "Applications", "Desktop", "Documents", "Downloads", "Movies"].forEach((s, i) =>
      k.text(s, wx + 26, wy + 70 + i * 30, { size: 13, color: i === 5 ? "#ffffff" : "#a4a5ad" }),
    );
    k.rect(wx + 14, wy + 70 + 5 * 30 - 13, 162, 26, "rgba(255,255,255,0.10)", 6);
    k.line(wx + 190, wy + 48, wx + ww, wy + 48, "rgba(255,255,255,0.08)");
    k.text("Name", wx + 214, wy + 66, { size: 12, weight: 500, color: "#8a8a93" });
    k.text("Size", wx + ww - 70, wy + 66, { size: 12, weight: 500, color: "#8a8a93" });
    const rows = [
      ["Screen Recording 2026-10-28 at 3.02.11 PM.mov", "1.2 GB"],
      ["Screen Recording 2026-10-28 at 3.09.40 PM.mov", "2.4 GB"],
      ["demo take 3 (audio broken).mov", "880 MB"],
      ["demo take 4.mov", "1.1 GB"],
      ["voiceover_retry.m4a", "14 MB"],
      ["voiceover_retry_2.m4a", "16 MB"],
      ["export_final.mp4", "620 MB"],
      ["export_final_v2.mp4", "640 MB"],
      ["export_final_v2_REAL.mp4", "655 MB"],
    ];
    rows.forEach(([n, s], i) => {
      const y = wy + 96 + i * 34;
      if (i % 2 === 1) k.rect(wx + 196, y - 16, ww - 202, 32, "rgba(255,255,255,0.03)", 4);
      k.rect(wx + 214, y - 8, 12, 15, "#d6d7de", 2);
      k.text(n!, wx + 236, y, { size: 13, color: "#d4d4da" });
      k.text(s!, wx + ww - 70, y, { size: 13, color: "#8a8a93" });
    });
  }

  if (o.mess ?? true) {
    fileIcon(k, 1366, 150, "mov", ["Screen Recording", "2026-11-04 at 4.1…"]);
    fileIcon(k, 1366, 270, "mov", ["demo_v1.mov"]);
    fileIcon(k, 1366, 375, "mov", ["demo_v2_FINAL.mov"]);
    fileIcon(k, 1366, 480, "folder", ["untitled folder"]);
    fileIcon(k, 1250, 480, "folder", ["untitled folder 2"]);
  }

  // menu bar
  k.rect(0, 0, SW, MENU_H, "rgba(10,10,16,0.55)");
  const app = o.app ?? "Finder";
  k.text(app, 44, 13, { size: 13, weight: 700, color: "#f2f2f5" });
  (o.menus ?? ["File", "Edit", "View", "Go", "Window", "Help"]).reduce((x, s) => {
    k.text(s, x, 13, { size: 13, color: "#e6e6ea" });
    return x + k.measure(s, 13) + 22;
  }, 44 + k.measure(app, 13, 700) + 24);
  k.circle(20, 13, 6, "none", "#e6e6ea", 1.6); // a neutral system glyph
  k.text(o.clock ?? "Tue Nov 4  4:52 PM", SW - 16, 13, { size: 13, color: "#f2f2f5", align: "right" });
  k.rect(SW - 196, 8, 24, 11, "none", 3, "#e6e6ea", 1.2);
  k.rect(SW - 194, 10, 15, 7, "#e6e6ea", 1.5);
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(SW - 226, 19, 4 + i * 4, -Math.PI * 0.75, -Math.PI * 0.25);
    g.strokeStyle = "#e6e6ea";
    g.lineWidth = 1.6;
    g.stroke();
  }

  // dock: the real app icons are painted in by makeDesktop once their files load;
  // here, the shelf, the running-app dots, the separator and the Trash
  k.rect(DOCK_X, DOCK_Y, DOCK_W, 70, "rgba(255,255,255,0.12)", 20, "rgba(255,255,255,0.14)");
  APPS.forEach((a, i) => {
    if (a.running) k.circle(DOCK_X + 12 + i * (TW + GAP) + TW / 2, SH - 10, 2, "rgba(255,255,255,0.75)");
  });
  const sx = TRASH.x - SEP / 2 - 1;
  k.line(sx, SH - 64, sx, SH - 18, "rgba(255,255,255,0.22)");
  drawTrash(g, TRASH.x, TRASH.y, false);
  k.mark("trash", TRASH);
}

/** A squircle-ish rounded rect path (macOS icon corner ≈ 22.5% of the side). */
function iconPath(g: G, x: number, y: number, s: number) {
  g.beginPath();
  g.roundRect(x, y, s, s, s * 0.225);
}

function drawDockApp(g: G, a: DockApp, img: HTMLImageElement, slot: number) {
  const cx = DOCK_X + 12 + slot * (TW + GAP) + TW / 2;
  const cy = SH - 67 + TW / 2;
  const s = TW * a.fit;
  const x = cx - s / 2;
  const y = cy - s / 2;
  g.save();
  // a soft drop shadow, as the dock gives every icon
  g.shadowColor = "rgba(0,0,0,0.35)";
  g.shadowBlur = 4;
  g.shadowOffsetY = 1.5;
  if (a.tile) {
    iconPath(g, x, y, s);
    g.fillStyle = a.tile;
    g.fill();
    g.shadowColor = "transparent";
    const m = s * (a.mark ?? 0.6);
    const k = Math.min(m / img.width, m / img.height);
    g.drawImage(img, cx - (img.width * k) / 2, cy - (img.height * k) / 2, img.width * k, img.height * k);
  } else if (a.clip) {
    iconPath(g, x, y, s);
    g.fillStyle = "#000";
    g.fill();
    g.shadowColor = "transparent";
    g.clip();
    g.drawImage(img, x, y, s, s);
  } else {
    const k = Math.min(s / img.width, s / img.height);
    g.drawImage(img, cx - (img.width * k) / 2, cy - (img.height * k) / 2, img.width * k, img.height * k);
  }
  g.restore();
}

/**
 * The desktop as a page. Pass the scene's loading manager: the dock's real app
 * icons load through it (so the export waits for them) and are painted into
 * the desktop texture as they arrive.
 */
export function makeDesktop(name = "desktop", o: DesktopOpts = {}, manager?: LoadingManager): Page {
  let canvas: OffscreenCanvas | null = null;
  const p = makePage(name, SW, SH, 2, (k) => {
    canvas = k.g.canvas as OffscreenCanvas;
    drawDesktop(k, o);
  });
  p.u.bgLum.value = 0.05;
  p.u.tint.setRGB(0.86, 0.92, 1.0);
  const tex = (p.mesh.material as THREE.ShaderMaterial).uniforms.map!.value as THREE.CanvasTexture;
  const loader = new THREE.ImageLoader(manager);
  APPS.forEach((a, i) => {
    loader.load(a.url, (img) => {
      const g = canvas!.getContext("2d")!; // still scaled to desktop px
      drawDockApp(g, a, img, i);
      tex.needsUpdate = true;
    });
  });
  return p;
}

/* -------------------------------------------------------------- overlays */

export interface Sprite {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  tex: THREE.CanvasTexture;
  w: number;
  h: number;
  /** named hit areas, in the sprite's own px */
  rects: Record<string, Rect>;
}

/** A crisp prop drawn once into a canvas (4× by default), as an unlit plane. */
export function sprite(name: string, w: number, h: number, draw: (k: Kit) => void, scale = 4, order = 4): Sprite {
  const c = new OffscreenCanvas(Math.ceil(w * scale), Math.ceil(h * scale));
  const g = c.getContext("2d")!;
  g.scale(scale, scale);
  const k = new Kit(g, w, h);
  draw(k);
  const tex = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * PX, h * PX), mat);
  mesh.name = name;
  mesh.renderOrder = order;
  return { mesh, mat, tex, w, h, rects: k.rects };
}

/** Pin a sprite to a page so its top-left corner sits at page px (x, y). */
export function put(page: Page, s: Sprite, x: number, y: number, o: { scale?: number; opacity?: number } = {}) {
  if (s.mesh.parent !== page.mesh) page.mesh.add(s.mesh);
  const sc = o.scale ?? 1;
  s.mesh.position.copy(page.local(x + s.w / 2, y + s.h / 2, 0));
  s.mesh.scale.setScalar(sc);
  s.mat.opacity = o.opacity ?? 1;
  s.mesh.visible = (o.opacity ?? 1) > 0.001 && sc > 0.001;
}

/** Centre of a named rect inside a sprite placed at (x, y), in page px. */
export function at(s: Sprite, name: string, x: number, y: number) {
  const r = s.rects[name]!;
  return { x: x + r.x + r.w / 2, y: y + r.y + r.h / 2, r: { x: x + r.x, y: y + r.y, w: r.w, h: r.h } as Rect };
}

/** One line of UI text as its own sprite. */
export function textSprite(name: string, text: string, size: number, weight: number, color: string, bg?: string) {
  const m = new OffscreenCanvas(8, 8).getContext("2d")!;
  m.font = `${weight} ${size}px ${FONT}`;
  const w = Math.ceil(m.measureText(text).width) + 8;
  const h = Math.ceil(size * 1.5);
  return sprite(name, w, h, (k) => {
    if (bg) k.rect(0, 0, w, h, bg, 3);
    k.text(text, 4, h / 2, { size, weight, color });
  });
}

/**
 * A macOS panel: the fill plus its two hairlines — a dark outer rim and a faint
 * light inner edge — both inset so no part of either is cut off by the
 * canvas edge, and the same width along the sides as around the corners.
 */
export function panelShape(g: G, w: number, h: number, r: number, fill: string) {
  g.beginPath();
  g.roundRect(0.5, 0.5, w - 1, h - 1, r - 0.5);
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = 1;
  g.strokeStyle = "rgba(0,0,0,0.55)";
  g.stroke();
  g.beginPath();
  g.roundRect(1.5, 1.5, w - 3, h - 3, r - 1.5);
  g.strokeStyle = "rgba(255,255,255,0.16)";
  g.stroke();
}

/* ---------------------------------------------------------------- props */

/** The macOS screenshot / screen-recording toolbar. */
export function captureBar(): Sprite {
  // macOS's own proportions: a compact bar, icons on a 44 px pitch, and the
  // Record button sitting right after Options in the system light blue.
  const H = 54;
  const PITCH = 44;
  const ICON0 = 76;
  const SEP2 = ICON0 + 4 * PITCH + 26;
  const OPT_X = SEP2 + 14;
  const m = new OffscreenCanvas(8, 8).getContext("2d")!;
  m.font = `400 14px ${FONT}`;
  const optW = m.measureText("Options").width;
  const CHEV = OPT_X + optW + 8;
  const BTN_X = CHEV + 8 + 14;
  const BTN_W = 86;
  const W = BTN_X + BTN_W + 10;
  return sprite("capture-toolbar", W, H, (k) => {
    const g = k.g;
    panelShape(g, W, H, 12, "rgba(36,37,44,0.97)");
    // close
    k.circle(26, H / 2, 10, "rgba(255,255,255,0.16)");
    k.line(22, H / 2 - 4, 30, H / 2 + 4, "#e6e6ea", 1.5);
    k.line(30, H / 2 - 4, 22, H / 2 + 4, "#e6e6ea", 1.5);
    k.line(50, 13, 50, H - 13, "rgba(255,255,255,0.16)");
    // capture: entire screen, window, selection · record: entire screen, selection
    for (let i = 0; i < 5; i++) {
      const cx = ICON0 + i * PITCH + (i >= 3 ? 12 : 0);
      if (i === 3) k.rect(cx - 18, 8, 36, H - 16, "rgba(255,255,255,0.2)", 7);
      g.setLineDash(i === 2 || i === 4 ? [3, 2.5] : []);
      g.strokeStyle = "#e6e6ea";
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(cx - 12, H / 2 - 8, 24, 16, i === 1 ? 4 : 2);
      g.stroke();
      g.setLineDash([]);
      if (i === 0) k.rect(cx - 12, H / 2 - 8, 24, 16, "rgba(230,230,234,0.35)", 2);
      if (i >= 3) k.circle(cx + 11, H / 2 + 7, 4.5, "#e6e6ea");
    }
    k.line(ICON0 + 2 * PITCH + 22, 13, ICON0 + 2 * PITCH + 22, H - 13, "rgba(255,255,255,0.16)");
    k.line(SEP2 + 12, 13, SEP2 + 12, H - 13, "rgba(255,255,255,0.16)");
    // Options ⌄, then the button
    k.text("Options", OPT_X + 12, H / 2, { size: 14, color: "#e6e6ea" });
    k.line(CHEV + 12, H / 2 - 2, CHEV + 16, H / 2 + 2, "#e6e6ea", 1.4);
    k.line(CHEV + 16, H / 2 + 2, CHEV + 20, H / 2 - 2, "#e6e6ea", 1.4);
    k.button("record", "Record", BTN_X + 12, (H - 30) / 2, { h: 30, w: BTN_W - 12, size: 14, weight: 500, fill: "#3b93f7", ink: "#ffffff", r: 7 });
  });
}

/** The recording indicator that lives in the menu bar: a red pill with a stop square and a timer. */
/** Sized to its contents: 10 px stop square inset 10, the timer, ~10 px to the end. */
export const REC_PILL_W = 68;
export function recPill(seconds: number): Sprite {
  const W = REC_PILL_W;
  const H = 22;
  const s = `0:${String(seconds).padStart(2, "0")}`;
  return sprite(`recording-indicator-${s}`, W, H, (k) => {
    k.rect(0, 0, W, H, "#d93a32", 11);
    k.rect(10, 6, 10, 10, "#ffffff", 2);
    k.text(s, 27, H / 2 + 0.5, { size: 13, weight: 600, color: "#ffffff" });
    k.mark("stop", { x: 0, y: 0, w: W, h: H });
  });
}
export const REC_PILL_X = SW - 226 - 22 - REC_PILL_W; // right edge stays beside the Wi-Fi icon
export const REC_PILL_Y = 2;

/** The floating thumbnail macOS shows after a recording stops. */
export function recordingThumb(): Sprite {
  const W = 208;
  const H = 130;
  return sprite("recording-thumbnail", W, H, (k) => {
    const g = k.g;
    const lg = g.createLinearGradient(0, 0, W, H);
    lg.addColorStop(0, "#1f2a52");
    lg.addColorStop(1, "#2a1735");
    k.rect(0, 0, W, H, lg as unknown as string, 10);
    k.rect(0, 0, W, 7, "rgba(10,10,16,0.7)", 0);
    k.rect(24, 30, 98, 62, "#1f2026", 4);
    k.rect(138, 12, 62, 18, "rgba(60,62,70,0.95)", 4);
    k.rect(70, H - 16, 70, 10, "rgba(255,255,255,0.18)", 4);
    k.rect(1, 1, W - 2, H - 2, "none", 10, "rgba(255,255,255,0.7)", 2);
    k.mark("grab", { x: 0, y: 0, w: W, h: H });
  });
}
export const THUMB_X = SW - 16 - 208;
export const THUMB_Y = SH - 150 - 10;

/** The Trash, full, as a sprite that covers the empty one in the dock. */
export function trashFull(): Sprite {
  return sprite("trash-full", TW, TW, (k) => drawTrash(k.g, 0, 0, true));
}

/** A QuickTime-style audio recording window, mid-take, clipping. */
export function audioWindow(seed = 7): Sprite {
  const W = 460;
  const H = 172;
  const r = rng(seed);
  return sprite("audio-recording-window", W, H, (k) => {
    panelShape(k.g, W, H, 12, "#232329");
    for (const [i, c] of ["#ff5f57", "#febc2e", "#28c840"].entries()) k.circle(18 + i * 20, 16, 6, c);
    k.text("Audio Recording", W / 2, 16, { size: 13, weight: 600, color: "#e6e6ea", align: "center" });
    k.rect(18, 38, W - 36, 74, "#17171c", 8);
    const n = 58;
    for (let i = 0; i < n; i++) {
      const env = Math.sin((i / n) * Math.PI) * 0.6 + 0.4;
      const hgt = Math.min(1, (0.25 + r() * 0.9) * env);
      const clip = hgt > 0.92;
      const x = 28 + i * 7.1;
      const bh = hgt * 30;
      k.rect(x, 75 - bh, 4, bh * 2, clip ? "#ff453a" : "#d9d9e0", 2);
    }
    k.text("00:07", 26, 140, { size: 16, weight: 500, color: "#e6e6ea" });
    k.circle(W / 2, 140, 21, "#3a3a42", "rgba(255,255,255,0.2)", 1);
    k.rect(W / 2 - 7, 133, 14, 14, "#ff453a", 3);
    k.mark("stop", { x: W / 2 - 21, y: 119, w: 42, h: 42 });
    k.text("Clipping", W - 26, 140, { size: 14, weight: 500, color: "#ff6b62", align: "right" });
  });
}

/** A movie file icon on its own, so the name field under it can change per keystroke. */
export function movIcon(name = "file-icon"): Sprite {
  return sprite(name, 64, 64, (k) => fileIcon(k, 32, 2, "mov", []));
}

/**
 * The name field under a file icon: in rename mode (white field, blue ring,
 * caret after `text`), or committed (selected label, blue fill, white text).
 * Small on purpose — one is drawn per keystroke.
 */
export const FIELD_W = 360;
export const FIELD_H = 30;
export function renameField(text: string, committed = false): Sprite {
  return sprite(committed ? "file-name" : "rename-field", FIELD_W, FIELD_H, (k) => {
    const tw = k.measure(text, 14, 500);
    const fw = Math.max(40, tw + 14);
    const fx = FIELD_W / 2 - fw / 2;
    if (committed) {
      k.rect(fx, 3, fw, 24, "#2463d1", 5);
      k.text(text, fx + 7, 15.5, { size: 14, weight: 500, color: "#ffffff" });
    } else {
      k.rect(fx, 3, fw, 24, "#ffffff", 4, "#3b82f6", 3);
      k.text(text, fx + 7, 15.5, { size: 14, weight: 500, color: "#111114" });
      k.line(fx + 7 + tw + 1.5, 7, fx + 7 + tw + 1.5, 24, "#111114", 1.4);
    }
    k.mark("field", { x: fx, y: 3, w: fw, h: 24 });
  }, 3);
}

/** "Are you sure you want to permanently erase the items in the Trash?" */
export function eraseDialog(): Sprite {
  const W = 300;
  const H = 232;
  return sprite("erase-trash-alert", W, H, (k) => {
    panelShape(k.g, W, H, 14, "rgba(46,47,54,0.98)");
    drawTrash(k.g, W / 2 - 26, 14, true);
    k.text("Are you sure you want to permanently", W / 2, 90, { size: 13, weight: 600, color: "#f2f2f5", align: "center" });
    k.text("erase the items in the Trash?", W / 2, 108, { size: 13, weight: 600, color: "#f2f2f5", align: "center" });
    k.text("You can’t undo this action.", W / 2, 134, { size: 12, color: "#a4a5ad", align: "center" });
    k.button("cancel", "Cancel", 16, 168, { h: 32, w: 128, size: 13, weight: 500, fill: "rgba(255,255,255,0.16)", ink: "#f2f2f5", r: 7 });
    k.button("erase", "Erase", 156, 168, { h: 32, w: 128, size: 13, weight: 500, fill: "#2f6fe0", ink: "#ffffff", r: 7 });
  });
}

/** A Slack banner (the real Slack mark, loaded through the frame barrier). */
export function slackBanner(name: string, sender: string, msg: string, manager: LoadingManager): Sprite {
  const W = 372;
  const H = 84;
  const s = sprite(name, W, H, (k) => {
    panelShape(k.g, W, H, 18, "rgba(44,45,52,0.97)");
    k.rect(14, (H - 40) / 2, 40, 40, "#ffffff", 10);
    k.text(sender, 66, 31, { size: 14.5, weight: 600, color: "#ffffff" });
    k.text("now", W - 16, 31, { size: 12.5, color: "rgba(255,255,255,0.62)", align: "right" });
    k.text(msg, 66, 55, { size: 14.5, color: "#f2f2f5" });
  });
  new THREE.ImageLoader(manager).load(slackLogoUrl, (img) => {
    const g = (s.tex.image as OffscreenCanvas).getContext("2d")!;
    g.drawImage(img, 22, H / 2 - 12, 24, 24);
    s.tex.needsUpdate = true;
  });
  return s;
}
export const BANNER_X = SW - 14 - 372;
export const BANNER_Y = MENU_H + 10;
