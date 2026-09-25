/**
 * NotchBrowser — the browser panel that drops out of the notch, rebuilt from
 * the post's screen recording: pure black shell, a row of dark tabs with a
 * collapse chevron, a pill URL bar, and the page underneath.
 *
 * Geometry is in world (desktop) pixels. The panel hangs from the top edge,
 * centred on the notch.
 */
import type { Assets, G } from "./core";
import { avatar, bar, circle, ellipsize, fillRR, glyph, icon, line, measure, rr, strokeRR, text } from "./ui";

export const NOTCH = { cx: 957, w: 314, h: 46, r: 14 };
export const PILL = { w: 440, h: 96, r: 44 };
export const PANEL = { x: 350, w: 1220, h: 820, r: 40 };

export const PAGE_Y = 170;
export const PAGE_W = PANEL.w;
export const PAGE_H = PANEL.h - PAGE_Y;

export const TABS = [
  { title: "Home • Threads", url: "https://www.threads.com/" },
  { title: "Dia | The browser…", url: "https://www.diabrowser.com/" },
  { title: "You need to try o…", url: "https://www.reddit.com/r/codex/comments/1of4x2/you_need_to_try_opus_55/" },
  { title: "govijr", url: "https://github.com/govijr" },
  { title: "Google", url: "https://www.google.com/" },
];
const TAB_X0 = 24;
const TAB_W = 208;
const TAB_GAP = 10;
const TAB_Y = 42;
const TAB_H = 48;
export const CHEVRON_X = 1180;

/** World-space centre of tab i (for the cursor). */
export function tabCenter(i: number) {
  return { x: PANEL.x + TAB_X0 + i * (TAB_W + TAB_GAP) + TAB_W / 2, y: TAB_Y + TAB_H / 2 };
}
export function chevronCenter() {
  return { x: PANEL.x + CHEVRON_X, y: TAB_Y + TAB_H / 2 };
}

/** The black shape: notch → pill → panel, as a rect hanging from y=0. */
export function drawShape(g: G, w: number, h: number, r: number, shadow: number) {
  const x = NOTCH.cx - w / 2;
  if (shadow > 0) {
    g.save();
    g.shadowColor = `rgba(0,0,0,${0.35 * shadow})`;
    g.shadowBlur = 40;
    g.shadowOffsetY = 14;
    rr(g, x, -40, w, h + 40, [0, 0, r, r] as unknown as number);
    g.fillStyle = "#000";
    g.fill();
    g.restore();
  }
  rr(g, x, -40, w, h + 40, [0, 0, r, r] as unknown as number);
  g.fillStyle = "#000";
  g.fill();
}

/* -------------------------------------------------------------- chrome */

export function drawChrome(g: G, active: number, pressed: { tab: number; amt: number }) {
  // tabs
  TABS.forEach((t, i) => {
    const x = TAB_X0 + i * (TAB_W + TAB_GAP);
    const on = i === active;
    const press = pressed.tab === i ? pressed.amt : 0;
    fillRR(g, x, TAB_Y, TAB_W, TAB_H, 11, on ? "#2b2b2e" : press > 0 ? "#222225" : "#141416");
    text(g, ellipsize(g, t.title, TAB_W - 60, 23, 500), x + 16, TAB_Y + TAB_H / 2 + 1, 23, on ? "#ffffff" : "#d9d9de", 500);
    glyph(g, "x", x + TAB_W - 34, TAB_Y + TAB_H / 2 - 10, 20, "#bdbdc4", 2);
  });
  glyph(g, "plus", TAB_X0 + 5 * (TAB_W + TAB_GAP) + 6, TAB_Y + TAB_H / 2 - 12, 24, "#d9d9de", 2);
  const chevPress = pressed.tab === 99 ? pressed.amt : 0;
  if (chevPress > 0) circle(g, CHEVRON_X, TAB_Y + TAB_H / 2, 24, `rgba(255,255,255,${0.14 * chevPress})`);
  glyph(g, "chevUp", CHEVRON_X - 13, TAB_Y + TAB_H / 2 - 13, 26, "#ffffff", 2.2);
  // toolbar
  const ty = 131;
  glyph(g, "chevL", 22, ty - 12, 24, "#e6e6ea", 2);
  glyph(g, "chevR", 50, ty - 12, 24, "#e6e6ea", 2);
  glyph(g, "reload", 82, ty - 10, 21, "#e6e6ea", 2);
  fillRR(g, 118, ty - 23, 980, 46, 23, "#161618");
  strokeRR(g, 118.5, ty - 22.5, 979, 45, 23, "#26262a");
  g.save();
  rr(g, 118, ty - 23, 960, 46, 23);
  g.clip();
  text(g, TABS[active]!.url, 142, ty + 1, 23, "#f2f2f5");
  g.restore();
  glyph(g, "star", 1112, ty - 12, 24, "#e6e6ea", 1.8);
  glyph(g, "eyeOff", 1168, ty - 12, 24, "#e6e6ea", 1.8);
}

