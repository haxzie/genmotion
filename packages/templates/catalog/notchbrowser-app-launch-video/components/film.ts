/**
 * The whole teaser as ONE continuous shot over one Mac desktop.
 *
 * World space = the desktop, 1920×1080 (wallpaper + real menu bar + real dock,
 * lifted from the post's screen recording). A single camera (centre + zoom)
 * looks at it; every scene file in /scenes is just a window onto this
 * timeline, so there are no cuts anywhere.
 *
 * Text beats are authored in "text-frame" pixels: the 1920×1080 frame as the
 * camera sees it at TEXT_ZOOM, centred on the desktop. At that zoom the
 * text-frame maps 1:1 onto the screen; when the camera pulls back, the words
 * shrink into the desktop with everything else.
 */
import { clamp, ease, H, lerp, prog, W, type Assets, type Ease, type Film, type G } from "./core";
import {
  chevronCenter,
  drawChrome,
  drawShape,
  NOTCH,
  PAGE_Y,
  pageCanvas,
  PANEL,
  PILL,
  tabCenter,
} from "./panel";
import { appTile, font, measure, rr, text } from "./ui";
import { WIN_PAD, WINDOWS, windowCanvas } from "./windows";

/* ================================================================ timing */

export const DURATION = 28;

const TX = {
  // 1 — headline
  headWord0: 0.15,
  headWordEach: 0.12,
  headWordDur: 0.8,
  headWipe: [0.3, 2.0] as const,
  headShrink: [2.8, 4.0] as const,
  // 2 — list
  listIn: [3.3, 3.7] as const,
  spin: [3.4, 7.9] as const,
  qmark: 8.1,
  textOut: [8.6, 9.3] as const,
  // 3 — pull back + pile-up
  pull: [8.6, 11.0] as const,
  winIn0: 8.8,
  winInEach: 0.33,
  winInDur: 1.4,
  // 4 — push through
  push: [12.8, 15.0] as const,
  winOut0: 12.8,
  winOutEach: 0.16,
  winOutDur: 1.0,
  line1: 14.3,
  line2: 15.0,
  wipe1: [14.4, 15.6] as const,
  wipe2: [15.1, 16.1] as const,
  text2Out: 16.3,
  // 5 — notch
  pan: [16.6, 18.8] as const,
  hover: [19.25, 19.75] as const,
  click: 19.9,
  open: [20.0, 20.9] as const,
  content: [20.2, 20.45] as const,
  camPanel: [19.85, 21.95] as const,
  // 6 — tabs, collapse
  tabClicks: [22.5, 23.2, 23.9] as const,
  chevClick: 24.6,
  close: [24.65, 25.45] as const,
  // 7 — checklist
  camEnd: [25.0, 26.9] as const,
  checkHead: 25.4,
  check0: 25.75,
  checkEach: 0.3,
};

const TEXT_ZOOM = 2.4;
const ORANGE = "#ff6a1a";

/* ================================================================ camera */

interface Cam {
  x: number;
  y: number;
  z: number;
}

// [time, x, y, zoom] — every move is a slow ease-in-out, 1.5–3s.
const CAM_KEYS: [number, number, number, number][] = [
  [0, 960, 540, TEXT_ZOOM],
  [TX.pull[0], 960, 540, TEXT_ZOOM],
  [TX.pull[1], 960, 540, 1.02],
  [TX.push[0], 960, 540, 1.06],
  [TX.push[1], 960, 540, TEXT_ZOOM],
  [TX.pan[0], 960, 540, TEXT_ZOOM],
  [TX.pan[1], 960, 170, 3.15],
  [TX.camPanel[0], 960, 170, 3.15],
  [TX.camPanel[1], 960, 428, 1.26],
  [TX.camEnd[0], 960, 428, 1.26],
  [TX.camEnd[1], 960, 540, 1.04],
];

