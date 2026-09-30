/**
 * The cinematic layer every scene shares, driven only by the reference clock:
 *
 *  - ash & embers falling through three depth layers (parallax against the
 *    subject, because the camera drifts)
 *  - a slow handheld camera drift, plus a decaying shake on each impact
 *  - a red flash + chromatic-looking streak on impacts and on the cut in
 *  - film grain and a vignette, drawn last over everything
 *
 * All motion is a pure function of (R, frame): deterministic for export.
 */
import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";
import { CAM_Z, H, W, mulberry32 } from "./kit";

export interface FxOpts {
  seed: number;
  /** Reference-clock second this scene starts at (for the cut streak). */
  start: number;
  /** Impact times (reference seconds): shake + flash. */
  hits?: number[];
  embers?: number;
  /** 0..1, how strong the handheld drift is (dashboard shots want less). */
  drift?: number;
}

const EMBER_VS = /* glsl */ `
  attribute float aSpeed;
  attribute float aPhase;
  attribute float aSize;
  attribute float aHot;
  uniform float uTime;
  uniform float uSpan;
  uniform float uCamZ;
  varying float vHot;
  varying float vFade;
  void main() {
    vec3 p = position;
    // fall, wrap vertically, sway
    float y = p.y - aSpeed * uTime;
    y = mod(y + uSpan * 0.5, uSpan) - uSpan * 0.5;
    p.y = y;
    p.x += sin(uTime * 0.7 + aPhase) * 18.0 + sin(uTime * 1.9 + aPhase * 2.3) * 5.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * (uCamZ / -mv.z);
    vHot = aHot;
    // flicker + fade near the vertical wrap so nothing pops
    vFade = (0.65 + 0.35 * sin(uTime * 3.0 + aPhase * 5.0)) * smoothstep(0.5, 0.38, abs(y / uSpan));
  }
`;
const EMBER_FS = /* glsl */ `
  varying float vHot;
  varying float vFade;
  uniform float uOpacity;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    vec3 ash = vec3(0.55, 0.52, 0.5);
    vec3 ember = mix(vec3(1.0, 0.28, 0.2), vec3(1.0, 0.8, 0.25), fract(vHot * 7.0));
    vec3 col = mix(ash, ember, step(0.55, vHot));
    gl_FragColor = vec4(col, a * vFade * uOpacity * mix(0.35, 1.0, step(0.55, vHot)));
  }
`;

