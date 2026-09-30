import * as THREE from "three";
import { FONT } from "./brand";

/**
 * World scale for the whole project: 1 world unit = 100 composition px on the
 * z = 0 plane (see fitCamera). Canvases are drawn at 2× for crisp type.
 */
export const PX = 0.01; // world units per composition px
const RES = 2; // canvas px per composition px

export type Fill = string | [string, string]; // solid, or a left→right gradient

export interface TextOpts {
  size: number; // composition px
  weight?: number;
  fill?: Fill;
  tracking?: number; // em
  align?: "center" | "left" | "right";
}

let _measure: OffscreenCanvasRenderingContext2D | null = null;

function fontOf(size: number, weight: number) {
  return `${weight} ${size * RES}px ${FONT}`;
}

/** Width (composition px) of a string at a size/weight/tracking. */
export function measure(text: string, size: number, weight = 500, tracking = 0) {
  const measureCtx = (_measure ??= new OffscreenCanvas(8, 8).getContext("2d")!);
  measureCtx.font = fontOf(size, weight);
  (measureCtx as any).letterSpacing = `${tracking * size * RES}px`;
  const w = measureCtx.measureText(text).width / RES;
  (measureCtx as any).letterSpacing = "0px";
  return w;
}

export interface TextMesh extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  userData: { w: number; h: number; [k: string]: unknown };
}

/** One line of type as an unlit, transparent plane. Anchor per `align`, vertically centred. */
export function text(str: string, o: TextOpts): TextMesh {
  const size = o.size;
  const weight = o.weight ?? 500;
  const tracking = o.tracking ?? (size >= 60 ? -0.02 : 0);
  const pad = Math.ceil(size * 0.3);
  const tw = Math.ceil(measure(str, size, weight, tracking));
  const w = tw + pad * 2;
  const h = Math.ceil(size * 1.45) + pad * 2;

  const canvas = new OffscreenCanvas(w * RES, h * RES);
  const g = canvas.getContext("2d")!;
  g.font = fontOf(size, weight);
  (g as any).letterSpacing = `${tracking * size * RES}px`;
  g.textBaseline = "middle";
  g.textAlign = "left";
  const fill = o.fill ?? "#ededef";
  if (Array.isArray(fill)) {
    const grad = g.createLinearGradient(pad * RES, 0, (pad + tw) * RES, 0);
    grad.addColorStop(0, fill[0]);
    grad.addColorStop(1, fill[1]);
    g.fillStyle = grad;
  } else g.fillStyle = fill;
  g.fillText(str, pad * RES, (h / 2 + size * 0.04) * RES);

  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const geo = new THREE.PlaneGeometry(w * PX, h * PX);
  const align = o.align ?? "center";
  if (align === "left") geo.translate((w / 2 - pad) * PX, 0, 0);
  if (align === "right") geo.translate((-w / 2 + pad) * PX, 0, 0);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
  ) as unknown as TextMesh;
  mesh.userData.w = tw * PX;
  mesh.userData.h = size * PX;
  mesh.name = slug(str);
  return mesh;
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "text";
}

export interface Part {
  text: string;
  fill?: Fill;
}

/**
 * A line built from separately animatable words, laid out with real spacing and
 * centred on the group origin (or left-aligned with `align: "left"`).
 * Returns the group; each word mesh is in group.userData.words with its rest x.
 */
export function words(parts: Part[], o: TextOpts) {
  const group = new THREE.Group();
  const weight = o.weight ?? 500;
  const tracking = o.tracking ?? (o.size >= 60 ? -0.02 : 0);
  const space = measure(" ", o.size, weight, tracking);
  const widths = parts.map((p) => measure(p.text, o.size, weight, tracking));
  const total = widths.reduce((a, b) => a + b, 0) + space * (parts.length - 1);
  let x = o.align === "left" ? 0 : -total / 2;
  const list: TextMesh[] = [];
  parts.forEach((p, i) => {
    const m = text(p.text, { ...o, fill: p.fill ?? o.fill, align: "left" });
    m.position.x = x * PX;
    m.userData.restX = m.position.x;
    x += widths[i] + space;
    group.add(m);
    list.push(m);
  });
  group.userData.words = list;
  group.userData.width = total * PX;
  group.name = slug(parts.map((p) => p.text).join(" "));
  return group;
}

/**
 * A word split into letters (each its own plane) for letter-by-letter builds.
 * `fill` gradients are sampled per letter by x, so the whole word reads as one ramp.
 */
export function letters(word: string, o: TextOpts & { fill: Fill }) {
  const group = new THREE.Group();
  const weight = o.weight ?? 500;
  const tracking = o.tracking ?? -0.03;
  const total = measure(word, o.size, weight, tracking);
  const list: TextMesh[] = [];
  const cA = new THREE.Color();
  const cB = new THREE.Color();
  for (let i = 0; i < word.length; i++) {
    const before = measure(word.slice(0, i), o.size, weight, tracking);
    const ch = word[i];
    const cw = measure(ch, o.size, weight, tracking);
    let fill: string;
    if (Array.isArray(o.fill)) {
      cA.set(o.fill[0]);
      cB.set(o.fill[1]);
      fill = "#" + cA.lerp(cB, (before + cw / 2) / total).getHexString();
    } else fill = o.fill;
    const m = text(ch, { ...o, fill, align: "left", tracking });
    m.position.x = (before - total / 2) * PX;
    m.userData.restX = m.position.x;
    m.name = `${slug(word)}-letter-${i + 1}`;
    group.add(m);
    list.push(m);
  }
  group.userData.letters = list;
  group.name = slug(word);
  return group;
}

/** Set opacity on every material under an object. */
export function setOpacity(obj: THREE.Object3D, a: number) {
  obj.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (m && "opacity" in m) {
      m.opacity = a;
      m.transparent = true;
    }
  });
  obj.visible = a > 0.001;
}
