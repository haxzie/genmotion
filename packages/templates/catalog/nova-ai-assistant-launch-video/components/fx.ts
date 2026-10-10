import * as THREE from "three";

/* ------------------------------------------------------------- backdrop */

export const MAX_GLOWS = 8;

export type Glow = { x: number; y: number; rx: number; ry: number; color: THREE.Color; amount: number };

const BG_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.9999, 1.0);
}`;

// Fractions of the frame, y down (matches how the reference was measured).
const BG_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec2 uDir;       // gradient axis in frame fractions
uniform vec4 uGlowGeo[${MAX_GLOWS}];
uniform vec4 uGlowCol[${MAX_GLOWS}];
uniform float uFade;     // multiply everything (dip)
uniform vec3 uFadeTo;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 f = vec2(vUv.x, 1.0 - vUv.y);
  float g = clamp(dot(f - 0.5, uDir) + 0.5, 0.0, 1.0);
  vec3 col = mix(uTop, uBottom, g);
  for (int i = 0; i < ${MAX_GLOWS}; i++) {
    vec4 geo = uGlowGeo[i];
    vec2 d = (f - geo.xy) / max(geo.zw, vec2(1e-4));
    col += uGlowCol[i].rgb * uGlowCol[i].a * exp(-dot(d, d));
  }
  col = mix(uFadeTo, col, uFade);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
}`;

export type Backdrop = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> & {
  glow: (i: number, g: Partial<Glow> & { color?: THREE.ColorRepresentation }) => void;
  grad: (top: THREE.ColorRepresentation, bottom: THREE.ColorRepresentation, dir?: [number, number]) => void;
};

/** A full-frame gradient + radial glows, drawn behind everything (clip space, camera-proof). */
export function backdrop(): Backdrop {
  const geo = new Array(MAX_GLOWS).fill(0).map(() => new THREE.Vector4(0.5, 0.5, 0.2, 0.2));
  const col = new Array(MAX_GLOWS).fill(0).map(() => new THREE.Vector4(0, 0, 0, 0));
  const mat = new THREE.ShaderMaterial({
    vertexShader: BG_VERT,
    fragmentShader: BG_FRAG,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color("#000") },
      uBottom: { value: new THREE.Color("#000") },
      uDir: { value: new THREE.Vector2(0, 1) },
      uGlowGeo: { value: geo },
      uGlowCol: { value: col },
      uFade: { value: 1 },
      uFadeTo: { value: new THREE.Color("#fff") },
    },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat) as unknown as Backdrop;
  mesh.name = "backdrop";
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.userData.pickable = false;
  const tmp = new THREE.Color();
  mesh.glow = (i, g) => {
    const v = geo[i]!;
    if (g.x !== undefined) v.x = g.x;
    if (g.y !== undefined) v.y = g.y;
    if (g.rx !== undefined) v.z = g.rx;
    if (g.ry !== undefined) v.w = g.ry;
    const c = col[i]!;
    if (g.color !== undefined) {
      tmp.set(g.color);
      c.x = tmp.r;
      c.y = tmp.g;
      c.z = tmp.b;
    }
    if (g.amount !== undefined) c.w = g.amount;
  };
  mesh.grad = (top, bottom, dir) => {
    (mat.uniforms.uTop!.value as THREE.Color).set(top);
    (mat.uniforms.uBottom!.value as THREE.Color).set(bottom);
    if (dir) (mat.uniforms.uDir!.value as THREE.Vector2).set(dir[0], dir[1]);
  };
  return mesh;
}

/* ------------------------------------------------------------- glow dot */

