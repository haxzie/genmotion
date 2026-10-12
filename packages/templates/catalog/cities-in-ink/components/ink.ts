/**
 * The engraving look: every surface is paper-white, shaded only by ink lines.
 * Hatching lives in world space (it sticks to surfaces as the camera flies),
 * gets denser as a face turns from the light, and fades to an even grey tone
 * before its lines get small enough to shimmer.
 */
import * as THREE from "three";
import { INK, PAPER } from "./brand";

export interface InkOptions {
  fogNear: number;
  fogFar: number;
  /** How much of the ink the fog removes at fogFar (atmospheric perspective). */
  fogMax?: number;
  light?: THREE.Vector3;
}

export interface Ink {
  uniforms: Record<string, THREE.IUniform>;
  /** Instanced boxes with outlines and window grids. */
  box(hatch?: number): THREE.ShaderMaterial;
  /** Curved solids (trees, clouds, terrain, domes): contour hatching. */
  round(opts?: { tone?: number; hatch?: number; contour?: number; rim?: number }): THREE.ShaderMaterial;
  /** Water / lawn: broken horizontal strokes of constant z. */
  plane(opts: { strength: number; spacing: number; dash?: number; wave?: number }): THREE.ShaderMaterial;
  line(opts?: { fade?: number; opacity?: number }): THREE.ShaderMaterial;
  hull(px?: number): THREE.ShaderMaterial;
}

