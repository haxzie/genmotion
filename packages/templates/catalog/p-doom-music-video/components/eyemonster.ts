import * as THREE from "three";
import { rng } from "./music";

/** A glowing vein network, drawn once on a canvas for the flesh's emissive map. */
function veinTexture(seed: number) {
  const r = rng(seed);
  const c = new OffscreenCanvas(1024, 512);
  const g = c.getContext("2d")!;
  g.fillStyle = "#000000";
  g.fillRect(0, 0, 1024, 512);
  g.lineCap = "round";
  const branch = (x: number, y: number, a: number, w: number, depth: number) => {
    let px = x;
    let py = y;
    const n = 8 + Math.floor(r() * 10);
    for (let i = 0; i < n; i++) {
      a += (r() - 0.5) * 0.7;
      const nx = px + Math.cos(a) * 14;
      const ny = py + Math.sin(a) * 14;
      g.strokeStyle = `rgba(255,${60 + Math.floor(r() * 60)},${120 + Math.floor(r() * 60)},${0.5 + w / 10})`;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(nx, ny);
      g.stroke();
      px = nx;
      py = ny;
      if (depth < 3 && r() < 0.18) branch(px, py, a + (r() < 0.5 ? 0.8 : -0.8), w * 0.6, depth + 1);
    }
  };
  for (let k = 0; k < 70; k++) branch(r() * 1024, r() * 512, r() * Math.PI * 2, 2 + r() * 3.5, 0);
  // wrap the texture horizontally by copying the edges
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A tapered tube whose vertices are relaid every frame along a spine. */
function livingTube(rings: number, radial: number, mat: THREE.Material, name: string) {
  const RV = radial + 1;
  const pos = new Float32Array(rings * RV * 3);
  const uv = new Float32Array(rings * RV * 2);
  const idx: number[] = [];
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < RV; i++) {
      uv.set([j / (rings - 1) * 3, i / radial], (j * RV + i) * 2);
      if (j < rings - 1 && i < radial) {
        const a = j * RV + i;
        idx.push(a, a + RV, a + 1, a + RV, a + RV + 1, a + 1);
      }
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.frustumCulled = false;
  const pts = Array.from({ length: rings }, () => new THREE.Vector3());
  const T = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const v = new THREE.Vector3();
  /** Fill `pts` yourself, then call build with a radius profile. */
  const build = (radius: (s: number) => number) => {
    const pa = geo.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j < rings; j++) {
      const a = pts[j];
      const b = pts[Math.min(rings - 1, j + 1)];
      T.subVectors(b, a);
      if (j === rings - 1) T.subVectors(a, pts[j - 1]);
      T.normalize();
      N.crossVectors(T, up);
      if (N.lengthSq() < 1e-6) N.set(1, 0, 0);
      N.normalize();
      B.crossVectors(N, T);
      const r = radius(j / (rings - 1));
      for (let i = 0; i <= radial; i++) {
        const th = (i / radial) * Math.PI * 2;
        v.copy(a).addScaledVector(N, Math.cos(th) * r).addScaledVector(B, Math.sin(th) * r);
        pa.setXYZ(j * RV + i, v.x, v.y, v.z);
      }
    }
    pa.needsUpdate = true;
    geo.computeVertexNormals();
  };
  return { mesh, pts, build };
}

/**
 * The entropy monster: a breathing, veined flesh mass that the eyes sit in,
 * a fanged maw that gnashes on the beat, bone horns, and writhing tentacles.
 * The front of the body is an ellipsoid centred at C with radii R; use
 * `surface(x, y, out)` to place things on it.
 */
