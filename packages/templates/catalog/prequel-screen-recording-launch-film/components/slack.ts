/**
 * Slack, dark theme, rebuilt from the user's own screenshot: the window (rail,
 * sidebar, DM header, the afternoon's two messages, the composer) is one page;
 * everything that arrives — the sent video, the typing indicator, Maya's reply
 * and the prequel.sh link preview — is an overlay. Real assets only: Musthaq's
 * avatar from the screenshot, Prequel's OG image and app icon from prequel.sh.
 */
import * as THREE from "three";
import type { LoadingManager } from "three";
import { makePage, type Kit, type Page } from "./page";
import { SW, SH, MENU_H, sprite, panelShape, type Sprite } from "./mac";
import avatarUrl from "../assets/musthaq-avatar.png";
import mayaUrl from "../assets/maya-avatar.jpg";
import ogUrl from "../assets/prequel-og.jpg";
import prequelIconUrl from "../assets/prequel-icon.jpg";

export const SL = {
  rail: "#121016",
  side: "#19171d",
  main: "#1a1d21",
  line: "#35373b",
  ink: "#d1d2d3",
  bright: "#f8f8f8",
  dim: "#ababad",
  link: "#4a9fd5",
  select: "#1164a3",
};

/* layout, in page px */
export const FEED_X = 352;           // message gutter (avatar left edge)
export const TEXT_X = FEED_X + 48;   // message text
/**
 * The message box, bottom-anchored at y 888. Proportions from the user's
 * screenshot of Slack's composer (scaled 1.15 so its type matches the feed):
 * formatting toolbar, the text row, then the + / Aa / emoji / @ / … row with
 * send on the right. With an attachment it grows by the file chip's height.
 */
export const COMPOSER_BOTTOM = 888;
export const COMPOSER_H = 135;
export const COMPOSER_CHIP_H = 62;
export const COMPOSER = { x: 346, y: COMPOSER_BOTTOM - COMPOSER_H, w: 1078, h: COMPOSER_H };
/** rows, from the box's top */
export const ROW = { tools: 25, text: 68, chip: 92 };
export const SENT_Y = 232;
export const REPLY_Y = 498;
export const TYPING_Y = 728;

function initials(k: Kit, x: number, y: number, s: number, text: string, bg: string) {
  k.rect(x, y, s, s, bg, s * 0.22);
  k.text(text, x + s / 2, y + s / 2 + 0.5, { size: s * 0.4, weight: 600, color: "#ffffff", align: "center" });
}

function header(k: Kit, x: number, y: number, name: string, time: string) {
  k.text(name, x, y, { size: 15, weight: 700, color: SL.bright });
  k.text(time, x + k.measure(name, 15, 700) + 8, y + 1, { size: 12, color: SL.dim });
}

