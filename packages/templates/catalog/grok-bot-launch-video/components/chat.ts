import { bodyPath, drawBot, drawEyes } from "./bots";
import { C } from "./brand";
import { EMOJI, canvasMesh, fillRR, measure, text } from "./stage";

type G = OffscreenCanvasRenderingContext2D;

/** Research Bot's chat avatar: blue disc, white bot peeking in from the right. */
export function drawAvatar(g: G, cx: number, cy: number, d: number, empty = false) {
  g.save();
  g.beginPath();
  g.arc(cx, cy, d / 2, 0, Math.PI * 2);
  g.fillStyle = C.blue;
  g.fill();
  if (!empty) {
    g.clip();
    g.translate(cx + d * 0.12, cy + d * 0.04);
    g.scale(d * 0.78, d * 0.78);
    bodyPath(g, "blue");
    g.fillStyle = "#ffffff";
    g.fill();
    g.fillStyle = C.blue;
    // blue eyes on the white face
    g.save();
    g.translate(-0.06, -0.04);
    for (const [x, y] of [[-0.09, 0.0], [0.1, -0.04]]) {
      g.save();
      g.translate(x, y);
      g.rotate(-0.45);
      g.beginPath();
      g.roundRect(-0.045, -0.1, 0.09, 0.2, 0.045);
      g.fill();
      g.restore();
    }
    g.restore();
  }
  g.restore();
}

export const MSG = { header: 30, body: 40, bubbleH: 108, padX: 37 };

/** One bot message: avatar, "Research Bot  10:02 AM", grey bubble. Origin = header line's left (x 192-60). */
export function botMessage(name: string, body: string, opts: { header?: string; avatarEmpty?: boolean } = {}) {
  const header = opts.header ?? "Research Bot  10:02 AM";
  const bw = Math.ceil(measure(body, { size: MSG.body, tracking: -0.3 })) + MSG.padX * 2;
  const W = Math.max(155 + bw, 700);
  const H = 31 + MSG.bubbleH + 10;
  // local coords: avatar centre at (35, 15+20), header at x 95, bubble at x 90
  const m = canvasMesh(name, W, H + 40, (g) => {
    if (!opts.avatarEmpty) drawAvatar(g, 35, 35, 69);
    text(g, header, 95, 20, { size: MSG.header, weight: 500, color: "#111114", tracking: -0.2 });
    fillRR(g, 90, 51, bw, MSG.bubbleH, MSG.bubbleH / 2, "#e9edf3");
    text(g, body, 90 + MSG.padX, 51 + MSG.bubbleH / 2 + 2, { size: MSG.body, color: "#16161a", tracking: -0.3 });
  });
  // put the local origin at the canvas top-left
  m.geometry.translate(W / 2, -(H + 40) / 2, 0);
  m.userData.bubbleW = bw;
  return m;
}

/** A reaction pill: emoji + count. */
export function reactionPill(name: string, emoji: string, count: string, w = 131, h = 70, opts: { bg?: string; border?: string; size?: number } = {}) {
  const m = canvasMesh(name, w, h, (g) => {
    fillRR(g, 0, 0, w, h, h / 2, opts.bg ?? "#eef0f4");
    if (opts.border) {
      g.strokeStyle = opts.border;
      g.lineWidth = 3;
      g.beginPath();
      g.roundRect(1.5, 1.5, w - 3, h - 3, h / 2 - 1.5);
      g.stroke();
    }
    const s = opts.size ?? 34;
    g.font = `${s}px ${EMOJI}`;
    g.textBaseline = "middle";
    g.fillText(emoji, h * 0.32, h / 2 + 2);
    text(g, count, h * 0.32 + s * 1.35, h / 2 + 1, { size: s, weight: 400, color: "#2b2b30" });
  });
  m.geometry.translate(w / 2, -h / 2, 0);
  return m;
}

/** The bot as a cursor: a blue arrow (hotspot = its tip, the mesh origin) towing the little bot. */
export function botCursor(name = "research-bot-cursor", s = 1) {
  const W = 110 * s, H = 100 * s;
  const tip = { x: 78 * s, y: 8 * s };
  const m = canvasMesh(name, W, H, (g) => {
    g.save();
    g.scale(s, s);
    drawBot(g, "blue", 36, 64, 52, { eyes: { rot: -0.4, dx: 0.02, dy: 0.0 } });
    // arrow: tip up-right
    g.beginPath();
    g.moveTo(78, 8);
    g.lineTo(46, 22);
    g.lineTo(60, 28);
    g.lineTo(64, 44);
    g.closePath();
    g.lineJoin = "round";
    g.strokeStyle = "#ffffff";
    g.lineWidth = 6;
    g.stroke();
    g.fillStyle = C.blue;
    g.fill();
    g.restore();
  }, { pad: 4 });
  m.geometry.translate(W / 2 - tip.x, -(H / 2 - tip.y), 0);
  return m;
}

export { drawEyes };

/** Copy Bot as a cursor: a teal arrow pointing up-left (tip = mesh origin), the bot trailing below-right. */
export function tealCursor(name = "copy-bot-cursor", s = 1) {
  const W = 130 * s, H = 110 * s;
  const m = canvasMesh(name, W, H, (g) => {
    g.save();
    g.scale(s, s);
    drawBot(g, "teal", 92, 70, 72, { eyes: { w: 0.19, h: 0.08, rot: -0.1, dy: 0.06, gap: 0.24 } });
    g.beginPath();
    g.moveTo(8, 8);
    g.lineTo(58, 22);
    g.lineTo(36, 32);
    g.lineTo(26, 56);
    g.closePath();
    g.lineJoin = "round";
    g.strokeStyle = "#ffffff";
    g.lineWidth = 6;
    g.stroke();
    g.fillStyle = "#19c79d";
    g.fill();
    g.restore();
  }, { pad: 4 });
  m.geometry.translate(W / 2 - 8 * s, -(H / 2 - 8 * s), 0);
  return m;
}

/** A Slack-style app icon: gradient rounded square with a white bot peeking up. */
export function drawAppIcon(g: OffscreenCanvasRenderingContext2D, x: number, y: number, s: number, top: string, bottom: string, eye: string) {
  g.save();
  g.beginPath();
  g.roundRect(x, y, s, s, s * 0.2);
  const gr = g.createLinearGradient(x + s, y, x, y + s);
  gr.addColorStop(0, top);
  gr.addColorStop(1, bottom);
  g.fillStyle = gr;
  g.fill();
  g.clip();
  g.translate(x + s * 0.48, y + s * 0.8);
  g.scale(s * 0.95, s * 0.95);
  g.beginPath();
  g.arc(0, 0, 0.5, 0, Math.PI * 2);
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.fill();
  g.fillStyle = eye;
  for (const [ex, ey] of [[-0.06, -0.3], [0.12, -0.36]]) {
    g.save();
    g.translate(ex, ey);
    g.rotate(-0.6);
    g.beginPath();
    g.roundRect(-0.05, -0.11, 0.1, 0.22, 0.05);
    g.fill();
    g.restore();
  }
  g.restore();
}
