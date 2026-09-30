import * as THREE from "three";

/**
 * Original 3D commerce tiles: a bevelled rounded slab with a hand-drawn glyph on its face.
 * Glyphs are drawn once to a canvas in the builder.
 */
export type Glyph =
  | "shield" | "check" | "cart" | "rupee" | "shirt" | "chart" | "plane"
  | "globe" | "bag" | "coins" | "arrow" | "bar" | "card" | "phone";

export const GLYPHS: Glyph[] = [
  "shield", "check", "cart", "rupee", "shirt", "chart", "plane",
  "globe", "bag", "coins", "arrow", "bar", "card", "phone",
];

type Skin = "light" | "navy" | "dark";

const SKIN = {
  light: { face: "#eef2ff", edge: 0xdfe5f7, ink: "#2c3bd1", ink2: "#8fa3ff" },
  navy: { face: "#1c2270", edge: 0x151a58, ink: "#ffffff", ink2: "#8fa3ff" },
  dark: { face: "#15161c", edge: 0x0e0f14, ink: "#f2f4ff", ink2: "#7d8cff" },
};

function roundedShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

let slabGeo: THREE.ExtrudeGeometry | null = null;
function slab() {
  return (slabGeo ??= new THREE.ExtrudeGeometry(roundedShape(1, 1, 0.22), {
    depth: 0.18, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4, curveSegments: 10,
  }).translate(0, 0, -0.18));
}

function drawGlyph(g: OffscreenCanvasRenderingContext2D, kind: Glyph, S: number, ink: string, ink2: string) {
  g.save();
  g.translate(S / 2, S / 2);
  g.lineCap = "round";
  g.lineJoin = "round";
  g.fillStyle = ink;
  g.strokeStyle = ink;
  const u = S / 100;
  g.lineWidth = 7 * u;
  const P = (pts: number[][], close = false) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x * u, y * u) : g.moveTo(x * u, y * u)));
    if (close) g.closePath();
  };
  switch (kind) {
    case "shield":
      P([[0, -30], [24, -20], [22, 8], [0, 30], [-22, 8], [-24, -20]], true);
      g.fillStyle = ink2; g.fill(); g.stroke();
      P([[-10, 0], [-2, 9], [12, -8]]); g.strokeStyle = "#ffffff"; g.stroke();
      break;
    case "check":
      g.beginPath(); g.arc(0, 0, 30 * u, 0, Math.PI * 2); g.fillStyle = "#22c55e"; g.fill();
      P([[-13, 1], [-3, 11], [14, -9]]); g.strokeStyle = "#ffffff"; g.lineWidth = 8 * u; g.stroke();
      break;
    case "cart":
      P([[-32, -22], [-22, -22], [-12, 14], [22, 14], [28, -12], [-18, -12]]); g.stroke();
      g.beginPath(); g.arc(-8 * u, 26 * u, 5 * u, 0, 7); g.arc(18 * u, 26 * u, 5 * u, 0, 7); g.fill();
      break;
    case "rupee":
      g.beginPath(); g.arc(0, 0, 32 * u, 0, 7); g.fillStyle = ink2; g.fill();
      g.strokeStyle = "#ffffff"; g.lineWidth = 6 * u;
      P([[-12, -16], [12, -16]]); g.stroke(); P([[-12, -6], [12, -6]]); g.stroke();
      g.beginPath(); g.moveTo(-12 * u, -16 * u); g.quadraticCurveTo(14 * u, -16 * u, 8 * u, 2 * u); g.lineTo(-10 * u, 2 * u); g.lineTo(10 * u, 18 * u); g.stroke();
      break;
    case "shirt":
      P([[-12, -26], [-30, -16], [-24, -2], [-16, -6], [-16, 28], [16, 28], [16, -6], [24, -2], [30, -16], [12, -26], [0, -18]], true);
      g.fill();
      break;
    case "chart":
      [[-26, 10, 20], [-8, -2, 32], [10, -14, 44]].forEach(([x, y, h]) => { g.fillStyle = ink2; g.fillRect(x * u, y * u, 14 * u, (h - 14) * u + 18 * u); });
      P([[-30, 6], [-8, -10], [6, -4], [28, -26]]); g.strokeStyle = ink; g.stroke();
      P([[16, -26], [28, -26], [28, -14]]); g.stroke();
      break;
    case "plane":
      P([[-28, 6], [28, -24], [8, 28], [0, 10]], true); g.fill();
      P([[0, 10], [28, -24]]); g.strokeStyle = ink2; g.lineWidth = 4 * u; g.stroke();
      break;
    case "globe":
      g.beginPath(); g.arc(0, 0, 30 * u, 0, 7); g.fillStyle = "#34c77b"; g.fill();
      g.strokeStyle = "#0f5132"; g.lineWidth = 3 * u;
      g.beginPath(); g.ellipse(0, 0, 13 * u, 30 * u, 0, 0, 7); g.stroke();
      P([[-30, 0], [30, 0]]); g.stroke(); P([[-26, -14], [26, -14]]); g.stroke(); P([[-26, 14], [26, 14]]); g.stroke();
      break;
    case "bag":
      P([[-22, -10], [22, -10], [26, 30], [-26, 30]], true); g.fill();
      g.beginPath(); g.arc(0, -12 * u, 11 * u, Math.PI, 0); g.strokeStyle = ink; g.stroke();
      break;
    case "coins":
      for (let i = 0; i < 4; i++) {
        g.beginPath(); g.ellipse(0, (18 - i * 11) * u, 26 * u, 9 * u, 0, 0, 7);
        g.fillStyle = i % 2 ? ink2 : ink; g.fill();
      }
      break;
    case "arrow":
      P([[0, -30], [24, -4], [9, -4], [9, 28], [-9, 28], [-9, -4], [-24, -4]], true); g.fill();
      break;
    case "bar":
      g.fillStyle = ink2; g.globalAlpha = 0.35; g.fillRect(-34 * u, -6 * u, 68 * u, 12 * u);
      g.globalAlpha = 1; g.fillStyle = "#22c55e"; g.fillRect(-34 * u, -6 * u, 46 * u, 12 * u);
      break;
    case "card":
      g.fillStyle = ink; g.beginPath(); g.roundRect(-32 * u, -20 * u, 64 * u, 40 * u, 7 * u); g.fill();
      g.fillStyle = ink2; g.fillRect(-32 * u, -10 * u, 64 * u, 8 * u);
      g.fillStyle = "#f5c542"; g.fillRect(-24 * u, 5 * u, 12 * u, 9 * u);
      break;
    case "phone":
      g.beginPath(); g.roundRect(-17 * u, -30 * u, 34 * u, 60 * u, 8 * u); g.fill();
      g.fillStyle = ink2; g.beginPath(); g.roundRect(-13 * u, -24 * u, 26 * u, 46 * u, 4 * u); g.fill();
      break;
  }
  g.restore();
}