export function createEyeMonster(name = "entropy-monster", opts: { maw?: boolean; horns?: boolean; tentacles?: boolean; C?: THREE.Vector3; R?: THREE.Vector3; wall?: boolean } = {}) {
  const group = new THREE.Group();
  group.name = name;
  const C = opts.C ?? new THREE.Vector3(0, -0.5, -6);
  const R = opts.R ?? new THREE.Vector3(15.5, 11, 7.2);

  const veins = veinTexture(19);
  const skin = fleshTextures(23);
  const flesh = new THREE.MeshPhysicalMaterial({
    color: "#a8807c",
    map: skin.map,
    bumpMap: skin.bump,
    bumpScale: 4,
    roughness: 0.62,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.45,
    sheen: 0.6,
    sheenColor: new THREE.Color("#ff5a5a"),
    sheenRoughness: 0.5,
    emissive: new THREE.Color("#5a0a1a"),
    emissiveMap: veins,
    emissiveIntensity: 0.12,
  });

  // the body: a displaced ellipsoid that breathes — or, for close-ups, a dense
  // curved wall of flesh on that ellipsoid's front, sculpted once
  const wall = opts.wall ?? false;
  const bodyGeo = wall ? new THREE.PlaneGeometry(64, 44, 440, 300) : new THREE.SphereGeometry(1, 300, 220);
  if (wall) {
    const wp = bodyGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < wp.count; i++) {
      const x = wp.getX(i);
      const y = wp.getY(i);
      const u = 1 - Math.pow(x / R.x, 2) - Math.pow((y - C.y) / R.y, 2);
      wp.setZ(i, C.z + R.z * Math.sqrt(Math.max(0, u)) - (u < 0 ? Math.sqrt(-u) * 8 : 0));
    }
    const wu = bodyGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < wu.count; i++) wu.setXY(i, wu.getX(i) * 3, wu.getY(i) * 2);
  }
  const base = Float32Array.from(bodyGeo.attributes.position.array as Float32Array);
  const body = new THREE.Mesh(bodyGeo, flesh);
  body.name = `${name}-body`;
  if (!wall) {
    body.position.copy(C);
    body.scale.copy(R);
  }
  group.add(body);
  // a slow living ripple, in the vertex shader, so the dense wall costs nothing per frame
  const lidFlesh = flesh.clone(); // eyelids: same skin, no ripple
  const rip = { value: 0 };
  const beatU = { value: 0 };
  if (wall) {
    flesh.onBeforeCompile = (sh) => {
      sh.uniforms.uRip = rip;
      sh.uniforms.uBeat = beatU;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uRip; uniform float uBeat;")
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\n transformed.z += (sin(position.x * 0.45 + uRip * 1.3) * sin(position.y * 0.5 - uRip) * 0.09 + sin(length(position.xy) * 1.4 - uRip * 6.0) * 0.03 * uBeat);",
        );
    };
  }

  // bone horns across the crown
  const bone = new THREE.MeshStandardMaterial({ color: "#e9dcc8", roughness: 0.5, emissive: "#3a2a1a", emissiveIntensity: 0.3 });
  const hornGeo = new THREE.ConeGeometry(0.9, 6, 16, 6);
  // bend the cone into a hook
  const hp = hornGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < hp.count; i++) {
    const y = hp.getY(i) + 3;
    hp.setZ(i, hp.getZ(i) + Math.pow(y / 6, 2) * 1.8);
  }
  hornGeo.computeVertexNormals();
  hornGeo.translate(0, 3, 0);
  [[-9, 8.2, -0.5], [-4.5, 10.2, 0.3], [4.5, 10.2, 0.3], [9, 8.2, -0.5]].forEach(([x, y, rz], i) => {
    const h = new THREE.Mesh(hornGeo, bone);
    h.position.set(x, y, -5);
    h.rotation.set(-0.5, 0, x < 0 ? 0.35 + rz * 0.2 : -0.35 - rz * 0.2);
    h.scale.setScalar(i === 1 || i === 2 ? 1.2 : 1);
    h.name = `${name}-horn-${i}`;
    group.add(h);
  });

  // the maw
  const MOUTH = new THREE.Vector3(0, -5.2, 0);
  const surf = (x: number, y: number, out: THREE.Vector3) => {
    const u = 1 - Math.pow(x / R.x, 2) - Math.pow((y - C.y) / R.y, 2);
    return out.set(x, y, C.z + R.z * Math.sqrt(Math.max(0, u)));
  };
  surf(MOUTH.x, MOUTH.y, MOUTH);
  const mouth = new THREE.Group();
  mouth.name = `${name}-maw`;
  mouth.position.copy(MOUTH).add(new THREE.Vector3(0, 0, -0.3));
  mouth.rotation.x = 0.35;
  group.add(mouth);
  const throat = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: "#0a0006" }));
  throat.name = `${name}-throat`;
  const glowIn = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: "#ff2d4a", transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  glowIn.position.z = 0.01;
  glowIn.name = `${name}-throat-glow`;
  const lipMat = new THREE.MeshPhysicalMaterial({ color: "#6a1a44", roughness: 0.3, clearcoat: 1, emissive: "#5a0a2a", emissiveIntensity: 0.6 });
  const lips = new THREE.Mesh(new THREE.TorusGeometry(1, 0.13, 16, 96), lipMat);
  lips.name = `${name}-lips`;
  mouth.add(throat, glowIn, lips);
  const toothGeo = new THREE.ConeGeometry(0.28, 1, 8);
  const TU = 17;
  const TL = 15;
  const upper = Array.from({ length: TU }, (_, i) => {
    const m = new THREE.Mesh(toothGeo, bone);
    m.name = `${name}-fang-upper-${i}`;
    mouth.add(m);
    return { m, u: i / (TU - 1), len: 0.9 + Math.pow(Math.sin((i / (TU - 1)) * Math.PI), 2) * 0.2 + (i % 4 === 1 ? 0.9 : 0) };
  });
  const lower = Array.from({ length: TL }, (_, i) => {
    const m = new THREE.Mesh(toothGeo, bone);
    m.name = `${name}-fang-lower-${i}`;
    mouth.add(m);
    return { m, u: i / (TL - 1), len: 0.7 + (i % 3 === 2 ? 0.7 : 0) };
  });
  const droolMat = new THREE.MeshPhysicalMaterial({ color: "#ffb8d8", transparent: true, opacity: 0.6, roughness: 0.05, clearcoat: 1, emissive: "#ff5aa9", emissiveIntensity: 0.3 });
  const strands = [-3.6, -1.4, 0.9, 3.1, 4.6].map((x, i) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), droolMat);
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), droolMat);
    s.name = `${name}-drool-${i}`;
    drop.name = `${name}-drool-${i}-drop`;
    mouth.add(s, drop);
    return { s, drop, x, ph: i * 1.7 };
  });

  // tentacles from around the rim
  const TENT = 10;
  const tr = rng(4);
  const tentacles = Array.from({ length: TENT }, (_, i) => {
    const a = (i / TENT) * Math.PI * 2 + 0.2;
    const tube = livingTube(40, 12, flesh, `${name}-tentacle-${i}`);
    group.add(tube.mesh);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? "#3df2ff" : "#ff5aa9" }));
    tip.name = `${name}-tentacle-${i}-lure`;
    group.add(tip);
    return { tube, tip, a, len: 13 + tr() * 7, ph: tr() * 6, thick: 1.1 + tr() * 0.6 };
  });

  const dir = new THREE.Vector3();
  const out = new THREE.Vector3();
  const fwd = new THREE.Vector3(0, 0, 1);
  const side = new THREE.Vector3();

  /** open 0..1 (jaw), pulse = beat, heart = veins. */
  const update = (t: number, s: { open: number; pulse: number }) => {
    // breathing flesh: slow swells plus a heartbeat ripple
    const pa = bodyGeo.attributes.position as THREE.BufferAttribute;
    const beat = s.pulse;
    rip.value = t;
    beatU.value = beat;
    for (let i = 0; i < (wall ? 0 : pa.count); i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const z = base[i * 3 + 2];
      const d =
        0.035 * Math.sin(x * 4 + t * 1.3) * Math.sin(y * 5 - t * 1.1) +
        0.022 * Math.sin(x * 11 + y * 7) * Math.sin(y * 13 - z * 5 + t * 0.6) +
        0.02 * Math.sin(z * 9 + x * 7 + t * 2.2) +
        0.018 * beat * Math.sin((x + y) * 12 - t * 8);
      const k = 1 + d;
      pa.setXYZ(i, x * k, y * k, z * k);
    }
    if (!wall) {
      pa.needsUpdate = true;
      bodyGeo.computeVertexNormals();
      body.scale.set(R.x * (1 + beat * 0.012), R.y * (1 + Math.sin(t * 1.4) * 0.01 + beat * 0.012), R.z);
    }
    flesh.emissiveIntensity = 0.08 + beat * 0.14;
    veins.offset.set(t * 0.004, 0);

    // the maw
    const o = THREE.MathUtils.clamp(s.open, 0, 1);
    if (mouth.visible) {
    const W = 6.4;
    const Hh = 0.35 + o * 2.3;
    throat.scale.set(W * 0.98, Hh * 0.98, 1);
    glowIn.scale.set(W * 0.7, Hh * 0.6, 1);
    (glowIn.material as THREE.MeshBasicMaterial).opacity = 0.15 + o * 0.35 + beat * 0.15;
    lips.scale.set(W, Hh, 1);
    upper.forEach((tt) => {
      const a = Math.PI * (0.08 + tt.u * 0.84);
      const x = -Math.cos(a) * W * 0.96;
      const y = Math.sin(a) * Hh * 0.96;
      tt.m.position.set(x, y - tt.len * 0.45, 0.25);
      tt.m.rotation.set(0, 0, Math.PI + x * 0.03);
      tt.m.scale.set(1, tt.len * (0.7 + o * 0.5), 1);
    });
    lower.forEach((tt) => {
      const a = Math.PI * (0.12 + tt.u * 0.76);
      const x = -Math.cos(a) * W * 0.9;
      const y = -Math.sin(a) * Hh * 0.95;
      tt.m.position.set(x, y + tt.len * 0.4, 0.25);
      tt.m.rotation.set(0, 0, -x * 0.03);
      tt.m.scale.set(1, tt.len * (0.7 + o * 0.4), 1);
    });
    strands.forEach((st) => {
      const gap = Hh * 1.7 * Math.sqrt(Math.max(0, 1 - Math.pow(st.x / W, 2)));
      const sag = Math.sin(t * 2 + st.ph) * 0.15;
      st.s.visible = st.drop.visible = o > 0.3;
      st.s.position.set(st.x + sag, 0, 0.35);
      st.s.scale.set(1, gap * 0.95, 1);
      st.drop.position.set(st.x + sag, -gap * 0.1 + Math.sin(t * 3 + st.ph) * 0.2, 0.4);
    });
    }

    // tentacles: rooted round the rim, curling and reaching toward the camera
    if (opts.tentacles ?? true) tentacles.forEach((tc) => {
      dir.set(Math.cos(tc.a), Math.sin(tc.a) * 0.75, 0).normalize();
      side.crossVectors(dir, fwd).normalize();
      out.set(C.x + Math.cos(tc.a) * R.x * 0.9, C.y + Math.sin(tc.a) * R.y * 0.9, C.z + 1);
      const n = tc.tube.pts.length;
      const step = tc.len / n;
      let th = 0.2;
      const p = tc.tube.pts;
      p[0].copy(out);
      for (let j = 1; j < n; j++) {
        const sN = j / n;
        th = 0.2 + sN * (1.6 + Math.sin(t * 1.4 + tc.ph) * 1.1);
        const wave = Math.sin(t * 2.6 - sN * 6 + tc.ph) * 0.5 * sN;
        p[j].copy(p[j - 1])
          .addScaledVector(dir, Math.cos(th) * step)
          .addScaledVector(fwd, Math.sin(th) * step * 0.9)
          .addScaledVector(side, wave * step);
      }
      tc.tube.build((sv) => tc.thick * (1 - sv * 0.93) * (1 + beat * 0.05));
      tc.tip.position.copy(p[n - 1]);
      tc.tip.scale.setScalar(1 + beat * 0.6);
    });
  };

  // the realistic cut keeps only flesh and eyes
  mouth.visible = opts.maw ?? true;
  group.children.forEach((c) => {
    if (c.name.startsWith(`${name}-horn`)) c.visible = opts.horns ?? true;
    if (c.name.startsWith(`${name}-tentacle`)) c.visible = opts.tentacles ?? true;
  });
  /**
   * Sculpt eye sockets into the skin: an almond pit where each eye shows, and
   * a puffy lid ridge around it. `sink` is how deep the eyes sit (fraction of radius).
   */
  const carve = (eyes: { x: number; y: number; r: number; tilt: number }[], sink: number) => {
    for (let i = 0; i < base.length / 3; i++) {
      const uz = base[i * 3 + 2];
      if (!wall && uz <= 0.05) continue;
      const wx = wall ? base[i * 3] : C.x + base[i * 3] * R.x;
      const wy = wall ? base[i * 3 + 1] : C.y + base[i * 3 + 1] * R.y;
      let dz = 0;
      for (const e of eyes) {
        const a = e.r * Math.sqrt(1 - sink * sink); // radius where the ball meets the skin
        const dx = wx - e.x;
        const dy = wy - e.y;
        const cs = Math.cos(e.tilt);
        const sn = Math.sin(e.tilt);
        const lx = dx * cs + dy * sn;
        const ly = (-dx * sn + dy * cs) * 1.55; // almond: the opening is shorter than it is wide
        const rho = Math.hypot(lx, ly);
        if (rho > a * 2.2) continue;
        // lids: a soft ridge hugging the opening
        dz += e.r * 0.4 * Math.exp(-Math.pow((rho - a * 1.08) / (a * 0.42), 2));
        // the opening itself: skin rolls smoothly away so the eye shows
        const q = THREE.MathUtils.clamp((a * 1.08 - rho) / (a * 0.5), 0, 1);
        dz -= e.r * 0.95 * q * q * (3 - 2 * q);
        // a crease above the upper lid
        dz -= e.r * 0.06 * Math.exp(-Math.pow((rho - a * 1.55) / (a * 0.12), 2)) * (ly > 0 ? 1 : 0);
      }
      if (dz !== 0) base[i * 3 + 2] = uz + (wall ? dz : dz / R.z);
    }
    if (wall) {
      (bodyGeo.attributes.position.array as Float32Array).set(base);
      bodyGeo.attributes.position.needsUpdate = true;
      bodyGeo.computeVertexNormals();
    }
  };

  return { group, update, surface: surf, carve, C, R, flesh, lidFlesh };
}