/* --------------------------------------------------------------- pages */

function threads(g: G, a: Assets) {
  g.fillStyle = "#101010";
  g.fillRect(0, 0, PAGE_W, PAGE_H);
  // rail
  text(g, "@", 56, 52, 46, "#ffffff", 700, "center");
  fillRR(g, 30, 110, 52, 50, 12, "#1e1e1e");
  glyph(g, "home", 42, 121, 28, "#ffffff", 2);
  ["plus", "search", "send", "heart", "user"].forEach((k, i) => glyph(g, k, 42, 186 + i * 58, 28, "#8a8a8a", 2));
  // header
  text(g, "For you", 190, 56, 32, "#f3f5f7", 700);
  g.beginPath();
  g.arc(1050, 56, 16, 0, Math.PI * 2);
  g.strokeStyle = "#f3f5f7";
  g.lineWidth = 2;
  g.stroke();
  glyph(g, "more", 1038, 44, 24, "#f3f5f7");
  // feed card
  fillRR(g, 150, 100, 940, PAGE_H, 28, "#181818");
  strokeRR(g, 150.5, 100.5, 939, PAGE_H, 28, "#262626");
  const post = (y: number, name: string, time: string, c1: string, c2: string, lines: string[], counts: string[]) => {
    avatar(g, 212, y + 26, 26, c1, c2, name[0]!.toUpperCase());
    text(g, name, 256, y + 12, 24, "#f3f5f7", 700);
    text(g, time, 266 + measure(g, name, 24, 700), y + 12, 24, "#777777");
    glyph(g, "more", 1030, y, 24, "#777777");
    lines.forEach((l, i) => text(g, l, 256, y + 50 + i * 36, 24, "#f3f5f7"));
    const cy = y + 50 + lines.length * 36 + 12;
    const kinds = ["heart", "comment", "repost", "send"];
    let cx = 256;
    kinds.forEach((k, i) => {
      glyph(g, k, cx, cy - 12, 24, "#cccccc", 1.8);
      text(g, counts[i]!, cx + 32, cy, 22, "#cccccc");
      cx += 110;
    });
    return cy + 34;
  };
  let y = 130;
  y = post(y, "saadhjawwadh", "2h", "#3b82f6", "#1e3a8a", ["New macOS 27 beta introduces a segmented brightness and", "volume on screen control."], ["5.1K", "73", "273", "84"]);
  line(g, 150, y, 1090, y, "#262626");
  y = post(y + 26, "jazminli57", "5h", "#f59e0b", "#b45309", [
    "MacMix just passed 1,000 users!",
    "And dozens of you have already upgraded to Studio —",
    "thank you so much for the support. To celebrate:",
    "25% off MacMix Studio · code MACMIX25 · until Oct 7",
  ], ["582", "32", "88", "38"]);
  // image card peeking
  fillRR(g, 256, y + 6, 470, 200, 16, "#e6e3ea");
  text(g, "Every app.", 491, y + 58, 34, "#111111", 700, "center", -0.5);
  text(g, "Its own volume.", 491, y + 98, 34, "#111111", 700, "center", -0.5);
  fillRR(g, 306, y + 130, 370, 90, 18, "#2a1257");
  void a;
}

