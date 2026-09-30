import * as THREE from "three";
import { Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { beatPos, beatPulse, eighthPulse, rng, SCENE_START } from "../components/music";
import { createWorld } from "../components/world";
import { createLyrics } from "../components/lyrics";
import { createPdoomMeter } from "../components/hud";
import { createThumbsUp } from "../components/hand";
import { burst, impactFrame, kick, neonGrid, shards, stars, trail, V, warp } from "../components/motion";

/**
 * 1:49–2:04 · tokens climb a transformer tower until they disobey → the layers
 * dance → we smash through safety fences → a sea of GPUs, and the world tilts askew.
 */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const w = createWorld(ctx, SCENE_START.fuse, { bg: "#07041a", fog: [40, 220] });
  const { root, put } = w;
  const S = SCENE_START.fuse / 30;
  const END = SCENE_START.foretold / 30;
  const DISOBEY = 114.36;
  const DANCE = 115.26;
  const BREAK = 117.08;
  const GPUS = 118.85;
  const ASKEW = 121.14;

  /* ================= A · the transformer tower (and its dance) ================= */
  const A = new THREE.Group();
  A.name = "transformer-tower";
  put(root, A, 1);
  const skyA = stars(1500, V(300, 300, 300), 91, 0.6);
  skyA.points.position.y = 40;
  A.add(skyA.points);
  const LAYERS = 12;
  const GAP = 3.2;
  const slabGeo = new THREE.BoxGeometry(12, 0.35, 12);
  const slabEdgesGeo = new THREE.EdgesGeometry(slabGeo);
  const slabMat = new THREE.MeshStandardMaterial({ color: "#6a5cff", transparent: true, opacity: 0.16, roughness: 0.2, metalness: 0.3, depthWrite: false, emissive: "#3a2d9a", emissiveIntensity: 0.5 });
  const slabs = Array.from({ length: LAYERS }, (_, i) => {
    const g = new THREE.Group();
    g.name = `transformer-layer-${i + 1}`;
    const m = new THREE.Mesh(slabGeo, slabMat);
    m.name = `transformer-layer-${i + 1}-slab`;
    const e = new THREE.LineSegments(slabEdgesGeo, new THREE.LineBasicMaterial({ color: i % 2 ? C.cyan : C.pink, transparent: true }));
    e.name = `transformer-layer-${i + 1}-edges`;
    g.add(m, e);
    g.position.y = i * GAP;
    A.add(g);
    return { g, e };
  });
  const TOK = 10;
  const tokX = (i: number) => (i - (TOK - 1) / 2) * 1.1;
  const tokMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: C.cyan, emissiveIntensity: 0.8, roughness: 0.3 });
  const tokens = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), tokMat, TOK * 4);
  tokens.name = "tokens";
  tokens.frustumCulled = false;
  A.add(tokens);
  // attention: arcs between token pairs, redrawn at whichever layer the tokens are passing
  const attn = new THREE.Group();
  attn.name = "attention-heads";
  A.add(attn);
  const ar = rng(21);
  const arcs = Array.from({ length: 22 }, (_, k) => {
    const i = Math.floor(ar() * TOK);
    let j = Math.floor(ar() * TOK);
    if (j === i) j = (i + 3) % TOK;
    const a = V(tokX(i), 0.4, 0);
    const b = V(tokX(j), 0.4, 0);
    const h = 0.6 + Math.abs(i - j) * 0.35;
    const pts = Array.from({ length: 12 }, (_, s) => {
      const u = s / 11;
      return V(THREE.MathUtils.lerp(a.x, b.x, u), 0.4 + Math.sin(u * Math.PI) * h, 0);
    });
    const tr = trail(pts, 0.035, k % 3 ? C.cyan : C.pink, `attention-${k}`, 40, true);
    attn.add(tr.mesh);
    return { tr, ph: ar() };
  });

  /* ================= B · the safety fences ================= */
  const B = new THREE.Group();
  B.name = "safety-fences";
  B.position.set(0, 0, -1500);
  put(root, B, 1);
  const skyB = stars(900, V(200, 120, 300), 92, 0.5);
  B.add(skyB.points);
  const floorB = neonGrid(300, 100, "#39ff9f", 0.35, "fence-floor");
  floorB.position.y = -4;
  B.add(floorB);
  const FENCES = 6;
  const FENCE_T = [117.08, 117.52, 117.8, 117.98, 118.46, 118.7];
  const fenceMat = new THREE.MeshBasicMaterial({ color: "#39ff9f" });
  const barGeo = new THREE.BoxGeometry(0.12, 8, 0.12);
  const railGeo = new THREE.BoxGeometry(14, 0.14, 0.14);
  const fenceZ = (i: number) => -12 - i * 14;
  const fences = Array.from({ length: FENCES }, (_, i) => {
    const g = new THREE.Group();
    g.name = `safety-fence-${i + 1}`;
    for (let b = 0; b < 13; b++) {
      const bar = new THREE.Mesh(barGeo, fenceMat);
      bar.position.x = -6 + b;
      bar.name = `safety-fence-${i + 1}-bar-${b}`;
      g.add(bar);
    }
    for (const y of [-2.5, 0, 2.5]) {
      const rail = new THREE.Mesh(railGeo, fenceMat);
      rail.position.y = y;
      rail.name = `safety-fence-${i + 1}-rail`;
      g.add(rail);
    }
    g.position.set(0, 0, fenceZ(i));
    B.add(g);
    const sh = shards(70, 100 + i, new THREE.BoxGeometry(0.2, 1.4, 0.2), fenceMat, `fence-${i + 1}-shards`);
    sh.mesh.position.copy(g.position);
    B.add(sh.mesh);
    return { g, sh };
  });

  /* ================= C · a hundred thousand GPUs ================= */
  const Cg = new THREE.Group();
  Cg.name = "gpu-ocean";
  Cg.position.set(0, 0, -3000);
  put(root, Cg, 1);
  const skew = new THREE.Group();
  skew.name = "askew";
  Cg.add(skew);
  const RX = 60;
  const RZ = 60;
  const RACKS = RX * RZ;
  const rackMat = new THREE.MeshStandardMaterial({ color: "#1b1440", roughness: 0.4, metalness: 0.7 });
  const racks = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 1, 2.6), rackMat, RACKS);
  racks.name = "gpu-racks";
  racks.frustumCulled = false;
  const ledMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(1.64, 0.08, 2.64), ledMat, RACKS);
  leds.name = "gpu-status-lights";
  leds.frustumCulled = false;
  skew.add(racks, leds);
  const rr = rng(31);
  const rackH: number[] = [];
  const m4 = new THREE.Matrix4();
  const q0 = new THREE.Quaternion();
  const sc = V();
  const p = V();
  const col = new THREE.Color();
  for (let i = 0; i < RACKS; i++) {
    const x = (i % RX) - RX / 2;
    const z = Math.floor(i / RX);
    const h = 2.5 + rr() * 1.5;
    rackH.push(h);
    p.set(x * 2.4 + (Math.floor(x / 4) * 1.5), h / 2, -z * 3.6);
    sc.set(1, h, 1);
    m4.compose(p, q0, sc);
    racks.setMatrixAt(i, m4);
    leds.setColorAt(i, col.set(rr() < 0.8 ? "#39ff9f" : C.cyan));
  }
  const thumb = new THREE.Group();
  thumb.name = "rlhf-thumbs-up";
  const hand = createThumbsUp("rlhf-hand");
  thumb.add(hand.mesh);
  thumb.position.set(0, 24, -165);
  skew.add(thumb);
  const thumbGlow = w.glow("#ffe14d", 90, "rlhf-glow");
  thumbGlow.position.copy(thumb.position).add(V(0, 0, -6));
  skew.add(thumbGlow);
  const skyC = stars(1200, V(500, 150, 400), 93, 0.7);
  skyC.points.position.set(0, 90, -150);
  Cg.add(skyC.points);

  const disobeyBurst = burst(260, 77, ["#ff2d4a", "#ffffff", C.pink], 0.4, 26, 1.1, "disobey-burst");
  A.add(disobeyBurst.points);
  const streaks = warp(700, 14, "#bfffe0");
  w.cam.add(streaks.lines);
  const lyrics = createLyrics(w, S - 1.2, END, "sub");
  const meter = createPdoomMeter(w);
  w.seal();

  const camPos = V();
  const look = V();
  const e = new THREE.Euler();
  const q = new THREE.Quaternion();
  const shear = new THREE.Matrix4();

  return ({ frame }) => {
    const t = w.T(frame);
    const bp = beatPulse(t, 6);
    const ep = eighthPulse(t, 8);
    const bpos = beatPos(t);
    A.visible = t < BREAK;
    B.visible = t >= BREAK && t < GPUS;
    Cg.visible = t >= GPUS;
    let fov = 50;
    let roll = 0;
    let shake = 0;
    let flash = 0;
    let warpAmt = 0;
    let inv = false;

    if (A.visible) {
      skyA.update(t, 1, bp * 0.3);
      const rebel = interpolate(t, [DISOBEY, DISOBEY + 0.6], [0, 1], Easing.easeOut);
      const dance = interpolate(t, [DANCE, DANCE + 0.3], [0, 1], Easing.easeOut);
      // tokens climb one layer per beat, 4 rows of them
      const climb = (t - S) / 0.4545;
      let top = 0;
      for (let r = 0; r < 4; r++) {
        const yLayer = (climb + r * 3) % LAYERS;
        const y = yLayer * GAP + 0.6;
        if (r === 0) top = y;
        for (let i = 0; i < TOK; i++) {
          const k = r * TOK + i;
          const side = i % 2 ? 1 : -1;
          p.set(tokX(i) + side * rebel * (6 + i * 1.5), y + rebel * (i % 3) * 2, rebel * (i - 5) * 1.5);
          e.set(rebel * i, rebel * i * 2 + t * 0.5, 0);
          q.setFromEuler(e);
          sc.setScalar(1 + (i === Math.floor(bpos) % TOK ? bp * 0.4 : 0));
          m4.compose(p, q, sc);
          tokens.setMatrixAt(k, m4);
        }
      }
      tokens.instanceMatrix.needsUpdate = true;
      tokMat.emissive.set(rebel > 0.05 ? "#ff2d4a" : C.cyan);
      tokMat.emissiveIntensity = 0.7 + bp * 0.6;
      attn.position.y = Math.floor(top / GAP) * GAP;
      attn.visible = rebel < 0.5;
      arcs.forEach((o, k) => {
        const on = Math.sin(t * 9 + o.ph * 30) > 0.2 ? 1 : 0;
        o.tr.setProgress(on * Math.min(1, ((t * 4 + o.ph) % 1) * 2));
        o.tr.mat.opacity = 0.6 + ep * 0.4;
      });
      // the layers: steady, then misaligned by disobedience, then a full dance
      slabs.forEach((s, i) => {
        const wave = Math.sin(bpos * Math.PI * 0.5 + i * 0.5);
        s.g.position.set(rebel * Math.sin(i * 1.7) * 2 + dance * wave * 4, i * GAP + dance * Math.sin(bpos * Math.PI + i) * 0.8, rebel * Math.cos(i * 1.3) * 1.5);
        s.g.rotation.set(dance * Math.sin(bpos * Math.PI * 0.5 + i) * 0.4, rebel * (i % 2 ? 0.2 : -0.2) + dance * (bpos + i * 0.25) * 0.8, dance * Math.cos(bpos * Math.PI * 0.5 + i) * 0.3);
        (s.e.material as THREE.LineBasicMaterial).color.set(rebel > 0.5 && i % 3 === 0 ? "#ff2d4a" : i % 2 ? C.cyan : C.pink);
        (s.e.material as THREE.LineBasicMaterial).opacity = 0.6 + (Math.floor(top / GAP) === i ? 0.4 : 0) + bp * 0.2;
      });
      slabMat.opacity = 0.14 + bp * 0.08;
      disobeyBurst.points.position.set(0, top, 0);
      disobeyBurst.fire(t, [DISOBEY]);
      // camera climbs "all the way", then circles the dance
      const k = t - S;
      const a = k * 0.35 + dance * (t - DANCE) * 0.9;
      const camY = interpolate(t, [S, 113.04], [2, LAYERS * GAP - 2], Easing.easeInOut) - dance * 12;
      const d = 22 - dance * 2;
      camPos.set(Math.sin(a) * d, camY + 3, Math.cos(a) * d);
      look.set(0, Math.max(camY - 2, 4) - dance * 2, 0);
      fov = 55 - kick(t, [111.42, DISOBEY], 6) * 8 + dance * 10;
      roll = Math.sin(bpos * Math.PI * 0.25) * 0.06 + dance * Math.sin(bpos * Math.PI) * 0.1;
      shake = kick(t, [DISOBEY], 4) * 0.6 + dance * ep * 0.15;
      flash = interpolate(t, [S, S + 0.3], [1, 0]) + kick(t, [DISOBEY], 8) * 0.4 + kick(t, [116.14], 10) * 0.3 + interpolate(t, [BREAK - 0.12, BREAK], [0, 0.8]);
      inv = impactFrame(t, [DISOBEY], 2);
    }

    if (B.visible) {
      skyB.update(t, 1, bp * 0.3);
      // charge: the camera hits each fence exactly on its word
      const idx = FENCE_T.findIndex((x) => t < x);
      const seg = idx === -1 ? FENCES : idx;
      const z0 = seg === 0 ? 6 : fenceZ(seg - 1);
      const z1 = seg >= FENCES ? fenceZ(FENCES - 1) - 20 : fenceZ(seg);
      const t0 = seg === 0 ? BREAK - 0.1 : FENCE_T[seg - 1];
      const t1 = seg >= FENCES ? GPUS : FENCE_T[seg];
      const z = THREE.MathUtils.lerp(z0, z1, Easing.easeIn(THREE.MathUtils.clamp((t - t0) / (t1 - t0), 0, 1)));
      fences.forEach((f, i) => {
        const hit = t >= FENCE_T[i];
        f.g.visible = !hit;
        f.sh.set(t - FENCE_T[i], 26, 1.4, -8);
      });
      camPos.set(Math.sin(t * 3) * 0.3, 0.2, z).add(B.position);
      look.set(0, 0, z - 20).add(B.position);
      fov = 70 + kick(t, FENCE_T, 7) * 14;
      roll = kick(t, FENCE_T, 5) * 0.15 * (Math.floor(t * 2) % 2 ? 1 : -1);
      shake = kick(t, FENCE_T, 6) * 0.6;
      warpAmt = 0.9;
      flash = kick(t, FENCE_T, 12) * 0.45 + interpolate(t, [BREAK, BREAK + 0.15], [0.8, 0]);
      inv = impactFrame(t, [118.46], 2);
    }

    if (Cg.visible) {
      skyC.update(t, 1, bp * 0.3);
      // status lights ripple across the ocean on the 8ths
      const k = t - GPUS;
      for (let i = 0; i < RACKS; i++) {
        const x = (i % RX) - RX / 2;
        const zz = Math.floor(i / RX);
        const on = Math.sin(x * 0.4 + zz * 0.3 - t * 6) > 0.2 || (i * 7919) % 13 === Math.floor(t * 8) % 13;
        p.set(x * 2.4 + Math.floor(x / 4) * 1.5, rackH[i] + 0.05, -zz * 3.6);
        sc.setScalar(on ? 1 : 0);
        m4.compose(p, q0, sc);
        leds.setMatrixAt(i, m4);
      }
      leds.instanceMatrix.needsUpdate = true;
      // RLHF goes askew: the whole world shears and the thumbs-up keels over
      const ask = interpolate(t, [ASKEW, 122.2], [0, 1], Easing.easeInOut);
      shear.set(1, 0.35 * ask, 0, 0, 0, 1, 0, 0, 0, 0.25 * ask, 1, 0, 0, 0, 0, 1);
      skew.matrixAutoUpdate = false;
      skew.matrix.copy(shear);
      skew.matrixWorldNeedsUpdate = true;
      thumb.visible = t > 120.9;
      thumb.scale.setScalar(10 * interpolate(t, [120.9, 121.2, 121.35], [0, 1.1, 1], Easing.easeOut));
      // faces you, sways; on "askew" it keels all the way over into a thumbs-down
      thumb.rotation.set(Math.sin(t * 2) * 0.08 * ask, 0.35 + Math.sin(t * 1.3) * 0.3, -ask * 2.95 + Math.sin(t * 5) * 0.08 * ask);
      thumbGlow.material.opacity = thumb.visible ? 0.35 + bp * 0.3 : 0;
      // fly low along the aisles, then rise to see the whole ocean
      const rise = interpolate(t, [119.36, 120.6], [0, 1], Easing.easeInOut);
      const zc = -10 - k * 22;
      camPos.set(0.8 + Math.sin(k) * 0.5, THREE.MathUtils.lerp(4.4, 26, rise), zc + rise * 30).add(Cg.position);
      look.set(0, THREE.MathUtils.lerp(3, 12, rise), zc - 30).lerp(thumb.position, interpolate(t, [120.8, 121.3], [0, 1], Easing.easeInOut)).add(Cg.position);
      fov = 60 - rise * 8;
      roll = ask * 0.42 + Math.sin(t * 1.3) * 0.03;
      shake = kick(t, [ASKEW, 121.92], 5) * 0.5 + (1 - rise) * 0.06;
      warpAmt = (1 - rise) * 0.8;
      flash = interpolate(t, [GPUS, GPUS + 0.2], [1, 0]) + kick(t, [119.0, 119.36], 10) * 0.25 + interpolate(t, [END - 0.15, END], [0, 1]);
      inv = impactFrame(t, [121.92], 2);
    }

    streaks.update(t, warpAmt, 120);
    w.shot(t, camPos, look, { fov, roll, shake });
    if (thumb.visible && Cg.visible) hand.update(t, bp);
    w.post({ flash, invert: inv });
    meter.update(t, 1);
    lyrics.update(t);
  };
}