function camBase(T: number): Cam {
  const k = CAM_KEYS;
  if (T <= k[0]![0]) return { x: k[0]![1], y: k[0]![2], z: k[0]![3] };
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i]!;
    const b = k[i + 1]!;
    if (T <= b[0]) {
      const u = ease.inOut(clamp((T - a[0]) / (b[0] - a[0])));
      // Zoom interpolates in log space so a push feels even all the way in.
      const z = Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), u));
      return { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), z };
    }
  }
  const l = k[k.length - 1]!;
  return { x: l[1], y: l[2], z: l[3] };
}

export function camAt(T: number): Cam {
  const c = camBase(T);
  // ambient drift, a few screen px
  c.x += (Math.sin(T * 0.53) * 7 + Math.sin(T * 1.31) * 2) / c.z;
  c.y += (Math.cos(T * 0.41) * 5 + Math.sin(T * 0.97) * 1.5) / c.z;
  // never show past the desktop's edge
  const hw = W / 2 / c.z;
  const hh = H / 2 / c.z;
  c.x = clamp(c.x, hw, 1920 - hw);
  c.y = clamp(c.y, hh, 1080 - hh);
  return c;
}

const toScreen = (c: Cam, x: number, y: number) => ({ x: (x - c.x) * c.z + W / 2, y: (y - c.y) * c.z + H / 2 });

function setCam(g: G, c: Cam) {
  g.setTransform(c.z, 0, 0, c.z, W / 2 - c.x * c.z, H / 2 - c.y * c.z);
}

/** Text-frame → world, composed onto the camera. */
function setTextFrame(g: G, c: Cam) {
  const s = 1 / TEXT_ZOOM;
  // world = 960 + (tx - 960) * s
  const a = c.z * s;
  const e = W / 2 + (960 - 960 * s - c.x) * c.z;
  const f = H / 2 + (540 - 540 * s - c.y) * c.z;
  g.setTransform(a, 0, 0, a, e, f);
}

/* ================================================================ desktop */

let dimCanvas: OffscreenCanvas | null = null;
let dimVer = -1;
function dimmed(a: Assets): OffscreenCanvas | null {
  const wp = a.img["wallpaper"];
  if (!wp) return null;
  if (dimCanvas && dimVer === a.version) return dimCanvas;
  dimCanvas = dimCanvas ?? new OffscreenCanvas(960, 540);
  const g = dimCanvas.getContext("2d") as G;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.filter = "blur(10px) brightness(0.30) saturate(1.15)";
  g.drawImage(wp, -40, -24, 1040, 588);
  g.filter = "none";
  dimVer = a.version;
  return dimCanvas;
}

function dimAt(T: number) {
  return (
    1 -
    prog(T, 8.6, 10.6) +
    prog(T, 12.9, 14.6) -
    prog(T, TX.pan[0], 18.3) +
    0.9 * prog(T, TX.camEnd[0], 26.2)
  );
}

function drawDesktop(g: G, a: Assets, T: number) {
  const wp = a.img["wallpaper"];
  if (wp) g.drawImage(wp, 0, 0, 1920, 1080);
  else {
    g.fillStyle = "#2c3a22";
    g.fillRect(0, 0, 1920, 1080);
  }
  const dock = a.img["dock"];
  if (dock) {
    // real dock from the recording (crop is 2330×200 at 1.7417 px per world px)
    const s = 1 / 1.7417;
    const dx = 960 - (2330 * s) / 2;
    const dy = 1080 - 200 * s - 2;
    g.save();
    rr(g, dx + 8 * s, dy + 10 * s, (2330 - 16) * s, (200 - 22) * s, 24);
    g.clip();
    g.drawImage(dock, dx, dy, 2330 * s, 200 * s);
    g.restore();
  }
  const d = clamp(dimAt(T));
  const dc = dimmed(a);
  if (d > 0.001) {
    g.globalAlpha = d;
    if (dc) g.drawImage(dc, 0, 0, 1920, 1080);
    else {
      g.fillStyle = "#0b0c0a";
      g.fillRect(0, 0, 1920, 1080);
    }
    g.globalAlpha = 1;
  }
}

/* ================================================================ text */

const WHITE = "#f4f1ec";