/* ======================================================= realistic pieces */

/** Mottled, pored, bruised skin: a colour map and a bump map, drawn once. */
export function fleshTextures(seed: number) {
  const r = rng(seed);
  const S = 1024;
  const col = new OffscreenCanvas(S, S / 2);
  const bump = new OffscreenCanvas(S, S / 2);
  const c = col.getContext("2d")!;
  const b = bump.getContext("2d")!;
  c.fillStyle = "#5a1e2a";
  c.fillRect(0, 0, S, S / 2);
  b.fillStyle = "#808080";
  b.fillRect(0, 0, S, S / 2);
  // blotches: bruised purples, raw pinks, sallow yellows
  const tones = ["rgba(40,8,24,0.35)", "rgba(150,50,60,0.22)", "rgba(110,70,50,0.18)", "rgba(70,20,60,0.3)", "rgba(190,90,90,0.15)"];
  for (let i = 0; i < 260; i++) {
    const x = r() * S;
    const y = r() * S / 2;
    const rad = 10 + Math.pow(r(), 2) * 120;
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, tones[i % tones.length]);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const gb = b.createRadialGradient(x, y, 0, x, y, rad);
    gb.addColorStop(0, r() < 0.5 ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)");
    gb.addColorStop(1, "rgba(128,128,128,0)");
    b.fillStyle = gb;
    b.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // wrinkles
  b.lineCap = c.lineCap = "round";
  for (let i = 0; i < 220; i++) {
    let x = r() * S;
    let y = r() * S / 2;
    let a = r() * Math.PI;
    b.strokeStyle = "rgba(20,20,20,0.35)";
    b.lineWidth = 1 + r() * 2;
    c.strokeStyle = "rgba(30,5,15,0.25)";
    c.lineWidth = b.lineWidth;
    b.beginPath();
    c.beginPath();
    b.moveTo(x, y);
    c.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      a += (r() - 0.5) * 0.6;
      x += Math.cos(a) * 12;
      y += Math.sin(a) * 12;
      b.lineTo(x, y);
      c.lineTo(x, y);
    }
    b.stroke();
    c.stroke();
  }
  // pores
  for (let i = 0; i < 4000; i++) {
    const x = r() * S;
    const y = r() * S / 2;
    b.fillStyle = "rgba(0,0,0,0.5)";
    b.fillRect(x, y, 1.5, 1.5);
    c.fillStyle = "rgba(40,10,15,0.35)";
    c.fillRect(x, y, 1.5, 1.5);
  }
  // blue-purple veins under the skin
  c.lineCap = "round";
  for (let k = 0; k < 40; k++) {
    let x = r() * S;
    let y = r() * S / 2;
    let a = r() * Math.PI * 2;
    const w = 1 + r() * 3;
    for (let i = 0; i < 16; i++) {
      a += (r() - 0.5) * 0.7;
      const nx = x + Math.cos(a) * 14;
      const ny = y + Math.sin(a) * 14;
      c.strokeStyle = "rgba(60,30,90,0.45)";
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(nx, ny);
      c.stroke();
      b.strokeStyle = "rgba(200,200,200,0.35)";
      b.lineWidth = w * 1.4;
      b.beginPath();
      b.moveTo(x, y);
      b.lineTo(nx, ny);
      b.stroke();
      x = nx;
      y = ny;
    }
  }
  const map = new THREE.CanvasTexture(col as unknown as HTMLCanvasElement);
  map.colorSpace = THREE.SRGBColorSpace;
  const bmp = new THREE.CanvasTexture(bump as unknown as HTMLCanvasElement);
  for (const t of [map, bmp]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    t.anisotropy = 8;
  }
  return { map, bump: bmp };
}