function reddit(g: G, a: Assets) {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, PAGE_W, PAGE_H);
  glyph(g, "menu", 24, 20, 26, "#1c1c1c", 2);
  icon(g, a, "reddit-icon", 70, 14, 40);
  fillRR(g, 130, 12, 640, 44, 22, "#eaedef");
  fillRR(g, 146, 18, 104, 32, 16, "#ffffff");
  text(g, "r/codex", 158, 35, 20, "#1c1c1c", 600);
  text(g, "Search in r/codex", 268, 35, 21, "#5c6c74");
  fillRR(g, 1080, 12, 110, 44, 22, "#d93900");
  text(g, "Log In", 1135, 35, 20, "#ffffff", 600, "center");
  line(g, 0, 68, PAGE_W, 68, "#e5ebee");
  // post
  const px = 40;
  avatar(g, px + 18, 110, 18, "#5b6af0", "#2f3bb8", "");
  text(g, "r/codex · 2h ago", px + 46, 101, 20, "#1c1c1c", 600);
  text(g, "uptotheright", px + 46, 124, 19, "#5c6c74");
  text(g, "You need to try opus 5.5", px, 178, 40, "#0f1a1c", 700, "left", -0.5);
  fillRR(g, px, 208, 150, 32, 16, "#d6dce0");
  text(g, "Comparison", px + 75, 225, 18, "#1c1c1c", 600, "center");
  const body = [
    "I have 3 20x codex accounts sitting on banked",
    "resets. I had abandoned Claude because opus ate",
    "tokens way too fast. On Tuesday I picked up a 20x",
    "Claude due to the hype.",
    "",
    "so opus 5.5 is",
    "- very fast",
    "- smarter — doesn't overengineer",
  ];
  body.forEach((l, i) => text(g, l, px, 274 + i * 36, 23, "#2a3c42"));
  const vy = 590;
  fillRR(g, px, vy, 130, 46, 23, "#eaedef");
  glyph(g, "arrowUp", px + 12, vy + 11, 24, "#1c1c1c", 2);
  text(g, "239", px + 66, vy + 23, 20, "#1c1c1c", 600, "center");
  fillRR(g, px + 146, vy, 110, 46, 23, "#eaedef");
  glyph(g, "comment", px + 160, vy + 11, 24, "#1c1c1c", 1.8);
  text(g, "135", px + 194, vy + 23, 20, "#1c1c1c", 600);
  fillRR(g, px + 272, vy, 116, 46, 23, "#eaedef");
  text(g, "Share", px + 330, vy + 23, 20, "#1c1c1c", 600, "center");
  // related
  const rx = 740;
  const rel: [string, string, string][] = [
    ["r/codex", "I tried Opus 5.5 and immediately", "remembered why I switched to…"],
    ["r/claude", "Opus 5.5 is honestly amazing", "196 upvotes · 48 comments"],
    ["r/Anthropic", "Opus 5.5", "121 upvotes · 61 comments"],
  ];
  rel.forEach(([s, t1, t2], i) => {
    const y = 300 + i * 124;
    text(g, s, rx, y, 19, "#5c6c74", 600);
    text(g, t1, rx, y + 34, 22, "#0f1a1c", 600);
    text(g, t2, rx, y + 66, 20, "#5c6c74");
  });
  // Google sign-in card
  g.save();
  g.shadowColor = "rgba(0,0,0,0.25)";
  g.shadowBlur = 30;
  g.shadowOffsetY = 8;
  fillRR(g, rx - 10, 88, 450, 170, 12, "#ffffff");
  g.restore();
  text(g, "G", rx + 26, 132, 30, "#4285f4", 700, "center");
  text(g, "Sign in to Reddit with Google", rx + 50, 132, 22, "#1f1f1f", 500);
  glyph(g, "x", rx + 400, 118, 20, "#5f6368", 2);
  fillRR(g, rx + 10, 184, 410, 48, 24, "#0b57d0");
  text(g, "Continue", rx + 215, 208, 21, "#ffffff", 600, "center");
}

