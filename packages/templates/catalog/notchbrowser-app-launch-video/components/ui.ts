/** Small Canvas 2D drawing helpers shared by the desktop, windows and panel. */
import { FONT, type Assets, type G } from "./core";

export function rr(g: G, x: number, y: number, w: number, h: number, r: number | [number, number, number, number]) {
  g.beginPath();
  g.roundRect(x, y, w, h, r as number);
}

export function fillRR(g: G, x: number, y: number, w: number, h: number, r: number, color: string | CanvasGradient) {
  rr(g, x, y, w, h, r);
  g.fillStyle = color;
  g.fill();
}

export function strokeRR(g: G, x: number, y: number, w: number, h: number, r: number, color: string, lw = 1) {
  rr(g, x, y, w, h, r);
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.stroke();
}

export function font(g: G, size: number, weight = 400, spacing = 0) {
  g.font = `${weight} ${size}px ${FONT}`;
  g.letterSpacing = `${spacing}px`;
}

export function text(
  g: G,
  s: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = 400,
  align: CanvasTextAlign = "left",
  spacing = 0,
) {
  font(g, size, weight, spacing);
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillText(s, x, y);
  g.letterSpacing = "0px";
}

export function measure(g: G, s: string, size: number, weight = 400, spacing = 0) {
  font(g, size, weight, spacing);
  const w = g.measureText(s).width;
  g.letterSpacing = "0px";
  return w;
}

/** Truncates with an ellipsis so the string fits maxW at the given size. */
export function ellipsize(g: G, s: string, maxW: number, size: number, weight = 400) {
  if (measure(g, s, size, weight) <= maxW) return s;
  let t = s.replace(/…$/, "");
  while (t.length > 1 && measure(g, t + "…", size, weight) > maxW) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}

/** Draws an image "contain"-fitted into a box. */
export function icon(g: G, a: Assets, name: string, x: number, y: number, w: number, h = w) {
  const im = a.img[name];
  if (!im || !im.naturalWidth) return;
  const s = Math.min(w / im.naturalWidth, h / im.naturalHeight);
  const dw = im.naturalWidth * s;
  const dh = im.naturalHeight * s;
  g.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Finder's real icon, lifted straight out of the reference dock. */
export function finderIcon(g: G, a: Assets, x: number, y: number, size: number) {
  const d = a.img["dock"];
  if (!d) return;
  g.save();
  rr(g, x + size * 0.06, y + size * 0.06, size * 0.88, size * 0.88, size * 0.2);
  g.clip();
  g.drawImage(d, 48, 44, 108, 108, x, y, size, size);
  g.restore();
}

/** A macOS-style app tile: white squircle with the brand mark inside. */
export function appTile(g: G, a: Assets, name: string, x: number, y: number, size: number, bg = "#ffffff") {
  if (name === "finder") {
    finderIcon(g, a, x - size * 0.04, y - size * 0.04, size * 1.08);
    return;
  }
  g.save();
  g.shadowColor = "rgba(0,0,0,0.35)";
  g.shadowBlur = size * 0.12;
  g.shadowOffsetY = size * 0.04;
  fillRR(g, x, y, size, size, size * 0.225, bg);
  g.restore();
  const grad = g.createLinearGradient(0, y, 0, y + size);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.06)");
  fillRR(g, x, y, size, size, size * 0.225, grad);
  const p = size * 0.2;
  icon(g, a, name, x + p, y + p, size - 2 * p);
}

export function circle(g: G, x: number, y: number, r: number, color: string | CanvasGradient) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
}

/** A simple initials avatar. */
export function avatar(g: G, x: number, y: number, r: number, c1: string, c2: string, initial = "") {
  const gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
  gr.addColorStop(0, c1);
  gr.addColorStop(1, c2);
  circle(g, x, y, r, gr);
  if (initial) text(g, initial, x, y + r * 0.04, r * 0.95, "rgba(255,255,255,0.95)", 600, "center");
}

/** macOS traffic lights. */
export function trafficLights(g: G, x: number, y: number, s = 1) {
  const cols = ["#ff5f57", "#febc2e", "#28c840"];
  cols.forEach((c, i) => {
    circle(g, x + i * 20 * s, y, 6.2 * s, c);
    g.beginPath();
    g.arc(x + i * 20 * s, y, 6.2 * s, 0, Math.PI * 2);
    g.strokeStyle = "rgba(0,0,0,0.18)";
    g.lineWidth = 0.6;
    g.stroke();
  });
}

