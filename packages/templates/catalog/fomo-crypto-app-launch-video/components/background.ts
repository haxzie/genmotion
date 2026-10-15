/**
 * Full-frame backdrops drawn in clip space, so they never move with the camera:
 * the fomo vertical gradient, optionally with the concentric "sonar" rings the
 * coin-flip and phone scenes sit on.
 */
import * as THREE from "three";
import { C } from "./brand";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, 0.9999, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uRing;
  uniform vec2 uRingCenter;   // px, y down
  uniform float uRingStep;    // px between rings
  uniform float uRingRadius0; // first ring radius
  uniform float uRingAlpha;
  uniform float uRingCount;
  uniform float uRingSoft;
  varying vec2 vUv;
  void main() {
    vec2 px = vec2(vUv.x * 1280.0, (1.0 - vUv.y) * 720.0);
    vec3 col = mix(uTop, uBottom, px.y / 719.0);
    if (uRingAlpha > 0.0) {
      float d = length(px - uRingCenter);
      // stacked translucent discs: each ring darkens what is inside it
      float k = 0.0;
      for (int i = 0; i < 12; i++) {
        if (float(i) >= uRingCount) break;
        float r = uRingRadius0 + float(i) * uRingStep;
        k += 1.0 - smoothstep(r - uRingSoft, r + uRingSoft, d);
      }
      col = mix(col, uRing, clamp(k * uRingAlpha, 0.0, 1.0));
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

export type Backdrop = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

export function backdrop(top = C.bgTop, bottom = C.bgBottom): Backdrop {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(top) },
      uBottom: { value: new THREE.Color(bottom) },
      uRing: { value: new THREE.Color(C.blue) },
      uRingCenter: { value: new THREE.Vector2(640, 900) },
      uRingStep: { value: 120 },
      uRingRadius0: { value: 200 },
      uRingAlpha: { value: 0 },
      uRingCount: { value: 0 },
      uRingSoft: { value: 2 },
    },
  });
  // Colours are used as raw sRGB values (no linear conversion) so the hexes land exactly.
  (mat.uniforms.uTop.value as THREE.Color).setStyle(top, THREE.NoColorSpace);
  (mat.uniforms.uBottom.value as THREE.Color).setStyle(bottom, THREE.NoColorSpace);
  (mat.uniforms.uRing.value as THREE.Color).setStyle(C.blue, THREE.NoColorSpace);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  m.frustumCulled = false;
  m.renderOrder = -1000;
  m.name = "backdrop";
  m.userData.pickable = false;
  return m;
}

/** sRGB colour for raw shader uniforms. */
export const raw = (hex: string) => new THREE.Color().setStyle(hex, THREE.NoColorSpace);

/**
 * The "sonar" backdrop: the fomo gradient with up to four concentric discs of
 * #6674f1 laid over it. Each disc has its own opacity and an optional vertical
 * fade (opaque above fadeTop, clear below fadeBottom), measured off the
 * reference. Discs are composited outermost first.
 */
