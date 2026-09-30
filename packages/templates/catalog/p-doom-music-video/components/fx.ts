import * as THREE from "three";

/** Shared uniforms a scene passes to every material so one value drives them all. */
export type Globals = {
  uInvert: { value: number }; // anime impact frame (stark black/white)
  uTime: { value: number };
};

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const HASH = /* glsl */ `
float hash11(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

const IMPACT = /* glsl */ `
vec3 impact(vec3 c, float amt) {
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 bw = vec3(1.0 - smoothstep(0.08, 0.22, l));
  return mix(c, bw, amt);
}`;

function flat(): Partial<THREE.ShaderMaterialParameters> {
  return { transparent: true, depthWrite: false, depthTest: false };
}

/* ------------------------------------------------------------------ art */

export type ArtUniforms = {
  map: { value: THREE.Texture | null };
  uOpacity: { value: number };
  uFlash: { value: number };
  uSplit: { value: number };
  uGlow: { value: number };
  uGlowR: { value: number };
  uGlowColor: { value: THREE.Color };
  uTint: { value: THREE.Color };
  uTintAmt: { value: number };
  uDissolve: { value: number };
  uDissolveColor: { value: THREE.Color };
  uUvRect: { value: THREE.Vector4 };
  uBright: { value: number };
  uInvert: { value: number };
  uTime: { value: number };
};
export type ArtMaterial = THREE.ShaderMaterial & { uniforms: ArtUniforms };

/** The one material every image uses: rim glow, rgb split, flash, tint, dissolve, impact. */
export function artMaterial(map: THREE.Texture, g: Globals, glowColor = "#ff3d9a"): ArtMaterial {
  const uniforms = {
    map: { value: map },
    uOpacity: { value: 1 },
    uFlash: { value: 0 },
    uSplit: { value: 0 },
    uGlow: { value: 0 },
    uGlowR: { value: 0.006 },
    uGlowColor: { value: new THREE.Color(glowColor) },
    uTint: { value: new THREE.Color("#000000") },
    uTintAmt: { value: 0 },
    uDissolve: { value: 0 },
    uDissolveColor: { value: new THREE.Color("#3df2ff") },
    uUvRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    uBright: { value: 1 },
    uInvert: g.uInvert,
    uTime: g.uTime,
  };
  return new THREE.ShaderMaterial({
    ...flat(),
    uniforms,
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float uOpacity, uFlash, uSplit, uGlow, uGlowR, uTintAmt, uDissolve, uInvert, uTime, uBright;
      uniform vec3 uGlowColor, uTint, uDissolveColor;
      uniform vec4 uUvRect;
      varying vec2 vUv;
      ${HASH}
      ${IMPACT}
      void main() {
        vec2 uv = uUvRect.xy + vUv * uUvRect.zw;
        vec4 c = texture2D(map, uv);
        if (uSplit > 0.0) {
          vec4 r = texture2D(map, uv + vec2(uSplit, 0.0));
          vec4 b = texture2D(map, uv - vec2(uSplit, 0.0));
          c.r = r.r; c.b = b.b; c.a = max(c.a, max(r.a, b.a));
        }
        c.rgb *= uBright;
        c.rgb = mix(c.rgb, uTint, uTintAmt);
        c.rgb = mix(c.rgb, vec3(1.0), uFlash);
        float outA = c.a;
        vec3 outC = c.rgb;
        if (uGlow > 0.0) {
          float a = 0.0;
          for (int i = 0; i < 12; i++) {
            float ang = float(i) * 0.5236;
            a += texture2D(map, uv + vec2(cos(ang), sin(ang)) * uGlowR).a;
            a += texture2D(map, uv + vec2(cos(ang), sin(ang)) * uGlowR * 2.2).a * 0.6;
          }
          a = clamp(a / 12.0, 0.0, 1.0) * uGlow;
          float ga = a * (1.0 - c.a);
          outA = c.a + ga;
          outC = (c.rgb * c.a + uGlowColor * ga) / max(outA, 1e-4);
        }
        if (uDissolve > 0.0) {
          vec2 cell = floor(uv * vec2(90.0, 120.0));
          float n = hash21(cell) * 0.7 + (1.0 - uv.y) * 0.3;
          if (n < uDissolve) discard;
          float edge = 1.0 - smoothstep(0.0, 0.08, n - uDissolve);
          outC = mix(outC, uDissolveColor * 1.6, edge);
        }
        outC = impact(outC, uInvert);
        gl_FragColor = vec4(outC, outA * uOpacity);
        #include <colorspace_fragment>
      }`,
  }) as ArtMaterial;
}

/* ---------------------------------------------------------- fullscreen */