/** Bloodshot sclera: off-white, capillaries crawling in from the edges. */
function scleraTexture(seed: number) {
  const r = rng(seed);
  const c = new OffscreenCanvas(1024, 512);
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#e2d2bc");
  grad.addColorStop(0.45, "#e8dccb");
  grad.addColorStop(1, "#b89a88");
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);
  g.lineCap = "round";
  for (let k = 0; k < 150; k++) {
    // start near the back of the ball (v near 1 = behind), crawl toward the iris
    let x = r() * 1024;
    let y = 250 + r() * 260;
    let a = -Math.PI / 2 + (r() - 0.5) * 0.8;
    let w = 1.2 + r() * 2.2;
    for (let i = 0; i < 18; i++) {
      a += (r() - 0.5) * 0.8;
      const nx = x + Math.cos(a) * 11;
      const ny = y + Math.sin(a) * 11;
      g.strokeStyle = `rgba(${150 + r() * 60},${20 + r() * 30},${30 + r() * 20},${0.35 + w / 8})`;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(nx, ny);
      g.stroke();
      x = nx;
      y = ny;
      w *= 0.93;
      if (y < 110) break;
    }
  }
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export type FleshEye = ReturnType<typeof createFleshEye>;

/**
 * A realistic eye: bloodshot wet sclera, a fibrous iris with crypts and a
 * limbal ring, a glassy cornea that catches the lights, and lids of the
 * monster's own flesh. Radius 1; faces +z; the ball turns to look.
 */