export function drawSlack(k: Kit, clock: string) {
  const g = k.g;
  g.fillStyle = SL.main;
  g.fillRect(0, 0, SW, SH);

  // menu bar
  k.rect(0, 0, SW, MENU_H, "#16141a");
  k.circle(20, 13, 6, "none", "#e6e6ea", 1.6);
  k.text("Slack", 44, 13, { size: 13, weight: 700, color: "#f2f2f5" });
  ["File", "Edit", "View", "Go", "Window", "Help"].reduce((x, s) => {
    k.text(s, x, 13, { size: 13, color: "#e6e6ea" });
    return x + k.measure(s, 13) + 22;
  }, 44 + k.measure("Slack", 13, 700) + 24);
  k.text(clock, SW - 16, 13, { size: 13, color: "#f2f2f5", align: "right" });

  // title bar + search
  k.rect(0, MENU_H, SW, 40, SL.rail);
  for (const [i, c] of ["#ff5f57", "#febc2e", "#28c840"].entries()) k.circle(20 + i * 20, MENU_H + 20, 6, c);
  k.rect(SW / 2 - 300, MENU_H + 8, 600, 24, "rgba(255,255,255,0.12)", 6);
  k.text("Search Acme", SW / 2, MENU_H + 20, { size: 13, color: SL.dim, align: "center" });

  // workspace rail
  k.rect(0, 66, 72, SH - 66, SL.rail);
  initials(k, 16, 82, 40, "A", "#5b3a68");
  for (let i = 0; i < 3; i++) k.rect(24, 150 + i * 56, 24, 24, "none", 6, "rgba(255,255,255,0.35)", 1.5);

  // sidebar
  k.rect(72, 66, 268, SH - 66, SL.side);
  k.line(340, 66, 340, SH, SL.line);
  k.text("Acme", 92, 92, { size: 18, weight: 700, color: SL.bright });
  k.text("Channels", 92, 136, { size: 14, weight: 500, color: SL.dim });
  ["general", "design", "launch", "random"].forEach((c, i) => k.text(`#  ${c}`, 100, 166 + i * 30, { size: 15, color: SL.dim }));
  k.text("Direct messages", 92, 300, { size: 14, weight: 500, color: SL.dim });
  const dms: [string, string, string][] = [["Maya Chen", "MC", "#c4683f"], ["Priya Shah", "PS", "#2f7a6b"], ["Leo Park", "LP", "#5865c9"]];
  dms.forEach(([n, ini, c], i) => {
    const y = 332 + i * 32;
    if (i === 0) k.rect(80, y - 15, 252, 30, SL.select, 6);
    initials(k, 98, y - 10, 20, ini, c);
    k.text(n, 128, y, { size: 15, weight: i === 0 ? 600 : 400, color: i === 0 ? "#ffffff" : SL.dim });
  });

  // DM header
  initials(k, 362, 80, 26, "MC", "#c4683f");
  k.text("Maya Chen", 398, 93, { size: 17, weight: 700, color: SL.bright });
  k.line(340, 116, SW, 116, SL.line);

  // the afternoon
  k.rect(SW / 2 + 170 - 50, 128, 100, 24, SL.main, 12, SL.line);
  k.text("Today", SW / 2 + 170, 140, { size: 12, weight: 600, color: SL.ink, align: "center" });
  initials(k, FEED_X, 166, 36, "MC", "#c4683f");
  header(k, TEXT_X, 174, "Maya Chen", "4:52 PM");
  k.text("hey! can you send a quick demo video?", TEXT_X, 196, { size: 15, color: SL.ink });
  k.text("any update on the demo?", TEXT_X, 220, { size: 15, color: SL.ink });

  // composer
}

/** Every place Maya's avatar sits in the window: sidebar DM, DM header, her afternoon message. */
const MAYA_SPOTS: [number, number, number][] = [[98, 322, 20], [362, 80, 26], [FEED_X, 166, 36]];

export function makeSlack(name = "slack", clock = "Tue Nov 4  11:52 PM", manager?: LoadingManager): Page {
  let canvas: OffscreenCanvas | null = null;
  const p = makePage(name, SW, SH, 2, (k) => {
    canvas = k.g.canvas as OffscreenCanvas;
    drawSlack(k, clock);
  });
  p.u.bgLum.value = 0.1;
  p.u.tint.setRGB(0.9, 0.93, 1.0);
  // Maya's photo replaces her initials tiles once it loads (through the frame barrier)
  const tex = (p.mesh.material as THREE.ShaderMaterial).uniforms.map!.value as THREE.CanvasTexture;
  new THREE.ImageLoader(manager).load(mayaUrl, (img) => {
    const g = canvas!.getContext("2d")!;
    for (const [x, y, s] of MAYA_SPOTS) {
      g.save();
      roundClip(g, x, y, s, s, s * 0.22);
      g.drawImage(img, x, y, s, s);
      g.restore();
    }
    tex.needsUpdate = true;
  });
  return p;
}

/* -------------------------------------------------------------- overlays */

