import * as THREE from "three";
import { C, FONT, GENMOTION_MARK_D, SAMSUNG_PAY_D } from "./brand";
import { PX } from "./text";

const RES = 2;

function planeFromCanvas(canvas: OffscreenCanvas, wPx: number, hPx: number) {
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(wPx * PX, hPx * PX),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
  );
}

function roundRect(g: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Draw the real Samsung Pay lockup (ink box x 0–24, y 6.6–17.4) into a box. */
function drawSamsungPay(g: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, colour: string) {
  const s = w / 24;
  g.save();
  g.translate(x, y - 6.6 * s);
  g.scale(s, s);
  g.fillStyle = colour;
  g.fill(new Path2D(SAMSUNG_PAY_D));
  g.restore();
  return 10.8 * s; // drawn height
}

/**
 * The white rounded payment badge: Samsung Pay lockup, black on white,
 * with a hairline border. `wPx` is the badge width in composition px.
 */
export function payBadge(wPx = 260) {
  const hPx = Math.round(wPx * 0.6);
  const cv = new OffscreenCanvas(wPx * RES, hPx * RES);
  const g = cv.getContext("2d")!;
  const r = hPx * 0.16 * RES;
  roundRect(g, 1, 1, wPx * RES - 2, hPx * RES - 2, r);
  g.fillStyle = "#ffffff";
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = "rgba(0,0,0,0.18)";
  g.stroke();
  const markW = wPx * 0.62 * RES;
  const markH = (markW / 24) * 10.8;
  drawSamsungPay(g, (wPx * RES - markW) / 2, (hPx * RES - markH) / 2, markW, "#000000");
  const m = planeFromCanvas(cv, wPx, hPx);
  m.name = "samsung-pay-badge";
  return m;
}

/** Bare Samsung Pay lockup (no badge), for the white end lockup. */
export function samsungPayMark(wPx: number, colour = "#000000") {
  const hPx = Math.ceil((wPx / 24) * 10.8) + 4;
  const cv = new OffscreenCanvas(wPx * RES, hPx * RES);
  const g = cv.getContext("2d")!;
  drawSamsungPay(g, 0, 2 * RES, wPx * RES, colour);
  const m = planeFromCanvas(cv, wPx, hPx);
  m.name = "samsung-pay-logo";
  return m;
}

/**
 * GenMotion lockup: the real gradient mark + "GenMotion" wordmark (+ optional suffix like "Checkout").
 * `size` is the wordmark cap size in composition px. Centred.
 */
export function genmotionLockup(size: number, textColour: string, suffix?: { text: string; colour: string }) {
  const markPx = size * 1.25;
  const gap = size * 0.35;
  const weight = 600;
  const font = `${weight} ${size * RES}px ${FONT}`;
  const sfont = `400 ${size * RES}px ${FONT}`;
  const mctx = new OffscreenCanvas(8, 8).getContext("2d")!;
  mctx.font = font;
  (mctx as any).letterSpacing = `${-0.02 * size * RES}px`;
  const wordW = mctx.measureText("GenMotion").width / RES;
  let sufW = 0;
  if (suffix) {
    mctx.font = sfont;
    sufW = mctx.measureText(" " + suffix.text).width / RES;
  }
  const pad = size * 0.3;
  const wPx = Math.ceil(pad * 2 + markPx + gap + wordW + sufW);
  const hPx = Math.ceil(markPx + pad * 2);
  const cv = new OffscreenCanvas(wPx * RES, hPx * RES);
  const g = cv.getContext("2d")!;
  // mark
  g.save();
  g.translate(pad * RES, pad * RES);
  const s = (markPx * RES) / 512;
  g.scale(s, s);
  const grad = g.createLinearGradient(61, 88.5, 428.5, 430);
  grad.addColorStop(0, C.lime);
  grad.addColorStop(1, C.teal);
  g.fillStyle = grad;
  g.fill(new Path2D(GENMOTION_MARK_D));
  g.restore();
  // wordmark
  g.font = font;
  (g as any).letterSpacing = `${-0.02 * size * RES}px`;
  g.textBaseline = "middle";
  g.fillStyle = textColour;
  const tx = (pad + markPx + gap) * RES;
  const ty = (hPx / 2 + size * 0.05) * RES;
  g.fillText("GenMotion", tx, ty);
  if (suffix) {
    (g as any).letterSpacing = "0px";
    g.font = sfont;
    g.fillStyle = suffix.colour;
    g.fillText(" " + suffix.text, tx + wordW * RES, ty);
  }
  const m = planeFromCanvas(cv, wPx, hPx);
  m.name = suffix ? "genmotion-checkout-logo" : "genmotion-logo";
  m.userData.w = wPx * PX;
  return m;
}
