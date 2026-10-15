/**
 * Type as textured planes, in Aeonik, drawn once at 2× in white and tinted,
 * blurred, faded and wiped per frame by a small shader.
 *
 * Geometry is in composition px, and the mesh origin is the text's ORIGIN on
 * its BASELINE (the left edge of the advance for "left", its middle for
 * "center"), so measured baselines from the reference drop straight in.
 */
import * as THREE from "three";
import { FAMILY } from "./brand";

const RES = 2;

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vLocal;
  void main() {
    vUv = uv;
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uBlur;     // px (composition)
  uniform vec2 uTexel;     // 1 / texture size in px (texture px)
  uniform float uMaskR;    // visible where local x < uMaskR
  uniform float uMaskL;    // visible where local x > uMaskL
  uniform float uMaskSoft;
  varying vec2 vUv;
  varying vec2 vLocal;
  void main() {
    float a = 0.0;
    if (uBlur < 0.05) {
      a = texture2D(map, vUv).a;
    } else {
      float tw = 0.0;
      vec2 st = uTexel * uBlur * ${RES.toFixed(1)} / 2.5;
      for (int i = -4; i <= 4; i++) {
        for (int j = -4; j <= 4; j++) {
          float w = exp(-float(i * i + j * j) / 8.0);
          a += texture2D(map, vUv + vec2(float(i), float(j)) * st).a * w;
          tw += w;
        }
      }
      a /= tw;
    }
    float m = 1.0 - smoothstep(uMaskR - uMaskSoft, uMaskR + uMaskSoft, vLocal.x);
    m *= smoothstep(uMaskL - uMaskSoft, uMaskL + uMaskSoft, vLocal.x);
    gl_FragColor = vec4(uColor, a * uOpacity * m);
  }
`;

export interface TextStyle {
  size: number;
  weight?: number;
  color?: string;
  /** em */
  tracking?: number;
  align?: "left" | "center" | "right";
}

export type TextMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> & {
  userData: { advance: number; inkLeft: number; inkRight: number };
};

export function fontString(size: number, weight = 400) {
  // sans fallbacks: if Aeonik is ever missing, never fall through to the browser's serif default
  return `${weight} ${size}px "${FAMILY}", "Helvetica Neue", Helvetica, Arial, sans-serif`;
}

export function measure(text: string, s: TextStyle) {
  const g = new OffscreenCanvas(8, 8).getContext("2d")!;
  g.font = fontString(s.size, s.weight);
  (g as unknown as { letterSpacing: string }).letterSpacing = `${(s.tracking ?? 0) * s.size}px`;
  const m = g.measureText(text);
  return { advance: m.width, inkLeft: -m.actualBoundingBoxLeft, inkRight: m.actualBoundingBoxRight };
}

export function text(str: string, s: TextStyle, name?: string): TextMesh {
  const size = s.size;
  const { advance, inkLeft, inkRight } = measure(str, s);
  const pad = Math.ceil(size * 0.6);
  const w = Math.ceil(Math.max(advance, inkRight) - Math.min(0, inkLeft)) + pad * 2;
  const h = Math.ceil(size * 1.6) + pad * 2;
  const base = pad + Math.ceil(size * 1.05); // baseline row in px
  const left = pad - Math.min(0, inkLeft);

  const canvas = new OffscreenCanvas(w * RES, h * RES);
  const g = canvas.getContext("2d")!;
  g.scale(RES, RES);
  g.font = fontString(size, s.weight);
  (g as unknown as { letterSpacing: string }).letterSpacing = `${(s.tracking ?? 0) * size}px`;
  g.fillStyle = "#ffffff";
  g.textBaseline = "alphabetic";
  g.fillText(str, left, base);

  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;

  const geo = new THREE.PlaneGeometry(w, h);
  // origin → (left, baseline); align shifts it along the advance
  const ax = s.align === "center" ? advance / 2 : s.align === "right" ? advance : 0;
  geo.translate(w / 2 - left - ax, -(h / 2) + base, 0);

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      map: { value: tex },
      uColor: { value: new THREE.Color().setStyle(s.color ?? "#ffffff", THREE.NoColorSpace) },
      uOpacity: { value: 1 },
      uBlur: { value: 0 },
      uTexel: { value: new THREE.Vector2(1 / (w * RES), 1 / (h * RES)) },
      uMaskR: { value: 1e6 },
      uMaskL: { value: -1e6 },
      uMaskSoft: { value: 1 },
    },
  });
  const mesh = new THREE.Mesh(geo, mat) as unknown as TextMesh;
  mesh.name = name ?? str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  mesh.userData.advance = advance;
  mesh.userData.inkLeft = inkLeft - ax;
  mesh.userData.inkRight = inkRight - ax;
  mesh.renderOrder = 100;
  return mesh;
}

export interface TextLook {
  opacity?: number;
  blur?: number;
  color?: string | THREE.Color;
  maskR?: number;
  maskL?: number;
  maskSoft?: number;
}

export function setText(m: TextMesh, look: TextLook) {
  const u = m.material.uniforms;
  if (look.opacity !== undefined) u.uOpacity.value = look.opacity;
  if (look.blur !== undefined) u.uBlur.value = look.blur;
  if (look.color !== undefined) {
    if (typeof look.color === "string") (u.uColor.value as THREE.Color).setStyle(look.color, THREE.NoColorSpace);
    else (u.uColor.value as THREE.Color).copy(look.color);
  }
  if (look.maskR !== undefined) u.uMaskR.value = look.maskR;
  if (look.maskL !== undefined) u.uMaskL.value = look.maskL;
  if (look.maskSoft !== undefined) u.uMaskSoft.value = look.maskSoft;
  m.visible = (u.uOpacity.value as number) > 0.001;
}