/** Orange colorama band that sweeps across a line. `leave` is what's left behind. */
function wipeFill(g: G, x0: number, x1: number, T: number, t0: number, t1: number, leave: string): string | CanvasGradient {
  const band = 520;
  const u = ease.inOutSine(clamp((T - t0) / (t1 - t0)));
  if (u <= 0) return WHITE;
  if (u >= 1) return leave;
  const edge = lerp(x0 - 20, x1 + band, u);
  const gr = g.createLinearGradient(edge - band, 0, edge, 0);
  const sh = Math.sin(T * 9) * 0.03;
  gr.addColorStop(0, leave);
  gr.addColorStop(clamp(0.18 + sh), "#ffd9a3");
  gr.addColorStop(clamp(0.38 + sh), "#ffb04a");
  gr.addColorStop(clamp(0.58 + sh), "#ff7a1f");
  gr.addColorStop(clamp(0.78 + sh), "#ff4f0f");
  gr.addColorStop(0.9, "#ffa24a");
  gr.addColorStop(1, WHITE);
  return gr;
}

/**
 * A line whose words arrive one by one from the right, with the colorama wipe
 * painted across the whole line.
 */
function wordsLine(
  g: G,
  words: string[],
  cx: number,
  cy: number,
  size: number,
  T: number,
  start: number,
  each: number,
  wipe: readonly [number, number],
  leave: string,
  exitAt: number | null,
) {
  font(g, size, 500, -size * 0.025);
  const space = g.measureText(" ").width;
  const ws = words.map((w) => g.measureText(w).width);
  const total = ws.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const x0 = cx - total / 2;
  const fill = wipeFill(g, x0, x0 + total, T, wipe[0], wipe[1], leave);
  g.textAlign = "left";
  g.textBaseline = "middle";
  let x = x0;
  words.forEach((w, i) => {
    const u = clamp((T - (start + i * each)) / TX.headWordDur);
    let alpha = clamp(u / 0.55);
    let dx = (1 - ease.outQuint(u)) * 170;
    let dy = 0;
    if (exitAt !== null) {
      const v = clamp((T - (exitAt + i * 0.035)) / 0.4);
      const ve = ease.inQuad(v);
      alpha *= 1 - ve;
      dy -= ve * 70;
    }
    if (alpha > 0.002) {
      g.globalAlpha = alpha;
      g.fillStyle = fill;
      g.fillText(w, x + dx, cy + dy);
    }
    x += ws[i]! + space;
  });
  g.globalAlpha = 1;
  g.letterSpacing = "0px";
}

/* ------------------------------------------------------------- the list */

const HARD: [string, string][] = [
  ["spending tokens wisely", "openai-icon"],
  ["picking the right model", "claude-icon"],
  ["managing context windows", "gemini"],
  ["writing the perfect prompt", "notion-icon"],
  ["reviewing ai-generated code", "github-icon"],
  ["keeping up with every launch", "x"],
  ["knowing when to trust the output", "grok-icon"],
  ["juggling twelve chat tabs", "chrome"],
  ["staying in flow", "spotify-icon"],
  ["keeping your team in sync", "slack-icon"],
  ["triaging agent tickets", "linear-icon"],
  ["babysitting long-running agents", "terminal"],
  ["remembering which chat had the answer", "perplexity-icon"],
  ["shipping before it's outdated", "vercel-icon"],
  ["reading every changelog", "discord-icon"],
  ["organizing your prompt library", "obsidian-icon"],
  ["designing with ai in the loop", "figma"],
  ["running evals that mean something", "python"],
  ["choosing open weights", "hugging-face-icon"],
  ["paying for ten subscriptions", "google-gmail"],
  ["prototyping in minutes", "replit-icon"],
  ["sandboxing your agents", "docker-icon"],
  ["keeping secrets out of prompts", "1password"],
  ["deciding what to automate", "zapier-icon"],
  ["catching hallucinations in prod", "sentry-icon"],
  ["finding that one doc", "google-drive"],
  ["reading the ai doom threads", "reddit-icon"],
  ["recording yet another demo", "loom-icon"],
  ["resolving ai merge conflicts", "git-icon"],
  ["managing your desktop", "finder"],
];
const ROW = 120;
const LIST_Y = 600;