/** A line of placeholder "text" (a rounded bar) for dense UI furniture. */
export function bar(g: G, x: number, y: number, w: number, h: number, color: string) {
  fillRR(g, x, y - h / 2, w, h, h / 2, color);
}

export function line(g: G, x1: number, y1: number, x2: number, y2: number, color: string, lw = 1) {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.stroke();
}

/** Stroked outline icons in the lucide idiom, drawn by hand. */
export function glyph(g: G, kind: string, x: number, y: number, s: number, color: string, lw = 2) {
  g.save();
  g.translate(x, y);
  g.scale(s / 24, s / 24);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = (lw * 24) / s;
  g.lineCap = "round";
  g.lineJoin = "round";
  const P = (d: string) => g.stroke(new Path2D(d));
  switch (kind) {
    case "heart":
      P("M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z");
      break;
    case "comment":
      P("M7.9 20A9 9 0 1 0 4 16.1L2 22Z");
      break;
    case "repost":
      P("m17 2 4 4-4 4");
      P("M3 11v-1a4 4 0 0 1 4-4h14");
      P("m7 22-4-4 4-4");
      P("M21 13v1a4 4 0 0 1-4 4H3");
      break;
    case "send":
      P("M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z");
      break;
    case "home":
      g.fill(new Path2D("M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"));
      break;
    case "plus":
      P("M5 12h14");
      P("M12 5v14");
      break;
    case "search":
      P("m21 21-4.34-4.34");
      g.beginPath();
      g.arc(11, 11, 8, 0, Math.PI * 2);
      g.stroke();
      break;
    case "user":
      P("M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2");
      g.beginPath();
      g.arc(12, 7, 4, 0, Math.PI * 2);
      g.stroke();
      break;
    case "chevL":
      P("m15 18-6-6 6-6");
      break;
    case "chevR":
      P("m9 18 6-6-6-6");
      break;
    case "chevUp":
      P("m18 15-6-6-6 6");
      break;
    case "chevDown":
      P("m6 9 6 6 6-6");
      break;
    case "reload":
      P("M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8");
      P("M3 3v5h5");
      break;
    case "x":
      P("M18 6 6 18");
      P("m6 6 12 12");
      break;
    case "star":
      P("M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z");
      break;
    case "eyeOff":
      P("M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49");
      P("M14.084 14.158a3 3 0 0 1-4.242-4.242");
      P("M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143");
      P("m2 2 20 20");
      break;
    case "mic":
      P("M12 19v3");
      P("M19 10v2a7 7 0 0 1-14 0v-2");
      rr(g, 9, 2, 6, 13, 3);
      g.stroke();
      break;
    case "grid":
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          g.beginPath();
          g.arc(5 + i * 7, 5 + j * 7, 1.8, 0, Math.PI * 2);
          g.fill();
        }
      break;
    case "book":
      P("M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20");
      break;
    case "more":
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(5 + i * 7, 12, 1.6, 0, Math.PI * 2);
        g.fill();
      }
      break;
    case "menu":
      P("M4 6h16");
      P("M4 12h16");
      P("M4 18h16");
      break;
    case "play":
      g.fill(new Path2D("M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z"));
      break;
    case "pause":
      g.fillRect(6, 4, 4, 16);
      g.fillRect(14, 4, 4, 16);
      break;
    case "skipF":
      g.fill(new Path2D("M5 4.5v15l11-7.5z"));
      g.fillRect(17, 4, 2.4, 16);
      break;
    case "skipB":
      g.fill(new Path2D("M19 4.5v15l-11-7.5z"));
      g.fillRect(4.6, 4, 2.4, 16);
      break;
    case "hash":
      P("M4 9h16");
      P("M4 15h16");
      P("M10 3 8 21");
      P("M16 3l-2 18");
      break;
    case "edit":
      P("M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7");
      P("M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z");
      break;
    case "circleDash":
      g.setLineDash([3, 3.2]);
      g.beginPath();
      g.arc(12, 12, 8, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      break;
    case "circle":
      g.beginPath();
      g.arc(12, 12, 8, 0, Math.PI * 2);
      g.stroke();
      break;
    case "arrowUp":
      P("m5 12 7-7 7 7");
      P("M12 19V5");
      break;
    case "sparkle":
      g.fill(new Path2D("M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"));
      break;
  }
  g.restore();
}