const DOT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHaloColor;
uniform float uCore;   // core radius as a fraction of the quad half-size
uniform float uHalo;   // halo strength
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float core = 1.0 - smoothstep(uCore * 0.75, uCore, d);
  float halo = exp(-d * d * 9.0) * uHalo;
  vec3 col = uColor * core + uHaloColor * halo;
  float a = clamp(core + halo, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0) * uOpacity;
  #include <colorspace_fragment>
}`;

export type Dot = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

/** A glowing point in layer px: core radius and halo radius. Additive. */
export function glowDot(core: number, halo: number, color: THREE.ColorRepresentation = "#ffffff", haloColor?: THREE.ColorRepresentation): Dot {
  const size = Math.max(halo, core) * 2;
  const mat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
    fragmentShader: DOT_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uHaloColor: { value: new THREE.Color(haloColor ?? color) },
      uCore: { value: core / (size / 2) },
      uHalo: { value: 0.6 },
      uOpacity: { value: 1 },
    },
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat) as Dot;
  m.renderOrder = 50;
  return m;
}

/* ------------------------------------------------------------- neon streak */

const STREAK_VERT = /* glsl */ `
attribute float aAlong;
attribute float aSide;
varying float vAlong;
varying float vSide;
void main() {
  vAlong = aAlong;
  vSide = aSide;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const STREAK_FRAG = /* glsl */ `
uniform vec3 uA;
uniform vec3 uB;
uniform float uHead;    // 0..1 of the path drawn so far
uniform float uTail;    // length of the bright fade behind the head (0..1 of path)
uniform float uFloor;   // brightness of the line far behind the head
uniform float uCoreW;   // core width as a fraction of half-width
uniform float uOpacity;
varying float vAlong;
varying float vSide;
void main() {
  if (vAlong > uHead) discard;
  float behind = uHead - vAlong;
  float k = mix(uFloor, 1.0, exp(-behind / max(uTail, 1e-4)));
  float s = abs(vSide);
  float core = 1.0 - smoothstep(uCoreW * 0.6, uCoreW, s);
  float glow = exp(-s * s * 5.0) * 0.55;
  vec3 col = mix(uA, uB, vAlong);
  vec3 c = col * glow + mix(col, vec3(1.0), 0.45) * core;
  gl_FragColor = vec4(c * k * uOpacity, 1.0);
  #include <colorspace_fragment>
}`;

export type Streak = THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> & { pointAt: (t: number) => THREE.Vector2 };

/** A neon line along a path (layer px), drawn on by uHead. Ribbon half-width includes the glow. */
export function streak(path: THREE.Vector2[], colorA: THREE.ColorRepresentation, colorB: THREE.ColorRepresentation, halfWidth = 14, coreWidth = 2, smooth = false): Streak {
  const curve: THREE.Curve<THREE.Vector2> = smooth ? new THREE.SplineCurve(path) : new THREE.Path(path);
  const n = 240;
  const pts = curve.getSpacedPoints(n);
  const pos: number[] = [];
  const along: number[] = [];
  const side: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const p = pts[i]!;
    const q = pts[Math.min(n, i + 1)]!;
    const r = pts[Math.max(0, i - 1)]!;
    const t = new THREE.Vector2().subVectors(q, r).normalize();
    const nrm = new THREE.Vector2(-t.y, t.x);
    pos.push(p.x + nrm.x * halfWidth, p.y + nrm.y * halfWidth, 0, p.x - nrm.x * halfWidth, p.y - nrm.y * halfWidth, 0);
    along.push(i / n, i / n);
    side.push(1, -1);
    if (i < n) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1));
  geo.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    vertexShader: STREAK_VERT,
    fragmentShader: STREAK_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uA: { value: new THREE.Color(colorA) },
      uB: { value: new THREE.Color(colorB) },
      uHead: { value: 1 },
      uTail: { value: 0.25 },
      uFloor: { value: 0.35 },
      uCoreW: { value: coreWidth / halfWidth },
      uOpacity: { value: 1 },
    },
  });
  const m = new THREE.Mesh(geo, mat) as unknown as Streak;
  m.renderOrder = 40;
  m.frustumCulled = false;
  m.pointAt = (t) => curve.getPointAt(THREE.MathUtils.clamp(t, 0, 1));
  return m;
}

/* ------------------------------------------------------------- flood */

export type Flood = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> & {
  set: (o: { x?: number; y?: number; radius?: number; soft?: number; amount?: number; core?: number }) => void;
};

/**
 * A full-frame colour flood that spreads from a point, with a clear core around
 * the point (like light pushing out from a pressed button). Clip-space, so it has
 * no edges to hide. x, y are frame fractions (y down); radius in frame heights.
 */
export function flood(color: THREE.ColorRepresentation, edge: THREE.ColorRepresentation = color): Flood {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uEdge: { value: new THREE.Color(edge) },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uAspect: { value: 16 / 9 },
      uRadius: { value: 0 },
      uSoft: { value: 0.25 },
      uCore: { value: 0.35 },
      uAmount: { value: 1 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform vec3 uEdge; uniform vec2 uCenter; uniform float uAspect;
      uniform float uRadius; uniform float uSoft; uniform float uCore; uniform float uAmount;
      varying vec2 vUv;
      void main() {
        vec2 f = vec2(vUv.x, 1.0 - vUv.y);
        vec2 d = (f - uCenter) * vec2(uAspect, 1.0);
        float r = length(d);
        // colour arrives outside the core and inside the travelling front
        float front = 1.0 - smoothstep(uRadius - uSoft, uRadius, r);
        float core = smoothstep(uRadius * uCore * 0.6, uRadius * uCore + 0.02, r);
        float a = front * core * uAmount;
        vec3 col = mix(uColor, uEdge, smoothstep(0.0, uRadius + 0.001, r));
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat) as unknown as Flood;
  m.frustumCulled = false;
  m.renderOrder = 900;
  m.userData.pickable = false;
  m.set = (o) => {
    const u = mat.uniforms;
    if (o.x !== undefined) (u.uCenter!.value as THREE.Vector2).x = o.x;
    if (o.y !== undefined) (u.uCenter!.value as THREE.Vector2).y = o.y;
    if (o.radius !== undefined) u.uRadius!.value = o.radius;
    if (o.soft !== undefined) u.uSoft!.value = o.soft;
    if (o.core !== undefined) u.uCore!.value = o.core;
    if (o.amount !== undefined) u.uAmount!.value = o.amount;
  };
  return m;
}