/** Draw an image onto a sprite once it loads (through the frame barrier). */
function paintLater(s: Sprite, url: string, manager: LoadingManager, draw: (g: OffscreenCanvasRenderingContext2D, img: HTMLImageElement) => void) {
  new THREE.ImageLoader(manager).load(url, (img) => {
    const g = (s.tex.image as OffscreenCanvas).getContext("2d")!;
    draw(g, img);
    s.tex.needsUpdate = true;
  });
}

function roundClip(g: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.clip();
}

/** The file chip waiting in the composer. */
export function fileChip(): Sprite {
  const W = 330;
  const H = 52;
  return sprite("composer-attachment", W, H, (k) => {
    panelShape(k.g, W, H, 10, "#222529");
    k.rect(10, 10, 32, 32, "#c1453d", 7);
    k.rect(19, 19, 14, 14, "none", 2, "#ffffff", 1.6);
    k.text("demo_final_v9 (use this one).mp4", 54, 19, { size: 13, weight: 600, color: SL.bright });
    k.text("MP4", 54, 36, { size: 12, color: SL.dim });
  });
}

/** The message box itself: `withChip` is the taller pre-send state with an attachment and a live send button. */
export function composerBox(withChip: boolean): Sprite {
  const W = COMPOSER.w;
  const H = COMPOSER_H + (withChip ? COMPOSER_CHIP_H : 0);
  return sprite(withChip ? "message-box-with-attachment" : "message-box", W, H, (k) => {
    const g = k.g;
    const off = "#76777a";
    const ic = "#a9aaad";
    g.beginPath();
    g.roundRect(0.5, 0.5, W - 1, H - 1, 10);
    g.fillStyle = "#222529";
    g.fill();
    g.strokeStyle = "#565856";
    g.lineWidth = 1;
    g.stroke();
    const line = (pts: number[][], c = off, lw = 1.6) => {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x!, y!) : g.moveTo(x!, y!)));
      g.strokeStyle = c;
      g.lineWidth = lw;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.stroke();
    };
    // formatting toolbar (dimmed: nothing selected)
    const ty = ROW.tools;
    k.text("B", 18, ty, { size: 17, weight: 800, color: off });
    g.save(); g.transform(1, 0, -0.22, 1, ty * 0.22, 0);
    k.text("I", 52, ty, { size: 17, weight: 400, color: off });
    g.restore();
    k.text("U", 82, ty, { size: 16, color: off }); line([[82, ty + 10], [94, ty + 10]]);
    k.text("S", 116, ty, { size: 16, color: off }); line([[113, ty], [129, ty]]);
    k.text("¶", 148, ty, { size: 17, color: off }); line([[162, ty - 2], [166, ty + 2], [170, ty - 2]]);
    line([[188, ty - 11], [188, ty + 11]], "#3d3f43", 1);
    // link
    g.beginPath(); g.ellipse(209, ty + 3, 6, 3.6, -Math.PI / 4, 0, Math.PI * 2); g.strokeStyle = off; g.lineWidth = 1.6; g.stroke();
    g.beginPath(); g.ellipse(215, ty - 3, 6, 3.6, -Math.PI / 4, 0, Math.PI * 2); g.stroke();
    // numbered + bulleted lists
    for (const [x, num] of [[240, true], [272, false]] as const) {
      for (let i = 0; i < 3; i++) {
        const y = ty - 7 + i * 7;
        if (num) k.text(String(i + 1), x, y, { size: 7, weight: 600, color: off });
        else k.circle(x + 2, y, 1.5, off);
        line([[x + 8, y], [x + 22, y]]);
      }
    }
    line([[300, ty - 11], [300, ty + 11]], "#3d3f43", 1);
    // quote, code, code block, block
    line([[314, ty - 8], [314, ty + 8]]);
    for (let i = 0; i < 3; i++) line([[319, ty - 6 + i * 6], [328, ty - 6 + i * 6]]);
    line([[346, ty - 5], [341, ty], [346, ty + 5]]); line([[356, ty - 5], [361, ty], [356, ty + 5]]); line([[353, ty - 6], [349, ty + 6]]);
    g.beginPath(); g.roundRect(372, ty - 8, 18, 15, 2); g.strokeStyle = off; g.lineWidth = 1.6; g.stroke();
    line([[376, ty - 3], [374, ty], [376, ty + 3]], off, 1.2); line([[386, ty - 3], [388, ty], [386, ty + 3]], off, 1.2);
    line([[401, ty - 7], [417, ty - 7]]); line([[401, ty], [417, ty]]); line([[401, ty + 7], [417, ty + 7]]);
    // bottom row: + · Aa · emoji · @ · …   and send
    const by = H - (COMPOSER_H - 111);
    k.circle(26, by, 15, "#2c2f33");
    line([[26, by - 7], [26, by + 7]], ic, 1.8); line([[19, by], [33, by]], ic, 1.8);
    k.text("Aa", 54, by - 1, { size: 15, weight: 500, color: ic }); line([[54, by + 9], [74, by + 9]], ic, 1.3);
    k.circle(98, by, 9, "none", ic, 1.6);
    k.circle(95, by - 2.5, 1.2, ic); k.circle(101, by - 2.5, 1.2, ic);
    g.beginPath(); g.arc(98, by + 1, 4.5, 0.15 * Math.PI, 0.85 * Math.PI); g.strokeStyle = ic; g.lineWidth = 1.5; g.stroke();
    k.text("@", 124, by, { size: 18, color: ic });
    for (let i = 0; i < 3; i++) k.circle(152 + i * 6, by + 1, 1.6, ic);
    // send: grey until there is something to send
    const live = withChip;
    if (live) k.rect(W - 74, by - 15, 34, 30, "#007a5a", 5);
    const sx = W - 57;
    g.beginPath();
    g.moveTo(sx - 8, by - 7); g.lineTo(sx + 9, by); g.lineTo(sx - 8, by + 7); g.lineTo(sx - 5, by); g.closePath();
    g.fillStyle = live ? "#ffffff" : "#6b6c6e";
    g.fill();
    line([[W - 26, by - 2], [W - 22, by + 2], [W - 18, by - 2]], live ? "#a9aaad" : "#6b6c6e", 1.4);
  });
}

