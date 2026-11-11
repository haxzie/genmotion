import { C, FONT_TEXT } from "./brand";
import { drawBot2D } from "./bot";
import { play, type G } from "./glyphs";

/** Static UI art for the texting and desktop beats, drawn once into canvases. */

/**
 * The finished video the bot sends: a frame from a launch ad with a play
 * button and scrubber, over a footer naming the file.
 */
export function drawVideoCard(g: G, w: number, h: number): void {
  const top = 197;
  g.save();
  g.beginPath();
  g.roundRect(0, 0, w, h, 34);
  g.clip();
  // the video frame: GenMotion's dark field with a green glow
  g.fillStyle = "#08080a";
  g.fillRect(0, 0, w, top);
  const rg = g.createRadialGradient(w * 0.5, top * 1.05, 10, w * 0.5, top * 1.05, w * 0.6);
  rg.addColorStop(0, "rgba(22,245,189,0.45)");
  rg.addColorStop(0.5, "rgba(10,160,98,0.18)");
  rg.addColorStop(1, "rgba(10,160,98,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, w, top);
  // the ad's headline, set in the film
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = C.gmText;
  g.font = `500 34px ${FONT_TEXT}`;
  g.fillText("Spring sale is live", w / 2, 74);
  // play button
  g.fillStyle = "rgba(255,255,255,0.16)";
  g.beginPath();
  g.arc(w / 2, 132, 24, 0, Math.PI * 2);
  g.fill();
  play(g, w / 2 + 2, 132, 18, "#ffffff");
  // scrubber
  g.fillStyle = "rgba(255,255,255,0.25)";
  g.beginPath();
  g.roundRect(24, top - 18, w - 48, 4, 2);
  g.fill();
  const sg = g.createLinearGradient(24, 0, 24 + (w - 48) * 0.38, 0);
  sg.addColorStop(0, C.gmLime);
  sg.addColorStop(1, C.gmMint);
  g.fillStyle = sg;
  g.beginPath();
  g.roundRect(24, top - 18, (w - 48) * 0.38, 4, 2);
  g.fill();
  g.textAlign = "left";
  // footer
  g.fillStyle = C.green;
  g.fillRect(0, top, w, h - top);
  g.fillStyle = "#ffffff";
  g.font = `500 22px ${FONT_TEXT}`;
  g.fillText("spring-sale-launch.mp4", 32, top + 32);
  g.font = `400 18px ${FONT_TEXT}`;
  g.fillText("0:20 · 1080p · made with GenMotion", 32, top + 62);
  // download arrow
  g.strokeStyle = "#ffffff";
  g.lineWidth = 3;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.save();
  g.translate(w - 50, top + 45);
  g.beginPath();
  g.moveTo(0, -14);
  g.lineTo(0, 8);
  g.moveTo(-9, -1);
  g.lineTo(0, 8);
  g.lineTo(9, -1);
  g.moveTo(-12, 15);
  g.lineTo(12, 15);
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
    ["Marketing", "6:42 PM", "10 spring sale ads are ready...", 147],
    ["Launch Videos", "6:15 PM", "Your v2 launch film rendered...", 225],
    ["Social Clips", "4:31 PM", "This week's Reels are queued...", 293],
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

/** The conversation header: a white pill with the bot and "Marketing". */
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
  g.fillText("Marketing", 66, 36);
}
