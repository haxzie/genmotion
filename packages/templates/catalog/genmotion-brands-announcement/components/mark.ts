/**
 * The GenMotion mark, from its own 512x512 SVG path, as a flat shape with the
 * brand's lime→teal gradient baked per vertex along the mark's diagonal.
 */
import * as THREE from "three";
import { PALETTE } from "./drawing";

const O = 256;
const sx = (x: number) => (x - O) / O;
const sy = (y: number) => (O - y) / O;

function markShape(): THREE.Shape {
  const s = new THREE.Shape();
  const m = (x: number, y: number) => s.moveTo(sx(x), sy(y));
  const l = (x: number, y: number) => s.lineTo(sx(x), sy(y));
  const c = (a: number, b: number, cc: number, d: number, x: number, y: number) =>
    s.bezierCurveTo(sx(a), sy(b), sx(cc), sy(d), sx(x), sy(y));
  m(280.083, 111.725);
  l(280.083, 38.5);
  c(280.083, 25.2083, 269.208, 14.3333, 255.917, 14.3333);
  c(179.55, 14.3333, 118.65, 108.1, 111.642, 231.833);
  l(38.4167, 231.833);
  c(25.125, 231.833, 14.25, 242.708, 14.25, 256);
  c(14.25, 332.367, 108.017, 393.267, 231.75, 400.275);
  l(231.75, 473.5);
  c(231.75, 486.792, 242.625, 497.667, 255.917, 497.667);
  c(332.283, 497.667, 393.183, 403.9, 400.192, 280.167);
  l(473.417, 280.167);
  c(486.708, 280.167, 497.583, 269.292, 497.583, 256);
  c(497.583, 179.633, 403.817, 118.733, 280.083, 111.725);

  const dot = new THREE.Path();
  const dm = (x: number, y: number) => dot.moveTo(sx(x), sy(y));
  const dc = (a: number, b: number, cc: number, d: number, x: number, y: number) =>
    dot.bezierCurveTo(sx(a), sy(b), sx(cc), sy(d), sx(x), sy(y));
  dm(255.917, 292.25);
  dc(235.858, 292.25, 219.667, 276.058, 219.667, 256);
  dc(219.667, 235.942, 235.858, 219.75, 255.917, 219.75);
  dc(275.975, 219.75, 292.167, 235.942, 292.167, 256);
  dc(292.167, 276.058, 275.975, 292.25, 255.917, 292.25);
  s.holes.push(dot);
  return s;
}

let shared: THREE.ShapeGeometry | null = null;

function markGeometry(): THREE.ShapeGeometry {
  if (shared) return shared;
  const g = new THREE.ShapeGeometry(markShape(), 40);
  const pos = g.attributes.position!;
  const lime = new THREE.Color(PALETTE.lime);
  const teal = new THREE.Color(PALETTE.teal);
  const from = new THREE.Vector2(sx(61), sy(88.5));
  const axis = new THREE.Vector2(sx(428.5), sy(430)).sub(from);
  const span = axis.lengthSq();
  const colors = new Float32Array(pos.count * 3);
  const p = new THREE.Vector2();
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    p.set(pos.getX(i), pos.getY(i)).sub(from);
    c.copy(lime).lerp(teal, THREE.MathUtils.clamp(p.dot(axis) / span, 0, 1));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  shared = g;
  return g;
}

/** The mark, `size` px across. Its material is its own, so it can fade alone. */
export function genmotionMark(name: string, size: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    markGeometry(),
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  mesh.name = name;
  mesh.scale.setScalar(size / 2);
  mesh.renderOrder = 7;
  return mesh;
}
