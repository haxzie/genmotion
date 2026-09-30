import * as THREE from "three";
import { Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, FONT_JP } from "../components/brand";
import { beatPos, beatPulse, eighthPulse, SCENE_START } from "../components/music";
import { createWorld } from "../components/world";
import { createLyrics } from "../components/lyrics";
import { createPdoomMeter, pdoomAt } from "../components/hud";
import { createGauge } from "../components/gauge";
import { createEye } from "../components/eye";
import { createTheatre, STAGE_AT, STAGE_CAM, STAGE_LOOK } from "../components/theatre";
import { burst, impactFrame, kick, pop, rings3, slam, stars, V, warp, word, type Ring3 } from "../components/motion";


/**
 * 2:04–2:18 · chorus 3. p(doom) hits 99.9% over a prophecy circle →
 * an endless recursive zoom → the eye sees, and closes → a curtain rises on a stage.
 */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const w = createWorld(ctx, SCENE_START.foretold, { bg: "#07031a", fog: [40, 240] });
  const { root, put } = w;
  const S = SCENE_START.foretold / 30;
  const END = SCENE_START.finale / 30;
  const PD = 125.7;
  const FORETOLD = 126.66;
  const REC = 127.95;
  const SEE = 132.05;
  const NEVER = 133.94;
  const KNOW = 134.58;
  const SHOW = 136.9;

  /* ================= A · the prophecy ================= */
  const A = new THREE.Group();
  A.name = "prophecy";
  put(root, A, 1);
  const skyA = stars(1600, V(400, 200, 400), 111, 0.6);
  skyA.points.position.y = 60;
  A.add(skyA.points);
  const circle = new THREE.Group();
  circle.name = "prophecy-circle";
  A.add(circle);
  const ringMat = (c: string) => new THREE.MeshBasicMaterial({ color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const circleRings = [
    [18, 18.4, C.pink],
    [15, 15.2, C.cyan],
    [9.5, 9.8, C.pink],
    [6, 6.15, C.yellow],
  ].map(([a, b, c], i) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(a as number, b as number, 160), ringMat(c as string));
    m.rotation.x = -Math.PI / 2;
    m.name = `prophecy-ring-${i}`;
    circle.add(m);
    return m;
  });
  // a hexagram of light
  const hexPts: number[] = [];
  for (let k = 0; k < 2; k++)
    for (let i = 0; i < 3; i++) {
      const a0 = (i / 3) * Math.PI * 2 + k * Math.PI / 3;
      const a1 = ((i + 1) / 3) * Math.PI * 2 + k * Math.PI / 3;
      hexPts.push(Math.cos(a0) * 15, 0.05, Math.sin(a0) * 15, Math.cos(a1) * 15, 0.05, Math.sin(a1) * 15);
    }
  const hexGeo = new THREE.BufferGeometry();
  hexGeo.setAttribute("position", new THREE.Float32BufferAttribute(hexPts, 3));
  const hex = new THREE.LineSegments(hexGeo, new THREE.LineBasicMaterial({ color: C.cyan }));
  hex.name = "prophecy-hexagram";
  circle.add(hex);
  const RUNES = "Ψ Ω Δ Σ ∞ λ ∂ ∇ φ θ π ∫ 零 一 滅 終".split(" ");
  const runes = RUNES.map((ch, i) => {
    const m = word(ch, { size: 110, weight: 600, color: C.pink, font: FONT_JP }, 1 / 60, `rune-${i}`);
    const a = (i / RUNES.length) * Math.PI * 2;
    m.position.set(Math.cos(a) * 16.6, 0.06, Math.sin(a) * 16.6);
    m.rotation.set(-Math.PI / 2, 0, -a - Math.PI / 2);
    (m.material as THREE.MeshBasicMaterial).depthTest = true;
    circle.add(m);
    return m;
  });
  const pillarGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 16, 1, true);
  pillarGeo.translate(0, 0.5, 0);
  const pillarMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const pillars = Array.from({ length: 6 }, (_, i) => {
    const m = new THREE.Mesh(pillarGeo, pillarMat);
    const a = (i / 6) * Math.PI * 2;
    m.position.set(Math.cos(a) * 15, 0, Math.sin(a) * 15);
    m.name = `pillar-of-light-${i}`;
    A.add(m);
    return m;
  });
  const gauge = createGauge("pdoom-dial-final", 4.2);
  gauge.group.position.set(0, 7, 0);
  gauge.group.userData.billboard = true;
  A.add(gauge.group);
  const gaugeGlow = w.glow("#ff2d4a", 22, "pdoom-final-glow");
  gaugeGlow.position.set(0, 7, -1);
  A.add(gaugeGlow);
  const ringsA = rings3(4, "#ff2d4a", 0.05, "prophecy-shockwave");
  A.add(ringsA.group);
  const RINGS_A: Ring3[] = [
    { t: PD, pos: V(0, 0.2, 0), scale: 40, dur: 0.9, flat: true },
    { t: FORETOLD, pos: V(0, 0.2, 0), scale: 50, dur: 1.0, flat: true },
    { t: FORETOLD + 0.1, pos: V(0, 0.2, 0), scale: 30, dur: 0.8, flat: true },
  ];

  /* ================= B · recursive self-upgrade ================= */
  const B = new THREE.Group();
  B.name = "recursion";
  B.position.set(0, 0, -2000);
  put(root, B, 1);
  const LV = 11;
  const RATIO = 0.62;
  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  const cubeEdges = new THREE.EdgesGeometry(cubeGeo);
  const levels = Array.from({ length: LV }, (_, i) => {
    const g = new THREE.Group();
    g.name = `recursion-level-${i}`;
    const edge = new THREE.LineSegments(cubeEdges, new THREE.LineBasicMaterial({ color: i % 2 ? C.cyan : C.pink, transparent: true }));
    edge.name = `recursion-level-${i}-edges`;
    const face = new THREE.Mesh(cubeGeo, new THREE.MeshBasicMaterial({ color: i % 2 ? C.cyan : C.pink, transparent: true, opacity: 0.04, depthWrite: false, side: THREE.DoubleSide }));
    face.name = `recursion-level-${i}-glass`;
    g.add(edge, face);
    B.add(g);
    return { g, edge, face };
  });
  const recCore = w.glow("#ffffff", 3, "recursion-core");
  B.add(recCore);
  const skyB = stars(1000, V(120, 120, 120), 112, 0.3);
  B.add(skyB.points);

  /* ================= C · what did you see ================= */
  const Cg = new THREE.Group();
  Cg.name = "what-did-you-see";
  Cg.position.set(0, 0, -4000);
  put(root, Cg, 1);
  const eye = createEye("final-eye");
  eye.group.scale.setScalar(7);
  Cg.add(eye.group);
  const eyeGlow = w.glow(C.cyan, 50, "final-eye-glow");
  eyeGlow.position.z = -4;
  Cg.add(eyeGlow);
  const memory = stars(900, V(60, 40, 30), 113, 0.4, ["#ffffff", C.cyan, C.pink]);
  Cg.add(memory.points);
  const seeBurst = burst(400, 55, ["#ffffff", C.cyan, C.pink, C.yellow], 0.5, 30, 1.4, "what-it-saw");
  seeBurst.points.position.z = 7;
  Cg.add(seeBurst.points);
  const eyeLight = new THREE.PointLight("#ffffff", 400, 80, 1.3);
  eyeLight.position.set(6, 8, 20);
  Cg.add(eyeLight);

  /* ================= D · the stage ================= */
  const D = new THREE.Group();
  D.name = "theatre";
  D.position.copy(STAGE_AT);
  put(root, D, 1);
  const theatre = createTheatre(w);
  D.add(theatre.group);

  const streaks = warp(700, 15, "#ffffff");
  w.cam.add(streaks.lines);
  const lyrics = createLyrics(w, S, END, "sub");
  const meter = createPdoomMeter(w);
  w.seal();

  const camPos = V();
  const look = V();

  return ({ frame }) => {
    const t = w.T(frame);
    const bp = beatPulse(t, 6);
    const ep = eighthPulse(t, 8);
    const bpos = beatPos(t);
    A.visible = t < REC;
    B.visible = t >= REC && t < SEE;
    Cg.visible = t >= SEE && t < SHOW;
    D.visible = t >= SHOW;
    let fov = 50;
    let roll = 0;
    let shake = 0;
    let flash = 0;
    let fade = 0;
    let warpAmt = 0;
    let inv = false;

    if (A.visible) {
      skyA.update(t, 1, bp * 0.3);
      const draw = interpolate(t, [S, 124.64], [0, 1], Easing.easeOut);
      circle.scale.setScalar(0.3 + draw * 0.7 + bp * 0.01);
      circle.rotation.y = t * 0.15;
      circleRings.forEach((m, i) => {
        m.rotation.z = t * (i % 2 ? 0.3 : -0.2);
        m.material.opacity = (0.6 + bp * 0.4) * draw;
      });
      runes.forEach((m, i) => {
        m.visible = t > S + i * 0.05;
        (m.material as THREE.MeshBasicMaterial).color.set(t > PD ? "#ff2d4a" : C.pink);
        m.scale.setScalar((1 / 60) * (1 + (i === Math.floor(bpos * 2) % RUNES.length ? 0.5 * ep : 0)));
      });
      // "foretold": pillars of light burst up from the hexagram's points
      pillars.forEach((m, i) => {
        const up = interpolate(t, [FORETOLD + i * 0.04, FORETOLD + 0.3 + i * 0.04], [0, 1], Easing.easeOut);
        m.visible = up > 0.001;
        m.scale.set(1 + bp * 0.3, up * 90, 1 + bp * 0.3);
      });
      pillarMat.opacity = 0.5 + bp * 0.3;
      const rise = interpolate(t, [124.3, 125.0], [0, 1], Easing.easeOut);
      gauge.group.position.y = -6 + rise * 13;
      gauge.group.scale.setScalar(slam(t, PD - 0.04, 1.3, 0.25) * (1 + kick(t, [PD], 6) * 0.1));
      gauge.update(pdoomAt(t), bp + kick(t, [PD], 4), rise);
      gaugeGlow.position.y = gauge.group.position.y;
      gaugeGlow.material.opacity = rise * (0.3 + bp * 0.4 + kick(t, [PD], 3));
      ringsA.update(t, RINGS_A);
      // camera spirals down onto the dial
      const k = t - S;
      const a = k * 0.5;
      const h = THREE.MathUtils.lerp(34, 11, interpolate(t, [S, 125.4], [0, 1], Easing.easeInOut)) + interpolate(t, [FORETOLD, REC], [0, 8], Easing.easeIn);
      const d = THREE.MathUtils.lerp(10, 22, interpolate(t, [S, 125.4], [0, 1], Easing.easeInOut));
      camPos.set(Math.sin(a) * d, h, Math.cos(a) * d);
      look.set(0, THREE.MathUtils.lerp(0, 7, rise) + interpolate(t, [FORETOLD, REC], [0, 20], Easing.easeIn), 0);
      fov = 55 - kick(t, [PD], 5) * 10 + interpolate(t, [FORETOLD, REC], [0, 15]);
      roll = Math.sin(bpos * Math.PI * 0.25) * 0.06;
      shake = kick(t, [PD], 4) * 0.8 + kick(t, [FORETOLD], 4) * 0.8 + bp * 0.05;
      flash = interpolate(t, [S, S + 0.25], [1, 0]) + kick(t, [PD], 8) * 0.5 + kick(t, [FORETOLD], 5) * 0.6 + interpolate(t, [REC - 0.15, REC], [0, 1]);
      inv = impactFrame(t, [PD, FORETOLD], 2);
    }

    if (B.visible) {
      // an infinite zoom: every level is the next one up, so the loop never ends
      const speed = t < 130.08 ? 0.9 : t < 130.72 ? 2.2 : 4.5;
      const z = (t - REC) * 0.9 + Math.max(0, t - 130.08) * 1.3 + Math.max(0, t - 130.72) * 2.3;
      const f = z - Math.floor(z);
      levels.forEach((L, i) => {
        const lvl = i - f;
        const s = 26 * Math.pow(RATIO, lvl);
        L.g.scale.setScalar(s);
        const idx = (i + Math.floor(z)) % 2;
        L.g.rotation.set(lvl * 0.35 + t * 0.2, lvl * 0.5 + t * 0.3, lvl * 0.15);
        const fadeIn = THREE.MathUtils.clamp((LV - 1 - lvl) / 1.5, 0, 1);
        const fadeOut = THREE.MathUtils.clamp(lvl + 0.6, 0, 1);
        (L.edge.material as THREE.LineBasicMaterial).opacity = fadeIn * fadeOut * (0.7 + bp * 0.3);
        (L.edge.material as THREE.LineBasicMaterial).color.setHSL((0.85 + lvl * 0.07 + t * 0.05 * (speed > 2 ? 1 : 0)) % 1, 1, 0.6);
        (L.face.material as THREE.MeshBasicMaterial).opacity = 0.05 * fadeIn * fadeOut;
        void idx;
      });
      recCore.scale.setScalar(2 + bp * 2 + (speed > 2 ? ep * 2 : 0));
      skyB.update(t, 1, bp * 0.3);
      camPos.set(Math.sin(t * 0.6) * 1.2, Math.cos(t * 0.5) * 1.2, 16).add(B.position);
      look.copy(B.position);
      fov = 50 + (speed - 0.9) * 6;
      roll = (t - REC) * 0.25 * speed * 0.5;
      shake = kick(t, [128.66, 130.08, 130.72], 7) * 0.3 + (speed > 2 ? ep * 0.1 : 0);
      warpAmt = speed > 2 ? 0.6 : 0.15;
      flash = interpolate(t, [REC, REC + 0.25], [1, 0]) + kick(t, [130.08, 130.72], 10) * 0.35 + interpolate(t, [SEE - 0.15, SEE], [0, 0.9]);
      inv = impactFrame(t, [130.72], 2);
    }

    if (Cg.visible) {
      memory.update(t, 0.8, bp * 0.3);
      // it sees — irises flood with bits — then closes, slowly, forever
      const close = interpolate(t, [NEVER, KNOW + 0.1], [0.14, 1], Easing.easeInOut);
      eyeGlow.material.opacity = (0.3 + bp * 0.3 + kick(t, [132.98], 2)) * (1 - close * 0.8);
      seeBurst.fire(t, [132.98]);
      const k = t - SEE;
      const after = interpolate(t, [KNOW, SHOW], [0, 1], Easing.easeInOut);
      const a = Math.sin(k * 0.3) * 0.3;
      const d = 30 - interpolate(t, [SEE, KNOW], [0, 12], Easing.easeInOut) + after * 30;
      camPos.set(Math.sin(a) * d, 1 + after * 4, Math.cos(a) * d).add(Cg.position);
      look.copy(Cg.position);
      eye.set(t, {
        pupil: 0.3 + bp * 0.05 + kick(t, [132.98], 3) * 0.3,
        bits: interpolate(t, [132.9, 133.2, 133.9], [0, 1, 0.4]),
        close,
        look: camPos,
        glow: 1 + kick(t, [132.98], 3),
      });
      fov = 45 - kick(t, [132.98], 4) * 6;
      roll = Math.sin(t * 0.4) * 0.03;
      shake = kick(t, [132.98], 5) * 0.4;
      flash = interpolate(t, [SEE, SEE + 0.3], [0.9, 0]) + kick(t, [132.98], 6) * 0.4;
      fade = interpolate(t, [KNOW, KNOW + 0.8], [0, 0.55]) + interpolate(t, [SHOW - 0.3, SHOW], [0, 0.45]);
      inv = impactFrame(t, [132.98], 1);
    }

    if (D.visible) {
      // the curtain rises on a stage; the camera settles on the finale's opening pose
      const open = interpolate(t, [137.46, END], [0, 0.35], Easing.easeInOut);
      theatre.update(t, { open, beam: interpolate(t, [137.3, 137.6], [0, 1]), turn: Math.sin(t * 0.8) * 0.12, pulse: bp });
      const settle = interpolate(t, [SHOW, END], [0, 1], Easing.easeOut);
      camPos.copy(STAGE_CAM).add(V(0, 1.5, 12).multiplyScalar(1 - settle)).add(STAGE_AT);
      look.copy(STAGE_LOOK).add(STAGE_AT);
      fov = 45;
      fade = interpolate(t, [SHOW, SHOW + 0.35], [1, 0]);
    }

    streaks.update(t, warpAmt, 100);
    w.shot(t, camPos, look, { fov, roll, shake });
    w.post({ flash, fade, invert: inv });
    meter.update(t, 1);
    lyrics.update(t);
  };
}
