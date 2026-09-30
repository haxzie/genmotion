import * as THREE from "three";
import { Easing, interpolate } from "@genmotion/three-engine";
import { C } from "./brand";
import { label, measure, type Label, type LabelOpts } from "./text";
import { rng, hash } from "./music";

/* ============================================================ timing */

/** Index of the most recent trigger ≤ t, or -1. */
export function lastIndex(t: number, times: number[]) {
  let k = -1;
  for (let i = 0; i < times.length; i++) if (t >= times[i]) k = i;
  return k;
}
/** 1 at a trigger, decaying exponentially: punches, flashes, shakes. */
export function kick(t: number, times: number[], sharp = 9) {
  const k = lastIndex(t, times);
  return k < 0 ? 0 : Math.exp(-(t - times[k]) * sharp);
}
/** True for `frames` frames after any trigger: anime impact frames. */
export function impactFrame(t: number, times: number[], frames = 2) {
  for (const x of times) if (t >= x && t < x + frames / 30) return true;
  return false;
}
/** Slam-in: huge, slight undershoot, then 1. */
export const slam = (t: number, t0: number, from = 3, dur = 0.18) =>
  interpolate(t, [t0, t0 + dur * 0.55, t0 + dur], [from, 0.93, 1], Easing.easeOut);
/** Pop-in with overshoot, 0 to 1. */
export const pop = (t: number, t0: number, dur = 0.3) => interpolate(t, [t0, t0 + dur * 0.6, t0 + dur], [0, 1.12, 1], Easing.easeOut);
/** Deterministic wobble, about -1..1. */
export const wob = (t: number, seed: number) => Math.sin(t * (7 + seed) + seed * 13) * 0.6 + (hash(Math.floor(t * 15) + seed * 31) - 0.5) * 0.8;
/** 0..1 window with eased in/out edges: on between a and b. */
export const win = (t: number, a: number, b: number, fin = 0.15, fout = 0.12) =>
  interpolate(t, [a - fin, a, b - fout, b], [0, 1, 1, 0]);

/* ============================================================ type */

/** Pixels-per-world-unit of a 50° lens at distance d on a 1080 frame. */
export const pxPerUnit = (d: number, fov = 50) => 1080 / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * d);

/** A line of type as a world-space plane. `unitsPerPx` sets its world size. */
export function word(text: string, o: LabelOpts, unitsPerPx: number, name: string): Label {
  const m = label(text, { ss: 3, ...o });
  m.scale.setScalar(unitsPerPx);
  m.name = name;
  return m;
}

export type Letters = { group: THREE.Group; chars: { m: Label; x: number }[]; width: number };

/** One mesh per character (px units; scale the group into the world). */
export function letters(text: string, o: LabelOpts, name: string): Letters {
  const group = new THREE.Group();
  group.name = name;
  const weight = o.weight ?? 500;
  const tr = o.tracking ?? 0;
  const total = measure(text, o.size, weight, o.font, tr);
  const chars: Letters["chars"] = [];
  [...text].forEach((ch, i) => {
    const before = measure(text.slice(0, i), o.size, weight, o.font, tr);
    const w = measure(ch, o.size, weight, o.font, tr);
    const x = -total / 2 + before + w / 2;
    const m = label(ch, { ss: 3, ...o, padX: o.size * 0.1 });
    m.name = `${name}-${i}`;
    m.position.x = x;
    group.add(m);
    chars.push({ m, x });
  });
  return { group, chars, width: total };
}

/* ============================================================ particles */

const PX = 1158; // point-size attenuation for a 50° lens at 1080p

/** A twinkling star shell/box. Sizes in world units. */
export function stars(count: number, spread: THREE.Vector3, seed: number, size = 0.6, colors = ["#ffffff", C.cyan, "#ffd6f0"], name = "stars") {
  const r = rng(seed);
  const pos = new Float32Array(count * 3);
  const sd = new Float32Array(count);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    pos.set([(r() - 0.5) * spread.x, (r() - 0.5) * spread.y, (r() - 0.5) * spread.z], i * 3);
    sd[i] = r();
    c.set(colors[Math.floor(r() * colors.length)]);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: size }, uAmt: { value: 1 }, uPulse: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute vec3 aColor;
      uniform float uTime, uSize, uAmt, uPulse;
      varying vec3 vColor; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.55 + 0.45 * sin(uTime * (2.0 + aSeed * 5.0) + aSeed * 70.0);
        vA = uAmt * tw;
        vColor = aColor;
        gl_PointSize = clamp(uSize * (0.4 + aSeed) * (tw + uPulse) * ${PX}.0 / max(-mv.z, 0.1), 0.0, 90.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vA;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float star = exp(-abs(q.x) * 30.0) * exp(-abs(q.y) * 5.0) + exp(-abs(q.y) * 30.0) * exp(-abs(q.x) * 5.0);
        float core = exp(-length(q) * 10.0);
        gl_FragColor = vec4(vColor, clamp(star + core, 0.0, 1.0) * vA);
        #include <colorspace_fragment>
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = name;
  pts.userData.pickable = false;
  pts.frustumCulled = false;
  return { points: pts, mat, update: (t: number, amt = 1, pulse = 0) => {
    mat.uniforms.uTime.value = t;
    mat.uniforms.uAmt.value = amt;
    mat.uniforms.uPulse.value = pulse;
  } };
}

