import * as THREE from "three";
import { W, H } from "./stage";

/**
 * The film's opening light: one huge soft ellipse of white light, falling off
 * through lilac and violet into black, that sweeps through the frame.
 *
 * Measured from the reference: the falloff is a fixed colour ramp keyed by
 * distance (px) outside a contour (the contour is where the ramp reads
 * #a675eb). `apex` is the screen-y of that contour on the centre column; the
 * ellipse sits above it (`dir` = -1, light from the top) or below (`dir` = +1,
 * light from the bottom). `spread` stretches the ramp; `ring` > 0 turns the
 * inside of the ellipse lilac beyond a bright rim of that width (the halo
 * behind "Better").
 */
const FRAG = /* glsl */ `
uniform float uApex;
uniform float uDir;
uniform float uK;   // b / a^2 (curvature at the apex is uK / 2)
uniform float uIb;  // 1 / b
uniform float uSpread;
uniform float uRing;
uniform vec3 uInner;
uniform float uOpacity;
varying vec2 vUv;

vec3 hex(float r, float g, float b) { return vec3(r, g, b) / 255.0; }

vec3 ramp(float d) {
  // d: px outside the contour (negative = inside, towards the light)
  const int N = 12;
  float stops[12];
  vec3 cols[12];
  stops[0] = -200.0; cols[0] = hex(255.0, 255.0, 255.0);
  stops[1] = -175.0; cols[1] = hex(255.0, 247.0, 228.0);
  stops[2] = -90.0;  cols[2] = hex(255.0, 214.0, 110.0);
  stops[3] = 0.0;    cols[3] = hex(255.0, 168.0, 38.0);
  stops[4] = 90.0;   cols[4] = hex(250.0, 115.0, 10.0);
  stops[5] = 180.0;  cols[5] = hex(221.0, 44.0, 0.0);
  stops[6] = 270.0;  cols[6] = hex(150.0, 26.0, 2.0);
  stops[7] = 360.0;  cols[7] = hex(98.0, 16.0, 2.0);
  stops[8] = 450.0;  cols[8] = hex(52.0, 9.0, 2.0);
  stops[9] = 540.0;  cols[9] = hex(24.0, 5.0, 1.0);
  stops[10] = 630.0; cols[10] = hex(8.0, 2.0, 0.0);
  stops[11] = 760.0; cols[11] = hex(0.0, 0.0, 0.0);
  if (d <= stops[0]) return cols[0];
  for (int i = 1; i < N; i++) {
    if (d <= stops[i]) {
      float t = (d - stops[i - 1]) / (stops[i] - stops[i - 1]);
      return mix(cols[i - 1], cols[i], t);
    }
  }
  return cols[N - 1];
}

void main() {
  vec2 p = vec2(vUv.x * ${W.toFixed(1)}, (1.0 - vUv.y) * ${H.toFixed(1)});
  // Ellipse distance written so a near-parabolic ellipse (b -> infinity) stays exact in fp32:
  // d = b (s - 1) = (K u^2 + v^2 / b - 2 v) / (sqrt(1 + w) + 1)
  float u = p.x - ${(W / 2).toFixed(1)};
  float v = uDir < 0.0 ? (uApex - p.y) : (p.y - uApex); // towards the ellipse centre
  float w = max(uK * u * u * uIb + v * v * uIb * uIb - 2.0 * v * uIb, -0.999999);
  float d = (uK * u * u + v * v * uIb - 2.0 * v) / (sqrt(1.0 + w) + 1.0);
  vec3 col = ramp(d / uSpread);
  if (uRing > 0.0) {
    // inside, beyond the bright rim, the light turns amber
    float x = clamp(((-d - 200.0 * uSpread) - uRing * 0.35) / (uRing * 1.25), 0.0, 1.0);
    float inner = x * x * (3.0 - 2.0 * x);
    col = mix(col, uInner, inner);
  }
  // the ramp holds display (sRGB) values measured off the reference, written straight out
  gl_FragColor = vec4(col, uOpacity);
}`;

export function glowLayer(name = "light-sweep") {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uApex: { value: 0 },
      uDir: { value: -1 },
      uK: { value: 4e-4 },
      uIb: { value: 0 },
      uSpread: { value: 1 },
      uRing: { value: 0 },
      uInner: { value: new THREE.Color("#c4a6f7") },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
  mesh.name = name;
  mesh.userData.pickable = false;
  mesh.renderOrder = -10;
  const u = mat.uniforms;
  const set = (o: { apex: number; dir: number; K: number; ib: number; spread?: number; ring?: number; inner?: THREE.Color; opacity?: number }) => {
    u.uApex!.value = o.apex;
    u.uDir!.value = o.dir;
    u.uK!.value = o.K;
    u.uIb!.value = o.ib;
    u.uSpread!.value = o.spread ?? 1;
    u.uRing!.value = o.ring ?? 0;
    if (o.inner) (u.uInner!.value as THREE.Color).copy(o.inner);
    u.uOpacity!.value = o.opacity ?? 1;
  };
  return { mesh, set };
}

const scratch = new THREE.Color();

/** Pose the light at a (possibly fractional) film frame from the fitted keys. */
export function glowAt(g: ReturnType<typeof glowLayer>, frame: number, keys: number[][]) {
  const n = keys.length - 1;
  const f = Math.min(Math.max(frame, 0), n);
  const i = Math.min(Math.floor(f), n - 1);
  const t = f - i;
  const a = keys[i]!, b = keys[i + 1]!;
  // never blend across a change of direction
  const k = a[1] !== b[1] ? (t < 0.5 ? a : b) : a.map((v, j) => v + (b[j]! - v) * t);
  // the fitted halo colour was lilac in the reference; keep its lightness, re-tint it Firebase amber
  const light = (k[6]! + k[7]! + k[8]!) / (3 * 255);
  const inner = scratch.setRGB(1, 0.78 + 0.22 * light, 0.42 + 0.58 * light * light, THREE.LinearSRGBColorSpace);
  g.set({ apex: k[0]!, dir: k[1]!, K: Math.exp(k[2]!), ib: Math.exp(k[3]!), spread: k[4]!, ring: k[5]!, inner });
}
