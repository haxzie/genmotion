import * as THREE from "three";
import { Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, FONT_JP } from "../components/brand";
import { beatPos, beatPulse, eighthPulse, rng, SCENE_START } from "../components/music";
import { createWorld } from "../components/world";
import { createLyrics } from "../components/lyrics";
import { createPdoomMeter, pdoomAt } from "../components/hud";
import { createGauge } from "../components/gauge";
import { createEye, type Eye } from "../components/eye";
import { createChineseRoom } from "../components/chineseroom";
import { createEyeMonster, createFleshEye, type FleshEye } from "../components/eyemonster";
import { burst, impactFrame, kick, neonGrid, pop, rings3, shards, slam, stars, V, warp, word, type Ring3 } from "../components/motion";

/**
 * 0:22–0:38 · chorus 1. The p(doom) dial over a synthwave highway, the future
 * explodes on "boom" → the Chinese room + shrooms → the shoggoth's smiley mask
 * cracks on "lies" → a wall of Shannon-entropy eyes.
 */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const w = createWorld(ctx, SCENE_START.chorus1, { bg: "#0b0520", fog: [40, 320] });
  const { root, put } = w;
  const S = SCENE_START.chorus1 / 30;
  const END = SCENE_START.singularity / 30;
  const BOOM = 25.7;
  const ROOM = 26.3;
  const SHOG = 29.95;
  const EYES = 33.4;
  const LIES = 31.14;

  /* ====================== A · the chorus highway ====================== */
  const A = new THREE.Group();
  A.name = "chorus-highway";
  put(root, A, 1);
  const skyA = stars(1200, V(600, 250, 300), 2, 0.6);
  skyA.points.position.set(0, 100, -200);
  A.add(skyA.points);
  const road = neonGrid(600, 120, C.pink, 0.8, "highway-grid");
  road.position.y = -3;
  A.add(road);
  const sunMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uHeat: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpacity, uHeat; varying vec2 vUv;
      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);
        if (r > 0.5) discard;
        float y = vUv.y;
        float band = step(0.5, fract(y * 14.0 - uTime * 0.6)) + step(0.52, y);
        if (y < 0.52 && band < 0.5 && y > 0.08) discard;
        vec3 col = mix(vec3(1.0, 0.18, 0.55), vec3(1.0, 0.88, 0.3), smoothstep(0.1, 0.9, y));
        col = mix(col, vec3(1.0), uHeat);
        gl_FragColor = vec4(col, uOpacity);
        #include <colorspace_fragment>
      }`,
  });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(60, 96), sunMat);
  sun.name = "the-future-sun";
  sun.position.set(0, 26, -260);
  A.add(sun);
  const sunGlow = w.glow("#ff5aa9", 300, "sun-glow");
  sunGlow.position.set(0, 26, -270);
  A.add(sunGlow);
  const gauge = createGauge("pdoom-dial", 3.2);
  gauge.group.position.set(0, 2.4, -12);
  A.add(gauge.group);
  gauge.group.traverse((o) => (o.renderOrder = 6)); // always over the sun, like an eclipse
  const gaugeGlow = w.glow(C.pink, 16, "pdoom-dial-glow");
  gaugeGlow.position.set(0, 2.4, -13);
  A.add(gaugeGlow);
  const shardMat = new THREE.MeshStandardMaterial({ color: "#ffd24d", emissive: "#ff3d9a", emissiveIntensity: 1.2, flatShading: true });
  const boom = shards(420, 5, new THREE.TetrahedronGeometry(2.2), shardMat, "future-shards");
  boom.mesh.position.copy(sun.position);
  A.add(boom.mesh);
  const boomBurst = burst(600, 9, ["#ffffff", C.yellow, C.pink, "#ff7a3d"], 3.5, 180, 1.6, "boom-sparks");
  boomBurst.points.position.copy(sun.position);
  A.add(boomBurst.points);
  const ringsA = rings3(5, C.pink, 0.02, "chorus-shockwave");
  A.add(ringsA.group);
  const RINGS_A: Ring3[] = [
    { t: 23.68, pos: V(0, 2.4, -12), scale: 9, dur: 0.7 },
    { t: 23.76, pos: V(0, 2.4, -12), scale: 6, dur: 0.6 },
    { t: BOOM, pos: V(0, 26, -255), scale: 260, dur: 1.2 },
    { t: BOOM + 0.1, pos: V(0, 26, -255), scale: 170, dur: 1.0 },
    { t: BOOM, pos: V(0, -2.9, -120), scale: 200, dur: 1.2, flat: true },
  ];

  /* ====================== B · the Chinese room ====================== */
  const B = new THREE.Group();
  B.name = "chinese-room";
  B.position.set(0, 0, -1500);
  put(root, B, 1);
  const croom = createChineseRoom(w);
  B.add(croom.group);

  /* ====================== C · the shoggoth ====================== */
  const Cg = new THREE.Group();
  Cg.name = "shoggoth-shot";
  Cg.position.set(0, 0, -3000);
  put(root, Cg, 1);
  const skyC = stars(700, V(200, 120, 100), 4, 0.5);
  skyC.points.position.z = -40;
  Cg.add(skyC.points);
  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(4.2, 4),
    new THREE.MeshStandardMaterial({ color: "#1c0f38", roughness: 0.25, metalness: 0.6, emissive: "#2b0a55", emissiveIntensity: 0.5 }),
  );
  body.name = "shoggoth-body";
  Cg.add(body);
  const TENT = 16;
  const SEGS = 22;
  const tentMat = new THREE.MeshStandardMaterial({ color: "#241245", roughness: 0.3, metalness: 0.5, emissive: "#3b0f6b", emissiveIntensity: 0.4 });
  const tentacles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), tentMat, TENT * SEGS);
  tentacles.name = "shoggoth-tentacles";
  tentacles.frustumCulled = false;
  Cg.add(tentacles);
  const EYEN = 60;
  const eyeDots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: C.cyan }), EYEN);
  eyeDots.name = "shoggoth-eyes";
  eyeDots.frustumCulled = false;
  Cg.add(eyeDots);
  const re = rng(8);
  const eyeDirs = Array.from({ length: EYEN }, () => V(re() * 2 - 1, re() * 2 - 1, re() * 0.8 + 0.2).normalize());
  const eyeSize = Array.from({ length: EYEN }, () => 0.12 + re() * 0.28);
  const tentDirs = Array.from({ length: TENT }, (_, j) => {
    const a = (j / TENT) * Math.PI * 2;
    return { a, tilt: (re() - 0.5) * 0.9, ph: re() * 6 };
  });
  // the smiley mask, drawn once
  const mc = new OffscreenCanvas(512, 512);
  const mg = mc.getContext("2d")!;
  mg.fillStyle = "#ffe14d";
  mg.beginPath();
  mg.arc(256, 256, 250, 0, Math.PI * 2);
  mg.fill();
  mg.fillStyle = "#1a1030";
  mg.beginPath();
  mg.ellipse(180, 200, 26, 44, 0, 0, Math.PI * 2);
  mg.ellipse(332, 200, 26, 44, 0, 0, Math.PI * 2);
  mg.fill();
  mg.strokeStyle = "#1a1030";
  mg.lineWidth = 26;
  mg.lineCap = "round";
  mg.beginPath();
  mg.arc(256, 270, 130, 0.15 * Math.PI, 0.85 * Math.PI);
  mg.stroke();
  const maskTex = new THREE.CanvasTexture(mc as unknown as HTMLCanvasElement);
  maskTex.colorSpace = THREE.SRGBColorSpace;
  const maskMat = new THREE.MeshStandardMaterial({ map: maskTex, roughness: 0.4, emissive: "#ffe14d", emissiveIntensity: 0.25, emissiveMap: maskTex, side: THREE.DoubleSide });
  const halfL = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48, Math.PI / 2, Math.PI), maskMat);
  const halfR = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48, -Math.PI / 2, Math.PI), maskMat);
  halfL.name = "smiley-mask-left";
  halfR.name = "smiley-mask-right";
  const mask = new THREE.Group();
  mask.name = "smiley-mask";
  mask.add(halfL, halfR);
  mask.position.set(0, 0.4, 4.6);
  Cg.add(mask);
  const shogLight = new THREE.PointLight(C.cyan, 200, 60, 1.5);
  shogLight.position.set(4, 6, 10);
  Cg.add(shogLight);
  const ringsC = rings3(3, C.yellow, 0.03, "lies-shockwave");
  Cg.add(ringsC.group);
  const RINGS_C: Ring3[] = [{ t: LIES, pos: V(0, 0.4, 4.8), scale: 14, dur: 0.7 }];

  /* ====================== D · Shannon-entropy eyes ====================== */
  const D = new THREE.Group();
  D.name = "entropy-eyes";
  D.position.set(0, 0, -4500);
  put(root, D, 1);
  const skyD = stars(600, V(160, 90, 60), 12, 0.35);
  skyD.points.position.z = -30;
  D.add(skyD.points);
  // the entropy monster: a wall of living flesh, eyes sunk into it
  const monster = createEyeMonster("entropy-monster", { maw: false, horns: false, tentacles: false, C: V(0, 0, -9), R: V(27, 19, 10), wall: true });
  D.add(monster.group);
  const eyes: { e: FleshEye; x: number; y: number; ph: number }[] = [];
  const sp = V();
  const sockets: { x: number; y: number; r: number; tilt: number }[] = [];
  const er2 = rng(19);
  const IRIS: [string, string][] = [["#c8841c", "#3f6a4a"], ["#8a5a2a", "#5a7a8a"], ["#b8641a", "#6a3a1a"], ["#9a8a2a", "#2a5a4a"], ["#c83a1a", "#4a1a10"]];
  const place = (e: FleshEye, x: number, y: number, scale: number, ph: number) => {
    monster.surface(x, y, sp);
    e.group.scale.setScalar(scale);
    // sunk deep, so the skin swallows the rim of the ball
    e.group.position.set(x, y, sp.z - scale * 0.72);
    D.add(e.group);
    sockets.push({ x, y, r: scale, tilt: (er2() - 0.5) * 0.4 });
    eyes.push({ e, x, y, ph });
  };
  const hero = createFleshEye("entropy-eye-hero", monster.lidFlesh, { inner: "#d8941c", outer: "#2f6a5a", seed: 1 });
  place(hero, 0, 1.8, 2.7, 0);
  const er = rng(71);
  const spots: [number, number, number][] = [];
  for (let tries = 0; spots.length < 17 && tries < 800; tries++) {
    const x = (er() * 2 - 1) * 12;
    const y = -5.5 + er() * 13.5;
    const sc = 0.65 + Math.pow(er(), 1.6) * 1.2;
    const clearHero = Math.hypot(x, y - 1.8) > 3.6 + sc;
    const clearOthers = spots.every(([a2, b2, s2]) => Math.hypot(a2 - x, b2 - y) > (s2 + sc) * 1.25 + 0.3);
    if (clearHero && clearOthers) spots.push([x, y, sc]);
  }
  spots.forEach(([x, y, sc], i) => {
    const [inner, outer] = IRIS[i % IRIS.length];
    const e = createFleshEye(`entropy-eye-${i + 1}`, monster.lidFlesh, { inner, outer, seed: i + 2, detail: 0.55 });
    place(e, x, y, sc, i * 0.37);
  });
  monster.carve(sockets, 0.72);
  // low-key, horror lighting: a dim warm key, a hot red under-rim, a cold back-rim
  const keyD = new THREE.PointLight("#ffd8b0", 160, 50, 1.4);
  keyD.position.set(-8, 10, 14);
  const rimA = new THREE.PointLight("#ff2a2a", 320, 45, 1.4);
  rimA.position.set(4, -12, 8);
  const rimB = new THREE.PointLight("#4fb8c8", 140, 50, 1.4);
  rimB.position.set(10, 12, 2);
  D.add(keyD, rimA, rimB);
  const formula = word("H(X) = −Σ p(x) log p(x)", { size: 64, weight: 400, color: C.text }, 1 / 64, "entropy-formula");
  formula.position.set(0, 5.1, 1.5);
  formula.userData.billboard = true;
  D.add(formula);
  const eyeLight = new THREE.PointLight("#ffffff", 40, 40, 1.4);
  eyeLight.position.set(0, 3, 12);
  D.add(eyeLight);

  const streaks = warp(500, 6, "#ffffff");
  w.cam.add(streaks.lines);

  const lyrics = createLyrics(w, S, END, "sub");
  const meter = createPdoomMeter(w);
  w.seal();

  const camPos = V();
  const look = V();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = V();
  const sc = V();
  const lookAtCam = V();

  return ({ frame }) => {
    const t = w.T(frame);
    const bp = beatPulse(t, 6);
    const ep = eighthPulse(t, 8);
    const bpos = beatPos(t);
    A.visible = t < ROOM;
    B.visible = t >= ROOM && t < SHOG;
    Cg.visible = t >= SHOG && t < EYES;
    D.visible = t >= EYES;

    let fov = 50;
    let roll = 0;
    let shake = 0;
    let flash = 0;
    let fade = 0;
    let warpAmt = 0;
    let inv = false;

    /* -------- A -------- */
    if (A.visible) {
      skyA.update(t, 1, bp * 0.3);
      road.position.z = (t * 40) % 5;
      const dialIn = interpolate(t, [S + 0.1, 22.8], [0, 1], Easing.easeOut);
      gauge.group.position.set(0, 2.4, -12 - (1 - dialIn) * 80);
      gauge.group.rotation.set(Math.sin(t * 0.8) * 0.12, (1 - dialIn) * 3 + Math.sin(t * 0.6) * 0.25, 0);
      const bump = kick(t, [23.68], 6);
      gauge.group.scale.setScalar(slam(t, 23.62, 1.25, 0.25) * (1 + bp * 0.04));
      gauge.update(pdoomAt(t), bp + bump, dialIn);
      gaugeGlow.material.opacity = (0.3 + bp * 0.4 + bump) * dialIn;
      // the future: the sun rises on "future", explodes on "boom"
      const blow = interpolate(t, [BOOM, BOOM + 0.5], [0, 1], Easing.easeOut);
      sun.visible = blow < 1;
      sunMat.uniforms.uTime.value = t;
      sunMat.uniforms.uHeat.value = interpolate(t, [25.2, BOOM], [0, 0.8]) + bp * 0.1;
      sunMat.uniforms.uOpacity.value = 1 - blow;
      sun.scale.setScalar(1 + interpolate(t, [24.8, BOOM], [0, 0.25]) + blow * 1.5);
      sun.position.y = 26 + interpolate(t, [24.3, 25.3], [-18, 0], Easing.easeOut);
      sunGlow.material.opacity = 0.5 + bp * 0.3 + kick(t, [BOOM], 2) * 2;
      boom.set(t - BOOM, 160, 2.5, -20);
      boomBurst.fire(t, [BOOM]);
      ringsA.update(t, RINGS_A, true);
      // camera: orbit the dial on the groove, then look up at the future
      const up = interpolate(t, [24.3, 25.2], [0, 1], Easing.easeInOut);
      const a = Math.sin(bpos * Math.PI * 0.25) * 0.35;
      camPos.set(Math.sin(a) * 9, 3 + Math.sin(t) * 0.4, -12 + Math.cos(a) * 9 - bp * 0.4);
      camPos.lerp(V(0, 1, 2), up);
      look.set(0, 1.2, -12).lerp(V(0, 22, -200), up);
      fov = 50 - bump * 8 + up * 10;
      roll = Math.sin(bpos * Math.PI * 0.5) * 0.05;
      shake = bump * 0.5 + kick(t, [BOOM], 3) * 1.8 + bp * 0.05;
      flash = interpolate(t, [S, S + 0.25], [0.9, 0]) + bump * 0.4 + kick(t, [BOOM], 3.5) * 0.9 + interpolate(t, [ROOM - 0.25, ROOM], [0, 1]);
      warpAmt = 0.3 + kick(t, [BOOM], 2) * 0.7;
      fade = interpolate(t, [S, S + 0.15], [0.98, 0]);
      inv = impactFrame(t, [23.68, BOOM], 2);
    }

    /* -------- B -------- */
    if (B.visible) {
      const trip = interpolate(t, [28.4, 28.9], [0, 1], Easing.easeOut);
      croom.update(t, { t0: 26.38, trip, shroomT: 28.46, pulse: bp, eighth: ep });
      // camera: meet a card at the slot → follow it to the desk → crane up over the room → trip
      const k = t - ROOM;
      const follow = interpolate(t, [26.45, 27.0], [0, 1], Easing.easeInOut);
      const crane = interpolate(t, [27.0, 27.9], [0, 1], Easing.easeInOut);
      const tripCam = interpolate(t, [28.4, 29.0], [0, 1], Easing.easeInOut);
      const a0 = 0.7 - interpolate(t, [27.0, 28.4], [0, 1.2]) - (t > 28.4 ? (t - 28.4) * 1.1 : 0);
      camPos.set(1.2, 3.3, -3.6).lerp(V(3.2, 4.4, 5.6), follow);
      camPos.lerp(V(Math.sin(a0) * 9.5, 5.4, Math.cos(a0) * 9.5), crane);
      camPos.lerp(V(Math.sin(a0) * 8, 3.6 + Math.sin(t * 2) * 0.5, Math.cos(a0) * 8), tripCam);
      look.set(0, 3.2, -7).lerp(V(0, 3.4, 0), follow).lerp(V(0, 3.0, 0), crane).lerp(V(0, 3.2, 0), tripCam);
      camPos.add(B.position);
      look.add(B.position);
      void k;
      fov = 55 + trip * (12 + Math.sin(t * 3) * 8) - kick(t, [27.04, 27.56], 6) * 5;
      roll = Math.sin(t * 1.3) * 0.03 + trip * Math.sin(t * 2.1) * 0.22;
      shake = kick(t, [28.46, 29.28], 8) * 0.25 + bp * 0.03;
      flash = interpolate(t, [ROOM, ROOM + 0.2], [1, 0]) + kick(t, [28.46], 10) * 0.35 + interpolate(t, [SHOG - 0.15, SHOG], [0, 0.8]);
    }

    /* -------- C -------- */
    if (Cg.visible) {
      skyC.update(t, 1, bp * 0.3);
      const k = t - SHOG;
      const rise = interpolate(t, [SHOG, SHOG + 0.6], [0, 1], Easing.easeOut);
      body.scale.set(1 + Math.sin(t * 2.3) * 0.05 + bp * 0.06, 1 + Math.cos(t * 1.9) * 0.06, 1 + Math.sin(t * 2.7) * 0.05);
      body.rotation.y = t * 0.2;
      body.position.y = (1 - rise) * -12;
      // tentacles writhe: each is a chain of shrinking spheres along a travelling wave
      for (let j = 0; j < TENT; j++) {
        const td = tentDirs[j];
        for (let s = 0; s < SEGS; s++) {
          const u = s / (SEGS - 1);
          const len = 3.8 + u * 13 * rise;
          const wave = Math.sin(t * 2.6 - u * 5 + td.ph) * u * 2.2 + Math.sin(bpos * Math.PI + j) * u * 0.6;
          const a = td.a + wave * 0.18;
          p.set(Math.cos(a) * len, Math.sin(a) * len * 0.7 + td.tilt * u * 4 + wave * 0.5, -u * 4 + Math.sin(t * 1.7 + j + u * 3) * u * 2);
          p.y += body.position.y;
          const r0 = (1 - u * 0.85) * 1.15;
          sc.setScalar(r0);
          m4.compose(p, q.identity(), sc);
          tentacles.setMatrixAt(j * SEGS + s, m4);
        }
      }
      tentacles.instanceMatrix.needsUpdate = true;
      tentMat.emissiveIntensity = 0.3 + bp * 0.4;
      // eyes: a few more open with every beat after the mask comes off
      const reveal = interpolate(t, [LIES, LIES + 1.2], [0.25, 1]);
      for (let i = 0; i < EYEN; i++) {
        const open = i / EYEN < reveal ? 1 : 0;
        const blink = Math.max(0, Math.sin(t * 3 + i * 1.7)) > 0.97 ? 0.1 : 1;
        p.copy(eyeDirs[i]).multiplyScalar(4.25 * body.scale.x);
        p.y += body.position.y;
        sc.setScalar(eyeSize[i] * open * blink * (1 + ep * 0.2));
        m4.compose(p, q.identity(), sc);
        eyeDots.setMatrixAt(i, m4);
      }
      eyeDots.instanceMatrix.needsUpdate = true;
      // "lies": the mask cracks in two and falls away
      const crack = interpolate(t, [LIES, LIES + 0.9], [0, 1], Easing.easeIn);
      mask.position.y = 0.4 + body.position.y;
      mask.rotation.z = Math.sin(t * 2) * 0.08 * (1 - crack);
      halfL.position.set(-crack * 3, -crack * crack * 12, crack * 2);
      halfL.rotation.set(crack * 1.5, crack * -2, crack * 1.2);
      halfR.position.set(crack * 3, -crack * crack * 12, crack * 2.5);
      halfR.rotation.set(-crack * 1.2, crack * 2, -crack * 1.4);
      mask.scale.setScalar(slam(t, SHOG + 0.3, 1.6, 0.3) * (1 + bp * 0.05));
      ringsC.update(t, RINGS_C, true);
      const a = -0.5 + k * 0.25;
      const d = 22 - k * 1.6 - kick(t, [LIES], 4) * 3;
      camPos.set(Math.sin(a) * d, 2 + Math.sin(k) * 1.5, Math.cos(a) * d).add(Cg.position);
      look.set(0, 0.5, 0).add(Cg.position);
      fov = 50 - kick(t, [LIES], 5) * 10;
      roll = Math.sin(t * 0.9) * 0.06;
      shake = kick(t, [LIES], 5) * 0.8 + bp * 0.08;
      flash = interpolate(t, [SHOG, SHOG + 0.2], [0.8, 0]) + kick(t, [LIES], 12) * 0.5;
      inv = impactFrame(t, [LIES], 2);
      fade = interpolate(t, [EYES - 0.15, EYES], [0, 1]);
    }

    /* -------- D -------- */
    if (D.visible) {
      skyD.update(t, 0.25, 0);
      const k = t - EYES;
      const reveal = interpolate(t, [34.0, 35.2], [0, 1], Easing.easeInOut);
      const open = interpolate(t, [34.85, 35.0], [0, 1], Easing.easeOut);
      const a = Math.sin(k * 0.4) * 0.25;
      // stay close: from one eye to a wall of them, never the whole creature
      const d = THREE.MathUtils.lerp(7, 15, reveal) - bp * 0.25;
      camPos.set(Math.sin(a) * d, 1.8 * (1 - reveal) + Math.sin(k * 0.6) * 0.5 + reveal * 1.2, Math.cos(a) * d).add(D.position);
      look.set(0, 1.8 * (1 - reveal) + reveal * 1.2, 0).add(D.position);
      const dilate = interpolate(t, [37.9, END - 0.05], [0, 1], Easing.easeIn);
      eyes.forEach((o, i) => {
        // the others are shut until "eyes", then open together; each blinks on its own clock
        const wake = i === 0 ? 1 : interpolate(t, [34.85 + (i % 5) * 0.03, 35.05 + (i % 5) * 0.03], [0, 1], Easing.easeOut);
        const bt = (t * 0.37 + o.ph * 1.7) % 1;
        const blink = bt > 0.94 ? Math.sin(((bt - 0.94) / 0.06) * Math.PI) : 0;
        lookAtCam.set(Math.sin(t * 0.7 + o.ph * 5) * 1.2, Math.cos(t * 0.5 + o.ph * 3) * 0.8, 0).add(camPos);
        o.e.set(t + o.ph, {
          pupil: THREE.MathUtils.lerp(0.26 + bp * 0.05 - kick(t, [34.9], 3) * 0.1, 0.95, dilate),
          close: THREE.MathUtils.lerp(1, 0.24, wake) + blink * 0.76,
          data: 0.4 + ep * 0.6,
          look: lookAtCam,
        });
      });
      monster.update(t, { open: 0, pulse: bp });
      formula.material.opacity = interpolate(t, [35.2, 35.5], [0, 1]) * (1 - dilate);
      formula.scale.setScalar((1 / 150) * pop(t, 35.2, 0.3));
      fov = 48 - kick(t, [34.9], 5) * 5 + dilate * 20;
      roll = Math.sin(t * 0.8) * 0.02;
      shake = kick(t, [34.9], 4) * 0.35 + bp * 0.03;
      flash = interpolate(t, [EYES, EYES + 0.2], [0, 0]) + kick(t, [34.9], 10) * 0.3;
      fade = interpolate(t, [EYES, EYES + 0.25], [1, 0]) + interpolate(t, [END - 0.25, END], [0, 1]);
      camPos.lerp(hero.group.getWorldPosition(p), dilate * 0.5);
    }

    streaks.update(t, warpAmt, 80);
    w.shot(t, camPos, look, { fov, roll, shake });
    w.post({ flash, fade, invert: inv });
    meter.update(t, t < ROOM ? 0 : 1);
    lyrics.update(t);
  };
}