function listPos(T: number) {
  const u = clamp((T - TX.spin[0]) / (TX.spin[1] - TX.spin[0]));
  // fast through the middle, a long slow landing on the last item
  const e = 1 - Math.pow(1 - u, 3.6);
  return (HARD.length - 1) * e;
}

function drawList(g: G, a: Assets, T: number, alpha: number) {
  const p = listPos(T);
  const size = 68;
  const tile = 92;
  for (let k = Math.max(0, Math.floor(p - 1)); k <= Math.min(HARD.length - 1, Math.ceil(p + 1)); k++) {
    const d = k - p;
    const ad = Math.abs(d);
    if (ad > 0.95) continue;
    const rowA = Math.pow(clamp(1 - ad * 1.08), 1.3) * alpha;
    if (rowA < 0.003) continue;
    const [label, ic] = HARD[k]!;
    const y = LIST_Y + d * ROW;
    const last = k === HARD.length - 1;
    const q = last ? clamp((T - TX.qmark) / 0.42) : 0;
    const qW = measure(g, "?", size, 500);
    const tw = measure(g, label, size, 500, -size * 0.025);
    const total = tile + 30 + tw + qW * ease.out(q);
    const x0 = 960 - total / 2;
    const sc = 1 - ad * 0.1;
    g.save();
    g.globalAlpha = rowA;
    g.translate(960, y);
    g.scale(sc, sc);
    g.translate(-960, -y);
    appTile(g, a, ic, x0, y - tile / 2, tile);
    text(g, label, x0 + tile + 30, y + 2, size, WHITE, 500, "left", -size * 0.025);
    if (q > 0) {
      const s = ease.outBack(q);
      const qx = x0 + tile + 30 + tw + 2;
      g.globalAlpha = rowA * clamp(q * 3);
      g.translate(qx + qW / 2, y + size * 0.3);
      g.scale(s, s);
      text(g, "?", -qW / 2, -size * 0.3 + 2, size, ORANGE, 500);
    }
    g.restore();
  }
}

/* ================================================================ windows */

function winDepth(T: number, i: number): { d: number; alpha: number } | null {
  const tIn = TX.winIn0 + i * TX.winInEach;
  if (T < tIn) return null;
  const n = WINDOWS.length;
  const tOut = TX.winOut0 + (n - 1 - i) * TX.winOutEach;
  if (T < tOut) {
    const u = clamp((T - tIn) / TX.winInDur);
    const e = ease.outQuart(u);
    return { d: lerp(0.13, 1, e), alpha: clamp(u / 0.14) };
  }
  const v = clamp((T - tOut) / TX.winOutDur);
  if (v >= 1) return null;
  const e = ease.in(v);
  return { d: lerp(1, 0.07, e), alpha: 1 - clamp((v - 0.72) / 0.28) };
}

function winRect(c: Cam, i: number, d: number) {
  const s = WINDOWS[i]!;
  const k = 1 / d;
  const x = c.x + (s.x - c.x) * k;
  const y = c.y + (s.y - c.y) * k;
  return { x, y, w: s.w * k, h: s.h * k, k };
}

function drawWindows(g: G, a: Assets, T: number, c: Cam) {
  WINDOWS.forEach((s, i) => {
    const st = winDepth(T, i);
    if (!st || st.alpha <= 0.002) return;
    const r = winRect(c, i, st.d);
    const cv = windowCanvas(s, a);
    g.globalAlpha = st.alpha;
    g.drawImage(cv, r.x - WIN_PAD * r.k, r.y - WIN_PAD * r.k, (s.w + 2 * WIN_PAD) * r.k, (s.h + 2 * WIN_PAD) * r.k);
    g.globalAlpha = 1;
  });
}

/* ================================================================ notch */

function activeTab(T: number) {
  let t = 0;
  const order = [2, 3, 4];
  TX.tabClicks.forEach((ct, i) => {
    if (T >= ct + 0.04) t = order[i]!;
  });
  return t;
}