type FS = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
function fsMesh(w: number, h: number, mat: THREE.ShaderMaterial, name: string): FS {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.name = name;
  m.userData.pickable = false;
  m.frustumCulled = false;
  return m as FS;
}

/** Anime concentration lines. uAmt 0..1, uColor, uCenter (px), uInner radius 0..1. */
export function speedLines(w: number, h: number, g: Globals, color = "#ffffff", count = 180): FS {
  return fsMesh(
    w,
    h,
    new THREE.ShaderMaterial({
      ...flat(),
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: g.uTime,
        uAmt: { value: 0 },
        uInner: { value: 0.35 },
        uRate: { value: 12 },
        uCount: { value: count },
        uColor: { value: new THREE.Color(color) },
        uRes: { value: new THREE.Vector2(w, h) },
        uCenter: { value: new THREE.Vector2(0, 0) },
        uInvert: g.uInvert,
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        uniform float uTime, uAmt, uInner, uRate, uCount, uInvert;
        uniform vec3 uColor; uniform vec2 uRes, uCenter;
        varying vec2 vUv;
        ${HASH}
        void main() {
          vec2 p = (vUv - 0.5) * uRes - uCenter;
          float a = atan(p.y, p.x) / 6.28318 + 0.5;
          float r = length(p) / (0.5 * length(uRes));
          float cell = a * uCount;
          float id = floor(cell);
          float f = fract(cell);
          float s = floor(uTime * uRate);
          float h1 = hash11(id + s * 13.1);
          float h2 = hash11(id * 1.7 + s * 7.3);
          float width = 0.06 + 0.4 * h2 * h2;
          float line = 1.0 - smoothstep(width * 0.4, width, abs(f - 0.5));
          float show = step(0.42, h1);
          float inner = uInner + h2 * 0.28;
          float rad = smoothstep(inner, inner + 0.3, r);
          float a2 = line * show * rad * uAmt;
          vec3 col = mix(uColor, vec3(0.0), uInvert);
          gl_FragColor = vec4(col, a2);
          #include <colorspace_fragment>
        }`,
    }),
    "speed-lines",
  );
}

/** Rotating idol-stage sunburst. */
export function sunburst(w: number, h: number, g: Globals, a = "#2a0f63", b = "#160838", rays = 24): FS {
  return fsMesh(
    w,
    h,
    new THREE.ShaderMaterial({
      ...flat(),
      uniforms: {
        uTime: g.uTime,
        uInvert: g.uInvert,
        uSpin: { value: 0.02 },
        uRays: { value: rays },
        uA: { value: new THREE.Color(a) },
        uB: { value: new THREE.Color(b) },
        uOpacity: { value: 1 },
        uPulse: { value: 0 },
        uRes: { value: new THREE.Vector2(w, h) },
        uCenter: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        uniform float uTime, uSpin, uRays, uOpacity, uPulse, uInvert;
        uniform vec3 uA, uB; uniform vec2 uRes, uCenter;
        varying vec2 vUv;
        ${IMPACT}
        void main() {
          vec2 p = (vUv - 0.5) * uRes - uCenter;
          float a = atan(p.y, p.x) / 6.28318;
          float s = smoothstep(0.46, 0.54, fract(a * uRays + uTime * uSpin));
          vec3 col = mix(uA, uB, s);
          float r = length(p) / (0.5 * length(uRes));
          col *= mix(1.25 + uPulse * 0.6, 0.35, smoothstep(0.0, 1.1, r));
          col = impact(col, uInvert);
          gl_FragColor = vec4(col, uOpacity);
          #include <colorspace_fragment>
        }`,
    }),
    "sunburst",
  );
}

