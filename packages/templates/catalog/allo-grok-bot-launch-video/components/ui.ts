import { C, FONT_TEXT } from "./brand";
import { drawBot2D } from "./bot";
import type { G } from "./glyphs";

/** Static UI art for the texting and desktop beats, drawn once into canvases. */

export function drawQuoteCard(g: G, w: number, h: number): void {
  const top = 197;
  g.save();
  g.beginPath();
  g.roundRect(0, 0, w, h, 10);
  g.clip();
  const lg = g.createLinearGradient(0, 0, w, 0);
  lg.addColorStop(0, "#0d0f30");
  lg.addColorStop(0.55, "#0d3a3a");
  lg.addColorStop(1, "#0a8c58");
  g.fillStyle = lg;
  g.fillRect(0, 0, w, top);
  const vg = g.createLinearGradient(0, 0, 0, top);
  vg.addColorStop(0, "rgba(10,160,98,0.35)");
  vg.addColorStop(0.45, "rgba(10,160,98,0)");
  vg.addColorStop(1, "rgba(8,8,30,0.6)");
  g.fillStyle = vg;
  g.fillRect(0, 0, w, top);
  // document
  g.fillStyle = "#fdfdfd";
  g.beginPath();
  g.roundRect(45, 46, 393, top - 46 + 4, [6, 6, 0, 0]);
  g.fill();
  g.fillStyle = "#e8e8ea";
  g.fillRect(72, 70, 40, 6);
  g.fillStyle = "#16171a";
  g.font = `500 38px ${FONT_TEXT}`;
  g.textBaseline = "middle";
  g.fillText("$1,000.00", 70, 103);
  g.strokeStyle = "#ececee";
  g.lineWidth = 1;
  g.strokeRect(58, 141, 175, 60);
  g.strokeRect(250, 141, 175, 60);
  g.fillStyle = "#e6e6e8";
  for (const x of [68, 260]) {
    g.fillRect(x, 150, 40, 5);
    g.fillRect(x, 162, 100, 5);
    g.fillRect(x, 174, 115, 5);
  }
  // footer
  g.fillStyle = C.green;
  g.fillRect(0, top, w, h - top);
  g.fillStyle = "#ffffff";
  g.font = `500 22px ${FONT_TEXT}`;
  g.fillText("Project Quote", 32, top + 34);
  g.fillStyle = "rgba(255,255,255,0.8)";
  g.font = `400 13px ${FONT_TEXT}`;
  g.fillText("startaproject.com", 32, top + 62);
  // link icon
  g.strokeStyle = "#ffffff";
  g.lineWidth = 3;
  g.lineCap = "round";
  g.save();
  g.translate(w - 52, top + 45);
  g.rotate(-Math.PI / 4);
  g.beginPath();
  g.roundRect(-16, -7, 18, 14, 7);
  g.roundRect(-2, -7, 18, 14, 7);
  g.stroke();
  g.restore();
  g.restore();
}

function blob(g: G, cx: number, cy: number, r: number, color: string): void {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(cx - r * 0.9, cy + r * 0.2);
  g.bezierCurveTo(cx - r * 1.0, cy - r * 0.9, cx + r * 0.2, cy - r * 1.3, cx + r * 0.7, cy - r * 0.6);
  g.bezierCurveTo(cx + r * 1.1, cy - r * 0.1, cx + r * 1.0, cy + r * 0.9, cx + r * 0.1, cy + r * 0.95);
  g.bezierCurveTo(cx - r * 0.5, cy + r * 1.0, cx - r * 0.85, cy + r * 0.7, cx - r * 0.9, cy + r * 0.2);
  g.fill();
  g.fillStyle = "#ffffff";
  for (const dx of [0.05, 0.35]) {
    g.beginPath();
    g.roundRect(cx + r * dx - r * 0.06, cy - r * 0.35, r * 0.12, r * 0.24, r * 0.06);
    g.fill();
  }
}

/** The app's sidebar: traffic lights, search and three assistants. */
export function drawSidebar(g: G, w: number, h: number): void {
  g.save();
  g.beginPath();
  g.roundRect(0, 0, w, h, [22, 0, 0, 22]);
  g.clip();
  g.fillStyle = C.sidebar;
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#e4e4e6";
  g.fillRect(w - 1, 0, 1, h);
  ["#fe5f57", "#febc2e", "#28c840"].forEach((c, i) => {
    g.fillStyle = c;
    g.beginPath();
    g.arc(27 + i * 33.5, 30, 9, 0, Math.PI * 2);
    g.fill();
  });
  g.strokeStyle = "#8a8a8e";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(361, 31);
  g.lineTo(377, 31);
  g.moveTo(369, 23);
  g.lineTo(369, 39);
  g.stroke();
  g.fillStyle = "#e7e7e9";
  g.beginPath();
  g.roundRect(16, 65, 371, 45, 12);
  g.fill();
  g.strokeStyle = "#9a9a9e";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(37, 86, 7, 0, Math.PI * 2);
  g.moveTo(42, 91);
  g.lineTo(47, 96);
  g.stroke();
  g.textBaseline = "middle";
  g.fillStyle = "#9a9a9e";
  g.font = `400 20px ${FONT_TEXT}`;
  g.fillText("Search", 58, 88);
  g.fillStyle = "#e0e0e2";
  g.beginPath();
  g.roundRect(16, 122, 371, 77, 12);
  g.fill();
  const rows: [string, string, string, number][] = [
    ["Front Desk", "6:42 PM", "Marie called back about Thu...", 147],
    ["Personal Assistant", "6:15 PM", "Your car's due for its service n...", 225],
    ["Executive Assistant", "4:31 PM", "The accountant needs the Q3...", 293],
  ];
  rows.forEach(([title, time, sub, y], i) => {
    if (i === 0) drawBot2D(g, 57, y + 13, 24);
    else blob(g, 55, y + 13, 25, i === 1 ? "#2ea0f5" : "#2fd17a");
    g.fillStyle = "#111114";
    g.font = `400 20px ${FONT_TEXT}`;
    g.textAlign = "left";
    g.fillText(title, 90, y);
    g.fillStyle = "#77777c";
    g.font = `400 18px ${FONT_TEXT}`;
    g.fillText(sub, 90, y + 27);
    g.textAlign = "right";
    g.font = `400 16px ${FONT_TEXT}`;
    g.fillStyle = "#8a8a8e";
    g.fillText(time, 372, y);
    g.textAlign = "left";
  });
  g.restore();
}

/** The conversation header: a white pill with the bot and "Front Desk". */
export function drawHeaderPill(g: G): void {
  g.save();
  g.shadowColor = "rgba(0,0,0,0.12)";
  g.shadowBlur = 12;
  g.shadowOffsetY = 3;
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.roundRect(12, 9, 166, 52, 26);
  g.fill();
  g.restore();
  drawBot2D(g, 42, 35, 13);
  g.fillStyle = "#111114";
  g.font = `400 19px ${FONT_TEXT}`;
  g.textBaseline = "middle";
  g.fillText("Front Desk", 66, 36);
}