function github(g: G, a: Assets) {
  g.fillStyle = "#0d1117";
  g.fillRect(0, 0, PAGE_W, PAGE_H);
  g.fillStyle = "#010409";
  g.fillRect(0, 0, PAGE_W, 116);
  strokeRR(g, 24, 16, 42, 40, 8, "#3d444d");
  glyph(g, "menu", 33, 24, 24, "#9198a1", 2);
  g.save();
  g.filter = "invert(1)";
  icon(g, a, "github-icon", 82, 14, 44);
  g.restore();
  text(g, "govijr", 140, 36, 24, "#f0f6fc", 600);
  [0, 1, 2, 3].forEach((i) => strokeRR(g, 900 + i * 56, 16, 42, 40, 8, "#3d444d"));
  glyph(g, "search", 909, 24, 24, "#9198a1", 2);
  glyph(g, "plus", 965, 24, 24, "#9198a1", 2);
  glyph(g, "circleDash", 1021, 24, 24, "#9198a1", 1.8);
  glyph(g, "more", 1077, 24, 24, "#9198a1", 1.8);
  avatar(g, 1150, 36, 20, "#e8c39e", "#8a5a3c", "");
  const tabs: [string, string][] = [["Overview", ""], ["Repositories", "103"], ["Projects", ""], ["Packages", ""], ["Stars", "63"]];
  let tx = 30;
  tabs.forEach(([t, n], i) => {
    text(g, t, tx, 90, 22, "#f0f6fc", i === 0 ? 600 : 400);
    let w = measure(g, t, 22, i === 0 ? 600 : 400);
    if (n) {
      fillRR(g, tx + w + 10, 76, 50, 28, 14, "#2f3742");
      text(g, n, tx + w + 35, 90, 18, "#f0f6fc", 600, "center");
      w += 60;
    }
    if (i === 0) fillRR(g, tx - 8, 112, w + 16, 4, 2, "#f78166");
    tx += w + 44;
  });
  line(g, 0, 116, PAGE_W, 116, "#3d444d");
  // profile
  const ax = 180;
  const ay = 280;
  const pg = g.createLinearGradient(ax - 128, ay - 128, ax + 128, ay + 128);
  pg.addColorStop(0, "#e9ddcb");
  pg.addColorStop(1, "#b8a48c");
  circle(g, ax, ay, 128, pg);
  g.save();
  g.beginPath();
  g.arc(ax, ay, 128, 0, Math.PI * 2);
  g.clip();
  // sunlit stripes, then a simple head-and-shoulders portrait
  g.globalAlpha = 0.22;
  for (let i = -4; i < 6; i++) fillRR(g, ax - 200 + i * 48, ay - 220, 20, 440, 10, "#ffffff");
  g.globalAlpha = 1;
  const skin = g.createLinearGradient(ax - 60, ay - 80, ax + 60, ay + 40);
  skin.addColorStop(0, "#f3cfae");
  skin.addColorStop(1, "#c98f69");
  g.beginPath();
  g.ellipse(ax + 4, ay - 18, 52, 62, 0.12, 0, Math.PI * 2);
  g.fillStyle = skin;
  g.fill();
  g.beginPath();
  g.ellipse(ax, ay + 130, 118, 90, 0, 0, Math.PI * 2);
  g.fillStyle = "#f4f4f2";
  g.fill();
  g.beginPath();
  g.ellipse(ax + 2, ay - 66, 50, 24, 0.1, Math.PI, Math.PI * 2);
  g.fillStyle = "#8a6446";
  g.fill();
  g.restore();
  g.beginPath();
  g.arc(ax, ay, 128, 0, Math.PI * 2);
  g.strokeStyle = "#3d444d";
  g.lineWidth = 2;
  g.stroke();
  text(g, "govijr", 52, 452, 30, "#9198a1", 300);
  fillRR(g, 52, 494, 256, 46, 8, "#212830");
  strokeRR(g, 52.5, 494.5, 255, 45, 8, "#3d444d");
  text(g, "Edit profile", 180, 517, 21, "#f0f6fc", 600, "center");
  fillRR(g, 52, 556, 256, 46, 8, "#212830");
  strokeRR(g, 52.5, 556.5, 255, 45, 8, "#3d444d");
  text(g, "Sponsors dashboard", 180, 579, 21, "#f0f6fc", 600, "center");
  // pinned
  const px = 360;
  text(g, "Pinned", px, 160, 24, "#f0f6fc", 400);
  text(g, "Customize your pins", 1190, 160, 20, "#4493f8", 400, "right");
  const repos: [string, string[], string, string, string][] = [
    ["react-native-rs", ["A high-performance React Native", "TurboModule bridge for Rust"], "Rust", "#dea584", "5"],
    ["computeflow", ["A cheaper alternative to Render", "and other AWS wrappers"], "TypeScript", "#3178c6", "1"],
    ["Computeflow-ASLB", ["Auto-scaling, load-balancing", "reverse-proxy server in C++"], "C++", "#f34b7d", "2"],
    ["ignite", ["Real-time event streaming and", "infrastructure as a service"], "Rust", "#dea584", "1"],
  ];
  repos.forEach(([n, d, lang, lc, st], i) => {
    const cx = px + (i % 2) * 422;
    const cy = 186 + Math.floor(i / 2) * 230;
    strokeRR(g, cx + 0.5, cy + 0.5, 404, 210, 10, "#3d444d");
    glyph(g, "book", cx + 20, cy + 22, 22, "#9198a1", 1.8);
    text(g, n, cx + 52, cy + 34, 22, "#4493f8", 600);
    const nw = measure(g, n, 22, 600);
    strokeRR(g, cx + 62 + nw, cy + 20, 76, 28, 14, "#3d444d");
    text(g, "Public", cx + 100 + nw, cy + 34, 16.5, "#9198a1", 500, "center");
    d.forEach((l, j) => text(g, l, cx + 20, cy + 82 + j * 32, 20, "#9198a1"));
    circle(g, cx + 30, cy + 176, 8, lc);
    text(g, lang, cx + 46, cy + 177, 19, "#9198a1");
    glyph(g, "star", cx + 60 + measure(g, lang, 19), cy + 165, 20, "#9198a1", 1.8);
    text(g, st, cx + 88 + measure(g, lang, 19), cy + 177, 19, "#9198a1");
  });
}

