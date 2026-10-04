import * as THREE from "three";

function tex(c: OffscreenCanvas) {
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Soft radial blob, white centre → transparent. */
export function radialTexture(size = 256, stops: [number, string][] = [[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,0.45)"], [1, "rgba(255,255,255,0)"]]) {
  const c = new OffscreenCanvas(size, size);
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  return tex(c);
}

export function glowSprite(color: string, size: number, opacity = 1, name = "glow") {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: radialTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  );
  m.name = name;
  m.userData.pickable = false;
  return m;
}

/**
 * A grid of thin lines with "+" markers at some intersections, drawn into a canvas.
 * cells × cells, each `cell` px. Optional radial fade to the edges.
 */
export function gridTexture(opts: {
  cells: number;
  cell: number;
  line: string;
  lineWidth?: number;
  cross?: string;
  crossEvery?: number;
  crossSize?: number;
  fade?: boolean;
  px?: number;
}) {
  const px = opts.px ?? 2;
  const S = opts.cells * opts.cell;
  const c = new OffscreenCanvas(S * px, S * px);
  const g = c.getContext("2d")!;
  g.scale(px, px);
  g.strokeStyle = opts.line;
  g.lineWidth = opts.lineWidth ?? 1;
  g.beginPath();
  for (let i = 0; i <= opts.cells; i++) {
    const p = i * opts.cell;
    g.moveTo(p, 0); g.lineTo(p, S);
    g.moveTo(0, p); g.lineTo(S, p);
  }
  g.stroke();
  if (opts.cross) {
    const e = opts.crossEvery ?? 2;
    const cs = opts.crossSize ?? opts.cell * 0.32;
    g.strokeStyle = opts.cross;
    g.lineWidth = (opts.lineWidth ?? 1) * 1.6;
    for (let i = e; i < opts.cells; i += e)
      for (let j = e; j < opts.cells; j += e) {
        const x = i * opts.cell, y = j * opts.cell;
        const gr = g.createRadialGradient(x, y, 0, x, y, cs);
        gr.addColorStop(0, opts.cross);
        gr.addColorStop(1, "rgba(255,255,255,0)");
        g.strokeStyle = gr;
        g.beginPath();
        g.moveTo(x - cs, y); g.lineTo(x + cs, y);
        g.moveTo(x, y - cs); g.lineTo(x, y + cs);
        g.stroke();
      }
  }
  if (opts.fade) {
    g.globalCompositeOperation = "destination-in";
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, "rgba(0,0,0,1)");
    gr.addColorStop(0.6, "rgba(0,0,0,0.7)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
  }
  return tex(c);
}

/** Horizontal light streak: bright round head at the right, tail fading to the left. */
export function streakTexture(head = "#ffffff", tail = "rgba(255,255,255,0)", w = 1024, h = 64) {
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, tail);
  gr.addColorStop(0.75, head);
  gr.addColorStop(1, head);
  // soft vertical falloff
  g.fillStyle = gr;
  g.filter = "blur(6px)";
  g.beginPath();
  g.moveTo(10, h / 2);
  g.lineTo(w - h / 2, h / 2 - h * 0.22);
  g.arc(w - h / 2, h / 2, h * 0.22, -Math.PI / 2, Math.PI / 2);
  g.closePath();
  g.fill();
  g.filter = "none";
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(10, h / 2);
  g.lineTo(w - h / 2, h / 2 - h * 0.12);
  g.arc(w - h / 2, h / 2, h * 0.12, -Math.PI / 2, Math.PI / 2);
  g.closePath();
  g.fill();
  return tex(c);
}

/** Full-frame gradient plane (drawn by a callback) used as a backdrop. Not pickable. */
export function backdrop(w: number, h: number, draw: (g: OffscreenCanvasRenderingContext2D, w: number, h: number) => void, name = "backdrop", res = 0.5) {
  const c = new OffscreenCanvas(Math.ceil(w * res), Math.ceil(h * res));
  const g = c.getContext("2d")!;
  g.scale(res, res);
  draw(g, w, h);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, toneMapped: false }),
  );
  m.name = name;
  m.userData.pickable = false;
  return m;
}

/** Diamond-shaped sparkle markers used on the "Meet" and end-card backdrops. */
export function drawDiamond(g: OffscreenCanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y);
  g.closePath();
  g.fill();
}