function pressState(T: number): { tab: number; amt: number } {
  const order = [2, 3, 4];
  for (let i = 0; i < TX.tabClicks.length; i++) {
    const ct = TX.tabClicks[i]!;
    if (T >= ct - 0.02 && T < ct + 0.25) return { tab: order[i]!, amt: 1 - clamp((T - ct) / 0.25) };
  }
  const cc = TX.chevClick;
  if (T >= cc - 0.02 && T < cc + 0.3) return { tab: 99, amt: 1 - clamp((T - cc) / 0.3) };
  return { tab: -1, amt: 0 };
}

function drawNotch(g: G, a: Assets, T: number) {
  const hov = ease.out(clamp((T - TX.hover[0]) / (TX.hover[1] - TX.hover[0])));
  const op = prog(T, TX.open[0], TX.open[1], ease.inOut);
  const cl = prog(T, TX.close[0], TX.close[1], ease.inOut);
  // notch → pill
  let w = lerp(NOTCH.w, PILL.w, hov);
  let h = lerp(NOTCH.h, PILL.h, hov);
  let r = lerp(NOTCH.r, PILL.r, hov);
  // pill → panel
  w = lerp(w, PANEL.w, op);
  h = lerp(h, PANEL.h, op);
  r = lerp(r, PANEL.r, op);
  // panel → notch
  if (cl > 0) {
    w = lerp(PANEL.w, NOTCH.w, cl);
    h = lerp(PANEL.h, NOTCH.h, cl);
    r = lerp(PANEL.r, NOTCH.r, cl);
  }
  const big = clamp((h - NOTCH.h) / 200);
  drawShape(g, w, h, r, big);

  // pill label
  const labelA = clamp((T - 19.45) / 0.35) * (1 - clamp((T - TX.open[0]) / 0.14));
  if (labelA > 0.002 && cl === 0) {
    g.globalAlpha = labelA;
    text(g, "NotchBrowser", NOTCH.cx, 70 + (1 - labelA) * 6, 22, "#ffffff", 500, "center", -0.2);
    g.globalAlpha = 1;
  }

  // browser content
  const contentA = prog(T, TX.content[0], TX.content[1], ease.out) * (1 - clamp((T - (TX.close[0] - 0.05)) / 0.16));
  if (contentA > 0.002) {
    const x = NOTCH.cx - w / 2;
    g.save();
    rr(g, x, -40, w, h + 40, [0, 0, r, r] as unknown as number);
    g.clip();
    g.globalAlpha = contentA;
    g.translate(PANEL.x, 0);
    const tab = activeTab(T);
    drawChrome(g, tab, pressState(T));
    const pc = pageCanvas(tab, a);
    g.drawImage(pc, 0, PAGE_Y, PANEL.w, PANEL.h - PAGE_Y);
    g.restore();
    g.globalAlpha = 1;
  }
}

/* ================================================================ cursor */

// [time, worldX, worldY]; clicks are separate. Glides are 0.4–1s, ease-in-out.
const CUR_KEYS: [number, number, number][] = [
  [18.05, 1040, 430],
  [19.1, 1062, 34],
  [19.9, 1060, 36],
  [20.95, 1100, 360],
  [22.0, 1100, 360],
  [22.44, tabCenter(2).x + 10, tabCenter(2).y + 4],
  [22.72, tabCenter(2).x + 10, tabCenter(2).y + 4],
  [23.14, tabCenter(3).x + 10, tabCenter(3).y + 4],
  [23.42, tabCenter(3).x + 10, tabCenter(3).y + 4],
  [23.84, tabCenter(4).x + 10, tabCenter(4).y + 4],
  [24.05, tabCenter(4).x + 10, tabCenter(4).y + 4],
  [24.54, chevronCenter().x + 4, chevronCenter().y + 4],
  [24.85, chevronCenter().x + 4, chevronCenter().y + 4],
  [25.7, 1640, 420],
];
const CLICKS = [TX.click, ...TX.tabClicks, TX.chevClick];

