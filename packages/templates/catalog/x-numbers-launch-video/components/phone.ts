/**
 * The iPhone and every screen shown on it. Everything inside the phone is laid
 * out in iPhone points (393 × 852 screen); the caller supplies the scale.
 */
import { clamp, ease, lerp, prog, track, type Assets, type G } from "./core";
import {
  circle,
  drawX,
  icon,
  iconDialpad,
  iconGear,
  iconUnread,
  measure,
  richLine,
  rr,
  statusBar,
  text,
  toggle,
  verified,
  xWidth,
} from "./draw";

export const SCREEN_W = 393;
export const SCREEN_H = 852;
export const BEZEL = 13.5;
export const PHONE_W = SCREEN_W + BEZEL * 2; // 420
export const PHONE_H = SCREEN_H + BEZEL * 2; // 879

export interface PhoneXf {
  cx: number;
  top: number;
  s: number;
}

/** Screen-space position of a point given in screen points. */
export function toScreen(p: PhoneXf, x: number, y: number) {
  const left = p.cx - (PHONE_W / 2) * p.s + BEZEL * p.s;
  const top = p.top + BEZEL * p.s;
  return { x: left + x * p.s, y: top + y * p.s };
}

export function drawPhone(g: G, p: PhoneXf, dark: boolean, screen: (g: G) => void) {
  g.save();
  g.translate(p.cx - (PHONE_W / 2) * p.s, p.top);
  g.scale(p.s, p.s);

  // Side buttons
  g.fillStyle = dark ? "#5a5a5c" : "#3a3a3c";
  rr(g, -2.2, 175, 3, 30, 1.5);
  g.fill();
  rr(g, -2.2, 235, 3, 58, 1.5);
  g.fill();
  rr(g, -2.2, 305, 3, 58, 1.5);
  g.fill();
  rr(g, PHONE_W - 0.8, 265, 3, 90, 1.5);
  g.fill();

  // Titanium band
  const band = g.createLinearGradient(0, 0, PHONE_W, 0);
  if (dark) {
    band.addColorStop(0, "#8d8d90");
    band.addColorStop(0.08, "#4a4a4d");
    band.addColorStop(0.5, "#3a3a3c");
    band.addColorStop(0.92, "#4a4a4d");
    band.addColorStop(1, "#8d8d90");
  } else {
    band.addColorStop(0, "#5b5b5e");
    band.addColorStop(0.06, "#2c2c2e");
    band.addColorStop(0.5, "#242426");
    band.addColorStop(0.94, "#2c2c2e");
    band.addColorStop(1, "#5b5b5e");
  }
  rr(g, 0, 0, PHONE_W, PHONE_H, 69);
  g.fillStyle = band;
  g.fill();
  // Black bezel
  rr(g, 2.6, 2.6, PHONE_W - 5.2, PHONE_H - 5.2, 66.5);
  g.fillStyle = "#050505";
  g.fill();
  if (dark) {
    g.strokeStyle = "rgba(255,255,255,0.10)";
    g.lineWidth = 0.8;
    g.stroke();
  }

  // Screen
  g.save();
  g.translate(BEZEL, BEZEL);
  rr(g, 0, 0, SCREEN_W, SCREEN_H, 55);
  g.clip();
  g.fillStyle = dark ? "#000" : "#fff";
  g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  screen(g);
  // Dynamic island (+ camera lens)
  g.fillStyle = "#000";
  rr(g, 136, 15, 121, 35, 17.5);
  g.fill();
  g.fillStyle = "#101626";
  circle(g, 238.5, 32.5, 5);
  g.fill();
  g.fillStyle = "#26305a";
  circle(g, 238.5, 32.5, 2.4);
  g.fill();
  g.restore();

  g.restore();
}

/* ------------------------------------------------------------ light chat -- */

