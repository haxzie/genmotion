/**
 * Chrome (light theme) showing prequel.sh. The page content is the user's own
 * full-page capture of the site, drawn in once it loads; the tab strip,
 * omnibox and the download bubble are rebuilt around it.
 */
import * as THREE from "three";
import type { LoadingManager } from "three";
import { makePage, type Kit, type Page, type Rect } from "./page";
import { SW, SH, MENU_H, sprite, type Sprite } from "./mac";
import siteUrl from "../assets/prequel-site.jpg";
import prequelIconUrl from "../assets/prequel-icon.jpg";
import avatarUrl from "../assets/musthaq-avatar.png";

export const CONTENT_Y = 104;
/** the capture is 3022 px wide; at 1440 it sits 1:0.4765 */
const SITE_W = 3022;
const S = SW / SITE_W;
/** "Download for Mac" in the capture (capture px), mapped to page px */
const BTN_CAPTURE = { x: 1204, y: 1100, w: 383, h: 88 };
export const DOWNLOAD_BTN: Rect = {
  x: BTN_CAPTURE.x * S, y: CONTENT_Y + BTN_CAPTURE.y * S, w: BTN_CAPTURE.w * S, h: BTN_CAPTURE.h * S,
};
export const HEADLINE: Rect = { x: 330, y: CONTENT_Y + 160, w: 780, h: 230 };
export const DL_ICON = { x: 1350, y: 84 };
export const BUBBLE = { x: SW - 14 - 360, y: CONTENT_Y + 4 };

function chromeFrame(k: Kit) {
  const g = k.g;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, SW, SH);
  // menu bar
  k.rect(0, 0, SW, MENU_H, "#ececef");
  k.circle(20, 13, 6, "none", "#1d1d1f", 1.6);
  k.text("Chrome", 44, 13, { size: 13, weight: 700, color: "#1d1d1f" });
  ["File", "Edit", "View", "History", "Bookmarks", "Profiles", "Tab", "Window", "Help"].reduce((x, s) => {
    k.text(s, x, 13, { size: 13, color: "#1d1d1f" });
    return x + k.measure(s, 13) + 22;
  }, 44 + k.measure("Chrome", 13, 700) + 24);
  k.text("Tue Nov 4  11:54 PM", SW - 16, 13, { size: 13, color: "#1d1d1f", align: "right" });
  // tab strip
  k.rect(0, MENU_H, SW, 40, "#dfe3e8");
  for (const [i, c] of ["#ff5f57", "#febc2e", "#28c840"].entries()) k.circle(22 + i * 20, MENU_H + 20, 6, c);
  k.rect(90, MENU_H + 6, 260, 34, "#ffffff", 10);
  k.text("Prequel — Cinematic screen re…", 122, MENU_H + 23, { size: 12.5, color: "#1f1f1f" });
  k.text("×", 334, MENU_H + 22, { size: 14, color: "#5f6368", align: "center" });
  k.text("+", 372, MENU_H + 22, { size: 18, color: "#5f6368", align: "center" });
  // toolbar + omnibox
  k.rect(0, 66, SW, 38, "#ffffff");
  ["‹", "›", "↻"].forEach((s, i) => k.text(s, 24 + i * 32, 85, { size: i === 2 ? 16 : 22, color: "#5f6368", align: "center" }));
  k.rect(118, 71, 1170, 28, "#f1f3f4", 14);
  k.text("prequel.sh", 146, 85, { size: 14, color: "#1f1f1f" });
  k.circle(1394, 85, 11, "#c9d7f2"); // the profile button; Musthaq's photo is painted in by makeBrowser
  k.line(0, CONTENT_Y - 0.5, SW, CONTENT_Y - 0.5, "#dadce0");
  // the download glyph in the toolbar
  k.line(DL_ICON.x, 78, DL_ICON.x, 90, "#5f6368", 1.8);
  k.line(DL_ICON.x - 5, 85, DL_ICON.x, 90, "#5f6368", 1.8);
  k.line(DL_ICON.x + 5, 85, DL_ICON.x, 90, "#5f6368", 1.8);
  k.line(DL_ICON.x - 7, 94, DL_ICON.x + 7, 94, "#5f6368", 1.8);
  k.mark("download-for-mac", DOWNLOAD_BTN);
}