export function createFleshEye(name: string, lidMat: THREE.Material, o: { inner?: string; outer?: string; seed?: number; detail?: number } = {}) {
  const d = o.detail ?? 1;
  const n = (x: number) => Math.max(10, Math.round(x * d));
  const group = new THREE.Group();
  group.name = name;
  const ball = new THREE.Group();
  ball.name = `${name}-ball`;
  group.add(ball);
  // the sphere's poles are on y; the texture's v=0 row is the top pole. Turn it so v runs front→back.
  const scleraGeo = new THREE.SphereGeometry(1, n(64), n(48));
  scleraGeo.rotateX(Math.PI / 2);
  const sclera = new THREE.Mesh(scleraGeo, new THREE.MeshPhysicalMaterial({ map: scleraTexture(o.seed ?? 1), color: "#c8b2a6", roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.5, sheenColor: new THREE.Color("#ff6a6a") }));
  sclera.name = `${name}-sclera`;
  ball.add(sclera);
  const capGeo = new THREE.SphereGeometry(1.003, n(96), n(32), 0, Math.PI * 2, 0, 0.6);
  capGeo.rotateX(Math.PI / 2);
  const irisMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPupil: { value: 0.3 },
      uInner: { value: new THREE.Color(o.inner ?? "#c8841c") },
      uOuter: { value: new THREE.Color(o.outer ?? "#3f6a4a") },
      uData: { value: 0 },
      uSeed: { value: (o.seed ?? 1) * 13.1 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uPupil, uData, uSeed; uniform vec3 uInner, uOuter; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)) + uSeed) * 43758.5453); }
      float n1(float x){ float i = floor(x); float f = fract(x); return mix(h(vec2(i,0.0)), h(vec2(i+1.0,0.0)), f*f*(3.0-2.0*f)); }
      void main() {
        float r = 1.0 - vUv.y;
        float a = vUv.x * 6.28318;
        // radial fibres at several frequencies, and dark crypts
        float fib = n1(a * 38.0) * 0.5 + n1(a * 90.0 + r * 3.0) * 0.35 + n1(a * 170.0) * 0.15;
        float crypt = smoothstep(0.62, 0.8, n1(a * 22.0 + floor(r * 5.0) * 7.0)) * smoothstep(0.3, 0.5, r) * (1.0 - smoothstep(0.75, 0.9, r));
        vec3 col = mix(uInner, uOuter, smoothstep(0.35, 0.75, r));
        col *= 0.55 + 0.75 * fib;
        col *= 1.0 - crypt * 0.55;
        // collarette ring around the pupil
        col += uInner * 0.35 * smoothstep(0.08, 0.0, abs(r - (uPupil + 0.14)));
        // dark limbal ring at the edge
        col *= mix(1.0, 0.12, smoothstep(0.78, 0.97, r));
        // the machine inside: faint data glints wandering in the fibres
        float glint = step(0.985, h(vec2(floor(a * 60.0), floor(r * 12.0) + floor(uTime * 6.0))));
        col += vec3(0.3, 0.95, 1.0) * glint * uData * 0.8;
        // pupil with a soft edge
        col = mix(col, vec3(0.01, 0.005, 0.01), smoothstep(uPupil + 0.02, uPupil - 0.015, r));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const iris = new THREE.Mesh(capGeo, irisMat);
  iris.name = `${name}-iris`;
  ball.add(iris);
  // the cornea: a clear wet dome that catches every light
  const cornea = new THREE.Mesh(
    new THREE.SphereGeometry(1.04, n(48), n(24), 0, Math.PI * 2, 0, 0.72),
    new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.18, roughness: 0.02, metalness: 0, clearcoat: 1, clearcoatRoughness: 0, depthWrite: false }),
  );
  cornea.geometry.rotateX(Math.PI / 2);
  cornea.name = `${name}-cornea`;
  ball.add(cornea);
  // lids of the monster's flesh
  // lids: thin half-caps over the exposed dome. Open, they tuck under the skin; a blink slides them shut.
  const upperGeo = new THREE.SphereGeometry(1.035, n(48), n(12), Math.PI, Math.PI, 0, 0.9);
  upperGeo.rotateX(Math.PI / 2); // pole → +z; this phi range is the top half
  const lowerGeo = new THREE.SphereGeometry(1.03, n(48), n(12), 0, Math.PI, 0, 0.9);
  lowerGeo.rotateX(Math.PI / 2); // bottom half
  const upper = new THREE.Mesh(upperGeo, lidMat);
  upper.name = `${name}-lid-upper`;
  const lower = new THREE.Mesh(lowerGeo, lidMat);
  lower.name = `${name}-lid-lower`;
  group.add(upper, lower);

  const target = new THREE.Vector3();
  const set = (t: number, s: { pupil?: number; close?: number; data?: number; look?: THREE.Vector3 }) => {
    irisMat.uniforms.uTime.value = t;
    irisMat.uniforms.uPupil.value = s.pupil ?? 0.3;
    irisMat.uniforms.uData.value = s.data ?? 0;
    const c = THREE.MathUtils.clamp(s.close ?? 0.22, 0, 1);
    upper.rotation.x = -0.95 * (1 - c);
    lower.rotation.x = 0.9 * (1 - c);
    // at rest the sculpted skin is the lid; the caps only come out to blink
    upper.visible = lower.visible = c > 0.32;
    if (s.look) {
      group.updateWorldMatrix(true, false);
      ball.lookAt(target.copy(s.look));
    }
  };
  set(0, {});
  return { group, ball, set };
}