const ROWS = [
  { img: "nikita", name: "Nikita Bier", msg: "It’s like a better version of a phone n…", time: "1d", bold: true },
  { img: "nico", name: "Nico", msg: "Okay I finished the X number trays", time: "2h" },
  { img: "alex", name: "alex", msg: "Unfollow me so I can test the number…", time: "2h" },
  { img: "anton", name: "Anton", msg: "All of the infra is built, let’s start test…", time: "1h", pin: true },
  { img: "", name: "Aditya", msg: "Yoo, thank you Benji!", time: "1h" },
  { img: "", name: "Alex Chen", msg: "Sent a voice message", time: "3h" },
  { img: "", name: "Maya", msg: "See you tomorrow", time: "5h" },
];

function avatar(g: G, a: Assets, key: string, x: number, y: number, r: number, seed = 0) {
  g.save();
  circle(g, x, y, r);
  g.clip();
  const im = a.img[key];
  if (im) {
    g.drawImage(im, x - r, y - r, r * 2, r * 2);
  } else {
    const gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
    gr.addColorStop(0, seed ? "#7a5c48" : "#6b7a8f");
    gr.addColorStop(1, seed ? "#3b2a22" : "#2d3440");
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.restore();
}

export interface LightChatOpts {
  scroll?: number;
  hideAll?: boolean;
  allPress?: number;
}

export function lightChat(g: G, a: Assets, o: LightChatOpts = {}) {
  const sc = o.scroll ?? 0;
  g.save();
  g.translate(0, -sc);
  avatar(g, a, "me", 32, 83.5, 16);
  text(g, "Chat", 196.5, 83.5, 17.5, "#0f1419", { weight: 700, align: "center" });
  if (!o.hideAll) {
    const pr = o.allPress ?? 0;
    g.fillStyle = pr > 0 ? `rgba(255,255,255,1)` : "#fff";
    rr(g, 315, 67, 60, 34, 17);
    g.fill();
    g.strokeStyle = "#dcdcdc";
    g.lineWidth = 1;
    g.stroke();
    text(g, "All", 332, 84.5, 15.5, "#0f1419", { weight: 500 });
    icon(g, "chevronDown", 360, 85, 13, "#0f1419", 2.2);
  }
  g.fillStyle = "#eff1f1";
  rr(g, 16, 115, 361, 39, 19.5);
  g.fill();
  icon(g, "search", 172, 134.5, 18, "#5b6066", 2);
  text(g, "Search", 186, 134.5, 16.5, "#5b6066");

  ROWS.forEach((r, i) => {
    const y = 194 + i * 83;
    avatar(g, a, r.img, 43, y + 12, 27, i % 2);
    text(g, r.name, 86, y, 15, "#0f1419", { weight: 600 });
    const nw = measure(g, r.name, 15, 600);
    verified(g, 86 + nw + 12, y, 15);
    text(g, r.time, 370, y, 14.5, "#536471", { align: "right" });
    text(g, r.msg, 86, y + 24, 14.5, r.bold ? "#0f1419" : "#536471", { weight: r.bold ? 600 : 400 });
    if (r.bold) {
      g.fillStyle = "#1d9bf0";
      circle(g, 367, y + 24, 3.6);
      g.fill();
    }
  });
  g.restore();
  statusBar(g, false);
}

/* ------------------------------------------------------------ the menu -- */

export const MENU_W = 196;
export const MENU_H = 332;
export const NUMBER_INS = 46;

export interface MenuOpts {
  /** 0..1 open progress (size). */
  open: number;
  /** Per-item entrance, time-driven. */
  T: number;
  openStart: number;
  /** Extra height for the inserted "Number" row, 0..NUMBER_INS. */
  ins: number;
  numberIcon: number;
  numberChars: number;
  /** Sweep highlight centre across the Number row, in menu points (NaN = none). */
  sweep: number;
  shadow?: number;
}

/**
 * Draws the menu in points with its top-right corner at (0,0)… no: top-left at
 * (0,0). The caller has translated/scaled. Opening grows from the top-right.
 */
export function drawMenu(g: G, o: MenuOpts) {
  const ins = o.ins;
  const H = MENU_H + ins;
  const w = MENU_W * lerp(0.35, 1, o.open);
  const h = H * lerp(0.12, 1, o.open);
  const x0 = MENU_W - w;

  g.save();
  g.globalAlpha *= clamp(o.open * 4);
  g.shadowColor = `rgba(0,0,0,${0.12 * (o.shadow ?? 1)})`;
  g.shadowBlur = 30;
  g.shadowOffsetY = 8;
  g.fillStyle = "#fdfdfd";
  rr(g, x0, 0, w, h, 24);
  g.fill();
  g.shadowColor = "transparent";
  g.strokeStyle = "rgba(0,0,0,0.07)";
  g.lineWidth = 0.8;
  g.stroke();
  rr(g, x0, 0, w, h, 24);
  g.clip();

  const items: Array<{ y: number; label: string; draw: (x: number, y: number) => void }> = [
    { y: 30, label: "All", draw: (x, y) => icon(g, "bubble", x, y, 21, "#0f1419", 1.9) },
    { y: 70, label: "Unread", draw: (x, y) => iconUnread(g, x, y, 21, "#0f1419", 1.9) },
    { y: 112, label: "Direct", draw: (x, y) => icon(g, "user", x, y, 21, "#0f1419", 1.9) },
    { y: 155, label: "Groups", draw: (x, y) => icon(g, "users", x, y, 21, "#0f1419", 1.9) },
    { y: 206, label: "Requests", draw: (x, y) => icon(g, "bubbleIn", x, y, 21, "#0f1419", 1.9) },
    { y: 248 + ins, label: "Settings", draw: (x, y) => iconGear(g, x, y, 21, "#0f1419", 1.9) },
    { y: 302 + ins, label: "Mark All Read", draw: (x, y) => icon(g, "markRead", x, y, 21, "#0f1419", 1.9) },
  ];

  // Number row highlight sweep
  if (!Number.isNaN(o.sweep) && ins > 1) {
    const ny = 249;
    const gr = g.createLinearGradient(o.sweep - 60, 0, o.sweep + 60, 0);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(0.5, "rgba(0,0,0,0.055)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, ny - 20, MENU_W, 40);
  }

  items.forEach((it, i) => {
    const p = ease.out(clamp((o.T - (o.openStart + i * 0.035)) / 0.42));
    const dx = (1 - p) * 70;
    g.save();
    g.globalAlpha *= clamp(p * 1.6);
    it.draw(x0 + 31 + dx, it.y);
    text(g, it.label, x0 + 55 + dx, it.y + 0.5, 15.5, "#0f1419");
    if (i === 0) icon(g, "check", x0 + 168 + dx, it.y, 19, "#0f1419", 2.1);
    g.restore();
  });
  // dividers
  g.fillStyle = "#ededed";
  g.fillRect(16, 178, 164, 0.8);
  g.fillRect(16, 274 + ins, 164, 0.8);

  // Inserted Number row
  if (ins > 0.5) {
    const ny = 249;
    g.save();
    g.globalAlpha *= o.numberIcon;
    iconDialpad(g, 31, ny, 21, "#000");
    g.restore();
    const label = "Number".slice(0, o.numberChars);
    if (label) text(g, label, 54, ny + 0.5, 15.5, "#000");
  }
  g.restore();
}

/* ------------------------------------------------------ digit roller -- */

let reelCanvas: OffscreenCanvas | null = null;
let reelG: G | null = null;

/**
 * Slot-machine digits. `pos[i]` is the continuous reel position for slot i
 * (integer = at rest on digit pos mod 10). Rows below show value+1.
 */
export function drawReels(
  g: G,
  cx: number,
  cy: number,
  slotW: number,
  size: number,
  pos: number[],
  color: string,
  jitter: number[] = [],
) {
  const rowH = size * 1.16;
  const n = 9; // 4 + dash + 4
  const w = Math.ceil(slotW * n + size);
  const h = Math.ceil(rowH * 3);
  if (!reelCanvas || reelCanvas.width < w || reelCanvas.height < h) {
    reelCanvas = new OffscreenCanvas(Math.max(w, 1200), Math.max(h, 360));
    reelG = reelCanvas.getContext("2d") as G;
  }
  const rg = reelG!;
  rg.setTransform(1, 0, 0, 1, 0, 0);
  rg.globalCompositeOperation = "source-over";
  rg.clearRect(0, 0, reelCanvas.width, reelCanvas.height);
  const mx = w / 2;
  const my = h / 2;
  let d = 0;
  for (let i = 0; i < n; i++) {
    const x = mx + (i - 4) * slotW;
    if (i === 4) {
      text(rg, "-", x, my, size, color, { weight: 500, align: "center" });
      continue;
    }
    const p = pos[d]!;
    const off = jitter[d] ?? 0;
    const base = Math.floor(p);
    for (let r = base - 1; r <= base + 2; r++) {
      const y = my + (r - p) * rowH + off;
      const v = ((r % 10) + 10) % 10;
      text(rg, String(v), x, y, size, color, { weight: 450, align: "center" });
    }
    d++;
  }
  // vertical fade mask
  rg.globalCompositeOperation = "destination-in";
  const gr = rg.createLinearGradient(0, 0, 0, h);
  const f = (y: number) => y / h;
  gr.addColorStop(0, "rgba(0,0,0,0)");
  gr.addColorStop(clamp(f(my - size * 0.78)), "rgba(0,0,0,0)");
  gr.addColorStop(clamp(f(my - size * 0.42)), "rgba(0,0,0,1)");
  gr.addColorStop(clamp(f(my + size * 0.4)), "rgba(0,0,0,1)");
  gr.addColorStop(clamp(f(my + size * 0.95)), "rgba(0,0,0,0)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  rg.fillStyle = gr;
  rg.fillRect(0, 0, w, h);
  rg.globalCompositeOperation = "source-over";
  g.drawImage(reelCanvas!, 0, 0, w, h, cx - mx, cy - my, w, h);
}

const FINAL = [3, 5, 5, 5, 0, 1, 6, 2];

/** Reel positions for the 3555-0162 roll: t0 = start, t1 = first landing. */
export function reelState(T: number, t0: number, t1: number) {
  const pos: number[] = [];
  const jit: number[] = [];
  FINAL.forEach((f, i) => {
    const land = t1 + i * 0.04;
    const p = clamp((T - t0) / (land - t0));
    const e = 1 - Math.pow(1 - p, 3.2);
    const down = i % 2 === 0;
    const start = down ? 20 : 0;
    const end = down ? f : 10 + f;
    pos.push(lerp(start, end, e));
    const settle = clamp((T - land) / 0.32);
    jit.push((i % 2 === 0 ? 1 : -1) * 0.1 * Math.sin(settle * Math.PI) * (1 - settle));
  });
  return { pos, jit };
}

/* ------------------------------------------------------- "Your X Number" -- */

export const SHEET_W = 377;
export const SHEET_H = 369;

export interface SheetOpts {
  T: number;
  rollStart: number;
  rollLand: number;
  toggleOn: number;
  togglePress: number;
  placeholder: number;
}

/** Light sheet, drawn with its top-left at (0,0) in points. */
export function drawYourNumberSheet(g: G, o: SheetOpts, shadow = 0) {
  g.save();
  if (shadow > 0) {
    g.shadowColor = `rgba(0,0,0,${0.13 * shadow})`;
    g.shadowBlur = 40;
    g.shadowOffsetY = 10;
  }
  g.fillStyle = "#fdfdfd";
  rr(g, 0, 0, SHEET_W, SHEET_H, 46);
  g.fill();
  g.restore();

  const cx = SHEET_W / 2;
  // Title with the X mark
  const tw1 = measure(g, "Your ", 17, 600);
  const tw2 = measure(g, " Number", 17, 600);
  const xw = xWidth(14);
  const total = tw1 + xw + tw2;
  let x = cx - total / 2;
  text(g, "Your ", x, 36, 17, "#0f1419", { weight: 600 });
  x += tw1;
  drawX(g, x + xw / 2, 36, 14, "#0f1419");
  x += xw;
  text(g, " Number", x, 36, 17, "#0f1419", { weight: 600 });

  text(g, "Your number lets anyone message or call you.", cx, 96, 14.2, "#707070", { align: "center" });
  text(g, "Only share with people you want contacting you.", cx, 116, 14.2, "#707070", { align: "center" });

  // Number field
  g.save();
  g.shadowColor = "rgba(0,0,0,0.05)";
  g.shadowBlur = 16;
  g.fillStyle = "#f1f1f1";
  rr(g, 24, 150, 331, 54, 15);
  g.fill();
  g.restore();
  const st = reelState(o.T, o.rollStart, o.rollLand);
  if (o.placeholder > 0) {
    g.save();
    g.globalAlpha *= o.placeholder;
    for (let i = 0; i < 9; i++) {
      text(g, i === 4 ? "-" : "0", cx + (i - 4) * 30.6, 178, 22.5, "#b8b8b8", { weight: 500, align: "center" });
    }
    g.restore();
  }
  if (o.placeholder < 1) {
    g.save();
    g.globalAlpha *= 1 - o.placeholder;
    drawReels(g, cx, 178, 30.6, 23, st.pos, "#0f1419", st.jit.map((j) => j * 23));
    g.restore();
  }

  text(g, "Enabled", 32, 252, 14.5, "#0f1419", { weight: 600 });
  toggle(g, 290, 238.5, 62, 27, o.toggleOn, o.togglePress);

  g.fillStyle = "#efefef";
  rr(g, 24, 299, 159, 47, 23.5);
  g.fill();
  icon(g, "refresh", 69, 322.5, 20, "#0f1419", 2.2);
  text(g, "Refresh", 84, 323, 16.5, "#0f1419", { weight: 600 });
  g.fillStyle = "#000";
  rr(g, 196, 299, 159, 47, 23.5);
  g.fill();
  text(g, "Share", 275.5, 323, 16.5, "#fff", { weight: 600, align: "center" });
}

/* ------------------------------------------------------------ dark DM -- */

export interface DarkOpts {
  T: number;
  /** Bottom "doesn't follow you" block alpha. */
  gate: number;
  enterPress: number;
  /** Keypad sheet top in points (>= 852 hides it). */
  sheetTop: number;
  usedBottom: number;
  usedTop: number;
  love: { y: number; a: number };
  yo: { y: number; a: number };
}

const PRESSES = [19.5, 19.9, 20.2, 20.6, 20.9, 21.2, 21.5, 21.9];
const TYPED = "35450169";

function darkHeader(g: G, a: Assets) {
  statusBar(g, true);
  icon(g, "back", 20.5, 81, 22, "#fff", 2);
  avatar(g, a, "benji", 65, 81, 15.5);
  text(g, "Benji Taylor", 93, 73.5, 16, "#e7e9ea", { weight: 600 });
  const nw = measure(g, "Benji Taylor", 16, 600);
  verified(g, 93 + nw + 11.5, 73.5, 15);
  // X badge
  const bx = 93 + nw + 22;
  g.fillStyle = "#16181c";
  rr(g, bx, 66, 15, 15, 2.5);
  g.fill();
  g.strokeStyle = "#333639";
  g.lineWidth = 0.7;
  g.stroke();
  drawX(g, bx + 7.5, 73.5, 9, "#e7e9ea");
  icon(g, "lock", 100, 91.5, 12.5, "#71767b", 2);
  text(g, "Encrypted", 108.5, 92, 13, "#71767b");
  icon(g, "phone", 318, 81, 19, "#71767b", 1.6);
  icon(g, "video", 364, 81, 22, "#71767b", 1.6);

  text(g, "Joined July 2014", 196.5, 135.5, 15.5, "#8b8f94", { align: "center" });
  text(g, "217K Followers", 196.5, 158.5, 15.5, "#8b8f94", { align: "center" });
  g.fillStyle = "#1c1d1f";
  rr(g, 131, 180, 131, 37, 18.5);
  g.fill();
  text(g, "View profile", 196.5, 199, 15.5, "#e7e9ea", { weight: 600, align: "center" });
}

function inputBar(g: G) {
  g.fillStyle = "#1c1d1f";
  circle(g, 30, 742, 21.5);
  g.fill();
  icon(g, "plus", 30, 742, 22, "#e7e9ea", 2);
  rr(g, 59, 720.5, 326, 43, 21.5);
  g.fill();
  text(g, "Encrypted", 75, 742.5, 17, "#6e7176");
  icon(g, "mic", 362, 742, 19, "#e7e9ea", 1.9);
  // tab bar
  const xs = [39, 118, 196, 274, 353];
  icon(g, "home", xs[0]!, 796, 22, "#e7e9ea", 1.9);
  g.fillStyle = "#1d9bf0";
  circle(g, xs[0]! + 7.5, 785.5, 3);
  g.fill();
  icon(g, "search", xs[1]!, 796, 22, "#e7e9ea", 1.9);
  icon(g, "grok", xs[2]!, 797, 21, "#e7e9ea", 1.9);
  icon(g, "bell", xs[3]!, 796, 22, "#e7e9ea", 1.9);
  g.fillStyle = "#e7e9ea";
  const bub = new Path2D("M7.9 20A9 9 0 1 0 4 16.1L2 22Z");
  g.save();
  g.translate(xs[4]! - 11, 796 - 11);
  g.scale(22 / 24, 22 / 24);
  g.fill(bub);
  g.restore();
  for (const bx of [xs[2]!, xs[3]!]) {
    g.fillStyle = "#1d9bf0";
    circle(g, bx + 12, 785, 7.5);
    g.fill();
    g.strokeStyle = "#000";
    g.lineWidth = 1.2;
    g.stroke();
    text(g, "1", bx + 12, 785.5, 10.5, "#fff", { weight: 600, align: "center" });
  }
}

function keypadSheet(g: G, T: number, top: number) {
  g.save();
  g.translate(8, top);
  g.fillStyle = "#151516";
  rr(g, 0, 0, 377, 563, 40);
  g.fill();
  const cx = 188.5;
  // title
  const tw1 = measure(g, "Enter ", 17, 600);
  const tw2 = measure(g, " Number", 17, 600);
  const xw = xWidth(14);
  let x = cx - (tw1 + xw + tw2) / 2;
  text(g, "Enter ", x, 34, 17, "#fff", { weight: 600 });
  x += tw1;
  drawX(g, x + xw / 2, 34, 14, "#fff");
  x += xw;
  text(g, " Number", x, 34, 17, "#fff", { weight: 600 });
  g.fillStyle = "#2a2a2c";
  g.fillRect(23, 61, 331, 0.8);
  richLine(
    g,
    [
      { s: "Enter ", color: "#8b8f94" },
      { s: "@benjitaylor’s", color: "#fff", weight: 600 },
      { s: " X Number to contact them.", color: "#8b8f94" },
    ],
    cx,
    110,
    13.5,
  );
  g.fillStyle = "#262628";
  rr(g, 23, 137, 331, 51, 13);
  g.fill();

  const typed = PRESSES.filter((p) => T >= p + 0.1).length;
  let slot = 0;
  for (let i = 0; i < 9; i++) {
    const sx = 47.7 + i * 35.2;
    if (i === 4) {
      g.fillStyle = "#fff";
      g.fillRect(sx - 7.5, 161.5, 15, 1.8);
      continue;
    }
    if (slot < typed) {
      text(g, TYPED[slot]!, sx, 162.5, 18, "#fff", { weight: 500, align: "center" });
    } else if (slot === typed) {
      g.fillStyle = "#fff";
      g.fillRect(sx - 0.6, 154, 1.3, 16);
    } else {
      text(g, "0", sx, 162.5, 18, "#48484a", { align: "center" });
    }
    slot++;
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "<"];
  keys.forEach((k, i) => {
    const kx = cx + ((i % 3) - 1) * 124;
    const ky = 244 + Math.floor(i / 3) * 62.7;
    let sc = 1;
    let ha = 0;
    let hr = 0;
    PRESSES.forEach((p, j) => {
      if (TYPED[j] !== k) return;
      if (T < p || T > p + 0.5) return;
      sc = Math.min(sc, track(T, [
        [p, 1],
        [p + 0.08, 0.45],
        [p + 0.2, 1],
      ]));
      hr = Math.max(hr, track(T, [
        [p + 0.07, 3],
        [p + 0.18, 21],
      ]));
      ha = Math.max(ha, T < p + 0.07 ? 0 : 1 - clamp((T - (p + 0.3)) / 0.1));
    });
    if (ha > 0) {
      g.fillStyle = `rgba(62,62,66,${ha})`;
      circle(g, kx, ky, hr);
      g.fill();
    }
    g.save();
    g.translate(kx, ky);
    g.scale(sc, sc);
    if (k === "<") icon(g, "chevronLeft", 0, 0, 22, "#fff", 2.2);
    else text(g, k, 0, k === "." ? 4 : 0.5, 22, "#fff", { weight: 600, align: "center" });
    g.restore();
  });

  g.fillStyle = "#262628";
  rr(g, 23, 492, 331, 45, 22.5);
  g.fill();
  text(g, "Enter", cx, 515, 17, "#8b8f94", { weight: 500, align: "center" });
  g.restore();
}

export function darkChat(g: G, a: Assets, o: DarkOpts) {
  darkHeader(g, a);

  if (o.usedTop > 0) {
    g.save();
    g.globalAlpha *= o.usedTop;
    text(g, "Today", 196.5, 260, 14, "#71767b", { align: "center" });
    richLine(
      g,
      [
        { s: "You used ", color: "#8b8f94" },
        { s: "@benjitaylor’s", color: "#e7e9ea", weight: 600 },
        { s: " X Number", color: "#8b8f94" },
      ],
      196.5,
      293,
      14.3,
    );
    text(g, "You can now message and call them", 196.5, 313, 14.3, "#8b8f94", { align: "center" });
    g.restore();
  }

  if (o.love.a > 0) {
    g.save();
    g.globalAlpha *= o.love.a;
    const w = measure(g, "Love your work", 16.5) + 32;
    g.fillStyle = "#1d9bf0";
    rr(g, 372 - w, o.love.y - 19.5, w, 39, 19.5);
    g.fill();
    text(g, "Love your work", 372 - w / 2, o.love.y + 0.5, 16.5, "#fff", { align: "center" });
    g.restore();
  }
  if (o.yo.a > 0) {
    g.save();
    g.globalAlpha *= o.yo.a;
    const w = measure(g, "Yoooo! Thank you", 16.5) + 32;
    g.fillStyle = "#2f3336";
    rr(g, 21, o.yo.y - 19.5, w, 39, 19.5);
    g.fill();
    text(g, "Yoooo! Thank you", 21 + w / 2, o.yo.y + 0.5, 16.5, "#e7e9ea", { align: "center" });
    g.restore();
  }

  if (o.gate > 0) {
    g.save();
    g.globalAlpha *= o.gate;
    richLine(
      g,
      [
        { s: "@benjitaylor", color: "#e7e9ea", weight: 600 },
        { s: " doesn’t follow you. If you know their", color: "#8b8f94" },
      ],
      196.5,
      612,
      14.3,
    );
    text(g, "X Number you can reach their priority inbox.", 196.5, 631, 14.3, "#8b8f94", { align: "center" });
    const sc = 1 - 0.06 * o.enterPress;
    g.save();
    g.translate(196.5, 672);
    g.scale(sc, sc);
    g.fillStyle = "#fff";
    rr(g, -63, -15.5, 126, 31, 15.5);
    g.fill();
    icon(g, "keypadBox", -46, 0, 14, "#000", 2);
    text(g, "Enter X Number", 7, 0.5, 13.5, "#0f1419", { weight: 600, align: "center" });
    g.restore();
    g.restore();
  }

  if (o.usedBottom > 0) {
    g.save();
    g.globalAlpha *= o.usedBottom;
    richLine(
      g,
      [
        { s: "You used ", color: "#8b8f94" },
        { s: "@benjitaylor’s", color: "#e7e9ea", weight: 600 },
        { s: " X Number.", color: "#8b8f94" },
      ],
      196.5,
      672,
      14.3,
    );
    text(g, "You can now message and call them.", 196.5, 692, 14.3, "#8b8f94", { align: "center" });
    g.restore();
  }

  inputBar(g);

  if (o.sheetTop < SCREEN_H) keypadSheet(g, o.T, o.sheetTop);
}

export { prog };