const SONAR_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uRing;
  uniform vec2 uCenter;      // px, y down
  uniform vec4 uRadius;      // px, inner → outer
  uniform vec4 uAlpha;
  uniform vec4 uFadeTop;     // px y where the disc is fully opaque
  uniform vec4 uFadeBottom;  // px y where it has faded out
  uniform float uSoft;
  varying vec2 vUv;
  float disc(float d, float r, float a, float ft, float fb, float y) {
    float inside = 1.0 - smoothstep(r - uSoft, r + uSoft, d);
    float fade = fb > ft ? clamp((fb - y) / (fb - ft), 0.0, 1.0) : 1.0;
    return inside * a * fade;
  }
  void main() {
    vec2 px = vec2(vUv.x * 1280.0, (1.0 - vUv.y) * 720.0);
    vec3 col = mix(uTop, uBottom, px.y / 719.0);
    float d = length(px - uCenter);
    col = mix(col, uRing, disc(d, uRadius.w, uAlpha.w, uFadeTop.w, uFadeBottom.w, px.y));
    col = mix(col, uRing, disc(d, uRadius.z, uAlpha.z, uFadeTop.z, uFadeBottom.z, px.y));
    col = mix(col, uRing, disc(d, uRadius.y, uAlpha.y, uFadeTop.y, uFadeBottom.y, px.y));
    col = mix(col, uRing, disc(d, uRadius.x, uAlpha.x, uFadeTop.x, uFadeBottom.x, px.y));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export type Sonar = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

export function sonar(ring = "#6674f1", top = C.bgTop, bottom = C.bgBottom): Sonar {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: SONAR_FRAG,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTop: { value: raw(top) },
      uBottom: { value: raw(bottom) },
      uRing: { value: raw(ring) },
      uCenter: { value: new THREE.Vector2(640, 100) },
      uRadius: { value: new THREE.Vector4(600, 800, 1000, 1200) },
      uAlpha: { value: new THREE.Vector4(1, 0.42, 0.17, 0) },
      uFadeTop: { value: new THREE.Vector4(470, 0, 0, 0) },
      uFadeBottom: { value: new THREE.Vector4(700, 0, 0, 0) },
      uSoft: { value: 1.2 },
    },
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  m.frustumCulled = false;
  m.renderOrder = -1000;
  m.name = "sonar-backdrop";
  m.userData.pickable = false;
  return m;
}

/**
 * A stack of large discs lit from the left, drifting behind the phone: each
 * disc adds a bright edge that decays to the right, plus a faint fill.
 * Measured as a saw-tooth in brightness across the backdrop of scenes 6–7.
 */
const STACK_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform float uX0;       // left edge (px) of the first disc at its widest row
  uniform float uSpacing;  // px between discs
  uniform float uCount;
  uniform float uR;        // disc radius px
  uniform float uCy;       // disc centre y px
  uniform float uA;        // edge brightness (0–1)
  uniform float uB;        // fill brightness per disc (0–1)
  uniform float uLambda;   // px decay of the edge light
  uniform float uMirror;   // 1 = mirror the stack onto the right side too
  varying vec2 vUv;
  float stack(vec2 px) {
    float dy = px.y - uCy;
    if (abs(dy) >= uR) return 0.0;
    float bow = uR - sqrt(uR * uR - dy * dy);
    float s = 0.0;
    for (int i = 0; i < 10; i++) {
      if (float(i) >= uCount) break;
      float e = uX0 + float(i) * uSpacing + bow;
      float d = px.x - e;
      if (d > 0.0) s += uA * exp(-d / uLambda) + uB * exp(-d / 420.0);
      else s += uA * 0.6 * smoothstep(-1.5, 0.0, d);
    }
    return s;
  }
  void main() {
    vec2 px = vec2(vUv.x * 1280.0, (1.0 - vUv.y) * 720.0);
    vec3 col = mix(uTop, uBottom, px.y / 719.0);
    float s = stack(px);
    if (uMirror > 0.5) s += stack(vec2(1280.0 - px.x, px.y));
    s *= 1.0 - smoothstep(470.0, 590.0, px.y);
    col += vec3(s);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export type DiscStack = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

export function discStack(top: string, bottom: string): DiscStack {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: STACK_FRAG,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTop: { value: raw(top) },
      uBottom: { value: raw(bottom) },
      uX0: { value: 40 },
      uSpacing: { value: 120 },
      uCount: { value: 0 },
      uR: { value: 550 },
      uCy: { value: 270 },
      uA: { value: 10 / 255 },
      uB: { value: 0 },
      uLambda: { value: 110 },
      uMirror: { value: 0 },
    },
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  m.frustumCulled = false;
  m.renderOrder = -1000;
  m.name = "disc-stack-backdrop";
  m.userData.pickable = false;
  return m;
}