function cursorAt(T: number) {
  const k = CUR_KEYS;
  if (T <= k[0]![0]) return { x: k[0]![1], y: k[0]![2] };
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i]!;
    const b = k[i + 1]!;
    if (T <= b[0]) {
      const u = ease.inOut(clamp((T - a[0]) / (b[0] - a[0])));
      return { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u) };
    }
  }
  const l = k[k.length - 1]!;
  return { x: l[1], y: l[2] };
}

let ARROW_P: Path2D | null = null;
const arrow = () => (ARROW_P ??= new Path2D("M0 0 L0 17.2 L4.1 13.3 L6.9 19.9 L9.7 18.7 L7 12.2 L12.6 12.2 Z"));

function drawCursor(g: G, T: number, c: Cam) {
  const alpha = clamp((T - 18.05) / 0.2) * (1 - clamp((T - 25.2) / 0.45));
  if (alpha <= 0.002) return;
  const p = cursorAt(T);
  const s = toScreen(c, p.x, p.y);
  let press = 0;
  CLICKS.forEach((ct) => {
    const d = T - ct;
    if (d > -0.08 && d < 0.2) press = Math.max(press, d < 0 ? 1 + d / 0.08 : 1 - d / 0.2);
  });
  const k = 4.0 * (1 - 0.12 * press); // oversized: ~80px tall
  g.setTransform(k, 0, 0, k, s.x, s.y);
  g.globalAlpha = alpha;
  g.shadowColor = "rgba(0,0,0,0.45)";
  g.shadowBlur = 14;
  g.shadowOffsetY = 5;
  g.fillStyle = "#000000";
  g.fill(arrow());
  g.shadowColor = "transparent";
  g.lineJoin = "round";
  g.lineWidth = 1.25;
  g.strokeStyle = "#ffffff";
  g.stroke(arrow());
  g.globalAlpha = 1;
}

/* ================================================================ checklist */

const CLAIMS = [
  "a real browser, inside your notch",
  "up to 8 tabs that survive a restart",
  "ad & tracker blocking built in",
  "cinema mode for video",
  "no data collected. no subscription.",
];

