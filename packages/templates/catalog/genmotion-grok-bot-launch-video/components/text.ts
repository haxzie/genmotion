import * as THREE from "three";
import { FONT } from "./brand";

/**
 * Type as a canvas texture on a plane, drawn once in the builder. Sizes are in
 * stage units (reference px); the canvas is drawn at RES x that so it stays
 * crisp at 1080p and through the 1.7x chat push-in.
 *
 * The plane is anchored at its left, centre or right edge (vertically centred)
 * so `revealTo()` can crop it like a typewriter without rebuilding anything.
 */
const RES = 4;

export interface TextOpts {
  size: number;
  weight?: number;
  color?: string;
  font?: string;
  /** Letter-spacing in em. */
  tracking?: number;
  align?: "left" | "center" | "right";
  /** Line height multiple for multi-line strings ("\n"). */
  lineHeight?: number;
  /** Per-letter dissolve material (for scrambled crossfades). */
  dissolve?: boolean;
}

export interface TextMesh extends THREE.Mesh<THREE.PlaneGeometry, THREE.Material> {
  userData: {
    w: number;
    h: number;
    pad: number;
    /** Width (stage units, from the left edge) up to the end of each word. */
    ends: number[];
    align: "left" | "center" | "right";
    texture: THREE.CanvasTexture;
  };
}

const dissolveVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const dissolveFrag = /* glsl */ `
uniform sampler2D map;
uniform float uOpacity;
uniform float uDissolve;   // 0 = all shown, 1 = all gone
uniform float uCells;
uniform float uSeed;
varying vec2 vUv;
float h(float n) { return fract(sin(n * 127.1 + uSeed * 31.7) * 43758.5453); }
void main() {
  vec4 t = texture2D(map, vUv);
  float r = h(floor(vUv.x * uCells));
  float a = 1.0 - smoothstep(r - 0.08, r + 0.08, uDissolve * 1.16 - 0.08);
  gl_FragColor = vec4(t.rgb, t.a * a * uOpacity);
  #include <colorspace_fragment>
}`;

export function text(str: string, o: TextOpts): TextMesh {
  const weight = o.weight ?? 500;
  const family = o.font ?? FONT;
  const S = o.size * RES;
  const font = `${weight} ${S}px ${family}`;
  const lines = str.split("\n");
  const lh = (o.lineHeight ?? 1.3) * S;
  const tracking = (o.tracking ?? -0.01) * S;

  const m = new OffscreenCanvas(8, 8).getContext("2d")!;
  m.font = font;
  (m as unknown as { letterSpacing: string }).letterSpacing = `${tracking}px`;
  const widths = lines.map((l) => m.measureText(l).width);
  const pad = Math.ceil(S * 0.18);
  const cw = Math.ceil(Math.max(...widths)) + pad * 2;
  const ch = Math.ceil(lh * (lines.length - 1) + S * 1.35) + pad * 2;

  const canvas = new OffscreenCanvas(cw, ch);
  const g = canvas.getContext("2d")!;
  g.font = font;
  (g as unknown as { letterSpacing: string }).letterSpacing = `${tracking}px`;
  g.fillStyle = o.color ?? "#0a0b0d";
  g.textBaseline = "middle";
  g.textAlign = "left";
  const top = pad + (S * 1.35) / 2;
  lines.forEach((l, i) => g.fillText(l, pad, top + i * lh));

  // Prefix widths at each word end (first line), for word-by-word reveals.
  const ends: number[] = [];
  const first = lines[0]!;
  const re = /\S+/g;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(first))) ends.push((pad + m.measureText(first.slice(0, mm.index + mm[0].length)).width + pad * 0.5) / RES);

  const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  const w = cw / RES;
  const h = ch / RES;
  const geo = new THREE.PlaneGeometry(w, h);
  const align = o.align ?? "center";
  // Shift so local x = 0 is the anchor; vertical centre is the first line's
  // centre for single lines, the block's centre otherwise.
  const dx = align === "left" ? w / 2 - pad / RES : align === "right" ? -w / 2 + pad / RES : 0;
  geo.translate(dx, 0, 0);

  let mat: THREE.Material;
  if (o.dissolve) {
    mat = new THREE.ShaderMaterial({
      vertexShader: dissolveVert,
      fragmentShader: dissolveFrag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        map: { value: texture },
        uOpacity: { value: 1 },
        uDissolve: { value: 0 },
        uCells: { value: Math.max(1, str.length) },
        uSeed: { value: str.length * 1.7 },
      },
    });
  } else {
    mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  }
  const mesh = new THREE.Mesh(geo, mat) as unknown as TextMesh;
  mesh.userData = { w, h, pad: pad / RES, ends, align, texture };
  return mesh;
}

export function setOpacity(mesh: THREE.Mesh, a: number): void {
  const mat = mesh.material as THREE.Material & { uniforms?: Record<string, THREE.IUniform> };
  if (mat.uniforms?.uOpacity) mat.uniforms.uOpacity.value = a;
  else mat.opacity = a;
  mesh.visible = a > 0.001;
}

export function setDissolve(mesh: THREE.Mesh, d: number): void {
  const mat = mesh.material as THREE.ShaderMaterial;
  mat.uniforms.uDissolve!.value = d;
}

/**
 * Crop the plane to show `frac` of its width. Left-anchored text reveals from
 * the left (typewriter); right-anchored reveals from the right.
 */
export function revealFrac(mesh: TextMesh, frac: number): void {
  const f = Math.min(1, Math.max(0.0001, frac));
  const { texture: t, pad, w, align } = mesh.userData;
  t.repeat.x = f;
  // Offsets keep the anchor (text start / text end) pinned while cropping.
  t.offset.x = align === "right" ? ((1 - f) * (w - pad)) / w : (pad * (1 - f)) / w;
  mesh.scale.x = f;
}

/** Show the first `n` words (fractional n fades nothing; it rounds down). */
export function revealWords(mesh: TextMesh, n: number): void {
  const { ends, w } = mesh.userData;
  const k = Math.floor(n);
  if (k >= ends.length) return revealFrac(mesh, 1);
  if (k <= 0) return revealFrac(mesh, 0.0001);
  revealFrac(mesh, ends[k - 1]! / w);
}