/** A 3D spherical burst of sparks fired at trigger times. */
export function burst(count: number, seed: number, colors = ["#ffffff", C.cyan, C.pink], size = 0.5, speed = 12, life = 1.1, name = "burst") {
  const r = rng(seed);
  const pos = new Float32Array(count * 3);
  const dir = new Float32Array(count * 3);
  const sd = new Float32Array(count);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(0.2 + r() * 0.8);
    dir.set([v.x, v.y, v.z], i * 3);
    sd[i] = r();
    c.set(colors[Math.floor(r() * colors.length)]);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aDir", new THREE.BufferAttribute(dir, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uAge: { value: -1 }, uSize: { value: size }, uSpeed: { value: speed }, uLife: { value: life }, uGrav: { value: -3 } },
    vertexShader: /* glsl */ `
      attribute vec3 aDir; attribute float aSeed; attribute vec3 aColor;
      uniform float uAge, uSize, uSpeed, uLife, uGrav;
      varying vec3 vColor; varying float vA;
      void main() {
        float a = max(uAge, 0.0);
        float d = uSpeed * (1.0 - exp(-3.0 * a)) / 3.0;
        vec3 p = aDir * d;
        p.y += 0.5 * uGrav * a * a;
        float life = 1.0 - clamp(a / (uLife * (0.5 + aSeed * 0.7)), 0.0, 1.0);
        vA = life * step(0.0, uAge);
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(uSize * (0.4 + aSeed) * life * ${PX}.0 / max(-mv.z, 0.1), 0.0, 120.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vA;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float star = exp(-abs(q.x) * 30.0) * exp(-abs(q.y) * 5.0) + exp(-abs(q.y) * 30.0) * exp(-abs(q.x) * 5.0);
        float core = exp(-length(q) * 9.0);
        gl_FragColor = vec4(vColor, clamp(star + core, 0.0, 1.0) * vA);
        #include <colorspace_fragment>
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = name;
  pts.userData.pickable = false;
  pts.frustumCulled = false;
  const fire = (t: number, times: number[]) => {
    const k = lastIndex(t, times);
    const age = k < 0 ? -1 : t - times[k];
    pts.visible = age >= 0 && age < life * 1.3;
    mat.uniforms.uAge.value = age;
  };
  return { points: pts, mat, fire };
}

/**
 * Warp streaks in CAMERA space: parent to the camera and they rush past the
 * lens forever. `amt` 0..1 is how hard you are flying.
 */
export function warp(count: number, seed: number, color = "#ffffff", name = "warp-streaks") {
  const r = rng(seed);
  const pos = new Float32Array(count * 6);
  const sd = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const rad = 1.2 + r() * 9;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    const z = -r() * 120;
    pos.set([x, y, z, x, y, z], i * 6);
    const k = r();
    sd.set([k, k], i * 2);
  }
  // second vertex flagged by odd index via attribute
  const tail = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) tail.set([0, 1], i * 2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
  geo.setAttribute("aTail", new THREE.BufferAttribute(tail, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAmt: { value: 0 }, uSpeed: { value: 90 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute float aTail;
      uniform float uTime, uAmt, uSpeed;
      varying float vA;
      void main() {
        vec3 p = position;
        float z = mod(p.z + uTime * uSpeed * (0.6 + aSeed), 120.0) - 120.0;
        p.z = z - aTail * (2.0 + uAmt * 18.0) * (0.5 + aSeed);
        vA = uAmt * (1.0 - aTail) * smoothstep(-120.0, -60.0, z);
        gl_Position = projectionMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying float vA;
      void main() { gl_FragColor = vec4(uColor, vA); }`,
  });
  const ls = new THREE.LineSegments(geo, mat);
  ls.name = name;
  ls.userData.pickable = false;
  ls.frustumCulled = false;
  ls.renderOrder = 850;
  return { lines: ls, update: (t: number, amt: number, speed = 90) => {
    ls.visible = amt > 0.001;
    mat.uniforms.uTime.value = t;
    mat.uniforms.uAmt.value = amt;
    mat.uniforms.uSpeed.value = speed;
  } };
}

