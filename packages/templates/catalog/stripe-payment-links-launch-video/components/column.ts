import * as THREE from "three";
import { backdrop } from "./fx";

/** The lit teal column (a vertical band with glowing edges) as an opaque full-frame plane. */
export function tealColumn(name = "teal-column") {
  const column = backdrop(1920, 1080, (g, w, h) => {
    const bw = 580;
    const x0 = (w - bw) / 2;
    // outer glow either side of the band
    for (const [x, dir] of [[x0, -1], [x0 + bw, 1]] as const) {
      const gr = g.createLinearGradient(x, 0, x + dir * 120, 0);
      gr.addColorStop(0, "rgba(190,250,255,0.55)");
      gr.addColorStop(0.35, "rgba(120,220,230,0.18)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(dir < 0 ? x - 120 : x, 0, 120, h);
    }
    // body: light cyan left edge → teal → deep petrol on the right
    const body = g.createLinearGradient(x0, 0, x0 + bw, 0);
    body.addColorStop(0, "#9fe9ea");
    body.addColorStop(0.08, "#5cc3c6");
    body.addColorStop(0.45, "#2f9497");
    body.addColorStop(0.8, "#1d5866");
    body.addColorStop(0.94, "#2a6f7c");
    body.addColorStop(1, "#a8eef2");
    g.fillStyle = body;
    g.fillRect(x0, 0, bw, h);
    // top-lit: brighter at the top, dimmer at the bottom
    const v = g.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, "rgba(255,255,255,0.1)");
    v.addColorStop(0.6, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,20,30,0.25)");
    g.fillStyle = v;
    g.fillRect(x0, 0, bw, h);
    // crisp edge lines
    g.fillStyle = "rgba(225,255,255,0.9)";
    g.fillRect(x0, 0, 3, h);
    g.fillRect(x0 + bw - 3, 0, 3, h);
  }, name, 1);
  column.renderOrder = -10;
  const m = column.material as THREE.MeshBasicMaterial;
  m.depthTest = false;
  m.transparent = false;
  return column;
}

/** The same column in Stripe light mode: a blurple glass band on the pale page. */
export function blurpleColumn(name = "blurple-column") {
  const column = backdrop(1920, 1080, (g, w, h) => {
    g.fillStyle = "#F6F9FC";
    g.fillRect(0, 0, w, h);
    const bw = 580;
    const x0 = (w - bw) / 2;
    for (const [x, dir] of [[x0, -1], [x0 + bw, 1]] as const) {
      const gr = g.createLinearGradient(x, 0, x + dir * 140, 0);
      gr.addColorStop(0, "rgba(99,91,255,0.38)");
      gr.addColorStop(0.4, "rgba(169,96,238,0.12)");
      gr.addColorStop(1, "rgba(246,249,252,0)");
      g.fillStyle = gr;
      g.fillRect(dir < 0 ? x - 140 : x, 0, 140, h);
    }
    const body = g.createLinearGradient(x0, 0, x0 + bw, 0);
    body.addColorStop(0, "#D4D1FF");
    body.addColorStop(0.08, "#9A94FF");
    body.addColorStop(0.45, "#635BFF");
    body.addColorStop(0.8, "#3F37D6");
    body.addColorStop(0.94, "#5A52F0");
    body.addColorStop(1, "#CFCBFF");
    g.fillStyle = body;
    g.fillRect(x0, 0, bw, h);
    const v = g.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, "rgba(255,255,255,0.16)");
    v.addColorStop(0.6, "rgba(255,255,255,0)");
    v.addColorStop(1, "rgba(20,10,80,0.18)");
    g.fillStyle = v;
    g.fillRect(x0, 0, bw, h);
    g.fillStyle = "rgba(255,255,255,0.95)";
    g.fillRect(x0, 0, 3, h);
    g.fillRect(x0 + bw - 3, 0, 3, h);
  }, name, 1);
  column.renderOrder = -10;
  const m = column.material as THREE.MeshBasicMaterial;
  m.depthTest = false;
  m.transparent = false;
  return column;
}