/** One state of the composer's text line (or its placeholder). */
export function composerText(text: string, placeholder = false): Sprite {
  const W = 760;
  const H = 26;
  return sprite(placeholder ? "composer-placeholder" : "composer-text", W, H, (k) => {
    k.text(placeholder ? "Message Maya Chen" : text, 0, H / 2, { size: 15, color: placeholder ? "#8b8c8e" : SL.ink });
    if (!placeholder) {
      const w = k.measure(text, 15);
      k.line(w + 2, 4, w + 2, H - 4, SL.ink, 1.4);
    }
  }, 3);
}

/** Musthaq's message: the video, with a line of apology. */
export function sentMessage(manager: LoadingManager): Sprite {
  const W = 760;
  const H = 250;
  const s = sprite("sent-video-message", W, H, (k) => {
    header(k, 48, 10, "Musthaq Ahamad", "11:52 PM");
    k.text("here it is. sorry it took a while", 48, 33, { size: 15, color: SL.ink });
    // the video card
    const cx = 48, cy = 52, cw = 340, ch = 192;
    const g = k.g;
    const lg = g.createLinearGradient(cx, cy, cx + cw, cy + ch);
    lg.addColorStop(0, "#1c2550");
    lg.addColorStop(1, "#2a1735");
    k.rect(cx, cy, cw, ch, lg as unknown as string, 8);
    k.rect(cx + 30, cy + 40, 150, 92, "#1f2026", 4);
    k.rect(cx + cw - 110, cy + 14, 96, 24, "rgba(60,62,70,0.95)", 5);
    k.circle(cx + cw / 2, cy + ch / 2 - 10, 22, "rgba(0,0,0,0.55)");
    g.beginPath();
    g.moveTo(cx + cw / 2 - 6, cy + ch / 2 - 21);
    g.lineTo(cx + cw / 2 + 11, cy + ch / 2 - 10);
    g.lineTo(cx + cw / 2 - 6, cy + ch / 2 + 1);
    g.closePath();
    g.fillStyle = "#ffffff";
    g.fill();
    k.rect(cx, cy + ch - 34, cw, 34, "rgba(0,0,0,0.6)", 0);
    k.text("demo_final_v9 (use this one).mp4", cx + 12, cy + ch - 17, { size: 12.5, weight: 500, color: "#ffffff" });
    k.rect(cx, cy, cw, ch, "none", 8, SL.line, 1);
  });
  paintLater(s, avatarUrl, manager, (g, img) => {
    g.save();
    roundClip(g, 0, 4, 36, 36, 8);
    g.drawImage(img, 0, 4, 36, 36);
    g.restore();
  });
  return s;
}

