import * as THREE from "three";
import { Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { beatPos, beatPulse, eighthPulse, rng, SCENE_START } from "../components/music";
import { createWorld } from "../components/world";
import { createLyrics } from "../components/lyrics";
import { createPdoomMeter } from "../components/hud";
import { createDeity } from "../components/deity";
import { burst, impactFrame, kick, neonGrid, rings3, stars, V, warp, type Ring3 } from "../components/motion";

/** 0:13–0:22 · an army of servants bows to a colossal boss, which opens into a mouth and eats them. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const w = createWorld(ctx, SCENE_START.servant, { bg: "#0a0520", fog: [25, 150] });
  const { root, put } = w;
  const frac = (x: number) => x - Math.floor(x);
  const S = SCENE_START.servant / 30;
  const END = SCENE_START.chorus1 / 30;
  const GPT = 16.62;
  const EAT = 19.12;
  const CHOMP = 21.7;

  const sky = stars(1200, V(300, 160, 300), 5, 0.4);
  sky.points.position.set(0, 40, -60);
  put(root, sky.points, 0);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: "#100a2a", roughness: 0.25, metalness: 0.8 }));
  floor.rotation.x = -Math.PI / 2;
  floor.name = "throne-floor";
  floor.userData.pickable = false;
  put(root, floor, 0);
  const grid = neonGrid(400, 100, C.violet, 0.35, "throne-grid");
  grid.position.y = 0.01;
  put(root, grid, 1);

  /* ---------- the servants: an instanced army that bows in waves ---------- */
  const COLS = 25;
  const ROWS = 14;
  const COUNT = COLS * ROWS;
  const cubeGeo = new THREE.BoxGeometry(0.8, 1.1, 0.8);
  cubeGeo.translate(0, 0.55, 0); // pivot at the feet, so they bow
  const cubeMat = new THREE.MeshStandardMaterial({ color: "#efeaff", roughness: 0.35, metalness: 0.1, emissive: C.violet, emissiveIntensity: 0.15 });
  const army = new THREE.InstancedMesh(cubeGeo, cubeMat, COUNT);
  army.name = "servant-army";
  army.frustumCulled = false;
  put(root, army, 2);
  const r = rng(13);
  const home: THREE.Vector3[] = [];
  const seed: number[] = [];
  for (let i = 0; i < COUNT; i++) {
    const cx = i % COLS;
    const rz = Math.floor(i / COLS);
    home.push(V((cx - (COLS - 1) / 2) * 1.8, 0, 6 - rz * 1.9));
    seed.push(r());
  }
  const armyColor = new THREE.Color();
  for (let i = 0; i < COUNT; i++) army.setColorAt(i, armyColor.set(seed[i] < 0.12 ? C.cyan : seed[i] < 0.2 ? C.pink : "#ffffff"));

  /* ---------- the boss ---------- */
  const BOSS = V(0, 15, -42);
  const boss = new THREE.Group();
  boss.name = "boss";
  boss.position.copy(BOSS);
  put(root, boss, 3);
  const deity = createDeity(w, "boss-seraph");
  boss.add(deity.group);
  const bossGlow = w.glow("#ffcf6d", 60, "boss-glow");
  bossGlow.position.z = -6;
  boss.add(bossGlow);
  const bossLight = new THREE.PointLight("#ffd28a", 400, 120, 1.6);
  bossLight.position.set(0, -4, 8);
  boss.add(bossLight);

  /* ---------- the mouth ---------- */
  const mouth = new THREE.Group();
  mouth.name = "chatgpt-mouth";
  boss.add(mouth);
  const gullet = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ color: "#000000" }));
  gullet.name = "mouth-void";
  mouth.add(gullet);
  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.035, 8, 160),
    new THREE.MeshBasicMaterial({ color: C.pink, transparent: true, blending: THREE.AdditiveBlending }),
  );
  lip.name = "mouth-lip";
  mouth.add(lip);
  const TEETH = 34;
  const toothGeo = new THREE.ConeGeometry(0.8, 3.4, 5);
  toothGeo.rotateZ(-Math.PI / 2); // tip → +x, then rotated to point inward
  const toothMat = new THREE.MeshStandardMaterial({ color: "#fff6fb", roughness: 0.25, metalness: 0.1, emissive: "#ffd6f0", emissiveIntensity: 0.2, flatShading: true });
  const teeth: { m: THREE.Mesh; a: number; row: number }[] = [];
  for (let i = 0; i < TEETH; i++) {
    const m = new THREE.Mesh(toothGeo, toothMat);
    m.name = `tooth-${i}`;
    mouth.add(m);
    teeth.push({ m, a: (i / TEETH) * Math.PI * 2, row: i % 2 });
  }
  const mouthRings = rings3(4, C.pink, 0.03, "mouth-shockwave");
  put(root, mouthRings.group, 5);
  const RINGS: Ring3[] = [
    { t: GPT, pos: BOSS, scale: 40, dur: 0.9 },
    { t: CHOMP, pos: BOSS, scale: 50, dur: 0.8 },
    { t: 13.88, pos: V(0, 0.2, -10), scale: 40, flat: true, dur: 0.9 },
    { t: 15.74, pos: V(0, 0.2, -10), scale: 40, flat: true, dur: 0.9 },
  ];
  const chompBurst = burst(300, 31, ["#ffffff", C.pink, C.yellow], 0.6, 40, 1.2, "chomp-burst");
  chompBurst.points.position.copy(BOSS);
  put(root, chompBurst.points, 6);

  const streaks = warp(500, 8, "#ffd6f0");
  w.cam.add(streaks.lines);

  const lyrics = createLyrics(w, S, END, "sub");
  const meter = createPdoomMeter(w);
  w.seal();

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = V();
  const sc = V(1, 1, 1);
  const camPos = V();
  const look = V();
  const a1 = V();
  const a2 = V();

  return ({ frame }) => {
    const t = w.T(frame);
    const bp = beatPulse(t, 6);
    const bpos = beatPos(t);
    const ep = eighthPulse(t, 8);
    sky.update(t, 1, bp * 0.3);

    // mouth: forms on "ChatGPT", yawns wider on "please don't eat me", snaps shut on "alive"
    const form = interpolate(t, [GPT - 0.1, GPT + 0.35], [0, 1], Easing.easeOut);
    const yawn = interpolate(t, [EAT, CHOMP - 0.1], [0, 1], Easing.easeInOut);
    const chomp = interpolate(t, [CHOMP - 0.06, CHOMP + 0.04], [0, 1], Easing.easeIn);
    const R = (7 + yawn * 4 + bp * 0.4) * (1 - chomp * 0.9);
    mouth.visible = form > 0.001;
    mouth.scale.setScalar(form);
    gullet.scale.setScalar(R * 1.05);
    lip.scale.setScalar(R * 1.08);
    lip.material.opacity = 0.6 + bp * 0.4;
    mouth.rotation.z = t * 0.4 + yawn * 2;
    teeth.forEach((o, i) => {
      const rr = R + (o.row ? 1.7 : 0.9);
      const wig = Math.sin(t * 12 + i) * 0.08 * yawn;
      o.m.position.set(Math.cos(o.a) * rr, Math.sin(o.a) * rr, 0.3 + o.row * 0.6);
      o.m.rotation.set(0, (o.row ? -0.35 : -0.15) * (1 - chomp), o.a + Math.PI + wig);
      o.m.scale.setScalar(1 + (o.row ? 0.25 : 0) + yawn * 0.35);
    });
    bossGlow.material.opacity = 0.35 + bp * 0.35 + yawn * 0.3;
    bossLight.intensity = 300 + bp * 400 + yawn * 500;

    // the army: bow in a wave that travels from the boss outward; deep bows on "servant" and "boss"
    const deep = Math.max(kick(t, [13.88, 15.74], 2.2), 0);
    for (let i = 0; i < COUNT; i++) {
      const h = home[i];
      const dist = Math.hypot(h.x, h.z + 40) / 60;
      const wave = Math.exp(-frac(bpos - dist * 2) * 5);
      const bow = Math.min(1.25, wave * 0.35 + deep * 1.1 * Math.min(1, Math.max(0, (t - 13.88 - dist * 0.4) * 6)) + (t > 15.74 ? kick(t, [15.74], 2) * 0.3 : 0));
      // "please don't eat me": each servant is lifted and spiralled into the mouth
      const d0 = EAT + seed[i] * 2.2 + (1 - dist) * 0.3;
      const suck = Easing.easeIn(THREE.MathUtils.clamp((t - d0) / 1.1, 0, 1));
      const spin = suck * (6 + seed[i] * 4);
      const rad = (1 - suck) * 1;
      p.set(h.x * rad + Math.cos(spin + seed[i] * 6) * 6 * Math.sin(suck * Math.PI), h.y, h.z * rad + Math.sin(spin) * 3 * Math.sin(suck * Math.PI));
      p.lerp(BOSS, suck);
      p.y += Math.sin(t * 2 + seed[i] * 9) * 0.05 * (1 - suck) + Math.max(0, Math.sin(bpos * Math.PI)) * 0.25 * (t > 16.62 ? 1 : 0) * (1 - suck);
      e.set(-bow + suck * spin, suck * spin * 0.7, (seed[i] - 0.5) * 0.08);
      q.setFromEuler(e);
      const s = (1 - suck * 0.8) * (1 + (t < GPT ? bp * 0.06 : ep * 0.08));
      sc.set(s, s * (1 - deep * 0.08), s);
      m4.compose(p, q, sc);
      army.setMatrixAt(i, m4);
    }
    army.instanceMatrix.needsUpdate = true;
    cubeMat.emissiveIntensity = 0.1 + bp * 0.25;
    mouthRings.update(t, RINGS, true);
    chompBurst.fire(t, [CHOMP]);

    // camera: walk among the ranks → crane up over the army → pulled into the mouth
    const k = t - S;
    a1.set(Math.sin(k * 0.6) * 2.5, 2.6 + k * 0.25, 12 - k * 2.4);
    a2.set(0, 2.5, -30);
    const crane = interpolate(t, [15.0, 16.6], [0, 1], Easing.easeInOut);
    const orbitA = interpolate(t, [15.0, EAT], [-0.6, 0.35], Easing.easeInOut);
    const hi = V(Math.sin(orbitA) * 34, 12 + Math.sin(k) * 1.2, -20 + Math.cos(orbitA) * 34);
    const pull = interpolate(t, [EAT, CHOMP], [0, 1], Easing.easeIn);
    const front = V(Math.sin(t * 3) * pull * 0.8, BOSS.y - 1, BOSS.z + 26 - pull * 21);
    camPos.lerpVectors(a1, hi, crane).lerp(front, interpolate(t, [EAT - 0.6, EAT + 0.4], [0, 1], Easing.easeInOut));
    look.lerpVectors(a2.set(0, 8 + crane * 2, -40), BOSS, interpolate(t, [15.6, 16.8], [0, 1], Easing.easeInOut));
    const fov = 50 + pull * 28 - kick(t, [GPT], 6) * 6;
    const roll = Math.sin(bpos * Math.PI * 0.25) * 0.06 + pull * Math.sin(t * 5) * 0.08;
    const shake = kick(t, [GPT], 6) * 0.8 + pull * 0.5 + kick(t, [13.88, 15.74], 7) * 0.3 + kick(t, [CHOMP], 4) * 2;
    streaks.update(t, pull * 0.9, 60 + pull * 140);
    // the seraph's hundred eyes watch the camera (this frame's position)
    deity.update(t, { pulse: bp, look: camPos, maw: form, blink: t > 14.6 && t < 14.8 ? 0.8 : 0 });
    w.shot(t, camPos, look, { fov, roll, shake });

    w.post({
      flash: interpolate(t, [S, S + 0.2], [1, 0]) + kick(t, [GPT], 10) * 0.5 + kick(t, [13.88, 15.74], 12) * 0.25,
      fade: interpolate(t, [CHOMP + 0.02, CHOMP + 0.1], [0, 1]) * 0.98,
      invert: impactFrame(t, [GPT, CHOMP], 2),
    });
    meter.update(t, 1);
    lyrics.update(t);
  };
}