/** Synthwave perspective grid floor. uHorizon in -1..1 screen space. */
export function gridFloor(w: number, h: number, g: Globals, color = "#ff3d9a"): FS {
  return fsMesh(
    w,
    h,
    new THREE.ShaderMaterial({
      ...flat(),
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: g.uTime,
        uInvert: g.uInvert,
        uAmt: { value: 1 },
        uSpeed: { value: 1.2 },
        uHorizon: { value: -0.15 },
        uColor: { value: new THREE.Color(color) },
        uAspect: { value: w / h },
        uPulse: { value: 0 },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        uniform float uTime, uAmt, uSpeed, uHorizon, uAspect, uPulse, uInvert;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float d = uHorizon - p.y;
          if (d <= 0.0) { gl_FragColor = vec4(0.0); return; }
          float z = 1.0 / d;
          vec2 gpos = vec2(p.x * uAspect * z * 1.4, z * 2.0 + uTime * uSpeed);
          vec2 fw = fwidth(gpos) * 1.2;
          vec2 l = 1.0 - smoothstep(vec2(0.0), fw + 0.02, abs(fract(gpos - 0.5) - 0.5));
          float line = max(l.x, l.y);
          float fade = smoothstep(0.0, 0.25, d) * smoothstep(0.0, 1.0, 1.0 - d * 0.35);
          float glow = exp(-d * 9.0) * (0.9 + uPulse);
          float a = (line * fade * (0.7 + uPulse * 0.8) + glow) * uAmt;
          vec3 col = mix(uColor, vec3(0.0), uInvert);
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
        }`,
    }),
    "grid-floor",
  );
}

/** A black hole / singularity with a swirling accretion ring. Size is its square in px. */
export function blackHole(size: number, g: Globals): FS {
  const m = fsMesh(
    size,
    size,
    new THREE.ShaderMaterial({
      ...flat(),
      uniforms: {
        uTime: g.uTime,
        uInvert: g.uInvert,
        uAmt: { value: 1 },
        uSpin: { value: 1 },
        uPulse: { value: 0 },
        uA: { value: new THREE.Color("#ff3d9a") },
        uB: { value: new THREE.Color("#3df2ff") },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        uniform float uTime, uAmt, uSpin, uPulse, uInvert;
        uniform vec3 uA, uB;
        varying vec2 vUv;
        void main() {
          vec2 p = (vUv - 0.5) * 4.0;          // core radius ~= 1 unit, square spans 4
          float r = length(p);
          vec2 q = vec2(p.x, p.y / 0.32);       // tilted disk
          float rq = length(q);
          float ang = atan(q.y, q.x);
          float swirl = 0.5 + 0.5 * sin(ang * 5.0 - uTime * 3.0 * uSpin + rq * 7.0);
          float swirl2 = 0.5 + 0.5 * sin(ang * 11.0 + uTime * 5.0 * uSpin - rq * 13.0);
          float disk = exp(-pow((rq - 1.55) / 0.42, 2.0)) * (0.55 + 0.6 * swirl * swirl2);
          float photon = exp(-pow((r - 1.02) / 0.05, 2.0)) * 1.4;
          float halo = exp(-pow((r - 1.1) / 0.45, 2.0)) * 0.45;
          vec3 col = mix(uA, uB, swirl) * disk * (2.2 + uPulse * 1.5) + vec3(1.0, 0.85, 1.0) * photon + mix(uA, uB, 0.5) * halo;
          float a = clamp(disk * 1.3 + photon + halo, 0.0, 1.0);
          // the core swallows everything behind it, but the front half of the disk passes in front
          float core = 1.0 - smoothstep(0.93, 1.0, r);
          float front = step(q.y, 0.0) * disk;
          col = mix(col, vec3(0.0), core * (1.0 - clamp(front * 1.5, 0.0, 1.0)));
          a = max(a, core);
          a *= smoothstep(2.0, 1.4, r) * uAmt;
          col = mix(col, vec3(1.0) - col, uInvert);
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
        }`,
    }),
    "singularity",
  );
  m.userData.pickable = true;
  return m;
}

