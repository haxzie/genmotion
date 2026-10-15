/**
 * The twinkling 4-point sparkles that drift behind the opening, recovered from
 * the reference by tracking every sparkle across frames 56–115: one layer, a
 * pattern that repeats every 2715 px, scrolled by a single offset curve.
 *
 * Catalogue entries are [x, y, size px, peak brightness 0–1] in pattern space.
 */
import * as THREE from "three";
import { X, Y } from "./stage";

export const STAR_PERIOD = 2715;

/** measured: [x, y, pixel-count, brightness-sum] → converted to size / alpha below */
const RAW: [number, number, number, number][] = [
  [140.6, 218.3, 23, 217], [145.2, 656.3, 22, 170], [205.3, 502.9, 12, 102], [252.5, 445.4, 4, 76],
  [327.5, 60.3, 27, 275], [415.6, 402.3, 17, 227], [492.5, 656.4, 21, 189], [582.2, 204.7, 5, 152],
  [595.0, 0.3, 5, 186], [770.7, 500.3, 20, 161], [841.0, 85.9, 6, 147], [891.4, 227.7, 27, 255],
  [926.8, 642.5, 20, 136], [946.5, 461.9, 38, 230], [987.8, 122.3, 39, 271], [1067.9, 222.9, 4, 143],
  [1124.1, 711.5, 17, 121], [1170.8, 77.6, 21, 223], [1207.8, 303.2, 22, 186], [1280.0, 507.7, 26, 213],
  [1296.0, 649.0, 26, 196], [1314.0, 118.9, 22, 222], [1339.2, 616.3, 3, 98], [1393.5, 5.2, 6, 160],
  [1395.1, 701.8, 21, 139], [1442.0, 321.2, 4, 111], [1516.6, 500.7, 26, 214], [1521.2, 62.7, 28, 276],
  [1581.3, 216.0, 28, 260], [1587.5, 5.1, 6, 162], [1588.8, 637.7, 4, 88], [1628.5, 273.6, 4, 87],
  [1703.3, 658.7, 20, 195], [1754.2, 520.5, 4, 99], [1791.3, 316.7, 25, 245], [1868.3, 62.7, 29, 283],
  [1940.9, 125.5, 5, 131], [2146.4, 218.6, 22, 200], [2267.2, 491.4, 25, 216], [2302.5, 76.5, 24, 227],
  [2322.3, 257.2, 29, 248], [2363.8, 596.8, 38, 204], [2443.6, 496.1, 3, 103], [2499.7, 7.5, 24, 234],
  [2546.6, 641.4, 17, 128], [2583.5, 415.8, 23, 170], [2655.9, 211.3, 25, 255], [2671.9, 70.0, 22, 283],
  [2689.8, 600.1, 22, 148], [2715.4, 102.8, 4, 168], [2733.6, 17.2, 22, 248], [2780.8, 397.8, 4, 92],
];

const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aPhase;
  uniform float uShift;
  uniform float uPeriod;
  uniform float uTime;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    // pattern x (px) → screen px, wrapped into [-period/2 .. period) around the frame
    float sx = mod(p.x + uShift + 200.0, uPeriod) - 200.0;
    p.x = sx - 640.0;
    vAlpha = aAlpha * (0.8 + 0.2 * sin(uTime * 3.0 + aPhase));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * 2.0; // the capture runs at 2x device pixels
  }
`;

const FRAG = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    vec2 q = abs(gl_PointCoord - 0.5) * 2.0;
    // concave 4-point sparkle: sqrt(x) + sqrt(y) < 1, softened
    float d = sqrt(q.x) + sqrt(q.y);
    float a = 1.0 - smoothstep(0.75, 1.0, d);
    float core = 1.0 - smoothstep(0.0, 0.45, length(q));
    a = max(a, core * 0.6);
    gl_FragColor = vec4(1.0, 1.0, 1.0, a * vAlpha * uOpacity);
  }
`;

export interface Starfield extends THREE.Points {
  material: THREE.ShaderMaterial;
}

export function starfield(): Starfield {
  const n = RAW.length;
  const pos = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const alpha = new Float32Array(n);
  const phase = new Float32Array(n);
  RAW.forEach(([x, y, count, bright], i) => {
    pos[i * 3] = x % STAR_PERIOD;
    pos[i * 3 + 1] = Y(y);
    pos[i * 3 + 2] = 0;
    size[i] = Math.max(3, Math.min(11, 2.2 + Math.sqrt(count) * 1.15));
    alpha[i] = Math.min(1, bright / 260);
    phase[i] = i * 1.7;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uShift: { value: 0 },
      uPeriod: { value: STAR_PERIOD },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
    },
  });
  const pts = new THREE.Points(geo, mat) as Starfield;
  pts.frustumCulled = false;
  pts.renderOrder = -500;
  pts.name = "stars";
  pts.userData.pickable = false;
  void X;
  return pts;
}