function google(g: G, a: Assets) {
  g.fillStyle = "#1f1f1f";
  g.fillRect(0, 0, PAGE_W, PAGE_H);
  text(g, "About", 30, 40, 21, "#e3e3e3");
  text(g, "Store", 110, 40, 21, "#e3e3e3");
  text(g, "Gmail", 980, 40, 21, "#e3e3e3", 400, "right");
  text(g, "Images", 1060, 40, 21, "#e3e3e3", 400, "right");
  glyph(g, "grid", 1082, 28, 26, "#e3e3e3");
  avatar(g, 1164, 40, 22, "#ffb74d", "#e65100", "G");
  text(g, "Google", PAGE_W / 2, 214, 128, "#ffffff", 500, "center", -4);
  const bw = 720;
  const bx = PAGE_W / 2 - bw / 2;
  fillRR(g, bx, 318, bw, 62, 31, "#4d5156");
  fillRR(g, bx + 1, 319, bw - 2, 60, 30, "#303134");
  glyph(g, "plus", bx + 22, 337, 26, "#e8eaed", 2);
  glyph(g, "mic", bx + bw - 200, 337, 26, "#e8eaed", 1.8);
  strokeRR(g, bx + bw - 150, 339, 22, 22, 6, "#e8eaed", 2);
  fillRR(g, bx + bw - 114, 328, 100, 42, 21, "#3c4043");
  glyph(g, "sparkle", bx + bw - 102, 340, 18, "#8ab4f8");
  text(g, "AI Mode", bx + bw - 78, 349, 18, "#e8eaed", 500);
  fillRR(g, PAGE_W / 2 - 250, 418, 226, 50, 8, "#303134");
  text(g, "Google Search", PAGE_W / 2 - 137, 443, 20, "#e3e3e3", 400, "center");
  fillRR(g, PAGE_W / 2 + 14, 418, 236, 50, 8, "#303134");
  text(g, "I'm Feeling Lucky", PAGE_W / 2 + 132, 443, 20, "#e3e3e3", 400, "center");
  text(g, "Google offered in:", PAGE_W / 2 - 250, 530, 20, "#bfbfbf", 400, "left");
  text(g, "Hindi  Bengali  Telugu  Marathi  Tamil", PAGE_W / 2 - 72, 530, 20, "#99c3ff");
  g.fillStyle = "#171717";
  g.fillRect(0, PAGE_H - 116, PAGE_W, 116);
  text(g, "India", 30, PAGE_H - 92, 21, "#bfbfbf");
  line(g, 0, PAGE_H - 68, PAGE_W, PAGE_H - 68, "#313335");
  ["Advertising", "Business", "How Search works"].forEach((s, i) => text(g, s, 30 + i * 150 + (i > 1 ? 10 : 0), PAGE_H - 36, 20, "#bfbfbf"));
  ["Settings", "Terms", "Privacy"].forEach((s, i) => text(g, s, PAGE_W - 30 - i * 110, PAGE_H - 36, 20, "#bfbfbf", 400, "right"));
  void bar;
}

const PAGES: Record<number, (g: G, a: Assets) => void> = { 0: threads, 2: reddit, 3: github, 4: google };

const SCALE = 1.6;
const pageCache = new Map<number, { v: number; c: OffscreenCanvas }>();

export function pageCanvas(tab: number, a: Assets): OffscreenCanvas {
  const hit = pageCache.get(tab);
  if (hit && hit.v === a.version) return hit.c;
  const c = hit?.c ?? new OffscreenCanvas(Math.ceil(PAGE_W * SCALE), Math.ceil(PAGE_H * SCALE));
  const g = c.getContext("2d") as G;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  (PAGES[tab] ?? threads)(g, a);
  pageCache.set(tab, { v: a.version, c });
  return c;
}