const POST_FS = /* glsl */ `
  varying vec2 vUv;
  uniform float uFrame;
  uniform float uFlash;
  uniform float uStreak;
  uniform float uAspect;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec2 uv = vUv;
    // grain: fresh per frame, deterministic
    float g = hash(floor(uv * vec2(960.0, 540.0)) + uFrame * 17.13);
    vec3 col = vec3(g * 0.045);
    // impact flash: red bloom from the centre
    vec2 q = (uv - 0.5) * vec2(uAspect, 1.0);
    float r = length(q);
    col += vec3(1.0, 0.22, 0.16) * uFlash * smoothstep(1.1, 0.0, r) * 0.55;
    col += vec3(1.0, 0.85, 0.5) * uFlash * smoothstep(0.35, 0.0, r) * 0.25;
    // cut streak: a hot horizontal band with a split red/yellow edge
    float band = exp(-pow((uv.y - 0.5) * 9.0, 2.0));
    float thin = exp(-pow((uv.y - 0.5) * 70.0, 2.0));
    col += uStreak * (vec3(1.0, 0.3, 0.2) * band * 0.35 + vec3(1.0, 0.9, 0.6) * thin * 0.9);
    gl_FragColor = vec4(col, 1.0);
  }
`;
const VIGNETTE_FS = /* glsl */ `
  varying vec2 vUv;
  uniform float uAspect;
  void main() {
    vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
    float v = smoothstep(0.45, 1.05, length(q));
    gl_FragColor = vec4(0.0, 0.0, 0.0, v * 0.72);
  }
`;
const QUAD_VS = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export function atmosphere(ctx: ThreeSceneContext, o: FxOpts) {
  const { scene } = ctx;
  const cam = ctx.camera as THREE.PerspectiveCamera;
  const rnd = mulberry32(o.seed * 7919);
  const aspect = ctx.width / ctx.height;

  // ---- embers & ash, in three depth bands ----
  const N = o.embers ?? 260;
  const span = H * 1.6;
  const pos = new Float32Array(N * 3);
  const speed = new Float32Array(N);
  const phase = new Float32Array(N);
  const size = new Float32Array(N);
  const hot = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const layer = i % 3; // 0 far, 1 mid, 2 near
    const z = layer === 0 ? -600 - rnd() * 500 : layer === 1 ? -150 + rnd() * 250 : 350 + rnd() * 350;
    const k = (CAM_Z - z) / CAM_Z; // keep bands covering the frame at their depth
    pos[i * 3] = (rnd() - 0.5) * W * k * 1.15;
    pos[i * 3 + 1] = (rnd() - 0.5) * span;
    pos[i * 3 + 2] = z;
    speed[i] = (layer === 2 ? 90 : layer === 1 ? 55 : 30) * (0.6 + rnd() * 0.8);
    phase[i] = rnd() * 100;
    size[i] = (layer === 2 ? 9 : layer === 1 ? 5 : 3.2) * (0.6 + rnd() * 0.9);
    hot[i] = rnd();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
  g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aHot", new THREE.BufferAttribute(hot, 1));
  const emberMat = new THREE.ShaderMaterial({
    vertexShader: EMBER_VS,
    fragmentShader: EMBER_FS,
    uniforms: { uTime: { value: 0 }, uSpan: { value: span }, uCamZ: { value: CAM_Z }, uOpacity: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const embers = new THREE.Points(g, emberMat);
  embers.name = "embers";
  embers.frustumCulled = false;
  embers.userData.pickable = false;
  embers.renderOrder = 50;
  scene.add(embers);

  // ---- post: vignette (normal blend) then grain / flash / streak (additive) ----
  const quad = new THREE.PlaneGeometry(2, 2);
  const vignette = new THREE.Mesh(
    quad,
    new THREE.ShaderMaterial({
      vertexShader: QUAD_VS,
      fragmentShader: VIGNETTE_FS,
      uniforms: { uAspect: { value: aspect } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  const postMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VS,
    fragmentShader: POST_FS,
    uniforms: { uFrame: { value: 0 }, uFlash: { value: 0 }, uStreak: { value: 0 }, uAspect: { value: aspect } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const post = new THREE.Mesh(quad, postMat);
  for (const [m, n, r] of [[vignette, "vignette", 998], [post, "film-grain", 999]] as const) {
    m.name = n;
    m.frustumCulled = false;
    m.renderOrder = r;
    m.userData.pickable = false;
    scene.add(m);
  }

  const hits = o.hits ?? [];
  const driftAmt = o.drift ?? 1;

  return {
    /** Impact envelope at R: 0 → 1 spike decaying over ~0.3s. */
    impact(R: number) {
      let v = 0;
      for (const h of hits) if (R >= h) v += Math.exp(-(R - h) * 14);
      return Math.min(1, v);
    },
    update(R: number, frame: number) {
      emberMat.uniforms.uTime!.value = R;
      postMat.uniforms.uFrame!.value = frame;
      const imp = this.impact(R);
      postMat.uniforms.uFlash!.value = imp * 0.55;
      postMat.uniforms.uStreak!.value = Math.exp(-Math.max(0, R - o.start) * 16) * (R >= o.start ? 1 : 0);
      // handheld drift + impact shake (translation only: layers parallax)
      let sx = 0, sy = 0;
      for (const h of hits) {
        if (R < h) continue;
        const a = 16 * Math.exp(-(R - h) * 9);
        sx += a * Math.sin((R - h) * 83 + h * 3);
        sy += a * Math.cos((R - h) * 71 + h * 5);
      }
      cam.position.x = driftAmt * (Math.sin(R * 0.37) * 7 + Math.sin(R * 0.91) * 2.5) + sx;
      cam.position.y = driftAmt * (Math.cos(R * 0.29) * 5 + Math.sin(R * 0.73) * 2) + sy;
      cam.position.z = CAM_Z;
      cam.rotation.set(0, 0, driftAmt * Math.sin(R * 0.23) * 0.0025 + sx * 0.0002);
    },
  };
}

// ------------------------------------------------------------ gold coins --

/**
 * Real lit, metallic coins that tumble under gravity. Instanced; each coin's
 * whole flight is a closed-form function of time, so any frame renders alone.
 */
export function coinRain(
  parent: THREE.Object3D,
  o: {
    seed: number;
    count: number;
    /** Reference seconds the first and last coin spawn. */
    from: number;
    to: number;
    /** Spawn point (parent space) for coin i. */
    emit: (i: number, r: () => number) => [number, number, number];
    /** Initial velocity (px/s) for coin i. */
    kick: (i: number, r: () => number) => [number, number, number];
    radius?: number;
    gravity?: number;
    name?: string;
  },
) {
  const r = o.radius ?? 26;
  const geo = new THREE.CylinderGeometry(r, r, r * 0.16, 40, 1);
  geo.rotateX(Math.PI / 2); // face the camera by default
  const mat = new THREE.MeshStandardMaterial({ color: "#ffd24d", metalness: 0.45, roughness: 0.32, emissive: "#7a4300", emissiveIntensity: 0.55 });
  const mesh = new THREE.InstancedMesh(geo, mat, o.count);
  mesh.name = o.name ?? "coins";
  mesh.frustumCulled = false;
  mesh.userData.pickable = false;
  parent.add(mesh);

  // their own light rig: warm key, red rim, soft fill (only lit materials care)
  const key = new THREE.DirectionalLight("#fff4d6", 4.2);
  key.position.set(-400, 700, 900);
  const rim = new THREE.DirectionalLight("#ff3b2f", 2.4);
  rim.position.set(600, -300, -400);
  const fill = new THREE.AmbientLight("#ffe2b0", 1.4);
  parent.add(key, rim, fill);

  const rnd = mulberry32(o.seed);
  const coins = Array.from({ length: o.count }, (_, i) => ({
    t0: o.from + ((o.to - o.from) * i) / Math.max(1, o.count - 1) + (rnd() - 0.5) * 0.05,
    p: new THREE.Vector3(...o.emit(i, rnd)),
    v: new THREE.Vector3(...o.kick(i, rnd)),
    axis: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(),
    spin: 5 + rnd() * 9,
    s: 0.75 + rnd() * 0.5,
  }));
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const grav = o.gravity ?? 1900;

  return {
    mesh,
    /** `vis` scales every coin (0 hides them) so they can leave with their scene. */
    update(R: number, vis = 1) {
      coins.forEach((c, i) => {
        const dt = R - c.t0;
        if (dt < 0 || dt > 2.6 || vis <= 0.001) {
          m4.makeScale(0, 0, 0);
        } else {
          pos.set(c.p.x + c.v.x * dt, c.p.y + c.v.y * dt - 0.5 * grav * dt * dt, c.p.z + c.v.z * dt);
          q.setFromAxisAngle(c.axis, c.spin * dt);
          const pop = Math.min(1, dt / 0.08);
          scl.setScalar(c.s * pop * vis);
          m4.compose(pos, q, scl);
        }
        mesh.setMatrixAt(i, m4);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// ------------------------------------------------------------- light rays --

/** Radial god rays + an expanding shockwave ring, for a reveal. */
export function rayBurst(parent: THREE.Object3D, name = "ray-burst") {
  const rays = new THREE.Mesh(
    new THREE.PlaneGeometry(2200, 2200),
    new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uAmt;
        float hash(float n){ return fract(sin(n) * 43758.5453); }
        void main(){
          vec2 p = vUv - 0.5;
          float r = length(p);
          float a = atan(p.y, p.x) / 6.28318 + 0.5;
          float k = a * 48.0 + uTime * 0.25;
          float i = floor(k);
          float f = fract(k);
          float beam = mix(hash(i), hash(i + 1.0), smoothstep(0.0, 1.0, f));
          beam = pow(beam, 3.0);
          float fall = smoothstep(0.5, 0.02, r) * smoothstep(0.0, 0.06, r);
          vec3 col = mix(vec3(1.0, 0.25, 0.15), vec3(1.0, 0.8, 0.3), smoothstep(0.35, 0.05, r));
          gl_FragColor = vec4(col * beam * fall * uAmt, 1.0);
        }`,
      uniforms: { uTime: { value: 0 }, uAmt: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  rays.name = name;
  rays.userData.pickable = false;
  const ringMat = new THREE.MeshBasicMaterial({ color: "#ffd23f", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.988, 1, 160), ringMat);
  ring.name = `${name}-shockwave`;
  ring.userData.pickable = false;
  parent.add(rays, ring);
  const m = rays.material as THREE.ShaderMaterial;
  return {
    rays,
    ring,
    /** k = seconds since the burst (negative = not yet). */
    update(k: number, time: number) {
      m.uniforms.uTime!.value = time;
      const amt = k < 0 ? 0 : Math.min(1, k / 0.08) * (0.12 + 0.5 * Math.exp(-k * 2.6));
      m.uniforms.uAmt!.value = amt;
      rays.visible = amt > 0.002;
      rays.rotation.z = time * 0.05;
      const rk = k < 0 ? 0 : Math.min(1, k / 0.7);
      const rs = 60 + (1 - Math.pow(1 - rk, 3)) * 1100;
      ring.scale.set(rs, rs, 1);
      ringMat.opacity = k < 0 ? 0 : Math.pow(1 - rk, 2) * 0.8;
      ring.visible = ringMat.opacity > 0.01;
    },
  };
}

// ------------------------------------------------------------------ sheen --

/** A diagonal glass highlight to sweep across a flat card (parent space). */
export function sheen(w: number, h: number, name = "sheen") {
  const mat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uPos;
      uniform float uAmt;
      uniform float uAspect;
      void main(){
        float d = (vUv.x * uAspect + (1.0 - vUv.y)) / (uAspect + 1.0) - uPos;
        float b = exp(-d * d * 4000.0) * 0.5 + exp(-d * d * 300.0) * 0.07;
        gl_FragColor = vec4(vec3(1.0, 0.9, 0.7) * b * uAmt, 1.0);
      }`,
    uniforms: { uPos: { value: -1 }, uAmt: { value: 1 }, uAspect: { value: w / h } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.name = name;
  m.userData.pickable = false;
  return {
    mesh: m,
    set(pos: number, amt = 1) {
      mat.uniforms.uPos!.value = pos;
      mat.uniforms.uAmt!.value = amt;
      m.visible = amt > 0.001 && pos > -0.2 && pos < 1.2;
    },
  };
}