/** Vignette + film grain + faint scanlines, over everything. */
export function filmOverlay(w: number, h: number, g: Globals): FS {
  return fsMesh(
    w,
    h,
    new THREE.ShaderMaterial({
      ...flat(),
      uniforms: {
        uTime: g.uTime,
        uVig: { value: 0.75 },
        uGrain: { value: 0.03 },
        uRes: { value: new THREE.Vector2(w, h) },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        uniform float uTime, uVig, uGrain; uniform vec2 uRes;
        varying vec2 vUv;
        ${HASH}
        void main() {
          vec2 p = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
          float v = smoothstep(0.45, 1.05, length(p) * 1.15) * uVig;
          float n = hash21(floor(vUv * uRes / 2.0) + floor(uTime * 30.0) * 17.0) - 0.5;
          float scan = 0.5 + 0.5 * sin(vUv.y * uRes.y * 1.5708);
          float ga = uGrain * (abs(n) * 2.0 + scan * 0.3);
          vec3 col = mix(vec3(0.5 + n), vec3(0.02, 0.0, 0.06), v / (v + ga + 1e-4));
          float a = clamp(v + ga, 0.0, 1.0);
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
        }`,
    }),
    "film-overlay",
  );
}

/** Flat colour fullscreen for flashes and fades. */
export function flashPlane(w: number, h: number, color = "#ffffff", additive = true) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }),
  );
  m.userData.pickable = false;
  m.frustumCulled = false;
  return m;
}

/** Halftone dot field fading along x — the manga-panel texture. */
export function halftone(w: number, h: number, g: Globals, color = "#ff3d9a", cell = 26): FS {
  return fsMesh(
    w,
    h,
    new THREE.ShaderMaterial({
      ...flat(),
      uniforms: {
        uTime: g.uTime,
        uAmt: { value: 0.6 },
        uCell: { value: cell },
        uColor: { value: new THREE.Color(color) },
        uRes: { value: new THREE.Vector2(w, h) },
        uDir: { value: new THREE.Vector2(1, 0.3) },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        uniform float uTime, uAmt, uCell; uniform vec3 uColor; uniform vec2 uRes, uDir;
        varying vec2 vUv;
        void main() {
          vec2 px = vUv * uRes;
          vec2 cell = fract(px / uCell) - 0.5;
          float grad = clamp(dot(vUv - 0.5, normalize(uDir)) + 0.5, 0.0, 1.0);
          float rad = grad * 0.55;
          float d = 1.0 - smoothstep(rad - 0.06, rad, length(cell));
          gl_FragColor = vec4(uColor, d * uAmt);
          #include <colorspace_fragment>
        }`,
    }),
    "halftone",
  );
}

/* ------------------------------------------------------------- particles */

/** Twinkling 4-point sparkles scattered over an area. */
export function sparkles(count: number, w: number, h: number, g: Globals, seed: number, colors = ["#ffffff", "#3df2ff", "#ff3d9a"], size = 34) {
  let s = seed >>> 0;
  const r = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pos = new Float32Array(count * 3);
  const seedA = new Float32Array(count);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (r() - 0.5) * w;
    pos[i * 3 + 1] = (r() - 0.5) * h;
    pos[i * 3 + 2] = 0;
    seedA[i] = r();
    c.set(colors[Math.floor(r() * colors.length)]);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seedA, 1));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    ...flat(),
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: g.uTime, uAmt: { value: 1 }, uSize: { value: size }, uRise: { value: 20 }, uH: { value: h } },
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute vec3 aColor;
      uniform float uTime, uAmt, uSize, uRise, uH;
      varying vec3 vColor; varying float vA;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + uH * 0.5 + uTime * uRise * (0.4 + aSeed), uH) - uH * 0.5;
        p.x += sin(uTime * (0.5 + aSeed) + aSeed * 40.0) * 12.0;
        float tw = 0.5 + 0.5 * sin(uTime * (3.0 + aSeed * 6.0) + aSeed * 60.0);
        vA = tw * uAmt;
        vColor = aColor;
        gl_PointSize = uSize * (0.35 + aSeed * 0.9) * (0.4 + tw * 0.8) * uAmt;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vA;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float star = exp(-abs(q.x) * 40.0) * exp(-abs(q.y) * 5.0) + exp(-abs(q.y) * 40.0) * exp(-abs(q.x) * 5.0);
        float core = exp(-length(q) * 14.0);
        float a = clamp(star + core, 0.0, 1.0) * vA;
        gl_FragColor = vec4(vColor, a);
        #include <colorspace_fragment>
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = "sparkles";
  pts.userData.pickable = false;
  pts.frustumCulled = false;
  return pts;
}

/** Falling rain / data streaks. */
export function streaks(count: number, w: number, h: number, g: Globals, seed: number, color = "#9fd8ff", len = 60, speed = 1400, slant = 0.12) {
  let s = seed >>> 0;
  const r = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const pos = new Float32Array(count * 6);
  const sd = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = (r() - 0.5) * w * 1.2;
    const y = (r() - 0.5) * h;
    const k = r();
    const l = len * (0.5 + k);
    pos.set([x, y, 0, x - l * slant, y + l, 0], i * 6);
    sd[i * 2] = k;
    sd[i * 2 + 1] = k;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
  const mat = new THREE.ShaderMaterial({
    ...flat(),
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: g.uTime, uAmt: { value: 0.5 }, uSpeed: { value: speed }, uH: { value: h }, uSlant: { value: slant }, uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime, uSpeed, uH, uSlant;
      varying float vK;
      void main() {
        vec3 p = position;
        float dy = uTime * uSpeed * (0.7 + aSeed * 0.6);
        float y = mod(p.y - dy + uH * 0.5, uH * 1.2) - uH * 0.6;
        p.x += (y - p.y) * -uSlant;
        p.y = y;
        vK = aSeed;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAmt; uniform vec3 uColor; varying float vK;
      void main() {
        float a = uAmt * (0.3 + vK * 0.7);
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }`,
  });
  const ls = new THREE.LineSegments(geo, mat);
  ls.name = "rain";
  ls.userData.pickable = false;
  ls.frustumCulled = false;
  return ls;
}
