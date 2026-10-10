import * as THREE from "three";
import type { ThreeFrame, ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { FONT_FAMILY } from "./brand";

/* ------------------------------------------------------------- fonts */

type FontFile = { family: string; url: string; weight?: string };

/** Build the scene only once the shipped font has loaded, inside the frame barrier. */
export function withFonts(ctx: ThreeSceneContext, fonts: FontFile[], build: () => ThreeSceneUpdate): ThreeSceneUpdate {
  const doc = ctx.canvas.ownerDocument;
  const loaded = new Set<string>();
  doc.fonts.forEach((face) => {
    if (face.status === "loaded") loaded.add(face.family.replace(/"/g, ""));
  });
  if (fonts.every((f) => loaded.has(f.family))) return build();

  let update: ThreeSceneUpdate | null = null;
  let last: ThreeFrame | null = null;
  const key = `fonts:${fonts.map((f) => f.url).join(",")}`;
  ctx.manager.itemStart(key);
  Promise.all(
    fonts.map((f) =>
      new FontFace(f.family, `url(${f.url})`, { weight: f.weight ?? "100 900" }).load().then((face) => {
        (doc.fonts as unknown as Set<FontFace>).add(face);
      }),
    ),
  )
    .catch(() => undefined)
    .then(() => {
      update = build();
      if (last) update(last);
    })
    .finally(() => ctx.manager.itemEnd(key));
  return (frame) => {
    last = frame;
    update?.(frame);
  };
}

/* ------------------------------------------------------------- labels */

export type TypeStyle = {
  size: number; // px at 1080
  weight?: number;
  tracking?: number; // em
  pad?: number; // extra room for blur, px
  dpr?: number; // canvas oversampling
};

const font = (s: TypeStyle, k: number) => `${s.weight ?? 400} ${s.size * k}px "${FONT_FAMILY}", Inter, Arial, sans-serif`;

let measurer: OffscreenCanvasRenderingContext2D | null = null;
export function measure(text: string, s: TypeStyle): number {
  const g = (measurer ??= new OffscreenCanvas(8, 8).getContext("2d")!);
  g.font = font(s, 1);
  (g as unknown as { letterSpacing: string }).letterSpacing = `${(s.tracking ?? 0) * s.size}px`;
  return g.measureText(text).width;
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uSweep;      // uv.x of the colour sweep edge: left of it = uColor2
uniform float uSweepSoft;
uniform vec3 uColorR;      // tint toward the right edge (horizontal gradient)
uniform float uOpacity;
uniform vec2 uTexel;       // 1 / plane size in px
uniform float uBlur;       // px
uniform float uBlurSlope;  // extra blur px at uv.x = 1
uniform vec2 uBlurDir;     // (1,1) round, (1,0) horizontal smear
uniform float uDpr;
varying vec2 vUv;
void main() {
  float r = uBlur + uBlurSlope * vUv.x;
  float a = 0.0;
  if (r < 0.4) {
    a = texture2D(uMap, vUv).a;
  } else {
    float wsum = 0.0;
    float bias = max(0.0, log2(r * uDpr / 5.0));   // pre-blurred mip levels kill the tap rings
    for (int i = 0; i < 40; i++) {
      float fi = float(i) + 0.5;
      float rr = sqrt(fi / 40.0);
      float th = fi * 2.39996;
      vec2 o = vec2(cos(th), sin(th)) * rr * r * uBlurDir * uTexel;
      float w = exp(-rr * rr * 2.0);
      a += texture2D(uMap, vUv + o, bias).a * w;
      wsum += w;
    }
    a /= wsum;
  }
  vec3 base = mix(uColor, uColorR, vUv.x);
  float k = smoothstep(uSweep - uSweepSoft, uSweep + uSweepSoft, vUv.x);
  vec3 col = mix(uColor2, base, k);
  gl_FragColor = vec4(col, a * uOpacity);
  #include <colorspace_fragment>
}`;

export type Label = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

/** One line of type, drawn once (white) and tinted in the shader. Origin = centre of the ink line. */
export function label(text: string, s: TypeStyle, color = "#ffffff", align: "center" | "left" = "center"): Label {
  const dpr = s.dpr ?? 2;
  const pad = Math.ceil(s.size * 0.35 + (s.pad ?? 24));
  const w = Math.ceil(measure(text, s)) + pad * 2;
  const h = Math.ceil(s.size * 1.3) + pad * 2;
  const canvas = new OffscreenCanvas(Math.ceil(w * dpr), Math.ceil(h * dpr));
  const g = canvas.getContext("2d")!;
  g.font = font(s, dpr);
  (g as unknown as { letterSpacing: string }).letterSpacing = `${(s.tracking ?? 0) * s.size * dpr}px`;
  g.fillStyle = "#ffffff";
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  // centre the x-height/cap band optically: baseline at middle + 0.36em
  g.fillText(text, pad * dpr, (h / 2 + s.size * 0.36) * dpr);

  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  const c = new THREE.Color(color);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uMap: { value: tex },
      uColor: { value: c.clone() },
      uColor2: { value: c.clone() },
      uColorR: { value: c.clone() },
      uSweep: { value: -1 },
      uSweepSoft: { value: 0.02 },
      uOpacity: { value: 1 },
      uTexel: { value: new THREE.Vector2(1 / w, 1 / h) },
      uBlur: { value: 0 },
      uBlurSlope: { value: 0 },
      uBlurDir: { value: new THREE.Vector2(1, 1) },
      uDpr: { value: dpr },
    },
  });
  const geo = new THREE.PlaneGeometry(w, h);
  if (align === "left") geo.translate(w / 2 - pad, 0, 0);
  const mesh = new THREE.Mesh(geo, mat) as Label;
  mesh.name = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  mesh.userData.inkWidth = w - pad * 2;
  {
    // px from the text origin to the first ink (side bearing), at style size
    const mg = (measurer ??= new OffscreenCanvas(8, 8).getContext("2d")!);
    mg.font = font(s, 1);
    mesh.userData.inkLeft = -mg.measureText(text).actualBoundingBoxLeft;
    mesh.userData.capHeight = 0.727 * s.size;
  }
  mesh.renderOrder = 100;
  return mesh;
}

export type LabelLook = {
  opacity?: number;
  blur?: number;
  blurSlope?: number;
  color?: THREE.ColorRepresentation;
  colorRight?: THREE.ColorRepresentation;
  sweepColor?: THREE.ColorRepresentation;
  sweep?: number;
  sweepSoft?: number;
  smear?: number; // 0 = round blur, 1 = horizontal only
};

export function setLabel(m: Label, look: LabelLook) {
  const u = m.material.uniforms;
  if (look.opacity !== undefined) u.uOpacity!.value = look.opacity;
  if (look.blur !== undefined) u.uBlur!.value = look.blur;
  if (look.blurSlope !== undefined) u.uBlurSlope!.value = look.blurSlope;
  if (look.color !== undefined) {
    (u.uColor!.value as THREE.Color).set(look.color);
    if (look.colorRight === undefined) (u.uColorR!.value as THREE.Color).set(look.color);
  }
  if (look.colorRight !== undefined) (u.uColorR!.value as THREE.Color).set(look.colorRight);
  if (look.sweepColor !== undefined) (u.uColor2!.value as THREE.Color).set(look.sweepColor);
  if (look.sweep !== undefined) u.uSweep!.value = look.sweep;
  if (look.sweepSoft !== undefined) u.uSweepSoft!.value = look.sweepSoft;
  if (look.smear !== undefined) (u.uBlurDir!.value as THREE.Vector2).set(1, 1 - look.smear);
}

/** An additive, heavily blurred copy of a label: the soft bloom around lit type. */
export function haloOf(m: Label, blur: number, strength: number): Label {
  const mat = m.material.clone();
  mat.uniforms.uMap = m.material.uniforms.uMap!; // share the texture
  mat.blending = THREE.AdditiveBlending;
  mat.uniforms.uBlur!.value = blur;
  mat.uniforms.uOpacity!.value = strength;
  const halo = new THREE.Mesh(m.geometry, mat) as Label;
  halo.name = `${m.name}-glow`;
  halo.renderOrder = m.renderOrder - 1;
  halo.userData.pickable = false;
  return halo;
}
