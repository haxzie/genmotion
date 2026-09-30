import * as THREE from "three";
import { Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, FONT_JP } from "../components/brand";
import { beatPos, beatPulse, eighthPulse, hash, rng, SCENE_START } from "../components/music";
import { createWorld } from "../components/world";
import { createAnimeFace } from "../components/animeface";
import { createLyrics } from "../components/lyrics";
import { createPdoomMeter, numberDisplay } from "../components/hud";
import { label } from "../components/text";
import { burst, impactFrame, kick, letters, neonGrid, rings3, slam, stars, trail, V, warp, word, type Ring3 } from "../components/motion";

/** 0:00–0:13 · title slam in space → the AI's eye → flying over a live circuit board → riding the loss curve off a cliff. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const w = createWorld(ctx, SCENE_START.intro, { bg: "#07041a", fog: [30, 170] });
  const { root, put } = w;
  const frac = (x: number) => x - Math.floor(x);

  const A_END = 2.087;
  const B_END = 5.9;
  const DROP = 10.74;
  const IMPACTS = [0.724, 3.74, DROP];

  const sky = stars(1400, V(400, 220, 400), 3, 0.35);
  put(root, sky.points, 0);

  /* ================= A · title in the void ================= */
  const A = new THREE.Group();
  A.name = "title-shot";
  put(root, A, 1);
  const coreWire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(5.2, 1),
    new THREE.MeshBasicMaterial({ color: C.violet, wireframe: true, transparent: true, opacity: 0.45 }),
  );
  coreWire.name = "ai-core-cage";
  coreWire.position.z = -9;
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.4, 0),
    new THREE.MeshStandardMaterial({ color: "#2a0f66", emissive: C.pink, emissiveIntensity: 0.6, flatShading: true, roughness: 0.3, metalness: 0.6 }),
  );
  core.name = "ai-core";
  core.position.z = -9;
  const coreGlow = w.glow(C.pink, 16, "ai-core-glow");
  coreGlow.position.z = -9.5;
  A.add(coreWire, core, coreGlow);
  const floorA = neonGrid(300, 60, C.pink, 0.55, "title-grid");
  floorA.position.y = -5;
  A.add(floorA);

  const UPP = 1 / 100; // world units per px for the title type
  const title = letters("p(doom)", { size: 180, weight: 500, color: C.text, tracking: -0.02 }, "title-pdoom");
  title.group.scale.setScalar(UPP);
  A.add(title.group);
  const reading = word("ピー・ドゥーム", { size: 40, weight: 600, font: FONT_JP, color: C.cyan, tracking: 0.5 }, UPP, "title-reading");
  reading.position.y = -1.6;
  const upping = word("I'm upping my", { size: 56, weight: 400, color: C.text }, UPP, "title-upping");
  upping.position.y = 1.75;
  A.add(reading, upping);
  const titleRings = rings3(5, C.pink, 0.03, "title-shockwave");
  A.add(titleRings.group);
  const TITLE_RINGS: Ring3[] = [
    { t: 0.269, pos: V(0, 0, -9), scale: 6 },
    { t: 0.724, pos: V(0, 0, 0), scale: 14, dur: 0.8 },
    { t: 0.82, pos: V(0, 0, -2), scale: 10, dur: 0.7 },
    { t: 1.178, pos: V(0, 0, -9), scale: 12 },
    { t: 1.633, pos: V(0, 0, -9), scale: 12 },
  ];
  const titleBurst = burst(260, 7, ["#ffffff", C.pink, C.cyan, C.yellow], 0.35, 22, 1.2, "title-burst");
  A.add(titleBurst.points);
  const ooX = ((title.chars[3].x + title.chars[4].x) / 2) * UPP;

  /* ================= B · the eye ================= */
  const B = new THREE.Group();
  B.name = "eye-shot";
  B.position.set(0, 0, -400);
  put(root, B, 1);
  const face = createAnimeFace("doomi-face");
  B.add(face.group);
  const EL = V(-face.EYE_X, face.EYE_Y, 0.6);
  const ER = V(face.EYE_X, face.EYE_Y, 0.6);
  const eyeGlow = w.glow(C.cyan, 4, "agi-eye-glow");
  eyeGlow.position.copy(ER);
  B.add(eyeGlow);
  const eyeSparks = stars(260, V(22, 10, 4), 11, 0.12, ["#ffffff", C.cyan, "#ffd6f0", C.pink], "eye-sparkles");
  eyeSparks.points.position.z = 2;
  B.add(eyeSparks.points);
  const pupilBurst = burst(160, 12, ["#ffffff", C.cyan, "#bff9ff"], 0.22, 9, 1.1, "sparks-right-eye");
  pupilBurst.points.position.copy(ER);
  const pupilBurstL = burst(160, 13, ["#ffffff", C.pink, "#ffd6f0"], 0.22, 9, 1.1, "sparks-left-eye");
  pupilBurstL.points.position.copy(EL);
  B.add(pupilBurst.points, pupilBurstL.points);
  const faceLook = new THREE.Vector2();
  const eyeRings = rings3(5, "#ffffff", 0.025, "eye-shockwave");
  B.add(eyeRings.group);
  const EYE_RINGS: Ring3[] = [
    { t: 2.86, pos: V(-3.25, 0.2, 0.7), scale: 3 },
    { t: 2.86, pos: V(3.25, 0.2, 0.7), scale: 3 },
    { t: 3.74, pos: V(0, 0.2, 5), scale: 14, dur: 0.8 },
    { t: 3.82, pos: V(3.25, 0.2, 0.7), scale: 6, dur: 0.7 },
  ];
  const agi = letters("AGI", { size: 300, weight: 500, color: "#ffffff", tracking: -0.03 }, "agi-slam");
  agi.group.scale.setScalar(1 / 110);
  agi.group.position.set(0, 0.2, 6.5);
  agi.group.userData.billboard = true;
  B.add(agi.group);

  /* ================= C · circuit board + loss curve ================= */
  const Cg = new THREE.Group();
  Cg.name = "circuit-world";
  Cg.position.set(0, 0, -900);
  put(root, Cg, 1);
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 420),
    new THREE.MeshStandardMaterial({ color: "#120a2e", roughness: 0.55, metalness: 0.5 }),
  );
  board.rotation.x = -Math.PI / 2;
  board.position.z = -150;
  board.name = "circuit-board";
  board.userData.pickable = false;
  Cg.add(board);
  const boardGrid = neonGrid(420, 140, C.violet, 0.22, "board-grid");
  boardGrid.position.set(0, 0.01, -150);
  Cg.add(boardGrid);

  // traces: manhattan paths with 45° chamfers, each with a data packet racing along it
  const r = rng(99);
  const traces: { tr: ReturnType<typeof trail>; pkt: THREE.Sprite; delay: number; speed: number; ph: number }[] = [];
  const tracesG = new THREE.Group();
  tracesG.name = "circuit-traces";
  Cg.add(tracesG);
  for (let i = 0; i < 46; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    let x = side * (1.5 + r() * 3);
    let z = 8 - r() * 150;
    const pts = [V(x, 0.05, z)];
    let dir = side;
    for (let s = 0; s < 6; s++) {
      const run = 4 + r() * 16;
      if (s % 2 === 0) {
        const nx = x + dir * run;
        pts.push(V(x + dir * run * 0.5, 0.05, z), V(nx - dir * 0.8, 0.05, z));
        x = nx;
        pts.push(V(x, 0.05, z - 0.8));
      } else {
        const nz = z - run;
        pts.push(V(x, 0.05, z - run * 0.5), V(x, 0.05, nz + 0.8));
        z = nz;
        pts.push(V(x + dir * 0.8, 0.05, z));
      }
      if (r() < 0.25) dir = -dir;
    }
    const col = r() < 0.7 ? C.cyan : C.pink;
    const tr = trail(pts, 0.07, col, `circuit-trace-${i}`, 120, true);
    tracesG.add(tr.mesh);
    const pkt = w.glow("#ffffff", 1.6, `data-packet-${i}`);
    tracesG.add(pkt);
    traces.push({ tr, pkt, delay: r() * 0.5, speed: 0.25 + r() * 0.35, ph: r() });
  }
  // a skyline of server towers along both edges, outlined in neon
  const towerGeo = new THREE.BoxGeometry(1, 1, 1);
  const towerEdges = new THREE.EdgesGeometry(towerGeo);
  const towerMat = new THREE.MeshStandardMaterial({ color: "#0e0826", roughness: 0.6, metalness: 0.4 });
  const edgeMatC = new THREE.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.6 });
  const edgeMatP = new THREE.LineBasicMaterial({ color: C.pink, transparent: true, opacity: 0.6 });
  const towers = new THREE.Group();
  towers.name = "server-skyline";
  towers.userData.pickable = false;
  for (let i = 0; i < 70; i++) {
    const tw = new THREE.Mesh(towerGeo, towerMat);
    const h = 8 + r() * 50;
    const s = 4 + r() * 8;
    tw.scale.set(s, h, s);
    tw.position.set((i % 2 ? 1 : -1) * (34 + r() * 60), h / 2, 20 - r() * 300);
    tw.add(new THREE.LineSegments(towerEdges, r() < 0.7 ? edgeMatC : edgeMatP));
    towers.add(tw);
  }
  Cg.add(towers);
  const skyC = stars(900, V(500, 160, 500), 8, 0.5);
  skyC.points.position.set(0, 90, -150);
  Cg.add(skyC.points);
  const chipGeo = new THREE.BoxGeometry(1, 1, 1);
  const chipMat = new THREE.MeshStandardMaterial({ color: "#1d1440", roughness: 0.35, metalness: 0.7 });
  const chipTop = new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.8 });
  const chips: THREE.Mesh[] = [];
  for (let i = 0; i < 16; i++) {
    const s = 2 + r() * 3.5;
    const chip = new THREE.Mesh(chipGeo, chipMat);
    chip.scale.set(s, 0.5 + r() * 0.6, s);
    chip.position.set((r() < 0.5 ? -1 : 1) * (6 + r() * 22), 0.3, 4 - r() * 150);
    chip.name = `chip-${i}`;
    const led = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), chipTop);
    led.rotation.x = -Math.PI / 2;
    led.position.y = 0.51;
    led.name = `chip-${i}-led`;
    chip.add(led);
    Cg.add(chip);
    chips.push(chip);
  }

  // the loss curve: a noisy plateau high above the board, then a cliff
  const lossPts: THREE.Vector3[] = [];
  const N = 90;
  const Z0 = -40;
  const LEN = 110;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const z = Z0 - u * LEN;
    const y = u < 0.55 ? 11 - u * 1.6 + (r() - 0.5) * 0.9 : 10.1 - Math.pow((u - 0.55) / 0.45, 0.55) * 9.4 + (r() - 0.5) * 0.25;
    lossPts.push(V(Math.sin(u * 5) * 2.5, y, z));
  }
  const lossTube = trail(lossPts, 0.2, C.cyan, "loss-curve", 600);
  const lossGlowTube = trail(lossPts, 0.6, C.cyan, "loss-curve-glow", 600, true);
  lossGlowTube.mat.opacity = 0.25;
  Cg.add(lossGlowTube.mesh, lossTube.mesh);
  // arc-length fraction where the cliff starts
  let acc = 0;
  let cliffAcc = 0;
  for (let i = 1; i < N; i++) {
    acc += lossPts[i].distanceTo(lossPts[i - 1]);
    if (i === Math.round(0.55 * (N - 1))) cliffAcc = acc;
  }
  const CLIFF = cliffAcc / acc;
  const lossHead = w.glow(C.cyan, 3.2, "loss-head");
  const lossCore = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
  lossCore.name = "loss-head-core";
  Cg.add(lossHead, lossCore);
  const dropRings = rings3(4, C.cyan, 0.04, "drop-shockwave");
  Cg.add(dropRings.group);
  const endP = lossPts[N - 1];
  const DROP_RINGS: Ring3[] = [
    { t: 12.2, pos: V(endP.x, 0.2, endP.z), scale: 18, dur: 0.8, flat: true },
    { t: 12.28, pos: V(endP.x, 0.2, endP.z), scale: 11, dur: 0.7, flat: true },
  ];
  const impactBurst = burst(300, 21, ["#ffffff", C.cyan, C.pink], 0.35, 26, 1.1, "loss-impact-burst");
  impactBurst.points.position.set(endP.x, 0.5, endP.z);
  Cg.add(impactBurst.points);

  // camera-space warp streaks for the dive
  const streaks = warp(500, 4, "#bff9ff");
  w.cam.add(streaks.lines);

  /* ================= HUD ================= */
  const lyrics = createLyrics(w, 0, 13, "sub");
  const meter = createPdoomMeter(w);
  const lossTitle = label("training loss", { size: 34, weight: 400, color: C.text, align: "left" });
  lossTitle.name = "hud-loss-label";
  lossTitle.position.set(w.W / 2 - 470, w.H / 2 - 80, 0);
  const lossNum = numberDisplay(84, 5, "#ffffff", "hud-loss-value");
  lossNum.group.position.set(w.W / 2 - 72, w.H / 2 - 158, 0);
  put(w.hud, lossTitle, 800);
  put(w.hud, lossNum.group, 800);
  w.seal();

  const camPos = V();
  const look = V();
  const tmpA = V();
  const tmpB = V();
  const CGO = Cg.position;

  return ({ frame }) => {
    const t = w.T(frame);
    const bp = beatPulse(t, 6);
    const bpos = beatPos(t);
    A.visible = t < A_END;
    B.visible = t >= A_END && t < B_END;
    Cg.visible = t >= B_END;

    let fov = 50;
    let roll = 0;
    let shake = 0;
    let flash = 0;
    let fade = 0;
    let warpAmt = 0;
    sky.update(t, 1, bp * 0.3);
    lossTitle.visible = lossNum.group.visible = false;

    /* -------- A -------- */
    if (A.visible) {
      const open = interpolate(t, [0, 0.4], [0, 1], Easing.easeOut);
      core.rotation.set(t * 0.7, t * 1.1, 0);
      core.scale.setScalar((0.4 + open * 0.6) * (1 + bp * 0.18));
      coreWire.rotation.set(-t * 0.3, t * 0.5, t * 0.2);
      coreWire.scale.setScalar(1 + bp * 0.08);
      coreGlow.material.opacity = open * (0.4 + bp * 0.6);
      floorA.position.z = (t * 12) % 5;

      title.chars.forEach((c, i) => {
        const t0 = 0.64 + i * 0.03;
        const inn = interpolate(t, [t0, t0 + 0.16], [0, 1], Easing.easeOut);
        const spin = (1 - inn) * (hash(i + 3) - 0.5) * 5;
        const wave = t > 1.0 ? Math.exp(-frac(bpos - i * 0.07) * 7) : 0;
        c.m.material.opacity = interpolate(t, [t0, t0 + 0.05], [0, 1]);
        c.m.position.set(c.x + (1 - inn) * (hash(i) - 0.5) * 900, wave * 40 + (1 - inn) * (hash(i + 9) - 0.5) * 500, (1 - inn) * 900);
        c.m.rotation.set(spin * 0.5, spin, spin * 0.3);
        c.m.scale.setScalar(slam(t, t0, 1.6, 0.22) * (1 + wave * 0.12));
      });
      const e1 = interpolate(t, [0.3, 0.5], [0, 1], Easing.easeOut);
      reading.material.opacity = e1;
      reading.position.set(0, -1.6 + (1 - e1) * -0.6, 0);
      reading.scale.setScalar(UPP * (0.6 + 0.4 * e1));
      const e3 = interpolate(t, [1.6, 1.74, 1.82], [0, 1.05, 1], Easing.easeOut);
      upping.material.opacity = Math.min(1, e3);
      upping.position.set(0, 1.75, (1 - Math.min(1, e3)) * 6);

      titleRings.update(t, TITLE_RINGS);
      titleBurst.fire(t, [0.724]);

      // slow orbit, punch on every beat, then dive through the o's
      const dive = interpolate(t, [1.72, A_END], [0, 1], Easing.easeIn);
      const a = Math.sin(t * 0.9) * 0.22;
      tmpA.set(Math.sin(a) * 12, 0.8 + Math.sin(t * 0.7) * 0.4, Math.cos(a) * 12 - bp * 0.6);
      tmpB.set(ooX, -0.1, -0.5);
      camPos.lerpVectors(tmpA, tmpB, dive);
      look.set(ooX * dive, 0, -6);
      fov = 50 + dive * 40;
      roll = Math.sin(t * 1.7) * 0.05 * (1 - dive) + dive * 0.4;
      shake = kick(t, [0.724], 7) * 0.5 + kick(t, [1.178, 1.633], 12) * 0.15;
      flash = kick(t, [0.724], 12) * 0.6 + interpolate(t, [1.96, A_END], [0, 1], Easing.easeIn);
      warpAmt = dive;
    }

    /* -------- B -------- */
    if (B.visible) {
      // arrive tight on the eyes from the o's, ease back to a close-up of the face
      // the pair of eyes fills the frame edge to edge
      const settle = interpolate(t, [A_END, A_END + 0.5, A_END + 0.7], [4.2, 7.1, 6.8], Easing.easeOut);
      const push = interpolate(t, [4.86, B_END], [0, 1], Easing.easeIn);
      const dz = settle - bp * 0.18 - kick(t, [3.74], 6) * 1.2;
      tmpA.set(Math.sin(t * 0.7) * 1.3, face.EYE_Y - 0.15 + Math.sin(t * 0.9) * 0.35, dz);
      tmpB.set(ER.x, ER.y, 2.4);
      camPos.lerpVectors(tmpA, tmpB, push).add(B.position);
      look.set(Math.sin(t * 0.7) * 0.25, face.EYE_Y - 0.05, 0).lerp(ER, push).add(B.position);
      // blinks: eyes open on "I see", a blink on the beat, then close for the cut
      const blinkAt = (t0: number, d = 0.2) => (t > t0 && t < t0 + d ? Math.sin(((t - t0) / d) * Math.PI) : 0);
      const wake = 1 - interpolate(t, [2.1, 2.34], [0, 1], Easing.easeOut);
      const shut = interpolate(t, [5.6, 5.84], [0, 1], Easing.easeIn);
      const blink = Math.max(wake, blinkAt(2.54), blinkAt(3.36, 0.16), blinkAt(4.45), shut);
      // the eyes dart on the 8ths, lock onto you for "AGI"
      const lockOn = interpolate(t, [3.7, 3.8, 4.7, 4.9], [0, 1, 1, 0]);
      faceLook.set(Math.round(Math.sin(Math.floor(t * 4.4) * 1.7) * 2) * 0.07 * (1 - lockOn), Math.sin(t * 1.3) * 0.03);
      face.update(t, {
        blinkL: blink,
        blinkR: blink,
        look: faceLook,
        spark: kick(t, [2.86], 3) * 1.2 + kick(t, [5.36], 4) * 0.8,
        circuit: interpolate(t, [3.74, 3.9], [0, 1]),
        dilate: kick(t, [3.74], 5) * -0.3 + push * 0.9,
        glow: 1 + kick(t, [2.86, 3.74], 4) * 0.5,
        blush: 0.8 + bp * 0.2,
        dim: interpolate(t, [3.7, 3.78, 4.74, 4.95], [0, 0.85, 0.85, 0]),
      });
      eyeGlow.material.opacity = interpolate(t, [3.74, 3.9], [0, 0.6]) * (0.5 + bp * 0.5);
      eyeSparks.update(t, 0.5 + kick(t, [2.86, 5.36], 3) * 1.4, bp * 0.4);
      pupilBurst.fire(t, [2.86, 3.74]);
      pupilBurstL.fire(t, [2.86]);
      eyeRings.update(t, EYE_RINGS, true);

      // AGI: slams in from behind the camera, throbs, then explodes outward
      const agiOut = interpolate(t, [4.74, 5.0], [0, 1], Easing.easeIn);
      agi.group.visible = t > 3.7 && agiOut < 1;
      agi.chars.forEach((c, i) => {
        const t0 = 3.7 + i * 0.04;
        const inn = interpolate(t, [t0, t0 + 0.14], [0, 1], Easing.easeOut);
        const dir = i - 1;
        c.m.material.opacity = interpolate(t, [t0, t0 + 0.04], [0, 1]) * (1 - agiOut);
        c.m.position.set(c.x + dir * agiOut * 900, agiOut * (hash(i) - 0.5) * 600, (1 - inn) * 1200 + agiOut * 600);
        c.m.rotation.z = agiOut * dir * 1.4;
        c.m.scale.setScalar(slam(t, t0, 1.8, 0.2) * (1 + bp * 0.08));
      });

      fov = 50 + push * 12 - kick(t, [3.74], 6) * 6;
      roll = Math.sin(t * 1.1) * 0.025 + kick(t, [3.74], 5) * 0.08;
      shake = kick(t, [3.74], 6) * 0.6 + kick(t, [2.86], 9) * 0.2 + bp * 0.04;
      flash = interpolate(t, [A_END, A_END + 0.18], [1, 0]) + kick(t, [3.74], 14) * 0.5;
      fade = interpolate(t, [5.72, B_END], [0, 1], Easing.easeIn);
    }

    /* -------- C -------- */
    if (Cg.visible) {
      const k = t - B_END;
      // traces boot up on "circuits", packets race; "nervous" flashes them pink on the 8ths
      const nerv = interpolate(t, [7.02, 7.1, 7.7, 7.85], [0, 1, 1, 0]);
      const ep = eighthPulse(t, 8);
      traces.forEach((o, i) => {
        const p = interpolate(t, [6.16 + o.delay, 6.16 + o.delay + 0.7], [0, 1], Easing.easeOut);
        o.tr.setProgress(p);
        o.tr.mat.opacity = 0.35 + 0.65 * (bp * 0.6 + 0.4) + nerv * ep;
        o.tr.mat.color.set(nerv > 0.5 && i % 2 === 0 ? C.pink : i % 7 === 0 ? C.pink : C.cyan);
        const u = frac(t * o.speed + o.ph);
        o.pkt.visible = p >= 1;
        o.tr.head(u);
        o.pkt.position.copy(o.tr.head(u));
        o.pkt.material.opacity = 0.9;
      });
      skyC.update(t, 1, bp * 0.4);
      edgeMatC.opacity = 0.35 + bp * 0.5;
      edgeMatP.opacity = 0.35 + (1 - bp) * 0.4 + nerv * ep;
      chipTop.color.set(nerv > 0.5 ? C.pink : C.cyan);
      chipTop.opacity = 0.4 + bp * 0.6;
      chips.forEach((c, i) => (c.position.y = 0.3 + Math.max(0, Math.sin(bpos * Math.PI + i)) * 0.25 * nerv));

      // loss curve draws on "there was a sudden", plateaus, then falls off the cliff at "drop"
      const draw = t < DROP ? interpolate(t, [9.58, DROP], [0, CLIFF], Easing.easeInOut) : interpolate(t, [DROP, 12.2], [CLIFF, 1], Easing.easeIn);
      const showLoss = t > 9.5;
      lossTube.mesh.visible = lossGlowTube.mesh.visible = lossHead.visible = lossCore.visible = showLoss;
      lossTube.setProgress(draw);
      lossGlowTube.setProgress(draw);
      lossGlowTube.mat.opacity = 0.2 + bp * 0.3;
      const hp = lossTube.head(Math.max(draw, 0.001));
      lossHead.position.copy(hp);
      lossCore.position.copy(hp);
      lossHead.material.opacity = 0.8 + bp * 0.2;
      lossHead.scale.setScalar(3.2 * (1 + bp * 0.3 + kick(t, [DROP], 5)));
      dropRings.update(t, DROP_RINGS);
      impactBurst.fire(t, [12.2]);

      // camera: skim the board → rise for the reveal → ride the curve → dive with it
      const skim = V(Math.sin(k * 0.9) * 2, 2.4 + Math.sin(k * 2) * 0.2, 8 - k * 13);
      const skimLook = V(skim.x * 0.5, 0.2, skim.z - 14);
      const rise = interpolate(t, [7.8, 8.8], [0, 1], Easing.easeInOut);
      const high = V(18 * Math.sin(k * 0.25), 24, -20 - k * 2);
      const highLook = V(0, 0, -60);
      const ride = interpolate(t, [9.45, 10.0], [0, 1], Easing.easeInOut);
      const behind = V(hp.x + 1.5, hp.y + 2.4, hp.z + 7);
      const ahead = V(hp.x * 0.5, hp.y - 1.2 - (t > DROP ? 6 : 0), hp.z - 12);
      camPos.lerpVectors(skim, high, rise).lerp(behind, ride);
      look.lerpVectors(skimLook, highLook, rise).lerp(ahead, ride).add(CGO);
      camPos.add(CGO);
      const plunge = interpolate(t, [DROP, DROP + 0.3, 12.2], [0, 1, 1]) * (1 - interpolate(t, [12.2, 12.5], [0, 1]));
      const outro = interpolate(t, [12.4, 13], [0, 1], Easing.easeIn);
      tmpB.copy(hp).add(CGO);
      camPos.lerp(tmpB, outro * 0.85);
      fov = 50 + plunge * 30 + nerv * -6 * (1 + ep * 0.3) + outro * 20;
      roll = Math.sin(bpos * Math.PI * 0.25) * 0.08 * (1 - ride) + nerv * Math.sin(t * 40) * 0.03 + plunge * 0.12;
      shake = kick(t, [6.16], 8) * 0.4 + nerv * 0.3 + kick(t, [DROP], 4) * 0.8 + kick(t, [12.2], 5) * 1.2 + bp * 0.05;
      warpAmt = plunge * 0.9 + (1 - rise) * 0.35 * (1 - ride);
      flash = kick(t, [6.16], 10) * 0.35 + kick(t, [DROP], 12) * 0.5 + kick(t, [12.2], 8) * 0.6 + interpolate(t, [12.8, 13], [0, 1], Easing.easeIn);
      fade = interpolate(t, [B_END, B_END + 0.25], [1, 0]);

      const lv = 0.012 + ((hp.y - 0.7) / 10.8) * 2.4;
      const hudOn = interpolate(t, [9.5, 9.7, 12.5, 12.7], [0, 1, 1, 0]);
      lossTitle.material.opacity = hudOn;
      lossNum.setOpacity(hudOn);
      lossNum.setText(Math.max(0.012, lv).toFixed(3));
      lossNum.group.scale.setScalar(1 + kick(t, [DROP], 7) * 0.35);
      lossTitle.visible = lossNum.group.visible = hudOn > 0.001;
    }

    streaks.update(t, warpAmt, 60 + warpAmt * 120);
    w.shot(t, camPos, look, { fov, roll, shake });
    w.post({ flash, fade, invert: impactFrame(t, IMPACTS, 2) });
    meter.update(t, interpolate(t, [6.2, 6.5], [0, 1]) * (1 - interpolate(t, [12.4, 12.7], [0, 1])));
    lyrics.update(t);
  };
}
