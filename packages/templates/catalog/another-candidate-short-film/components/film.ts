/**
 * The film layer every scene shares: anamorphic letterbox, a heavy vignette,
 * moving grain, a black fader and a flash — plus camera-locked type for the
 * few words the film itself says.
 */
import * as THREE from "three";
import { FONT, PX, framing } from "./core";

export const INK = "#ededef";
export const MUTED = "#8a8a93";
export const BG = "#030304";

const CLIP_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`;

const GRAIN_FRAG = /* glsl */ `
uniform float uSeed;
uniform float uAmount;
varying vec2 vUv;
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 p = floor(gl_FragCoord.xy / 1.6) + vec2(uSeed * 17.31, uSeed * 41.77);
  float n = h(p);
  gl_FragColor = vec4(vec3(n), uAmount);
}`;

const SHADE_FRAG = /* glsl */ `
uniform float uAspect;
uniform float uVig;
uniform float uBar;
uniform float uBlack;
uniform vec3 uFlash;
uniform float uFlashAmt;
varying vec2 vUv;
void main() {
  vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
  float v = smoothstep(0.28, 1.05, length(q)) * uVig;
  float bar = step(vUv.y, uBar) + step(1.0 - uBar, vUv.y);
  float a = clamp(max(max(v, uBlack), bar), 0.0, 1.0);
  vec3 col = vec3(0.0);
  // the flash lives inside the picture, never on the bars
  float fa = uFlashAmt * (1.0 - bar);
  col = mix(col, uFlash, fa / max(1e-4, max(a, fa)));
  a = max(a, fa);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

export interface Film {
  set(frame: number, o?: { black?: number; vig?: number; grain?: number; flash?: number; flashColor?: string }): void;
  /** Camera-locked group: 1 unit = 100 px, origin at frame centre. */
  hud: THREE.Group;
}

export function makeFilm(scene: THREE.Scene, camera: THREE.Camera, width: number, height: number, dist: number): Film {
  const quad = new THREE.PlaneGeometry(1, 1);
  const grainU = { uSeed: { value: 0 }, uAmount: { value: 0.07 } };
  const grain = new THREE.Mesh(
    quad,
    new THREE.ShaderMaterial({ uniforms: grainU, vertexShader: CLIP_VERT, fragmentShader: GRAIN_FRAG, transparent: true, depthTest: false, depthWrite: false }),
  );
  const shadeU = {
    uAspect: { value: width / height },
    uVig: { value: 0.92 },
    uBar: { value: framing(width, height).bar },
    uBlack: { value: 0 },
    uFlash: { value: new THREE.Color("#ffffff") },
    uFlashAmt: { value: 0 },
  };
  const shade = new THREE.Mesh(
    quad,
    new THREE.ShaderMaterial({ uniforms: shadeU, vertexShader: CLIP_VERT, fragmentShader: SHADE_FRAG, transparent: true, depthTest: false, depthWrite: false }),
  );
  for (const [m, n, o] of [[grain, "film-grain", 990], [shade, "film-shade", 991]] as const) {
    m.name = n;
    m.frustumCulled = false;
    m.renderOrder = o;
    m.userData.pickable = false;
    scene.add(m);
  }

  const hud = new THREE.Group();
  hud.name = "hud";
  scene.add(hud);
  const fwd = new THREE.Vector3();

  return {
    hud,
    set(frame, o = {}) {
      // follow the camera without parenting to it (the camera outlives the scene)
      camera.updateMatrixWorld();
      hud.quaternion.copy(camera.quaternion);
      fwd.set(0, 0, -dist).applyQuaternion(camera.quaternion);
      hud.position.copy(camera.position).add(fwd);
      grainU.uSeed.value = frame % 97;
      grainU.uAmount.value = o.grain ?? 0.07;
      shadeU.uVig.value = o.vig ?? 0.92;
      shadeU.uBlack.value = o.black ?? 0;
      shadeU.uFlashAmt.value = o.flash ?? 0;
      if (o.flashColor) shadeU.uFlash.value.set(o.flashColor);
    },
  };
}

/** One line of the film's own type, camera-locked, unlit. */
export function hudLabel(text: string, size: number, color: string, o: { weight?: number; tracking?: number; align?: "left" | "center" | "right"; name?: string } = {}) {
  const RES = 2;
  const weight = o.weight ?? 400;
  const font = `${weight} ${size * RES}px ${FONT}`;
  const m = new OffscreenCanvas(8, 8).getContext("2d")!;
  m.font = font;
  const track = (o.tracking ?? 0) * size * RES;
  const chars = [...text];
  const widths = chars.map((c) => m.measureText(c).width);
  const tw = track ? widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1) : m.measureText(text).width;
  const pad = size * 0.4 * RES;
  const W = Math.ceil(tw + pad * 2);
  const H = Math.ceil(size * 1.6 * RES);
  const c = new OffscreenCanvas(W, H);
  const g = c.getContext("2d")!;
  g.font = font;
  g.fillStyle = color;
  g.textBaseline = "middle";
  if (track) {
    let x = pad;
    chars.forEach((ch, i) => {
      g.fillText(ch, x, H / 2);
      x += widths[i]! + track;
    });
  } else {
    g.fillText(text, pad, H / 2);
  }
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const geo = new THREE.PlaneGeometry((W / RES) * PX, (H / RES) * PX);
  const shiftX = o.align === "left" ? ((W / RES) / 2 - pad / RES) * PX : o.align === "right" ? -((W / RES) / 2 - pad / RES) * PX : 0;
  geo.translate(shiftX, 0, 0);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
  );
  mesh.name = o.name ?? text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  mesh.renderOrder = 995;
  return Object.assign(mesh, { textWidth: tw / RES });
}
