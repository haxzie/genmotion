/**
 * The reference's backdrop: a blue screen-print halftone over an image that
 * moves with the camera. Three looks crossfade:
 *   A — cloudy blooms with a white flower burst (the terminal act)
 *   B — a snowy mountain ridge (the dock collapse)
 *   C — flat field with layout guides (the end card)
 * Procedural, so it costs nothing to load and never ships a blank frame.
 */
import * as THREE from "three";
import { C } from "./brand";

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.999, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec2 uCam;      // camera centre, stage px
uniform float uZoom;
uniform vec2 uView;     // viewport in stage px at zoom 1 (1920 x 1080)
uniform vec2 uRes;      // render target in device px
uniform float uTime;
uniform float uB;       // weight of look B
uniform float uC;       // weight of look C
uniform vec2 uBurst;    // flower burst centre, stage px
uniform vec3 uField;
uniform vec3 uField2;
uniform vec3 uLift;
uniform vec3 uInk;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}

float lookA(vec2 s) {
  vec2 q = s * 0.0024 + vec2(uTime * 0.035, -uTime * 0.02);
  float n = fbm(q + 0.6 * fbm(q * 1.7 + 3.0));
  float blooms = smoothstep(0.5, 0.74, n);
  // the white flower: a burst of petals radiating from uBurst
  vec2 d = s - uBurst;
  float r = length(d);
  float a = atan(d.y, d.x);
  float petals = pow(abs(sin(a * 13.0 + fbm(vec2(a * 3.0, 1.0)) * 2.0)), 0.6);
  float reach = 330.0 + 170.0 * petals + 60.0 * fbm(vec2(a * 6.0, uTime * 0.2));
  float flower = (1.0 - smoothstep(reach * 0.55, reach, r)) * smoothstep(40.0, 140.0, r) * (0.55 + 0.45 * petals);
  float grain = 0.05 + 0.12 * fbm(s * 0.02 + 5.0);
  return clamp(grain + blooms * 0.8 + flower, 0.0, 1.0);
}

float lookB(vec2 s) {
  // a ridge rising to the upper right; snow above, rock texture below
  float ridge = -120.0 + s.x * 0.42 + 90.0 * (fbm(vec2(s.x * 0.004, 2.0)) - 0.5);
  float above = smoothstep(-30.0, 60.0, s.y - ridge);
  float tex = fbm(s * 0.018 + vec2(4.0, uTime * 0.05));
  float snow = above * mix(0.3, 1.0, smoothstep(0.32, 0.68, tex));
  float rock = (1.0 - above) * smoothstep(0.5, 0.74, fbm(vec2(s.x * 0.01 + s.y * 0.004, s.y * 0.03) + 9.0)) * 0.6;
  return clamp(snow + rock, 0.0, 1.0);
}

void main() {
  vec2 screen = vUv * uView;                              // stage px of the viewport
  vec2 world = uCam + (vUv - 0.5) * uView / uZoom;        // stage px under this fragment

  // halftone cell in screen space (4.5 px at 1080p)
  float cell = 4.5;
  vec2 cid = floor(screen / cell);
  vec2 local = fract(screen / cell) - 0.5;
  vec2 cworld = uCam + ((cid + 0.5) * cell / uView - 0.5) * uView / uZoom;

  float L = mix(lookA(cworld), lookB(cworld), uB);
  L *= (1.0 - uC);
  L += uC * 0.025;                                         // a whisper of texture on the flat field

  float rad = 0.5 * sqrt(L) * 1.25;
  float px = cell * uRes.y / uView.y;                     // device px per cell
  float aa = 0.75 / px;
  float dotMask = 1.0 - smoothstep(rad - aa, rad + aa, length(local));
  dotMask *= step(0.002, L);

  float diag = smoothstep(0.0, 1.0, vUv.x * 0.65 + (1.0 - vUv.y) * 0.35);
  vec3 field = mix(uField, uField2, diag);                 // pink -> orange across the frame
  vec3 base = mix(field, uLift, L * 0.35 * (1.0 - uC));
  vec3 col = mix(base, uInk, dotMask);

  // end-card layout guides (screen space, like the reference)
  float lw = 2.2;
  float gx = min(abs(screen.x - 190.0), abs(screen.x - 1730.0));
  float gy = min(abs(screen.y - 96.0), abs(screen.y - 984.0));
  float g = 1.0 - smoothstep(lw * 0.5, lw, min(gx, gy));
  col = mix(col, mix(field, vec3(1.0), 0.18), g * uC);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export type Halftone = ReturnType<typeof halftone>;

export function halftone(res: { width: number; height: number }) {
  const viewW = 1080 * (res.width / res.height);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uCam: { value: new THREE.Vector2() },
      uZoom: { value: 1 },
      uView: { value: new THREE.Vector2(viewW, 1080) },
      uRes: { value: new THREE.Vector2(res.width, res.height) },
      uTime: { value: 0 },
      uB: { value: 0 },
      uC: { value: 0 },
      uBurst: { value: new THREE.Vector2(760, 120) },
      uField: { value: new THREE.Color(C.field) },
      uField2: { value: new THREE.Color(C.field2) },
      uLift: { value: new THREE.Color(C.lift) },
      uInk: { value: new THREE.Color(C.dot) },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  mesh.name = "halftone-backdrop";
  mesh.userData.pickable = false;
  return {
    mesh,
    set(cam: { x: number; y: number; zoom: number }, time: number, b: number, c: number) {
      (mat.uniforms.uCam.value as THREE.Vector2).set(cam.x, cam.y);
      mat.uniforms.uZoom.value = cam.zoom;
      mat.uniforms.uTime.value = time;
      mat.uniforms.uB.value = b;
      mat.uniforms.uC.value = c;
    },
  };
}