export function makeBrowser(name: string, manager: LoadingManager): Page {
  let canvas: OffscreenCanvas | null = null;
  const p = makePage(name, SW, SH, 2, (k) => {
    canvas = k.g.canvas as OffscreenCanvas;
    chromeFrame(k);
  });
  p.u.bgLum.value = 1;
  p.u.tint.setRGB(0.97, 0.98, 1.0);
  const tex = (p.mesh.material as THREE.ShaderMaterial).uniforms.map!.value as THREE.CanvasTexture;
  const loader = new THREE.ImageLoader(manager);
  loader.load(siteUrl, (img) => {
    const g = canvas!.getContext("2d")!;
    g.save();
    g.beginPath();
    g.rect(0, CONTENT_Y, SW, SH - CONTENT_Y);
    g.clip();
    g.drawImage(img, 0, CONTENT_Y, SW, img.height * (SW / img.width));
    g.restore();
    tex.needsUpdate = true;
  });
  loader.load(avatarUrl, (img) => {
    const g = canvas!.getContext("2d")!;
    g.save();
    g.beginPath();
    g.arc(1394, 85, 11, 0, Math.PI * 2);
    g.clip();
    g.drawImage(img, 1383, 74, 22, 22);
    g.restore();
    tex.needsUpdate = true;
  });
  loader.load(prequelIconUrl, (img) => {
    const g = canvas!.getContext("2d")!;
    g.save();
    g.beginPath();
    g.roundRect(102, MENU_H + 15, 16, 16, 4);
    g.clip();
    g.drawImage(img, 102, MENU_H + 15, 16, 16);
    g.restore();
    tex.needsUpdate = true;
  });
  return p;
}

/** Chrome's download bubble: one row, downloading at `pct`, or done. */
export function downloadBubble(pct: number, done: boolean): Sprite {
  const W = 360;
  const H = 96;
  return sprite(done ? "download-done" : `download-${pct}`, W, H, (k) => {
    const g = k.g;
    g.shadowColor = "rgba(0,0,0,0.18)";
    g.shadowBlur = 0;
    k.rect(0.5, 0.5, W - 1, H - 1, "#ffffff", 12, "#dadce0", 1);
    k.text("Recent download history", 18, 22, { size: 12, weight: 600, color: "#5f6368" });
    // file icon: the real Prequel icon is painted by the scene
    k.rect(18, 42, 36, 36, "#f1f3f4", 8);
    k.text("Prequel.dmg", 68, 52, { size: 14, weight: 600, color: "#1f1f1f" });
    if (done) {
      k.text("Done · Open file", 68, 71, { size: 12.5, color: "#188038" });
      k.circle(W - 34, 60, 11, "#188038");
      k.line(W - 39, 60, W - 35, 64, "#ffffff", 2);
      k.line(W - 35, 64, W - 28, 56, "#ffffff", 2);
      k.mark("open", { x: 0, y: 36, w: W, h: 50 });
    } else {
      k.rect(68, 68, 220, 5, "#e8eaed", 3);
      k.rect(68, 68, Math.max(5, 220 * pct / 100), 5, "#1a73e8", 3);
      k.text(`${pct}%`, W - 22, 70, { size: 12, color: "#5f6368", align: "right" });
    }
  });
}

/** Paint the Prequel icon onto a bubble's file slot once it loads. */
export function paintBubbleIcon(s: Sprite, manager: LoadingManager) {
  new THREE.ImageLoader(manager).load(prequelIconUrl, (img) => {
    const g = (s.tex.image as OffscreenCanvas).getContext("2d")!;
    g.save();
    g.beginPath();
    g.roundRect(20, 44, 32, 32, 7);
    g.clip();
    g.drawImage(img, 20, 44, 32, 32);
    g.restore();
    s.tex.needsUpdate = true;
  });
}