/** "Maya Chen is typing…" */
export function typingIndicator(): Sprite {
  return sprite("typing-indicator", 260, 22, (k) => {
    k.text("Maya Chen is typing…", 0, 11, { size: 12.5, weight: 500, color: SL.dim });
  }, 3);
}

export const UNFURL = { x: 48, y: 62, w: 560, h: 124, thumb: 124 };

/** Maya's reply and the prequel.sh link preview, laid out like the screenshot. */
export function replyMessage(manager: LoadingManager): Sprite {
  const W = 760;
  const H = 200;
  const U = UNFURL;
  const s = sprite("prequel-reply", W, H, (k) => {
    initials(k, 0, 4, 36, "MC", "#c4683f");
    header(k, 48, 10, "Maya Chen", "11:53 PM");
    k.text("You should try Prequel!", 48, 33, { size: 15, color: SL.ink });
    const lw = k.measure("https://prequel.sh", 15);
    k.text("https://prequel.sh", 48, 52, { size: 15, color: SL.link });
    k.mark("link", { x: 48, y: 43, w: lw, h: 18 });
    // the preview card
    k.rect(U.x, U.y, U.w, U.h, "#1e2024", 10, SL.line, 1);
    k.text("Prequel — Cinematic screen recorder for Mac", U.x + 14, U.y + 26, { size: 14, weight: 700, color: SL.bright });
    k.text("Prequel is a Mac screen recorder that does the editing", U.x + 14, U.y + 50, { size: 13, color: SL.dim });
    k.text("for you: zooms on every click, your camera framed, …", U.x + 14, U.y + 68, { size: 13, color: SL.dim });
    k.text("Prequel", U.x + 40, U.y + 98, { size: 13, color: SL.dim });
    k.mark("unfurl", { x: U.x, y: U.y, w: U.w, h: U.h });
  });
  paintLater(s, mayaUrl, manager, (g, img) => {
    g.save();
    roundClip(g, 0, 4, 36, 36, 8);
    g.drawImage(img, 0, 4, 36, 36);
    g.restore();
  });
  paintLater(s, ogUrl, manager, (g, img) => {
    // cover-crop the OG image into the square on the right, as Slack does
    const t = U.thumb;
    const sc = t / img.height;
    const sw = t / sc;
    g.save();
    g.beginPath();
    g.roundRect(U.x + U.w - t, U.y, t, t, [0, 10, 10, 0]);
    g.clip();
    g.drawImage(img, (img.width - sw) / 2, 0, sw, img.height, U.x + U.w - t, U.y, t, t);
    g.restore();
    g.strokeStyle = SL.line;
    g.lineWidth = 1;
    g.beginPath();
    g.roundRect(U.x + 0.5, U.y + 0.5, U.w - 1, U.h - 1, 10);
    g.stroke();
  });
  paintLater(s, prequelIconUrl, manager, (g, img) => {
    g.save();
    roundClip(g, U.x + 14, U.y + 89, 18, 18, 4);
    g.drawImage(img, U.x + 14, U.y + 89, 18, 18);
    g.restore();
  });
  return s;
}
