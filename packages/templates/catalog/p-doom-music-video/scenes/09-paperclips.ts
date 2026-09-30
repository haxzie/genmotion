import * as THREE from "three";
import { Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { beatPos, beatPulse, eighthPulse, rng, SCENE_START } from "../components/music";
import { createWorld } from "../components/world";
import { createLyrics } from "../components/lyrics";
import { createPdoomMeter } from "../components/hud";
import { paperclipGeometry } from "../components/props";
import { burst, impactFrame, kick, neonGrid, pop, rings3, shards, stars, trail, V, word, type Ring3 } from "../components/motion";

/**
 * 1:35–1:49 · paperclips pour in and fill the room, the kill switch sits
 * unattended, the walls close in, a fuse burns to a bomb → orthogonality thesis.
 */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const w = createWorld(ctx, SCENE_START.paperclips, { bg: "#0a0620", fog: [25, 90] });
  const { root, put } = w;
  const S = SCENE_START.paperclips / 30;
  const END = SCENE_START.fuse / 30;
  const POUR = 97.0;
  const KILL = 98.9;
  const TRAP = 100.74;
  const FUSE = 102.56;
  const LIT = 103.46;
  const BLAST = 105.98;

  /* ================= A · the room ================= */
  const A = new THREE.Group();
  A.name = "clip-room";
  put(root, A, 1);
  const room = new THREE.Group();
  room.name = "room-shell";
  A.add(room);
  const roomGeo = new THREE.BoxGeometry(22, 11, 22);
  roomGeo.translate(0, 0.5, 0);
  const walls = new THREE.Mesh(roomGeo, new THREE.MeshStandardMaterial({ color: "#2a1d55", roughness: 0.85, side: THREE.BackSide }));
  walls.name = "room-walls";
  walls.userData.pickable = false;
  const roomEdges = new THREE.LineSegments(new THREE.EdgesGeometry(roomGeo), new THREE.LineBasicMaterial({ color: C.pink }));
  roomEdges.name = "room-edges";
  const floorGrid = neonGrid(22, 22, C.violet, 0.5, "room-grid");
  floorGrid.position.y = -4.99;
  room.add(walls, roomEdges, floorGrid);
  const lamp = new THREE.PointLight("#ffffff", 140, 50, 1.3);
  lamp.position.set(0, 4.5, 0);
  A.add(lamp);
  const warm = new THREE.PointLight(C.pink, 60, 40, 1.4);
  warm.position.set(-7, 0, 7);
  A.add(warm);

  // spouts in the ceiling
  const SPOUTS = [V(-4, 5.6, -3), V(4, 5.6, -1), V(0, 5.6, 4)];
  const spoutMat = new THREE.MeshStandardMaterial({ color: "#3a2d7a", metalness: 0.8, roughness: 0.3, emissive: C.cyan, emissiveIntensity: 0.4 });
  SPOUTS.forEach((sp, i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.5, 1.2, 20, 1, true), spoutMat);
    m.position.copy(sp);
    m.name = `clip-spout-${i}`;
    A.add(m);
  });

  // the flood: accelerating spawn (count ∝ t²), parabolic fall, rest on a rising pile
  const N = 1800;
  const D = 8.2;
  const clipMat = new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.55, roughness: 0.25, emissive: "#6a5cff", emissiveIntensity: 0.12 });
  const clips = new THREE.InstancedMesh(paperclipGeometry(), clipMat, N);
  clips.name = "paperclips";
  clips.frustumCulled = false;
  A.add(clips);
  const level = (t: number) => -4.9 + 7.4 * Math.pow(THREE.MathUtils.clamp((t - POUR - 0.8) / D, 0, 1), 2);
  const cr = rng(55);
  const clipData = Array.from({ length: N }, (_, i) => {
    const ti = POUR + D * Math.sqrt(i / N);
    const sp = SPOUTS[i % 3];
    const rest = V((cr() - 0.5) * 20, 0, (cr() - 0.5) * 20);
    rest.lerp(V(sp.x, 0, sp.z), Math.pow(cr(), 2) * 0.6);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(cr() * Math.PI, cr() * Math.PI, cr() * Math.PI));
    return { ti, sp, rest, restY: level(ti + 0.7) + cr() * 0.9, q, spin: (cr() - 0.5) * 20, s: 0.55 + cr() * 0.3 };
  });
  const cc = new THREE.Color();
  for (let i = 0; i < N; i++) clips.setColorAt(i, cc.set(i % 11 === 0 ? C.pink : i % 7 === 0 ? C.cyan : "#e8e4ff"));

  // the kill switch, unattended
  const kill = new THREE.Group();
  kill.name = "kill-switch";
  kill.position.set(-7, -5, -7);
  A.add(kill);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 2.6, 24), new THREE.MeshStandardMaterial({ color: "#2f2560", metalness: 0.6, roughness: 0.35 }));
  pedestal.position.y = 1.3;
  pedestal.name = "kill-switch-pedestal";
  const btnMat = new THREE.MeshStandardMaterial({ color: "#ff2d4a", emissive: "#ff2d4a", emissiveIntensity: 0.8, roughness: 0.3 });
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.35, 32), btnMat);
  button.position.y = 2.78;
  button.name = "kill-switch-button";
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#bfe9ff", transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false }));
  dome.position.y = 2.6;
  dome.name = "kill-switch-dome";
  const btnGlow = w.glow("#ff2d4a", 4, "kill-switch-glow");
  btnGlow.position.y = 3;
  const sign = word("Out of office", { size: 64, weight: 500, color: "#1a1030", bg: "#ffe14d", padX: 26, padY: 12, radius: 10 }, 1 / 110, "pto-sign");
  sign.position.set(1.9, 2.4, 0.6);
  sign.rotation.set(0, 0.5, 0.08);
  (sign.material as THREE.MeshBasicMaterial).depthTest = true;
  kill.add(pedestal, button, dome, btnGlow, sign);
  const chair = new THREE.Group();
  chair.name = "empty-chair";
  chair.position.set(-3.8, -5, -5.5);
  const chairMat = new THREE.MeshStandardMaterial({ color: "#1b1433", roughness: 0.5, metalness: 0.3 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 1.6), chairMat);
  seat.position.y = 1.5;
  seat.name = "chair-seat";
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 0.2), chairMat);
  back.position.set(0, 2.5, -0.75);
  back.name = "chair-back";
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 10), chairMat);
  pole.position.y = 0.75;
  pole.name = "chair-pole";
  chair.add(seat, back, pole);
  for (let i = 0; i < 5; i++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.14), chairMat);
    leg.position.set(Math.cos((i / 5) * Math.PI * 2) * 0.5, 0.08, Math.sin((i / 5) * Math.PI * 2) * 0.5);
    leg.rotation.y = -(i / 5) * Math.PI * 2;
    leg.name = `chair-leg-${i}`;
    chair.add(leg);
  }
  A.add(chair);

  // the fuse and the bomb, riding the top of the pile
  const top = new THREE.Group();
  top.name = "pile-top";
  A.add(top);
  const fusePts = [V(9, 0.4, 7), V(6, 0.7, 2), V(7, 0.4, -3), V(2, 0.6, -5), V(-3, 0.5, -2), V(-2, 0.8, 2), V(0, 0.9, 0.5)];
  const fuse = trail(fusePts, 0.08, "#d9c89a", "fuse", 300);
  top.add(fuse.mesh);
  const spark = w.glow("#ffd24d", 3.2, "fuse-spark");
  top.add(spark);
  const sparkBits = burst(120, 91, ["#ffffff", "#ffd24d", "#ff7a3d"], 0.25, 5, 0.5, "fuse-sparks");
  top.add(sparkBits.points);
  const bomb = new THREE.Group();
  bomb.name = "bomb";
  const bombBody = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 24), new THREE.MeshStandardMaterial({ color: "#151022", roughness: 0.3, metalness: 0.7 }));
  bombBody.name = "bomb-body";
  const bombCap = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 16), new THREE.MeshStandardMaterial({ color: "#6a5cff", metalness: 0.8 }));
  bombCap.position.y = 1.45;
  bombCap.name = "bomb-cap";
  bomb.add(bombBody, bombCap);
  bomb.position.set(0, 1.9, 0);
  top.add(bomb);
  const blastRings = rings3(4, "#ffd24d", 0.06, "blast-shockwave");
  A.add(blastRings.group);
  const blastShards = shards(300, 13, new THREE.TetrahedronGeometry(0.6), new THREE.MeshStandardMaterial({ color: "#ffd24d", emissive: "#ff7a3d", emissiveIntensity: 1.2, flatShading: true }), "blast-shards");
  A.add(blastShards.mesh);

  /* ================= B · orthogonality thesis ================= */
  const B = new THREE.Group();
  B.name = "orthogonality";
  B.position.set(0, 0, -2000);
  put(root, B, 1);
  const skyB = stars(900, V(200, 120, 200), 81, 0.5);
  B.add(skyB.points);
  const plane = neonGrid(30, 30, C.violet, 0.3, "thesis-grid");
  plane.rotation.x = Math.PI / 2;
  plane.position.set(9, 6, -0.05);
  B.add(plane);
  const axisMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const makeAxis = (name: string, len: number, rotZ: number) => {
    const g = new THREE.Group();
    g.name = name;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 12), axisMat);
    shaft.position.y = len / 2;
    shaft.name = `${name}-shaft`;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1, 16), axisMat);
    tip.position.y = len + 0.5;
    tip.name = `${name}-arrow`;
    g.add(shaft, tip);
    g.rotation.z = rotZ;
    B.add(g);
    return g;
  };
  const xAxis = makeAxis("axis-intelligence", 18, -Math.PI / 2);
  const yAxis = makeAxis("axis-goals", 13, 0);
  const xLab = word("intelligence", { size: 72, weight: 500, color: C.text }, 1 / 60, "label-intelligence");
  xLab.position.set(15, -1.5, 0);
  const yLab = word("goals", { size: 72, weight: 500, color: C.text }, 1 / 60, "label-goals");
  yLab.position.set(2.6, 13.6, 0);
  B.add(xLab, yLab);
  const rightAngle = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([V(1.2, 0, 0.01), V(1.2, 1.2, 0.01), V(0, 1.2, 0.01)]),
    new THREE.LineBasicMaterial({ color: C.cyan }),
  );
  rightAngle.name = "right-angle";
  B.add(rightAngle);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), new THREE.MeshBasicMaterial({ color: C.pink }));
  dot.name = "an-agent";
  const dotGlow = w.glow(C.pink, 5, "an-agent-glow");
  const projMat = new THREE.LineDashedMaterial({ color: "#ffffff", dashSize: 0.3, gapSize: 0.25, transparent: true, opacity: 0.6 });
  const projGeo = new THREE.BufferGeometry().setFromPoints([V(), V(), V()]);
  const proj = new THREE.Line(projGeo, projMat);
  proj.name = "agent-projection";
  B.add(dot, dotGlow, proj);
  const bigClip = new THREE.Mesh(paperclipGeometry(0.07, 90), new THREE.MeshStandardMaterial({ color: "#e8e4ff", metalness: 0.6, roughness: 0.2, emissive: C.cyan, emissiveIntensity: 0.3 }));
  bigClip.name = "the-paperclip-goal";
  bigClip.position.set(16.5, 2.2, 0.5);
  bigClip.scale.setScalar(1.8);
  B.add(bigClip);
  const bLight = new THREE.PointLight("#ffffff", 200, 80, 1.2);
  bLight.position.set(8, 10, 14);
  B.add(bLight);

  const SPARK_T = Array.from({ length: 16 }, (_, j) => LIT + j * 0.16);
  const lyrics = createLyrics(w, S, END, "sub");
  const meter = createPdoomMeter(w);
  w.seal();

  const camPos = V();
  const look = V();
  const p = V();
  const m4 = new THREE.Matrix4();
  const sc = V();
  const q = new THREE.Quaternion();
  const spin = new THREE.Quaternion();
  const axisY = V(0, 1, 0);
  const pp = projGeo.attributes.position as THREE.BufferAttribute;

  return ({ frame }) => {
    const t = w.T(frame);
    const bp = beatPulse(t, 6);
    const ep = eighthPulse(t, 8);
    const bpos = beatPos(t);
    A.visible = t < BLAST;
    B.visible = t >= BLAST;
    let fov = 55;
    let roll = 0;
    let shake = 0;
    let flash = 0;
    let inv = false;

    if (A.visible) {
      const L = level(t);
      const squeeze = 1 - 0.32 * interpolate(t, [TRAP, FUSE], [0, 1], Easing.easeInOut);
      room.scale.set(squeeze, 1, squeeze);
      (roomEdges.material as THREE.LineBasicMaterial).color.set(t > TRAP && Math.floor(t * 6) % 2 ? "#ff2d4a" : C.pink);
      spoutMat.emissiveIntensity = t > POUR ? 0.5 + ep * 0.8 : 0.2;
      for (let i = 0; i < N; i++) {
        const c = clipData[i];
        const u = (t - c.ti) / 0.7;
        if (u < 0) {
          sc.setScalar(0);
          m4.compose(c.sp, q.identity(), sc);
        } else {
          const k = Math.min(1, u);
          p.set(THREE.MathUtils.lerp(c.sp.x, c.rest.x * squeeze, k), THREE.MathUtils.lerp(c.sp.y - 0.6, c.restY, k * k), THREE.MathUtils.lerp(c.sp.z, c.rest.z * squeeze, k));
          spin.setFromAxisAngle(axisY, (1 - k) * c.spin);
          q.copy(c.q).multiply(spin);
          sc.setScalar(c.s);
          m4.compose(p, q, sc);
        }
        clips.setMatrixAt(i, m4);
      }
      clips.instanceMatrix.needsUpdate = true;
      // kill switch: blinking, ignored, buried
      btnMat.emissiveIntensity = Math.floor(t * 4) % 2 ? 1.4 : 0.3;
      btnGlow.material.opacity = Math.floor(t * 4) % 2 ? 0.9 : 0.2;
      sign.scale.setScalar((1 / 110) * pop(t, 99.82, 0.3));
      sign.visible = t > 99.8;
      chair.rotation.y = t * 1.1;
      // fuse + bomb on the pile
      top.position.y = L;
      top.visible = t > FUSE - 0.1;
      bomb.scale.setScalar(pop(t, FUSE, 0.35) * (1 + ep * 0.06 * (t > 104.5 ? 1 : 0)));
      const burn = interpolate(t, [LIT, BLAST - 0.1], [0, 1], Easing.easeIn);
      fuse.setProgress(1);
      fuse.mat.color.set("#d9c89a");
      const sp = fuse.head(burn);
      spark.position.copy(sp);
      spark.visible = t > LIT && t < BLAST;
      spark.scale.setScalar(3 + ep * 2);
      sparkBits.points.position.copy(sp);
      sparkBits.fire(t, SPARK_T);
      fuse.mesh.visible = t < BLAST;
      // hide the burnt part by shrinking the drawn range from the start
      const burnt = Math.floor(burn * 300);
      fuse.mesh.geometry.setDrawRange(burnt * 48, (300 - burnt) * 48);
      blastRings.update(t, [{ t: BLAST - 0.05, pos: V(0, L + 1.9, 0), scale: 30, dur: 0.5 }] as Ring3[], true);
      blastShards.mesh.position.set(0, L + 1.9, 0);
      blastShards.set(t - (BLAST - 0.05), 40, 0.8, -10);

      // camera
      const k = t - S;
      const base = V(Math.sin(k * 0.3) * 3, -1.5, 8.5);
      const baseLook = V(0, 2 + interpolate(t, [POUR - 0.3, POUR + 0.4], [0, 2], Easing.easeInOut), -2);
      const toKill = interpolate(t, [KILL - 0.2, KILL + 0.5], [0, 1], Easing.easeInOut) * (1 - interpolate(t, [TRAP - 0.3, TRAP + 0.3], [0, 1], Easing.easeInOut));
      const killPos = V(-2.5, Math.max(-1.8, L + 1.2), -1);
      const killLook = V(-7, Math.max(-2.5, L - 0.5), -7);
      const trapped = interpolate(t, [TRAP - 0.3, TRAP + 0.5], [0, 1], Easing.easeInOut) * (1 - interpolate(t, [FUSE - 0.2, FUSE + 0.4], [0, 1], Easing.easeInOut));
      const trapPos = V(Math.sin(t * 1.3) * 2, L + 1.6, Math.cos(t * 1.3) * 2);
      const trapLook = V(Math.sin(t * 1.3 + 2.4) * 8, L + 1, Math.cos(t * 1.3 + 2.4) * 8);
      const chase = interpolate(t, [FUSE - 0.2, FUSE + 0.4], [0, 1], Easing.easeInOut);
      const chasePos = V(sp.x + 3, L + sp.y + 2.4, sp.z + 4).lerp(V(5, L + 4, 7), t < LIT ? 1 : 0);
      const chaseLook = V(sp.x * 0.6, L + 1, sp.z * 0.6);
      camPos.copy(base).lerp(killPos, toKill).lerp(trapPos, trapped).lerp(chasePos, chase);
      look.copy(baseLook).lerp(killLook, toKill).lerp(trapLook, trapped).lerp(chaseLook, chase);
      camPos.y = Math.max(camPos.y, L + 1.2);
      fov = 58 + trapped * 12 + kick(t, [BLAST - 0.05], 3) * 20 - kick(t, [96.36, 97.08], 7) * 6;
      roll = Math.sin(bpos * Math.PI * 0.25) * 0.06 + trapped * Math.sin(t * 2) * 0.12;
      shake = kick(t, [96.36, 97.08], 8) * 0.25 + trapped * 0.1 + (t > 104.5 ? ep * 0.12 : 0) + kick(t, [BLAST - 0.05], 3) * 1.5;
      flash = interpolate(t, [S, S + 0.25], [1, 0]) + kick(t, [96.36], 10) * 0.35 + interpolate(t, [BLAST - 0.12, BLAST], [0, 1], Easing.easeIn);
    }

    if (B.visible) {
      skyB.update(t, 1, bp * 0.3);
      const grow = interpolate(t, [BLAST, BLAST + 0.5], [0, 1], Easing.easeOut);
      const grow2 = interpolate(t, [106.18, 106.7], [0, 1], Easing.easeOut);
      xAxis.scale.set(1, grow, 1);
      yAxis.scale.set(1, grow2, 1);
      xLab.scale.setScalar((1 / 60) * pop(t, 106.2, 0.3));
      yLab.scale.setScalar((1 / 60) * pop(t, 107.06, 0.3));
      xLab.visible = t > 106.2;
      yLab.visible = t > 107.06;
      rightAngle.visible = t > 107.1;
      // the agent wanders: any intelligence, any goal — then settles on paperclips
      const wander = interpolate(t, [107.1, 108.6], [0, 1], Easing.easeInOut);
      const dx = 4 + Math.sin(t * 1.9) * 3 + wander * 9.5;
      const dy = 6 + Math.cos(t * 1.4) * 4 * (1 - wander) + wander * -3.8;
      dot.position.set(dx, dy, 0.2);
      dot.scale.setScalar(pop(t, 106.8, 0.3) * (1 + bp * 0.2));
      dotGlow.position.copy(dot.position);
      dotGlow.material.opacity = dot.scale.x > 0.01 ? 0.7 + bp * 0.3 : 0;
      pp.setXYZ(0, dx, 0, 0.1);
      pp.setXYZ(1, dx, dy, 0.1);
      pp.setXYZ(2, 0, dy, 0.1);
      pp.needsUpdate = true;
      proj.computeLineDistances();
      proj.visible = t > 106.9;
      bigClip.visible = t > 107.9;
      bigClip.scale.setScalar(1.8 * pop(t, 107.9, 0.35) * (1 + bp * 0.05));
      bigClip.rotation.set(0.3, t * 0.8, 0.2);
      const k = t - BLAST;
      const a = -0.5 + k * 0.18;
      camPos.set(8.5 + Math.sin(a) * 28, 8 + Math.sin(k * 0.5) * 2, Math.cos(a) * 28).add(B.position);
      look.set(8.5, 7.8, 0).add(B.position);
      fov = 50 + kick(t, [BLAST], 3) * 10;
      roll = Math.sin(t * 0.5) * 0.03;
      shake = kick(t, [BLAST], 3) * 0.6 + kick(t, [106.18, 107.06], 8) * 0.2;
      flash = interpolate(t, [BLAST, BLAST + 0.5], [1, 0]) + interpolate(t, [END - 0.15, END], [0, 1]);
      inv = impactFrame(t, [106.18], 2);
    }

    w.shot(t, camPos, look, { fov, roll, shake });
    w.post({ flash, invert: inv });
    meter.update(t, 1);
    lyrics.update(t);
  };
}