/* ============================================================ shards */

/**
 * An instanced cloud of pieces that explode outward from the origin (or
 * implode back, if you run age backwards). Deterministic per frame.
 */
export function shards(count: number, seed: number, geo: THREE.BufferGeometry, mat: THREE.Material, name = "shards") {
  const r = rng(seed);
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.name = name;
  mesh.frustumCulled = false;
  const dirs: THREE.Vector3[] = [];
  const axes: THREE.Vector3[] = [];
  const sizes: number[] = [];
  const spins: number[] = [];
  const home: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    dirs.push(new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(0.3 + r() * 0.7));
    axes.push(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize());
    sizes.push(0.4 + r() * 0.9);
    spins.push((r() - 0.5) * 14);
    home.push(new THREE.Vector3((r() - 0.5) * 0.6, (r() - 0.5) * 0.6, (r() - 0.5) * 0.6));
  }
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  /** age in seconds since the blast; speed world-units/s; `fadeScale` shrinks pieces over life. */
  const set = (age: number, speed = 14, life = 1.6, gravity = -4) => {
    mesh.visible = age >= 0 && age < life;
    if (!mesh.visible) return;
    const d = (speed * (1 - Math.exp(-2.2 * age))) / 2.2;
    const k = 1 - Math.pow(age / life, 2);
    for (let i = 0; i < count; i++) {
      p.copy(home[i]).addScaledVector(dirs[i], d);
      p.y += 0.5 * gravity * age * age * sizes[i];
      q.setFromAxisAngle(axes[i], spins[i] * age);
      s.setScalar(sizes[i] * k);
      m4.compose(p, q, s);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  set(-1);
  return { mesh, set };
}

/* ============================================================ rings */

export type Ring3 = { t: number; pos: THREE.Vector3; scale?: number; dur?: number; flat?: boolean };

/** A pool of expanding neon shockwave rings in 3D. */
export function rings3(n: number, color: string, thickness = 0.04, name = "shockwave") {
  const group = new THREE.Group();
  group.name = name;
  group.userData.pickable = false;
  const geo = new THREE.TorusGeometry(1, thickness, 8, 96);
  const list: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.name = `${name}-${i}`;
    m.visible = false;
    group.add(m);
    list.push(m);
  }
  const update = (t: number, triggers: Ring3[], face = false) => {
    for (const m of list) m.visible = false;
    let slot = 0;
    for (const tr of triggers) {
      const dur = tr.dur ?? 0.6;
      const u = (t - tr.t) / dur;
      if (u < 0 || u >= 1 || slot >= n) continue;
      const m = list[slot++];
      m.visible = true;
      m.position.copy(tr.pos);
      m.userData.billboard = !tr.flat && face;
      if (tr.flat) m.rotation.set(-Math.PI / 2, 0, 0);
      else if (!face) m.rotation.set(0, 0, 0);
      m.scale.setScalar(0.1 + (1 - Math.pow(1 - u, 3)) * (tr.scale ?? 5));
      m.material.opacity = Math.pow(1 - u, 1.5);
    }
  };
  return { group, update };
}

/* ============================================================ trails */

/** A glowing tube along a path, revealed with setProgress(0..1). */
export function trail(points: THREE.Vector3[], radius: number, color: string, name = "trail", tubular = 400, additive = false) {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const radial = 8;
  const geo = new THREE.TubeGeometry(curve, tubular, radius, radial, false);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    depthWrite: !additive,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.frustumCulled = false;
  const setProgress = (p: number) => geo.setDrawRange(0, Math.floor(THREE.MathUtils.clamp(p, 0, 1) * tubular) * radial * 6);
  const at = new THREE.Vector3();
  const head = (p: number) => curve.getPointAt(THREE.MathUtils.clamp(p, 0, 1), at);
  return { mesh, mat, curve, setProgress, head };
}

/* ============================================================ floors */

/** An infinite-looking neon grid floor (core GridHelper), fades into the fog. */
export function neonGrid(size: number, divisions: number, color: string, opacity = 0.7, name = "neon-grid") {
  const grid = new THREE.GridHelper(size, divisions, color, color);
  const m = grid.material as THREE.LineBasicMaterial;
  m.transparent = true;
  m.opacity = opacity;
  m.depthWrite = false;
  grid.name = name;
  grid.userData.pickable = false;
  return grid;
}

/* ============================================================ maths */

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
/** Point on a horizontal orbit. */
export function orbit(out: THREE.Vector3, r: number, a: number, y: number, c?: THREE.Vector3) {
  return out.set((c?.x ?? 0) + Math.sin(a) * r, (c?.y ?? 0) + y, (c?.z ?? 0) + Math.cos(a) * r);
}