function drawChecklist(g: G, T: number) {
  if (T < TX.checkHead - 0.1) return;
  const hu = clamp((T - TX.checkHead) / 0.9);
  const he = ease.outQuint(hu);
  g.globalAlpha = clamp(hu / 0.5);
  text(g, "notchbrowser", 960, 292 + (1 - he) * 40, 88, "#ffffff", 500, "center", -2.4);
  g.globalAlpha = 1;
  const size = 46;
  let maxW = 0;
  CLAIMS.forEach((c) => (maxW = Math.max(maxW, measure(g, c, size, 400))));
  const x0 = 960 - (maxW + 76) / 2;
  CLAIMS.forEach((c, i) => {
    const t0 = TX.check0 + i * TX.checkEach;
    const u = clamp((T - t0) / 0.8);
    if (u <= 0) return;
    const y = 432 + i * 90;
    const e = ease.outQuint(u);
    g.globalAlpha = clamp(u / 0.4);
    text(g, c, x0 + 76 + (1 - e) * 60, y, size, "#ededef", 400);
    // ring draws on
    const ru = ease.inOut(clamp((T - t0) / 0.6));
    const cx = x0 + 24;
    g.beginPath();
    g.arc(cx, y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ru);
    g.strokeStyle = ORANGE;
    g.lineWidth = 3.5;
    g.lineCap = "round";
    g.stroke();
    // tick draws on
    const tu = ease.out(clamp((T - t0 - 0.38) / 0.34));
    if (tu > 0) {
      const pts: [number, number][] = [
        [cx - 10, y + 1],
        [cx - 3, y + 8],
        [cx + 11, y - 8],
      ];
      const l1 = Math.hypot(7, 7);
      const l2 = Math.hypot(14, 16);
      const L = (l1 + l2) * tu;
      g.beginPath();
      g.moveTo(pts[0]![0], pts[0]![1]);
      if (L <= l1) {
        g.lineTo(pts[0]![0] + 7 * (L / l1), pts[0]![1] + 7 * (L / l1));
      } else {
        g.lineTo(pts[1]![0], pts[1]![1]);
        const f = (L - l1) / l2;
        g.lineTo(pts[1]![0] + 14 * f, pts[1]![1] - 16 * f);
      }
      g.strokeStyle = "#ffffff";
      g.lineWidth = 4;
      g.lineJoin = "round";
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}

/* ================================================================ frame */

function drawFilm(g: G, T: number, a: Assets) {
  const c = camAt(T);
  setCam(g, c);
  drawDesktop(g, a, T);
  drawWindows(g, a, T, c);

  // text beats (authored in text-frame px)
  const textAlpha = 1 - prog(T, TX.textOut[0], TX.textOut[1], ease.inOut);
  if (T < TX.textOut[1]) {
    setTextFrame(g, c);
    const sh = prog(T, TX.headShrink[0], TX.headShrink[1], ease.inOut);
    const sc = lerp(1, 56 / 96, sh);
    const ty = lerp(540, 452, sh);
    g.save();
    g.globalAlpha = textAlpha;
    g.translate(960, ty);
    g.scale(sc, sc);
    g.translate(-960, -540);
    wordsLine(g, ["in", "the", "ai", "era,", "the", "hard", "part", "is"], 960, 540, 96, T, TX.headWord0, TX.headWordEach, TX.headWipe, WHITE, null);
    g.restore();
    const la = prog(T, TX.listIn[0], TX.listIn[1], ease.out) * textAlpha;
    if (la > 0.002) drawList(g, a, T, la);
  }
  if (T > TX.line1 - 0.1 && T < TX.text2Out + 0.9) {
    setTextFrame(g, c);
    wordsLine(g, ["don't", "make", "your", "browser"], 960, 482, 104, T, TX.line1, 0.12, TX.wipe1, WHITE, TX.text2Out);
    wordsLine(g, ["one", "of", "them"], 960, 604, 104, T, TX.line2, 0.14, TX.wipe2, ORANGE, TX.text2Out + 0.14);
  }

  setCam(g, c);
  drawNotch(g, a, T);
  drawChecklist(g, T);

  drawCursor(g, T, c);
  g.setTransform(1, 0, 0, 1, 0, 0);
}

/* ================================================================ motion blur */

function probe(T: number): number[] {
  const c = camAt(T);
  const pts: number[] = [];
  const push = (p: { x: number; y: number }) => pts.push(p.x, p.y);
  push(toScreen(c, 200, 150));
  push(toScreen(c, 1720, 930));
  WINDOWS.forEach((_, i) => {
    const st = winDepth(T, i);
    if (!st || st.alpha < 0.05) {
      pts.push(0, 0, 0, 0);
      return;
    }
    const r = winRect(c, i, st.d);
    push(toScreen(c, r.x, r.y));
    push(toScreen(c, r.x + r.w, r.y + r.h));
  });
  const listOn = T > TX.listIn[0] && T < TX.textOut[1];
  pts.push(0, listOn ? listPos(T) * ROW * (c.z / TEXT_ZOOM) : 0);
  const open = prog(T, TX.open[0], TX.open[1], ease.inOut) - prog(T, TX.close[0], TX.close[1], ease.inOut);
  const pw = lerp(PILL.w, PANEL.w, open);
  const ph = lerp(PILL.h, PANEL.h, open);
  push(toScreen(c, NOTCH.cx + pw / 2, ph));
  if (T > 18 && T < 25.8) push(toScreen(c, cursorAt(T).x, cursorAt(T).y));
  else pts.push(0, 0);
  return pts;
}

const HALF = 0.25 / 30;

function samples(T: number) {
  const a = probe(T - HALF);
  const b = probe(T + HALF);
  let m = 0;
  for (let i = 0; i < a.length; i += 2) {
    const d = Math.hypot(a[i]! - b[i]!, a[i + 1]! - b[i + 1]!);
    if (d > m) m = d;
  }
  return m < 3 ? 1 : Math.ceil(m / 3);
}

export const FILM: Film = { draw: drawFilm, samples };

export type { Ease };
