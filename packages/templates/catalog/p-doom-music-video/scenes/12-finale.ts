import * as THREE from "three";
import { Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { barTime, beatPos, beatPulse, eighthPulse, hash, rng, SCENE_START } from "../components/music";
import { createWorld } from "../components/world";
import { createLyrics } from "../components/lyrics";
import { createPdoomMeter } from "../components/hud";
import { createGauge } from "../components/gauge";
import { createEye } from "../components/eye";
import { createTheatre, STAGE_AT, STAGE_CAM, STAGE_LOOK } from "../components/theatre";
import { heartGeometry, paperclipGeometry } from "../components/props";
import { createGenMotionMark } from "../components/genmotionlogo";
import { label } from "../components/text";
import { burst, impactFrame, kick, letters, pop, rings3, shards, slam, stars, V, warp, type Ring3 } from "../components/motion";

/**
 * 2:18–2:37 · "Was it all for show?" — the eye was cardboard. Then the stage
 * falls away: a ring tunnel, every motif in one orbit, a supernova on the
 * loudest bar, and the title reassembles from the debris.
 */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const w = createWorld(ctx, SCENE_START.finale, { bg: "#07031a", fog: [60, 400] });
  const { root, put } = w;
  const S = SCENE_START.finale / 30;
  const END = SCENE_START.end / 30;
  const SHOW = 140.2;
  const TUNNEL = barTime(78);
  const GATHER = barTime(80);
  const NOVA = barTime(81);
  const CONVERGE = barTime(82);
  const TITLE = barTime(83);
  const QUIET = barTime(84);
  const OUT = barTime(85);
  const CARD = 154.55; // the end card: "Made with GenMotion"

  /* ================= D · the stage, continued ================= */
  const D = new THREE.Group();
  D.name = "theatre";
  D.position.copy(STAGE_AT);
  put(root, D, 1);
  const theatre = createTheatre(w);
  D.add(theatre.group);

  /* ================= T · the ring tunnel ================= */
  const T = new THREE.Group();
  T.name = "ring-tunnel";
  T.position.set(0, 0, -1500);
  put(root, T, 1);
  const RINGS = 40;
  const ringGeo = new THREE.TorusGeometry(7, 0.14, 8, 120);
  const tunnel = Array.from({ length: RINGS }, (_, i) => {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.name = `tunnel-ring-${i}`;
    T.add(m);
    return m;
  });
  const tunnelEnd = w.glow("#ffffff", 30, "tunnel-light");
  tunnelEnd.position.z = -360;
  T.add(tunnelEnd);

  /* ================= G · the gathering, the nova, the title ================= */
  const G = new THREE.Group();
  G.name = "gathering";
  G.position.set(0, 0, -3000);
  put(root, G, 1);
  const skyG = stars(2500, V(500, 300, 500), 121, 0.7, ["#ffffff", C.cyan, C.pink, "#ffd6f0", C.yellow]);
  G.add(skyG.points);
  const eye = createEye("the-eye-one-last-time");
  eye.group.scale.setScalar(3.2);
  G.add(eye.group);
  const eyeGlow = w.glow(C.cyan, 30, "last-eye-glow");
  eyeGlow.position.z = -3;
  G.add(eyeGlow);
  const CLIPS = 500;
  const clipMat = new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.55, roughness: 0.25, emissive: "#6a5cff", emissiveIntensity: 0.3 });
  const clips = new THREE.InstancedMesh(paperclipGeometry(0.05, 32), clipMat, CLIPS);
  clips.name = "orbiting-paperclips";
  clips.frustumCulled = false;
  G.add(clips);
  const cr = rng(8);
  const clipOrbit = Array.from({ length: CLIPS }, () => ({ r: 6 + Math.pow(cr(), 0.7) * 11, a: cr() * Math.PI * 2, y: (cr() - 0.5) * 1.6, s: 0.35 + cr() * 0.35, ax: V(cr() - 0.5, cr() - 0.5, cr() - 0.5).normalize(), sp: cr() * 6 }));
  const ccol = new THREE.Color();
  for (let i = 0; i < CLIPS; i++) clips.setColorAt(i, ccol.set(i % 5 === 0 ? C.pink : i % 3 === 0 ? C.cyan : "#e8e4ff"));
  const heartMat = new THREE.MeshStandardMaterial({ color: "#ff5aa9", emissive: "#ff2e7e", emissiveIntensity: 0.9, roughness: 0.25 });
  const heartGeo = heartGeometry();
  const hearts = Array.from({ length: 8 }, (_, i) => {
    const m = new THREE.Mesh(heartGeo, heartMat);
    m.name = `orbiting-heart-${i}`;
    m.scale.setScalar(0.55);
    G.add(m);
    return m;
  });
  const SERP = 80;
  const serpMat = new THREE.MeshStandardMaterial({ color: "#1b1040", roughness: 0.25, metalness: 0.8, emissive: "#ff2e7e", emissiveIntensity: 0.5, flatShading: true });
  const serpent = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.6, 0), serpMat, SERP);
  serpent.name = "orbiting-basilisk";
  serpent.frustumCulled = false;
  G.add(serpent);
  const novaShards = shards(700, 41, new THREE.TetrahedronGeometry(0.5), new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: C.pink, emissiveIntensity: 1.3, flatShading: true }), "nova-shards");
  G.add(novaShards.mesh);
  const novaBurst = burst(900, 42, ["#ffffff", C.cyan, C.pink, C.yellow], 0.6, 60, 2.2, "supernova");
  G.add(novaBurst.points);
  const novaRings = rings3(6, "#ffffff", 0.05, "nova-shockwave");
  G.add(novaRings.group);
  const NOVA_RINGS: Ring3[] = [
    { t: NOVA, pos: V(), scale: 80, dur: 1.4 },
    { t: NOVA + 0.1, pos: V(), scale: 55, dur: 1.2 },
    { t: NOVA, pos: V(), scale: 70, dur: 1.4, flat: true },
    { t: TITLE, pos: V(0, 1.2, 0), scale: 22, dur: 0.9 },
    { t: TITLE + 0.1, pos: V(0, 1.2, 0), scale: 14, dur: 0.8 },
  ];
  const novaLight = new THREE.PointLight("#ffffff", 0, 200, 1.2);
  G.add(novaLight);
  // the title, reassembled from the debris
  const title = letters("p(doom)", { size: 220, weight: 500, color: C.text, tracking: -0.02 }, "final-title");
  title.group.scale.setScalar(1 / 62);
  title.group.position.set(0, 1.9, 0);
  title.group.userData.billboard = true;
  G.add(title.group);
  const tr = rng(77);
  const starts = title.chars.map(() => V((tr() - 0.5) * 3000, (tr() - 0.5) * 2000, (tr() - 0.5) * 2000));
  const gauge = createGauge("pdoom-dial-end", 1.5);
  gauge.group.position.set(0, -2.7, 0);
  gauge.group.userData.billboard = true;
  G.add(gauge.group);

  const streaks = warp(800, 16, "#ffffff");
  w.cam.add(streaks.lines);
  const lyrics = createLyrics(w, S - 1.5, TUNNEL, "sub");
  const meter = createPdoomMeter(w);
  // end card, in the HUD above the fade so it sits on black
  const endCard = new THREE.Group();
  endCard.name = "made-with-genmotion";
  const endGlow = w.glow("#16F5BD", 520, "genmotion-logo-glow");
  endGlow.position.set(0, 80, -40);
  const mark = createGenMotionMark("genmotion-logo");
  mark.mesh.scale.setScalar(0.44);
  mark.mesh.position.set(0, 80, 0);
  const madeWith = label("Made with GenMotion", { size: 48, weight: 400, color: "#ededef", tracking: -0.01 });
  madeWith.name = "made-with-genmotion-text";
  endCard.add(endGlow, mark.mesh, madeWith);
  put(w.hud, endCard, 980);
  endCard.visible = false;
  w.seal();

  const camPos = V();
  const look = V();
  const p = V();
  const sc = V();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const spin = new THREE.Quaternion();
  const e = new THREE.Euler();
  const col = new THREE.Color();

  return ({ frame }) => {
    const t = w.T(frame);
    const bp = beatPulse(t, 6);
    const ep = eighthPulse(t, 8);
    const bpos = beatPos(t);
    D.visible = t < TUNNEL;
    T.visible = t >= TUNNEL && t < GATHER;
    G.visible = t >= GATHER;
    let fov = 45;
    let roll = 0;
    let shake = 0;
    let flash = 0;
    let fade = 0;
    let warpAmt = 0;
    let inv = false;

    /* -------- D -------- */
    if (D.visible) {
      const open = interpolate(t, [S, 139.6], [0.35, 1], Easing.easeInOut);
      // "show": the eye spins round — cardboard — and topples over
      const spinU = interpolate(t, [SHOW, SHOW + 0.45, SHOW + 0.6], [0, Math.PI * 1.08, Math.PI], Easing.easeOut);
      const flicker = t > SHOW + 0.3 ? (hash(Math.floor(t * 14)) > 0.35 ? 1 : 0.25) : 1;
      theatre.update(t, { open, beam: flicker, turn: Math.sin(t * 0.8) * 0.12 * (t < SHOW ? 1 : 0) + spinU, pulse: bp });
      const topple = interpolate(t, [140.95, 141.35], [0, 1], Easing.easeIn);
      theatre.cutout.rotation.x = -topple * Math.PI * 0.5;
      // then the whole stage drops out from under us
      const drop = interpolate(t, [141.45, TUNNEL], [0, 1], Easing.easeIn);
      D.position.y = STAGE_AT.y - drop * 40;
      const push = interpolate(t, [S, SHOW], [0, 1], Easing.easeInOut);
      camPos.copy(STAGE_CAM).add(V(0, -0.5, -6).multiplyScalar(push)).add(V(0, 0, 0));
      camPos.add(STAGE_AT);
      look.copy(STAGE_LOOK).add(STAGE_AT).add(V(0, drop * 10, 0));
      fov = 45 - kick(t, [SHOW], 4) * 5 + drop * 25;
      roll = Math.sin(t * 0.6) * 0.02 + drop * 0.2;
      shake = kick(t, [141.35], 6) * 0.3 + kick(t, [SHOW], 6) * 0.15;
      flash = kick(t, [SHOW], 10) * 0.3 + interpolate(t, [TUNNEL - 0.2, TUNNEL], [0, 1], Easing.easeIn);
      warpAmt = drop;
    }

    /* -------- T -------- */
    if (T.visible) {
      const k = t - TUNNEL;
      const travel = 60 * k + 14 * k * k;
      tunnel.forEach((m, i) => {
        const z = -((i * 9 + 360 - (travel % 360)) % 360);
        m.position.set(Math.sin(z * 0.03 + t) * 2, Math.cos(z * 0.025 + t * 0.8) * 2, z);
        m.rotation.set(0, 0, i * 0.3 + t * (i % 2 ? 1 : -1));
        const near = THREE.MathUtils.clamp(1 + z / 360, 0, 1);
        m.scale.setScalar(1 + bp * 0.12 + (Math.floor(bpos) % 4 === i % 4 ? 0.1 : 0));
        m.material.color.setHSL((i * 0.05 + t * 0.25) % 1, 1, 0.6);
        m.material.opacity = near * (0.6 + ep * 0.4);
      });
      tunnelEnd.scale.setScalar(20 + interpolate(t, [144.6, GATHER], [0, 200], Easing.easeIn));
      tunnelEnd.material.opacity = 0.6 + bp * 0.4;
      camPos.set(Math.sin(t * 1.3) * 0.8, Math.cos(t * 1.1) * 0.8, 0).add(T.position);
      look.set(Math.sin(t * 0.9) * 2, Math.cos(t * 0.7) * 2, -40).add(T.position);
      fov = 70 + k * 6;
      roll = k * 0.6 + Math.sin(bpos * Math.PI * 0.5) * 0.2;
      shake = bp * 0.12 + ep * 0.05;
      warpAmt = 1;
      flash = interpolate(t, [TUNNEL, TUNNEL + 0.25], [1, 0]) + kick(t, [barTime(79)], 8) * 0.4 + interpolate(t, [GATHER - 0.2, GATHER], [0, 1], Easing.easeIn);
      inv = impactFrame(t, [barTime(79)], 2);
    }

    /* -------- G -------- */
    if (G.visible) {
      skyG.update(t, 1, bp * 0.4);
      const blown = t >= NOVA;
      const ex = blown ? 1 + 40 * Easing.easeOut(Math.min(1, (t - NOVA) / 2.5)) : 1 - kick(t, [NOVA - 0.45], 3) * 0; // no-op before
      // the implosion beat right before the nova: everything sucks inward
      const suck = interpolate(t, [NOVA - 0.45, NOVA], [0, 1], Easing.easeIn);
      const R = blown ? ex : 1 - suck * 0.7;
      // eye
      eye.group.visible = !blown;
      eye.group.scale.setScalar(3.2 * (1 - suck * 0.5) * (1 + bp * 0.05));
      eyeGlow.material.opacity = blown ? 0 : 0.4 + bp * 0.3 + suck;
      // clips
      for (let i = 0; i < CLIPS; i++) {
        const o = clipOrbit[i];
        const a = o.a + t * (3 / Math.pow(o.r, 0.9)) * (1 + suck * 3);
        p.set(Math.cos(a) * o.r * R, o.y * R + Math.sin(a * 2 + i) * 0.3, Math.sin(a) * o.r * R);
        spin.setFromAxisAngle(o.ax, t * o.sp + (blown ? (t - NOVA) * 8 : 0));
        e.set(0.3, a, 0);
        q.setFromEuler(e).multiply(spin);
        sc.setScalar(o.s * (1 + ep * 0.1));
        m4.compose(p, q, sc);
        clips.setMatrixAt(i, m4);
      }
      clips.instanceMatrix.needsUpdate = true;
      clips.visible = !blown || t < NOVA + 2.5;
      clipMat.emissiveIntensity = 0.25 + bp * 0.4;
      hearts.forEach((m, i) => {
        const a = (i / 8) * Math.PI * 2 + t * 0.9;
        m.position.set(Math.cos(a) * 9 * R, Math.sin(a) * 9 * R, Math.sin(a * 2) * 1.5);
        m.rotation.set(0, t * 2 + i, 0);
        m.scale.setScalar(0.55 * (1 + bp * 0.25));
        m.visible = !blown || t < NOVA + 2.5;
      });
      for (let i = 0; i < SERP; i++) {
        const a = (i / SERP) * Math.PI * 2 + t * 1.4;
        const rr = 13 * R + Math.sin(a * 5 + t * 3) * 0.6;
        p.set(Math.cos(a) * rr, Math.sin(a * 3 + t) * 1.2, Math.sin(a) * rr);
        p.applyAxisAngle(V(1, 0, 0), 1.1);
        e.set(t * 2 + i, i * 0.4, 0);
        q.setFromEuler(e);
        sc.setScalar(1 + Math.sin(i * 0.5 - t * 6) * 0.3);
        m4.compose(p, q, sc);
        serpent.setMatrixAt(i, m4);
      }
      serpent.instanceMatrix.needsUpdate = true;
      serpent.visible = !blown || t < NOVA + 2.5;
      serpMat.emissiveIntensity = 0.4 + ep * 0.6;
      novaShards.set(t - NOVA, 70, 4, -2);
      novaBurst.fire(t, [NOVA]);
      novaRings.update(t, NOVA_RINGS, true);
      novaLight.intensity = kick(t, [NOVA], 1.5) * 4000;
      // title letters fly in from the debris and slam on the downbeat
      title.group.visible = t >= CONVERGE - 0.1;
      title.chars.forEach((c, i) => {
        const land = TITLE - 0.02 * (title.chars.length - i);
        const u = THREE.MathUtils.clamp((t - CONVERGE) / (land - CONVERGE), 0, 1);
        const k = Easing.easeIn(u);
        c.m.position.set(THREE.MathUtils.lerp(starts[i].x, c.x, k), THREE.MathUtils.lerp(starts[i].y, 0, k) + (t > TITLE ? Math.exp(-(((bpos - i * 0.08) % 1) + 1) % 1 * 6) * 20 : 0), THREE.MathUtils.lerp(starts[i].z, 0, k));
        c.m.rotation.set((1 - k) * (i + 1) * 3, (1 - k) * (i + 2) * 2, (1 - k) * i);
        c.m.scale.setScalar(u >= 1 ? slam(t, land, 1.4, 0.2) : 1);
        c.m.material.opacity = Math.min(1, u * 3) * (1 - interpolate(t, [OUT, OUT + 0.9], [0, 1]));
      });
      const dial = pop(t, TITLE + 0.35, 0.35);
      gauge.group.visible = dial > 0.001;
      gauge.group.scale.setScalar(dial);
      gauge.update(99.9, bp + (Math.floor(t * 4) % 2 ? 0.5 : 0), 1 - interpolate(t, [OUT, OUT + 0.9], [0, 1]));
      // camera: fast orbit round the gathering → knocked back by the nova → drift to the title
      const k = t - GATHER;
      const a = k * 1.3;
      const orbitPos = V(Math.sin(a) * 26, 6 + Math.sin(k * 2) * 2, Math.cos(a) * 26);
      const knock = blown ? Easing.easeOut(Math.min(1, (t - NOVA) / 1.2)) : 0;
      const after = interpolate(t, [NOVA + 0.6, TITLE], [0, 1], Easing.easeInOut);
      const titlePos = V(0, 0.4, 18 - interpolate(t, [TITLE, OUT], [0, 3], Easing.easeInOut));
      camPos.copy(orbitPos).multiplyScalar(1 + knock * 0.8).lerp(titlePos, after).add(G.position);
      look.set(0, 0, 0).add(G.position);
      fov = 55 - suck * 12 + kick(t, [NOVA], 2) * 30 - after * 10 - kick(t, [TITLE], 6) * 6;
      roll = (1 - after) * (Math.sin(bpos * Math.PI * 0.5) * 0.12 + knock * 0.3) + Math.sin(t * 0.5) * 0.02;
      shake = bp * 0.1 * (1 - after) + kick(t, [NOVA], 2) * 3 + kick(t, [TITLE], 5) * 0.3;
      warpAmt = kick(t, [NOVA], 1.5);
      flash = interpolate(t, [GATHER, GATHER + 0.25], [1, 0]) + kick(t, [NOVA], 4) + kick(t, [TITLE], 8) * 0.5;
      fade = interpolate(t, [CARD - 0.7, CARD], [0, 1], Easing.easeIn);
      inv = impactFrame(t, [NOVA, TITLE], 2);
      // the eye, while it lasts, watches you
      eye.set(t, { pupil: 0.3 + bp * 0.06 + suck * 0.5, close: 0.12, look: camPos, glow: 1 + bp * 0.5, bits: ep * 0.5 });
    }

    streaks.update(t, warpAmt, 140);
    w.shot(t, camPos, look, { fov, roll, shake });
    // made with GenMotion
    endCard.visible = t >= CARD;
    if (endCard.visible) {
      const k = t - CARD;
      const pop = interpolate(k, [0, 0.35, 0.5], [0, 1.08, 1], Easing.easeOut);
      const spin = interpolate(k, [0, 0.6], [-Math.PI * 1.25, 0], Easing.easeOut);
      mark.mesh.scale.setScalar(0.44 * pop * (1 + beatPulse(t, 6) * 0.02));
      mark.mesh.rotation.set(Math.sin(t * 0.9) * 0.08, spin + Math.sin(t * 1.2) * 0.22 * Math.min(1, k), 0);
      mark.mat.uniforms.uShine.value = interpolate(k, [0.55, 1.3], [-6, 6]);
      const out = interpolate(t, [END - 0.3, END - 0.03], [0, 1]);
      mark.mat.uniforms.uOpacity.value = Math.min(1, k * 6) * (1 - out);
      const txt = interpolate(k, [0.4, 0.7], [0, 1], Easing.easeOut);
      madeWith.material.opacity = txt * (1 - out);
      madeWith.position.set(0, -130 - (1 - txt) * 30, 0);
      endGlow.material.opacity = 0.22 * pop * (1 - out);
    }
    w.post({ flash, fade, invert: inv });
    meter.update(t, 1 - interpolate(t, [QUIET, QUIET + 0.5], [0, 1]));
    lyrics.update(t);
  };
}
