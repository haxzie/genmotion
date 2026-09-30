/** Reference-specific UI pieces drawn once into canvases. */
import * as THREE from "three";
import { C, FONT_TECH } from "./brand";
import { canvasMesh, roundRect } from "./kit";

type Ctx2D = OffscreenCanvasRenderingContext2D;

/** Rounded pill/box with a fill (flat or left→right gradient stops) and hairline stroke. */
export function pill(
  w: number,
  h: number,
  o: {
    r?: number;
    fill?: string | [number, string][];
    fillDir?: "x" | "y" | "diag";
    stroke?: string;
    strokeW?: number;
    name?: string;
    res?: number;
    anchor?: "left" | "center" | "right";
    draw?: (g: Ctx2D, w: number, h: number) => void;
  },
) {
  const pad = 4;
  return canvasMesh(
    w + pad * 2,
    h + pad * 2,
    (g) => {
      g.translate(pad, pad);
      const r = o.r ?? h / 2;
      if (o.fill) {
        roundRect(g, 0, 0, w, h, r);
        if (typeof o.fill === "string") g.fillStyle = o.fill;
        else {
          const dir = o.fillDir ?? "x";
          const gr =
            dir === "x" ? g.createLinearGradient(0, 0, w, 0) : dir === "y" ? g.createLinearGradient(0, 0, 0, h) : g.createLinearGradient(0, 0, w, h);
          for (const [s, c] of o.fill) gr.addColorStop(s, c);
          g.fillStyle = gr;
        }
        g.fill();
      }
      o.draw?.(g, w, h);
      if (o.stroke) {
        roundRect(g, (o.strokeW ?? 2) / 2, (o.strokeW ?? 2) / 2, w - (o.strokeW ?? 2), h - (o.strokeW ?? 2), r);
        g.strokeStyle = o.stroke;
        g.lineWidth = o.strokeW ?? 2;
        g.stroke();
      }
    },
    { res: o.res ?? 2, name: o.name, anchor: o.anchor },
  );
}

/** Padlock glyph, closed or with the shackle swung open. */
export function lockIcon(size: number, color: string, open: boolean, name: string, lw = 4) {
  return canvasMesh(
    size,
    size,
    (g) => {
      const s = size;
      g.strokeStyle = color;
      g.lineWidth = lw;
      g.lineCap = "round";
      g.lineJoin = "round";
      const bw = s * 0.52, bh = s * 0.38;
      const bx = (s - bw) / 2, by = s * 0.48;
      roundRect(g, bx, by, bw, bh, s * 0.07);
      g.stroke();
      g.beginPath();
      const sr = bw * 0.3;
      const cx = s / 2;
      if (open) {
        g.moveTo(cx - sr, by);
        g.lineTo(cx - sr, by - s * 0.14);
        g.arc(cx, by - s * 0.14, sr, Math.PI, 0);
        g.lineTo(cx + sr, by - s * 0.1);
      } else {
        g.moveTo(cx - sr, by);
        g.lineTo(cx - sr, by - s * 0.1);
        g.arc(cx, by - s * 0.1, sr, Math.PI, 0);
        g.lineTo(cx + sr, by);
      }
      g.stroke();
    },
    { res: 3, name },
  );
}

/** macOS-style pointing-hand cursor. */
export function handCursor(size = 64) {
  return canvasMesh(
    size,
    size,
    (g) => {
      const k = size / 32;
      g.scale(k, k);
      g.lineJoin = "round";
      g.beginPath();
      // index finger up, three knuckles, palm
      g.moveTo(11, 17);
      g.lineTo(11, 5);
      g.quadraticCurveTo(11, 2.5, 13, 2.5);
      g.quadraticCurveTo(15, 2.5, 15, 5);
      g.lineTo(15, 13);
      g.lineTo(15, 11.5);
      g.quadraticCurveTo(15, 10, 17, 10);
      g.quadraticCurveTo(19, 10, 19, 11.5);
      g.lineTo(19, 13);
      g.quadraticCurveTo(19, 11.5, 21, 11.5);
      g.quadraticCurveTo(23, 11.5, 23, 13);
      g.lineTo(23, 14);
      g.quadraticCurveTo(23, 12.8, 24.8, 12.8);
      g.quadraticCurveTo(26.5, 12.8, 26.5, 14.5);
      g.lineTo(26.5, 22);
      g.quadraticCurveTo(26.5, 28, 21, 29.5);
      g.lineTo(15, 29.5);
      g.quadraticCurveTo(12, 29.5, 10, 26);
      g.lineTo(6, 19.5);
      g.quadraticCurveTo(5, 17.5, 7, 16.8);
      g.quadraticCurveTo(9, 16.3, 11, 19);
      g.closePath();
      g.fillStyle = "#ffffff";
      g.fill();
      g.strokeStyle = "#000000";
      g.lineWidth = 1.4;
      g.stroke();
      g.beginPath();
      for (const x of [15, 19, 23]) {
        g.moveTo(x, 20);
        g.lineTo(x, 25);
      }
      g.lineWidth = 1;
      g.stroke();
    },
    { res: 3, name: "cursor-hand" },
  );
}

/** Gradient fill of the "Copy link" button / orb: mottled yellow ↔ red. */
export function orbGradient(g: Ctx2D, w: number, h: number) {
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, "#d1252b");
  gr.addColorStop(0.35, "#f2d05f");
  gr.addColorStop(0.6, "#f1cc51");
  gr.addColorStop(1, "#d01f25");
  return gr;
}

export function copyButton(w: number, h: number, label: string, name = "copy-link-button") {
  return pill(w, h, {
    r: h * 0.18,
    name,
    res: 2,
    draw: (g) => {
      roundRect(g, 0, 0, w, h, h * 0.18);
      g.fillStyle = orbGradient(g, w, h);
      g.fill();
      // soft light blotches
      const b = g.createRadialGradient(w * 0.62, h * 0.35, 0, w * 0.62, h * 0.35, w * 0.35);
      b.addColorStop(0, "rgba(255,215,82,0.55)");
      b.addColorStop(1, "rgba(255,215,82,0)");
      g.fillStyle = b;
      g.fill();
      g.fillStyle = "#ffffff";
      g.font = `500 ${Math.round(h * 0.2)}px ${FONT_TECH}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(label, w / 2, h / 2);
    },
  });
}

export const mat = (m: THREE.Mesh) => m.material as THREE.MeshBasicMaterial;
export { C };

/** L1 / L2 pill fills — shared by scenes 3 and 4 so the handoff matches. */
export const L1_FILL: [number, string][] = [[0, "#e0b012"], [0.45, "#721417"], [0.8, "#190405"], [1, "#050605"]];
export const L2_FILL: [number, string][] = [[0, "#691215"], [0.45, "#440c0e"], [0.85, "#0e0303"], [1, "#050606"]];