const COMMON_VERT = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec3 vNormalL;
  varying vec3 vLocal;
  varying vec3 vSize;
  varying vec4 vParams;
  attribute vec4 aParams;
  void main() {
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = modelMatrix * instanceMatrix;
    #endif
    vec3 sc = vec3(length(m[0].xyz), length(m[1].xyz), length(m[2].xyz));
    vSize = sc;
    vLocal = position * sc;
    vNormalL = normal;
    vNormalW = normalize(mat3(m) * (normal / (sc * sc)));
    vec4 wp = m * vec4(position, 1.0);
    vWorld = wp.xyz;
    vParams = aParams;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const COMMON_FRAG = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uPaper;
  uniform vec3 uLight;
  uniform vec3 uFog;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec3 vNormalL;
  varying vec3 vLocal;
  varying vec3 vSize;
  varying vec4 vParams;

  float h21(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  // one family of parallel lines, coordinate measured in cycles
  float lineAA(float c, float w) {
    float fw = max(fwidth(c), 1e-5);
    float d = abs(fract(c + 0.5) - 0.5) / fw;
    float l = 1.0 - smoothstep(w * 0.5 - 0.35, w * 0.5 + 0.65, d);
    return mix(l, clamp(w * fw * 0.8, 0.0, 0.85), smoothstep(0.16, 0.38, fw));
  }
  float edgeAA(float dist, float fw, float w) {
    float d = dist / max(fw, 1e-5);
    return 1.0 - smoothstep(w * 0.5 - 0.35, w * 0.5 + 0.65, d);
  }
  float fogK() {
    float d = length(vWorld - cameraPosition);
    return smoothstep(uFog.x, uFog.y, d) * uFog.z;
  }
  vec4 finish(float ink) {
    ink = clamp(ink, 0.0, 1.0) * (1.0 - fogK());
    return vec4(mix(uPaper, uInk, ink), 1.0);
  }
`;

const BOX_FRAG = /* glsl */ `
  uniform float uHatch;
  float hatch(float tone, vec2 p, float s) {
    float ink = 0.0;
    ink = max(ink, lineAA(p.x / s, 1.0) * smoothstep(0.30, 0.36, tone));
    ink = max(ink, lineAA(p.y / s, 1.0) * smoothstep(0.58, 0.64, tone));
    ink = max(ink, lineAA((p.x + p.y) / (s * 1.3), 1.0) * smoothstep(0.80, 0.86, tone));
    return ink;
  }
  void main() {
    vec3 nL = normalize(vNormalL);
    vec3 n = normalize(vNormalW);
    float lit = clamp(dot(n, uLight), 0.0, 1.0);
    float tone = 1.0 - (0.18 + 0.82 * lit) + vParams.w;
    bool roof = abs(nL.y) > 0.5;
    float hgt = vSize.y;
    vec2 p; vec2 hs;
    if (roof) { p = vLocal.xz; hs = vSize.xz * 0.5; }
    else if (abs(nL.x) > 0.5) { p = vec2(vLocal.z, vLocal.y + hgt * 0.5); hs = vec2(vSize.z * 0.5, hgt * 0.5); }
    else { p = vec2(vLocal.x, vLocal.y + hgt * 0.5); hs = vec2(vSize.x * 0.5, hgt * 0.5); }
    vec2 fw = max(fwidth(p), vec2(1e-5));

    float eu = hs.x - abs(p.x);
    float ev = roof ? (hs.y - abs(p.y)) : min(p.y, hgt - p.y);
    float ink = max(edgeAA(eu, fw.x, 1.25), edgeAA(ev, fw.y, 1.25));

    ink = max(ink, hatch(tone, p, uHatch));

    // masked-cut surfaces (tone < -0.5): plain stone with engraved shading that
    // thickens into each edge, so the sweep reads as a solid object, not a wipe
    if (vParams.w < -0.5) {
      float dv = roof ? 1e3 : ev;
      bool vert = eu < dv;
      float d = min(eu, dv);
      float band = 1.0 - smoothstep(0.0, 1.6, d);
      float c = (vert ? p.x : p.y) / 0.07;
      ink = max(ink, lineAA(c, mix(0.6, 3.2, band)) * step(0.02, band) * band);
    }

    float winW = vParams.x, floorH = vParams.y, style = vParams.z;
    if (!roof && winW > 0.0) {
      float cu = p.x / winW + 0.5;
      float cv = p.y / floorH;
      float inside = step(winW * 0.45, eu) * step(floorH * 0.9, p.y) * step(floorH * 0.35, hgt - p.y);
      if (style > 1.5 && style < 2.5) inside = step(winW * 0.3, eu) * step(0.5, p.y) * step(0.5, hgt - p.y);
      float detail = smoothstep(2.5, 6.0, min(winW / fw.x, floorH / fw.y));
      float win = 0.0;
      if (style < 0.5 || style > 2.5) {
        // punched windows (style 3: tall and narrow, gothic)
        vec2 hw = style > 2.5 ? vec2(0.22, 0.36) : vec2(0.26, 0.27);
        vec2 q = vec2(abs(fract(cu) - 0.5) - hw.x, abs(fract(cv) - 0.55) - hw.y);
        vec2 qpx = q * vec2(winW / fw.x, floorH / fw.y);
        float sd = max(qpx.x, qpx.y);
        float outline = 1.0 - smoothstep(0.35, 1.3, abs(sd));
        float glass = 1.0 - smoothstep(-0.5, 0.5, sd);
        win = max(outline, glass * max(hatch(tone + 0.5, p, uHatch * 0.55), 0.35));
        if (style > 2.5) win = max(win, lineAA(cu, 1.0));
      } else if (style < 1.5) {
        // glass curtain wall: strong mullions, faint floor lines, darker glass
        win = max(lineAA(cu, 1.1), lineAA(cv, 1.0) * 0.6);
        win = max(win, hatch(tone + 0.28, p, uHatch * 0.7));
      } else {
        // vertical ribs only
        win = lineAA(cu, 1.1);
      }
      ink = max(ink, inside * mix(0.22, win, detail));
    }
    gl_FragColor = finish(ink);
    #include <colorspace_fragment>
  }
`;

const ROUND_FRAG = /* glsl */ `
  uniform float uTone;
  uniform float uHatch;
  uniform float uContour;
  uniform float uRim;
  void main() {
    vec3 n = normalize(vNormalW);
    if (!gl_FrontFacing) n = -n;
    float lit = clamp(dot(n, uLight), 0.0, 1.0);
    float tone = 1.0 - (0.2 + 0.8 * lit) + uTone;
    float s = uHatch;
    float c1 = dot(vWorld, normalize(vec3(1.0, 0.35, 0.55))) / s;
    float c2 = dot(vWorld, normalize(vec3(-0.6, 0.9, 0.3))) / (s * 1.1);
    float c3 = dot(vWorld, normalize(vec3(0.2, -0.4, 1.0))) / (s * 1.2);
    float ink = 0.0;
    ink = max(ink, lineAA(c1, 1.0) * smoothstep(0.34, 0.42, tone));
    ink = max(ink, lineAA(c2, 1.0) * smoothstep(0.56, 0.64, tone));
    ink = max(ink, lineAA(c3, 1.0) * smoothstep(0.76, 0.84, tone));
    if (uContour > 0.0) ink = max(ink, lineAA(vWorld.y / uContour, 1.0) * smoothstep(0.12, 0.3, tone));
    vec3 v = normalize(cameraPosition - vWorld);
    ink = max(ink, smoothstep(0.86, 0.97, 1.0 - abs(dot(n, v))) * uRim);
    gl_FragColor = finish(ink);
    #include <colorspace_fragment>
  }
`;

const PLANE_FRAG = /* glsl */ `
  uniform float uStrength;
  uniform float uSpacing;
  uniform float uDash;
  uniform float uWave;
  void main() {
    float z = vWorld.z + sin(vWorld.x * 0.031) * uWave + sin(vWorld.x * 0.0071 + 1.3) * uWave * 2.0;
    float row = floor(z / uSpacing + 0.5);
    float l = lineAA(z / uSpacing, 1.0);
    float seg = h21(vec2(floor((vWorld.x + row * 7.3) / (uSpacing * 9.0)), row));
    float fw = fwidth(z / uSpacing);
    float dash = mix(step(uDash, seg), 1.0 - uDash * 0.7, smoothstep(0.16, 0.38, fw));
    gl_FragColor = finish(l * dash * uStrength);
    #include <colorspace_fragment>
  }
`;

const LINE_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = modelMatrix * instanceMatrix;
    #endif
    vec4 wp = m * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const LINE_FRAG = /* glsl */ `
  uniform vec3 uInk; uniform vec3 uPaper; uniform vec3 uFog; uniform float uOpacity;
  varying vec3 vWorld;
  void main() {
    float d = length(vWorld - cameraPosition);
    float k = (1.0 - smoothstep(uFog.x, uFog.y, d) * uFog.z) * uOpacity;
    gl_FragColor = vec4(mix(uPaper, uInk, k), 1.0);
    #include <colorspace_fragment>
  }
`;

const HULL_VERT = /* glsl */ `
  uniform float uPx;
  uniform vec2 uRes;
  varying vec3 vWorld;
  void main() {
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = modelMatrix * instanceMatrix;
    #endif
    vec4 wp = m * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec3 nW = normalize(mat3(m) * normal);
    vec4 clip = projectionMatrix * viewMatrix * wp;
    vec4 cn = projectionMatrix * viewMatrix * vec4(nW, 0.0);
    vec2 dir = cn.xy;
    float len = length(dir);
    dir = len > 1e-6 ? dir / len : vec2(0.0);
    clip.xy += dir * uPx * 2.0 / uRes * clip.w;
    gl_Position = clip;
  }
`;

export function createInk(opts: InkOptions, width: number, height: number): Ink {
  const light = (opts.light ?? new THREE.Vector3(-0.55, 0.75, 0.45)).clone().normalize();
  const uniforms = {
    uInk: { value: new THREE.Color(INK) },
    uPaper: { value: new THREE.Color(PAPER) },
    uLight: { value: light },
    uFog: { value: new THREE.Vector3(opts.fogNear, opts.fogFar, opts.fogMax ?? 0.9) },
    uRes: { value: new THREE.Vector2(width, height) },
  };
  const shared = { uInk: uniforms.uInk, uPaper: uniforms.uPaper, uLight: uniforms.uLight, uFog: uniforms.uFog };
  const make = (frag: string, extra: Record<string, THREE.IUniform>, vert = COMMON_VERT) =>
    new THREE.ShaderMaterial({
      uniforms: { ...shared, ...extra },
      vertexShader: vert,
      fragmentShader: (vert === COMMON_VERT ? COMMON_FRAG : "") + frag,
    });

  return {
    uniforms,
    box: (hatch = 0.9) => make(BOX_FRAG, { uHatch: { value: hatch } }),
    round: (o = {}) =>
      make(ROUND_FRAG, {
        uTone: { value: o.tone ?? 0 },
        uHatch: { value: o.hatch ?? 0.6 },
        uContour: { value: o.contour ?? 0 },
        uRim: { value: o.rim ?? 0 },
      }),
    plane: (o) =>
      make(PLANE_FRAG, {
        uStrength: { value: o.strength },
        uSpacing: { value: o.spacing },
        uDash: { value: o.dash ?? 0.35 },
        uWave: { value: o.wave ?? 1.5 },
      }),
    line: (o = {}) =>
      new THREE.ShaderMaterial({
        uniforms: { ...shared, uFog: { value: new THREE.Vector3(opts.fogNear, opts.fogFar, o.fade ?? opts.fogMax ?? 0.9) }, uOpacity: { value: o.opacity ?? 1 } },
        vertexShader: LINE_VERT,
        fragmentShader: LINE_FRAG,
      }),
    hull: (px = 1.3) =>
      new THREE.ShaderMaterial({
        uniforms: { ...shared, uPx: { value: px }, uRes: uniforms.uRes, uOpacity: { value: 1 } },
        vertexShader: HULL_VERT,
        fragmentShader: LINE_FRAG,
        side: THREE.BackSide,
      }),
  };
}

/* ------------------------------------------------------------------ boxes */

export interface Box {
  x: number; z: number; w: number; d: number; h: number;
  y?: number; rot?: number;
  /** Window cell width and floor height in metres; 0 = blank wall. */
  win?: number; floor?: number;
  /** 0 punched windows, 1 glass curtain, 2 vertical ribs, 3 tall gothic. */
  style?: number;
  /** Added darkness (mansards, slate, shadowed masses). */
  tone?: number;
}

export function boxes(list: Box[], material: THREE.Material, name: string): THREE.InstancedMesh {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const params = new Float32Array(list.length * 4);
  const mesh = new THREE.InstancedMesh(geo, material, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  list.forEach((b, i) => {
    q.setFromAxisAngle(up, b.rot ?? 0);
    m.compose(new THREE.Vector3(b.x, (b.y ?? 0) + b.h / 2, b.z), q, new THREE.Vector3(b.w, b.h, b.d));
    mesh.setMatrixAt(i, m);
    params.set([b.win ?? 0, b.floor ?? 3.2, b.style ?? 0, b.tone ?? 0], i * 4);
  });
  geo.setAttribute("aParams", new THREE.InstancedBufferAttribute(params, 4));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.name = name;
  return mesh;
}

/* ------------------------------------------------------------------ blobs */

export interface Blob { x: number; y: number; z: number; r: number; sy?: number }

/** Spheres with an ink outline: trees, clouds, capsules. */
export function blobs(list: Blob[], fill: THREE.Material, hull: THREE.Material, name: string, segs = 12): THREE.Group {
  const geo = new THREE.SphereGeometry(1, segs, Math.round(segs * 0.7));
  const body = new THREE.InstancedMesh(geo, fill, list.length);
  const outline = new THREE.InstancedMesh(geo, hull, list.length);
  const m = new THREE.Matrix4();
  list.forEach((b, i) => {
    m.makeScale(b.r, b.r * (b.sy ?? 1), b.r).setPosition(b.x, b.y, b.z);
    body.setMatrixAt(i, m);
  });
  outline.instanceMatrix = body.instanceMatrix;
  body.frustumCulled = outline.frustumCulled = false;
  const g = new THREE.Group();
  g.add(outline, body);
  g.name = name;
  body.name = name + "-fill";
  outline.name = name + "-outline";
  outline.userData.pickable = false;
  return g;
}

/** Puffs for one cumulus cloud, flat-bottomed, centred on the origin. */
export function cloudPuffs(rng: () => number, width: number, n = 11): Blob[] {
  const out: Blob[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * 2 - 1;
    const x = t * width * 0.5 + (rng() - 0.5) * width * 0.08;
    const bulk = 1 - t * t;
    const r = width * (0.09 + 0.13 * bulk) * (0.8 + rng() * 0.4);
    out.push({ x, y: r * 0.35 + bulk * width * 0.06 * rng(), z: (rng() - 0.5) * width * 0.15, r, sy: 0.85 });
  }
  for (let i = 0; i < Math.round(n / 2); i++) {
    const t = (rng() * 2 - 1) * 0.55;
    const r = width * (0.1 + 0.08 * rng());
    out.push({ x: t * width * 0.5, y: width * 0.14 + r * 0.5, z: (rng() - 0.5) * width * 0.1, r, sy: 0.9 });
  }
  return out;
}

/* ------------------------------------------------------------------ lines */

export function lines(segments: number[], material: THREE.Material, name: string): THREE.LineSegments {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(segments, 3));
  const l = new THREE.LineSegments(g, material);
  l.name = name;
  l.frustumCulled = false;
  return l;
}

/** Solid ink girders: one thin box per segment, for members that need real weight up close. */
export function beams(segments: number[], thickness: number, material: THREE.Material, name: string): THREE.InstancedMesh {
  const n = segments.length / 6;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, n);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion(), m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    a.fromArray(segments, i * 6);
    b.fromArray(segments, i * 6 + 3);
    d.subVectors(b, a);
    const len = d.length();
    q.setFromUnitVectors(up, d.normalize());
    m.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(thickness, len + thickness * 0.5, thickness));
    mesh.setMatrixAt(i, m);
  }
  mesh.frustumCulled = false;
  mesh.name = name;
  return mesh;
}

/** Push a polyline into a segment list. */
export function polyline(out: number[], pts: THREE.Vector3[]) {
  for (let i = 0; i < pts.length - 1; i++) out.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
}
export function seg(out: number[], a: THREE.Vector3 | number[], b: THREE.Vector3 | number[]) {
  const A = Array.isArray(a) ? a : [a.x, a.y, a.z];
  const B = Array.isArray(b) ? b : [b.x, b.y, b.z];
  out.push(A[0], A[1], A[2], B[0], B[1], B[2]);
}

/* ---------------------------------------------------------- city blocks */

export interface CityOptions {
  rng: () => number;
  x0: number; x1: number; z0: number; z1: number;
  block: number; street: number;
  height: (x: number, z: number, r: () => number) => number;
  keep?: (x: number, z: number) => boolean;
  win?: number; floor?: number; style?: (h: number, r: () => number) => number;
  mansard?: boolean;
}

/** A grid of blocks, each split into 2–4 buildings of varied height. */
export function city(o: CityOptions): Box[] {
  const out: Box[] = [];
  const pitch = o.block + o.street;
  for (let bx = o.x0; bx < o.x1; bx += pitch) {
    for (let bz = o.z0; bz < o.z1; bz += pitch) {
      const cx = bx + o.block / 2, cz = bz + o.block / 2;
      if (o.keep && !o.keep(cx, cz)) continue;
      const splitX = o.rng() > 0.5;
      const parts = 2 + Math.floor(o.rng() * 3);
      let acc = 0;
      for (let p = 0; p < parts; p++) {
        const frac = p === parts - 1 ? 1 - acc : (1 / parts) * (0.7 + o.rng() * 0.6);
        const len = o.block * frac;
        const start = (splitX ? bx : bz) + o.block * acc;
        acc += frac;
        const h = o.height(cx, cz, o.rng);
        if (h <= 0) continue;
        const b: Box = splitX
          ? { x: start + len / 2, z: cz, w: len - 0.6, d: o.block, h }
          : { x: cx, z: start + len / 2, w: o.block, d: len - 0.6, h };
        b.win = o.win ?? 3.4;
        b.floor = o.floor ?? 3.4;
        b.style = o.style ? o.style(h, o.rng) : 0;
        out.push(b);
        if (o.mansard) {
          out.push({ ...b, y: h, h: 4.5, w: b.w - 2.4, d: b.d - 2.4, win: 3.4, floor: 4.5, style: 0, tone: 0.32 });
        }
      }
    }
  }
  return out;
}