const faceCache = new Map<string, THREE.MeshBasicMaterial>();
const edgeCache = new Map<string, THREE.MeshStandardMaterial>();

/** A tile of `size` world units. Group contains the slab + a face plane. */
export function tile(kind: Glyph, skin: Skin, size: number, name: string) {
  const sk = SKIN[skin];
  const key = kind + skin;
  let face = faceCache.get(key);
  if (!face) {
    const S = 256;
    const cv = new OffscreenCanvas(S, S);
    const g = cv.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, S, S);
    grad.addColorStop(0, sk.face);
    grad.addColorStop(1, skin === "light" ? "#d6ddf6" : "#0c0e2c");
    g.fillStyle = grad;
    g.beginPath(); g.roundRect(0, 0, S, S, S * 0.2); g.fill();
    drawGlyph(g, kind, S * 0.92, sk.ink, sk.ink2);
    const tex = new THREE.CanvasTexture(cv as unknown as HTMLCanvasElement);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    face = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
    faceCache.set(key, face);
  }
  let edge = edgeCache.get(skin);
  if (!edge) {
    edge = new THREE.MeshStandardMaterial({ color: sk.edge, roughness: 0.35, metalness: 0.15 });
    edgeCache.set(skin, edge);
  }
  const group = new THREE.Group();
  group.name = name;
  const body = new THREE.Mesh(slab(), edge);
  body.name = `${name}-body`;
  const f = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 1.02), face);
  f.position.z = 0.061;
  f.name = `${name}-face`;
  group.add(body, f);
  group.scale.setScalar(size);
  return group;
}

/** Standard 3-light rig for the tiles. */
export function tileLights(scene: THREE.Scene) {
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(-4, 6, 8);
  const rim = new THREE.DirectionalLight(0x9aa6ff, 1.4);
  rim.position.set(6, -3, 4);
  const amb = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(key, rim, amb);
}
