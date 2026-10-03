import { canvasTexture, rrPath } from "./ui";

const PURPLE = "#DD2C00"; // Firebase flame red (C.red)

/** The list tile glyphs (white shapes with purple detail), drawn into a 97 px tile. */
export function tileTexture(kind: string) {
  const S = 97;
  return canvasTexture(S + 4, S + 4, (g) => {
    g.translate(2, 2);
    g.beginPath(); rrPath(g, 0, 0, S, S, 22); g.fillStyle = PURPLE; g.fill();
    const c = S / 2;
    g.fillStyle = "#ffffff";
    g.strokeStyle = PURPLE;
    g.lineWidth = 3.6;
    g.lineCap = "round";
    g.lineJoin = "round";
    if (kind === "train") {
      // a document with a folded corner and a plus
      const w = 38, h = 48, x = c - w / 2, y = c - h / 2, fold = 12;
      g.beginPath();
      g.moveTo(x + 7, y); g.lineTo(x + w - fold, y); g.lineTo(x + w, y + fold); g.lineTo(x + w, y + h - 7);
      g.arcTo(x + w, y + h, x + w - 7, y + h, 7); g.lineTo(x + 7, y + h); g.arcTo(x, y + h, x, y + h - 7, 7);
      g.lineTo(x, y + 7); g.arcTo(x, y, x + 7, y, 7); g.closePath(); g.fill();
      // the fold
      g.beginPath(); g.moveTo(x + w - fold, y); g.lineTo(x + w - fold, y + fold); g.lineTo(x + w, y + fold); g.stroke();
      g.beginPath(); g.moveTo(c - 7, c + 4); g.lineTo(c + 7, c + 4); g.moveTo(c, c - 3); g.lineTo(c, c + 11); g.stroke();
    } else {
      g.beginPath(); rrPath(g, c - 22, c - 22, 44, 44, 11); g.fill();
      if (kind === "deploy") {
        g.beginPath(); g.moveTo(c - 9, c); g.lineTo(c + 9, c); g.moveTo(c, c - 9); g.lineTo(c, c + 9); g.stroke();
      } else if (kind === "evaluate") {
        g.beginPath(); g.moveTo(c - 12, c + 8); g.lineTo(c - 3, c - 1); g.lineTo(c + 3, c + 4); g.lineTo(c + 12, c - 6); g.stroke();
        g.beginPath(); g.arc(c + 21, c - 21, 8.5, 0, Math.PI * 2); g.fillStyle = "#ffffff"; g.fill();
        g.lineWidth = 3.4; g.stroke();
      } else {
        g.beginPath();
        g.moveTo(c - 9, c + 11); g.lineTo(c - 9, c - 4);
        g.moveTo(c, c + 11); g.lineTo(c, c - 11);
        g.moveTo(c + 9, c + 11); g.lineTo(c + 9, c + 4);
        g.stroke();
      }
    }
  });
}

