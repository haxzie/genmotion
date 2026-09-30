import * as THREE from "three";
import { Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { beatPos, beatPulse, eighthPulse, rng, SCENE_START } from "../components/music";
import { createWorld } from "../components/world";
import { createLyrics } from "../components/lyrics";
import { createPdoomMeter } from "../components/hud";
import { createEarth, MAX_IMPACTS } from "../components/earth";
import earthDayUrl from "../assets/earth-day.jpg";
import earthNightUrl from "../assets/earth-night.png";
import earthSpecUrl from "../assets/earth-specular.jpg";
import { burst, impactFrame, kick, pop, rings3, slam, stars, trail, V, warp, word, type Ring3 } from "../components/motion";

/**
 * 0:58–1:13 · chorus 2. The basilisk circles you and roars → NVDA candles
 * rocket to the moon and the omega point → 1e18 FLOPs lattice → a safety box
 * that cracks on "reckoned".
 */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const w = createWorld(ctx, SCENE_START.chorus2, { bg: "#07041a", fog: [40, 260] });
  const baseBg = new THREE.Color("#07041a");
  const spaceBg = new THREE.Color("#010106");
  const { root, put } = w;
  const S = SCENE_START.chorus2 / 30;
  const END = SCENE_START.flops / 30;
  const BAS = 61.18;
  const ROAR = 62.08;
  const NVDA = 62.6;
  const MOON = 63.88;
  const OMEGA = 64.28;
  const FLOPS = 66.15;
  const SAFE = 69.8;
  const RECK = 71.2;

  /* ================= A · the basilisk ================= */
  const A = new THREE.Group();
  A.name = "basilisk-shot";
  put(root, A, 1);
  // the basilisk boom: the real Earth, three waves of warheads on the beats, then the flash
  const spaceStars = stars(2600, V(900, 600, 900), 31, 0.9, ["#ffffff", "#cfe0ff", "#ffe8cf"]);
  A.add(spaceStars.points);
  const texL = new THREE.TextureLoader(ctx.manager);
  const eDay = texL.load(earthDayUrl);
  const eNight = texL.load(earthNightUrl);
  eDay.colorSpace = eNight.colorSpace = THREE.SRGBColorSpace;
  eDay.anisotropy = eNight.anisotropy = 8;
  const earth = createEarth({ day: eDay, night: eNight, spec: texL.load(earthSpecUrl) }, "earth", 10, -1.9);
  A.add(earth.group);
  const sunGlow = w.glow("#fff0d0", 90, "sun-glare");
  sunGlow.position.copy(earth.sun).multiplyScalar(170);
  A.add(sunGlow);
  const camAngle = (t: number) => -0.8 + (t - S) * 0.35 + Math.max(0, t - 60.04) * 0.25 + Math.max(0, t - 61.18) * 0.3;
  // three waves of targets on the camera-facing hemisphere
  const ir = rng(66);
  const WAVES: { t: number; n: number }[] = [
    { t: 60.04, n: 3 },
    { t: 61.18, n: 3 },
    { t: ROAR, n: 6 },
  ];
  const impDirs: THREE.Vector3[] = [];
  const impTimes: number[] = [];
  WAVES.forEach((wv, wi) => {
    for (let i = 0; i < wv.n; i++) {
      // each wave lands where the camera will be looking when it hits
      impDirs.push(V((ir() - 0.5) * (wi === 2 ? 1.1 : 1.3), (ir() - 0.35) * 0.9 + 0.15, 1).normalize().applyAxisAngle(V(0, 1, 0), camAngle(wv.t)));
      impTimes.push(wv.t + i * 0.03);
    }
  });
  earth.setImpacts(impDirs, impTimes);
  // warheads: fast streaks from out past the camera down to each target
  const warheads = impDirs.map((d0, i) => {
    const target = d0.clone().multiplyScalar(10.05);
    const tan = V().crossVectors(d0, V(0, 1, 0)).normalize().multiplyScalar((ir() - 0.5) * 36);
    const start = d0.clone().multiplyScalar(36).add(tan).add(V(0, (ir() - 0.3) * 18, 0));
    const mid = start.clone().lerp(target, 0.5).add(d0.clone().multiplyScalar(6));
    const pts = Array.from({ length: 40 }, (_, k) => {
      const u = k / 39;
      return start.clone().lerp(mid, u).lerp(mid.clone().lerp(target, u), u);
    });
    const tr = trail(pts, 0.07, "#ffe2b0", `warhead-trail-${i}`, 160, true);
    A.add(tr.mesh);
    const head = w.glow("#fff4d8", 2.2, `warhead-${i}`);
    A.add(head);
    return { tr, head, t1: impTimes[i], t0: impTimes[i] - 0.55 };
  });
  // the basilisk's gaze: red locks snap onto the next wave's targets
  const reticleMat = new THREE.MeshBasicMaterial({ color: "#ff2d3a", transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const reticles = impDirs.map((d0, i) => {
    const g = new THREE.Group();
    g.name = `target-lock-${i}`;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.7, 48), reticleMat);
    ring.name = `target-lock-${i}-ring`;
    const ticks = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.08, 4, 1), reticleMat);
    ticks.name = `target-lock-${i}-ticks`;
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), reticleMat);
    dot.name = `target-lock-${i}-dot`;
    g.add(ring, ticks, dot);
    g.position.copy(d0).multiplyScalar(10.1);
    g.lookAt(d0.clone().multiplyScalar(20));
    A.add(g);
    return { g, ticks, t0: impTimes[i] - 0.5, t1: impTimes[i] };
  });
  const shock = rings3(MAX_IMPACTS, "#ffb070", 0.03, "nuke-shockwave");
  A.add(shock.group);
  const SHOCKS: Ring3[] = impDirs.map((d0, i) => ({ t: impTimes[i], pos: d0.clone().multiplyScalar(10.1), scale: i >= 6 ? 8 : 5, dur: 1.2 }));
  // the planet-wide shockwave on "boom"
  const planetRing = new THREE.Mesh(
    new THREE.RingGeometry(1, 1.06, 160),
    new THREE.MeshBasicMaterial({ color: "#ffd0a0", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  planetRing.name = "planet-shockwave";
  A.add(planetRing);
  const fireballs = impDirs.map((d0, i) => {
    const f = w.glow("#ff8a3a", 1, `fireball-${i}`);
    const core = w.glow("#fff4d0", 1, `fireball-${i}-core`);
    A.add(f, core);
    return { f, core, d0, big: i >= 6 };
  });
  const debris = burst(700, 3, ["#ffffff", "#ffd9a0", "#ff7a3d"], 0.3, 26, 1.4, "nuke-debris");
  A.add(debris.points);
  /* ================= B · NVDA to the moon ================= */
  const B = new THREE.Group();
  B.name = "nvda-shot";
  B.position.set(0, 0, -1200);
  put(root, B, 1);
  const skyB = stars(1400, V(300, 500, 200), 41, 0.7);
  skyB.points.position.y = 120;
  B.add(skyB.points);
  const CANDLES = 44;
  const candleGeo = new THREE.BoxGeometry(1, 1, 1);
  const green = new THREE.MeshStandardMaterial({ color: "#39ff9f", emissive: "#12ff8a", emissiveIntensity: 0.6, roughness: 0.3 });
  const red = new THREE.MeshStandardMaterial({ color: "#ff3b5c", emissive: "#ff2d4a", emissiveIntensity: 0.6, roughness: 0.3 });
  const wickMat = new THREE.MeshBasicMaterial({ color: "#d9fff0" });
  const rb = rng(7);
  const candles: { g: THREE.Group; body: THREE.Mesh; y: number; h: number; t0: number }[] = [];
  let level = 0;
  for (let i = 0; i < CANDLES; i++) {
    const up = rb() < 0.78;
    const h = 1.5 + rb() * 5;
    const y0 = level;
    level += up ? h * 0.8 : -h * 0.45;
    const g = new THREE.Group();
    g.name = `nvda-candle-${i}`;
    const bodyM = new THREE.Mesh(candleGeo, up ? green : red);
    bodyM.scale.set(1.3, h, 1.3);
    bodyM.name = `nvda-candle-${i}-body`;
    const wick = new THREE.Mesh(candleGeo, wickMat);
    wick.scale.set(0.12, h + 2.5, 0.12);
    wick.name = `nvda-candle-${i}-wick`;
    g.add(wick, bodyM);
    g.position.set(-40 + i * 2.2, y0 + (up ? h / 2 : -h / 2 + h * 0.45), Math.sin(i * 0.4) * 1.5);
    B.add(g);
    candles.push({ g, body: bodyM, y: g.position.y, h, t0: NVDA - 0.3 + i * 0.04 });
  }
  const top = V(-40 + CANDLES * 2.2, level, 0);
  const moonC = new OffscreenCanvas(512, 256);
  const mc = moonC.getContext("2d")!;
  mc.fillStyle = "#cfc8e8";
  mc.fillRect(0, 0, 512, 256);
  const mr = rng(3);
  for (let i = 0; i < 140; i++) {
    const x = mr() * 512;
    const y = mr() * 256;
    const rad = 3 + Math.pow(mr(), 3) * 30;
    mc.fillStyle = `rgba(90,80,130,${0.25 + mr() * 0.35})`;
    mc.beginPath();
    mc.arc(x, y, rad, 0, Math.PI * 2);
    mc.fill();
  }
  const moonTex = new THREE.CanvasTexture(moonC as unknown as HTMLCanvasElement);
  moonTex.colorSpace = THREE.SRGBColorSpace;
  const moon = new THREE.Mesh(new THREE.SphereGeometry(14, 64, 48), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.9, emissive: "#3a2d66", emissiveIntensity: 0.35 }));
  moon.name = "the-moon";
  moon.position.set(top.x + 10, top.y + 40, -30);
  B.add(moon);
  const moonGlow = w.glow("#cfc8ff", 70, "moon-glow");
  moonGlow.position.copy(moon.position).add(V(0, 0, -10));
  B.add(moonGlow);
  // the omega point: every line converges
  const OMEGA_P = moon.position.clone().add(V(0, 26, 0));
  const RAYS = 90;
  const rayGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 5);
  rayGeo.translate(0, 0.5, 0);
  rayGeo.rotateX(Math.PI / 2); // length along +z
  const rayMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const rr = rng(12);
  const rays = Array.from({ length: RAYS }, (_, i) => {
    const from = OMEGA_P.clone().add(V((rr() - 0.5) * 2, (rr() - 0.5) * 2, (rr() - 0.5) * 2).normalize().multiplyScalar(60 + rr() * 60));
    const m = new THREE.Mesh(rayGeo, rayMat);
    m.name = `omega-ray-${i}`;
    m.position.copy(from);
    m.lookAt(OMEGA_P);
    B.add(m);
    return { m, len: from.distanceTo(OMEGA_P), d: rr() * 0.4 };
  });
  const omega = w.glow("#ffffff", 10, "omega-point");
  omega.position.copy(OMEGA_P);
  B.add(omega);

  /* ================= C · 1e18 FLOPs ================= */
  const Cg = new THREE.Group();
  Cg.name = "flops-lattice";
  Cg.position.set(0, 0, -2600);
  put(root, Cg, 1);
  const N = 16;
  const LAT = N * N * N;
  const cubeMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3, metalness: 0.4, emissive: "#ffffff", emissiveIntensity: 0.25 });
  const lattice = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), cubeMat, LAT);
  lattice.name = "flops-cubes";
  lattice.frustumCulled = false;
  Cg.add(lattice);
  const cellPos: THREE.Vector3[] = [];
  const SP = 2.2;
  for (let i = 0; i < LAT; i++) {
    const x = i % N;
    const y = Math.floor(i / N) % N;
    const z = Math.floor(i / (N * N));
    cellPos.push(V((x - (N - 1) / 2) * SP, (y - (N - 1) / 2) * SP, (z - (N - 1) / 2) * SP));
  }
  const flopsWord = word("10¹⁸ FLOPs / second", { size: 120, weight: 500, color: "#ffffff" }, 1 / 60, "flops-headline");
  flopsWord.userData.billboard = true;
  Cg.add(flopsWord);

  /* ================= D · safe enough ================= */
  const D = new THREE.Group();
  D.name = "safety-box";
  D.position.set(0, 0, -4000);
  put(root, D, 1);
  const skyD = stars(500, V(120, 80, 120), 51, 0.4);
  D.add(skyD.points);
  const boxGeo = new THREE.BoxGeometry(6, 6, 6);
  const glass = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: "#9fffd0", transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.2, depthWrite: false }));
  glass.name = "safety-glass";
  const boxEdgeMat = new THREE.LineBasicMaterial({ color: "#6dffb2", transparent: true });
  const boxEdges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), boxEdgeMat);
  boxEdges.name = "safety-edges";
  D.add(glass, boxEdges);
  const coreMat = new THREE.MeshStandardMaterial({ color: "#6dffb2", emissive: "#2dff8f", emissiveIntensity: 0.8, flatShading: true });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 0), coreMat);
  core.name = "contained-model";
  D.add(core);
  const coreGlow = w.glow("#6dffb2", 8, "contained-glow");
  D.add(coreGlow);
  // the crack: a jagged line across the front face, drawn on "reckoned"
  const crackPts: number[] = [];
  const cr = rng(2);
  let cx = -3;
  let cy = 1.5;
  for (let i = 0; i < 16; i++) {
    const nx = cx + 0.38 + cr() * 0.1;
    const ny = cy + (cr() - 0.55) * 0.9;
    crackPts.push(cx, cy, 3.02, nx, ny, 3.02);
    if (i % 4 === 2) crackPts.push(nx, ny, 3.02, nx + (cr() - 0.5) * 0.8, ny + (cr() - 0.5) * 1.2, 3.02);
    cx = nx;
    cy = ny;
  }
  const crackGeo = new THREE.BufferGeometry();
  crackGeo.setAttribute("position", new THREE.Float32BufferAttribute(crackPts, 3));
  const crack = new THREE.LineSegments(crackGeo, new THREE.LineBasicMaterial({ color: "#ffffff" }));
  crack.name = "safety-crack";
  D.add(crack);
  const crackSegs = crackPts.length / 3;

  const streaks = warp(600, 9, "#ffffff");
  w.cam.add(streaks.lines);
  const lyrics = createLyrics(w, S, END, "sub");
  const meter = createPdoomMeter(w);
  w.seal();

  const camPos = V();
  const look = V();
  const p = V();
  const p2 = V();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const sc = V();
  const col = new THREE.Color();

  return ({ frame }) => {
    const t = w.T(frame);
    const bp = beatPulse(t, 6);
    const ep = eighthPulse(t, 8);
    const bpos = beatPos(t);
    A.visible = t < NVDA;
    B.visible = t >= NVDA && t < FLOPS;
    Cg.visible = t >= FLOPS && t < SAFE;
    D.visible = t >= SAFE;
    let fov = 50;
    let roll = 0;
    let shake = 0;
    let flash = 0;
    let fade = 0;
    let warpAmt = 0;
    let inv = false;

    /* -------- A -------- */
    if (A.visible) {
      w.scene.background = spaceBg;
      (w.scene.fog as THREE.Fog).near = 400;
      (w.scene.fog as THREE.Fog).far = 2000;
      spaceStars.update(t, 1, 0);
      const hot = interpolate(t, [ROAR, ROAR + 0.4], [0, 1], Easing.easeOut);
      earth.update(t, hot);
      warheads.forEach((wh) => {
        const u = interpolate(t, [wh.t0, wh.t1], [0, 1], Easing.easeIn);
        wh.tr.setProgress(u);
        wh.tr.mesh.visible = u > 0 && t < wh.t1 + 0.35;
        wh.tr.mat.opacity = t < wh.t1 ? 0.95 : Math.max(0, 0.95 - (t - wh.t1) * 3);
        wh.head.visible = u > 0 && u < 1;
        wh.head.position.copy(wh.tr.head(u));
      });
      reticles.forEach((rc) => {
        const on = interpolate(t, [rc.t0, rc.t0 + 0.08, rc.t1 - 0.02, rc.t1 + 0.04], [0, 1, 1, 0]);
        rc.g.visible = on > 0.001;
        rc.g.scale.setScalar(THREE.MathUtils.lerp(3.5, 1, interpolate(t, [rc.t0, rc.t0 + 0.15], [0, 1], Easing.easeOut)));
        rc.ticks.rotation.z = t * 3;
      });
      reticleMat.opacity = Math.floor(t * 14) % 2 ? 1 : 0.55;
      shock.update(t, SHOCKS, true);
      fireballs.forEach((fb, i) => {
        const age = t - impTimes[i];
        fb.f.visible = fb.core.visible = age >= 0;
        if (age < 0) return;
        const grow = 1 - Math.exp(-age * 6);
        const k = fb.big ? 1.6 : 1;
        fb.f.position.copy(fb.d0).multiplyScalar(10.2 + grow * 1.4 * k);
        fb.f.scale.setScalar((1.5 + grow * 6) * k);
        fb.f.material.opacity = Math.min(1, age * 12) * (0.95 - grow * 0.2);
        fb.core.position.copy(fb.f.position);
        fb.core.scale.setScalar((1 + grow * 2.2) * k);
        fb.core.material.opacity = Math.exp(-age * 2.5);
      });
      debris.points.position.copy(impDirs[8]).multiplyScalar(10.2);
      debris.fire(t, [ROAR]);
      // the planet-wide shockwave, facing the camera
      const pr = interpolate(t, [ROAR, ROAR + 0.5], [0, 1], Easing.easeOut);
      planetRing.visible = t >= ROAR;
      planetRing.scale.setScalar(10.5 + pr * 30);
      (planetRing.material as THREE.MeshBasicMaterial).opacity = (1 - pr) * 0.9;
      planetRing.userData.billboard = true;
      sunGlow.material.opacity = 0.75;
      // camera: warp in from deep space, whip around the planet faster with each wave,
      // dive on "basilisk", and get slammed back by the boom
      const arrive = interpolate(t, [S, 59.2], [0, 1], Easing.easeOut);
      const dive = interpolate(t, [61.18, ROAR], [0, 1], Easing.easeIn);
      const blast = interpolate(t, [ROAR, NVDA], [0, 1], Easing.easeOut);
      const a0 = camAngle(t);
      const dist = THREE.MathUtils.lerp(130, 30, arrive) - interpolate(t, [60.04, 61.18], [0, 6], Easing.easeInOut) - dive * 8 + blast * 22;
      camPos.set(Math.sin(a0) * dist, THREE.MathUtils.lerp(30, 5, arrive) + Math.sin(t * 1.3) * 1.5 - dive * 3, Math.cos(a0) * dist);
      look.set(0, 0, 0);
      fov = 45 + (1 - arrive) * 35 - kick(t, [60.04, 61.18], 6) * 6 + blast * 20;
      roll = Math.sin(t * 0.9) * 0.05 + (1 - arrive) * 0.4 + dive * 0.12;
      shake = kick(t, [60.04, 61.18], 5) * 0.6 + kick(t, [ROAR], 2) * 2.2;
      warpAmt = (1 - arrive) * 1 + blast * 0.6;
      flash = interpolate(t, [S, S + 0.2], [1, 0]) + kick(t, [60.04, 61.18], 12) * 0.2 + kick(t, [ROAR], 7) * 0.45 + interpolate(t, [NVDA - 0.1, NVDA], [0, 1]);
      inv = impactFrame(t, [ROAR], 2);
    } else {
      w.scene.background = baseBg;
      (w.scene.fog as THREE.Fog).color.copy(baseBg);
      (w.scene.fog as THREE.Fog).near = 40;
      (w.scene.fog as THREE.Fog).far = 260;
    }

    /* -------- B -------- */
    if (B.visible) {
      skyB.update(t, 1, bp * 0.3);
      candles.forEach((c, i) => {
        const g = pop(t, c.t0, 0.25);
        c.g.visible = g > 0.001;
        c.g.scale.set(1, g * (1 + (i % 4 === Math.floor(bpos) % 4 ? bp * 0.15 : 0)), 1);
      });
      green.emissiveIntensity = 0.5 + bp * 0.6;
      const moonIn = interpolate(t, [MOON - 0.6, MOON], [0, 1], Easing.easeOut);
      moon.scale.setScalar(pop(t, MOON - 0.35, 0.4));
      moon.rotation.y = t * 0.2;
      moonGlow.material.opacity = moonIn * (0.5 + bp * 0.3);
      const conv = interpolate(t, [OMEGA, 65.7], [0, 1], Easing.easeInOut);
      rays.forEach((r) => {
        const k = THREE.MathUtils.clamp(conv * 1.4 - r.d, 0, 1);
        r.m.visible = k > 0.001;
        r.m.scale.set(1, 1, r.len * k);
      });
      rayMat.opacity = 0.5 + bp * 0.4;
      omega.scale.setScalar(4 + conv * 40 + bp * 4);
      omega.material.opacity = Math.min(1, conv * 2);
      // rocket up the chart, past the moon, to the omega point
      const climb = interpolate(t, [NVDA, MOON], [0, 1], Easing.easeIn);
      const toOmega = interpolate(t, [OMEGA - 0.2, 65.9], [0, 1], Easing.easeInOut);
      const along = V(-40 + climb * (top.x + 40), THREE.MathUtils.lerp(-2, top.y, climb) + 4, 16 - climb * 4);
      const alongLook = V(along.x + 12, along.y + 4 + climb * 10, 0);
      camPos.copy(along).lerp(V(moon.position.x - 30, OMEGA_P.y - 10, 30), toOmega).add(B.position);
      look.copy(alongLook).lerp(OMEGA_P, Math.max(toOmega, interpolate(t, [MOON - 0.3, MOON + 0.3], [0, 0.6]))).add(B.position);
      fov = 50 + climb * 15 * (1 - toOmega) + conv * 10;
      roll = -0.08 * climb * (1 - toOmega) + Math.sin(t) * 0.03;
      shake = kick(t, [MOON], 6) * 0.4 + climb * 0.1 * (1 - toOmega);
      warpAmt = climb * 0.8 * (1 - toOmega);
      flash = interpolate(t, [NVDA, NVDA + 0.2], [1, 0]) + kick(t, [MOON], 8) * 0.3 + interpolate(t, [65.7, FLOPS], [0, 1], Easing.easeIn);
    }

    /* -------- C -------- */
    if (Cg.visible) {
      const k = t - FLOPS;
      const rate = t < 67.06 ? 8 : 24; // FLOPs: the waves speed up on the word
      const phase = k * rate;
      for (let i = 0; i < LAT; i++) {
        const cp = cellPos[i];
        const wv = Math.sin(cp.x * 0.35 + cp.y * 0.25 - phase) * Math.cos(cp.z * 0.3 + phase * 0.5);
        const on = wv > 0.55 ? 1 : 0;
        e.set(wv * 1.4 + on * phase * 0.3, wv, 0);
        q.setFromEuler(e);
        sc.setScalar(0.6 + on * 0.5 + ep * 0.15);
        m4.compose(cp, q, sc);
        lattice.setMatrixAt(i, m4);
        lattice.setColorAt(i, col.set(on ? (i % 3 ? C.cyan : C.pink) : "#3a2d66"));
      }
      lattice.instanceMatrix.needsUpdate = true;
      if (lattice.instanceColor) lattice.instanceColor.needsUpdate = true;
      cubeMat.emissiveIntensity = 0.4 + bp * 0.4;
      // fly down an aisle of the lattice
      const z = 30 - k * 14;
      camPos.set(SP * 0.5 + Math.sin(k * 1.5) * 0.4, SP * 0.5 + Math.sin(k) * 0.3, z).add(Cg.position);
      look.set(SP * 0.5, SP * 0.5 + Math.sin(k * 0.7) * 2, z - 20).add(Cg.position);
      flopsWord.visible = t > 67.0;
      flopsWord.position.set(SP * 0.5, SP * 0.5 + 0.2, z - 9);
      flopsWord.scale.setScalar((1 / 60) * slam(t, 67.02, 3, 0.22) * (1 + bp * 0.05));
      flopsWord.material.opacity = interpolate(t, [67.0, 67.08, 69.3, 69.6], [0, 1, 1, 0]);
      fov = 62 + (t > 67.06 ? 8 : 0) - kick(t, [67.06], 6) * 10;
      roll = k * 0.25 + Math.sin(bpos * Math.PI * 0.5) * 0.06;
      shake = kick(t, [67.06], 5) * 0.4 + bp * 0.05;
      warpAmt = t > 67.06 ? 0.7 : 0.3;
      flash = interpolate(t, [FLOPS, FLOPS + 0.2], [1, 0]) + kick(t, [67.06], 10) * 0.4;
      inv = impactFrame(t, [67.06], 2);
      fade = interpolate(t, [SAFE - 0.2, SAFE], [0, 1]);
    }

    /* -------- D -------- */
    if (D.visible) {
      skyD.update(t, 1, 0);
      const k = t - SAFE;
      const alarm = interpolate(t, [RECK, RECK + 0.2], [0, 1]);
      core.rotation.set(t * 0.5, t * 0.8, 0);
      core.scale.setScalar(1 + bp * 0.08 + kick(t, [RECK], 5) * 0.4);
      coreMat.color.set(alarm > 0.5 ? "#ff3b5c" : "#6dffb2");
      coreMat.emissive.set(alarm > 0.5 ? "#ff2d4a" : "#2dff8f");
      coreMat.emissiveIntensity = 0.7 + bp * 0.5;
      coreGlow.material.color.set(alarm > 0.5 ? "#ff2d4a" : "#6dffb2");
      coreGlow.material.opacity = 0.4 + bp * 0.3;
      boxEdgeMat.color.set(alarm > 0.5 && Math.floor(t * 8) % 2 === 0 ? "#ff3b5c" : "#6dffb2");
      const draw = interpolate(t, [RECK, RECK + 0.5], [0, 1], Easing.easeOut);
      crack.visible = draw > 0;
      crackGeo.setDrawRange(0, Math.floor((draw * crackSegs) / 2) * 2);
      // calm orbit, then a slow ominous push into the crack
      const push = interpolate(t, [RECK, END], [0, 1], Easing.easeInOut);
      const a = 0.9 - k * 0.3 * (1 - push);
      const d = 13 - push * 7;
      camPos.set(Math.sin(a) * d, 2 + Math.sin(k * 0.6) * 0.5 - push * 1.5, Math.cos(a) * d).add(D.position);
      look.copy(D.position);
      fov = 48 - push * 8;
      roll = Math.sin(t * 0.5) * 0.03;
      shake = kick(t, [RECK], 5) * 0.3;
      fade = interpolate(t, [SAFE, SAFE + 0.3], [1, 0]);
      flash = interpolate(t, [END - 0.2, END], [0, 1], Easing.easeIn);
      inv = impactFrame(t, [RECK], 1);
    }

    streaks.update(t, warpAmt, 90);
    w.shot(t, camPos, look, { fov, roll, shake });
    w.post({ flash, fade, invert: inv });
    meter.update(t, 1);
    lyrics.update(t);
  };
}
