import * as THREE from "three";
import { Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { beatPos, beatPulse, eighthPulse, rng, SCENE_START, SPB } from "../components/music";
import { createWorld } from "../components/world";
import { createLyrics } from "../components/lyrics";
import { createPdoomMeter } from "../components/hud";
import { createEye } from "../components/eye";
import { burst, impactFrame, kick, pop, rings3, shards, stars, V, warp, word, type Ring3 } from "../components/motion";

/**
 * 1:13–1:29 · a neural net fires forward and back → the von Neumann machine
 * shatters on "obsolete" → a neon corridor takes a sharp left turn → there you are.
 */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const w = createWorld(ctx, SCENE_START.flops, { bg: "#06031a", fog: [30, 200] });
  const { root, put } = w;
  const S = SCENE_START.flops / 30;
  const END = SCENE_START.gato / 30;
  const FWD = 74.12;
  const BWD = 76.2;
  const REP = 76.88;
  const VN = 77.75;
  const OBS = 80.12;
  const TURN = 81.3;
  const LEFT = 81.86;
  const THERE = 83.04;
  const ARE = 83.96;

  /* ================= A · the network ================= */
  const A = new THREE.Group();
  A.name = "neural-net";
  put(root, A, 1);
  const skyA = stars(1200, V(300, 200, 300), 61, 0.5);
  A.add(skyA.points);
  const L = 6;
  const NPL = 9;
  const nodes: THREE.Vector3[][] = [];
  for (let l = 0; l < L; l++) {
    nodes.push([]);
    for (let n = 0; n < NPL; n++) {
      const a = (n / NPL) * Math.PI * 2;
      const rad = l === 0 || l === L - 1 ? 3 : 4.5;
      nodes[l].push(V((l - (L - 1) / 2) * 7, Math.sin(a) * rad, Math.cos(a) * rad));
    }
  }
  const nodeMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: C.cyan, emissiveIntensity: 0.3, roughness: 0.3 });
  const nodeMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 24, 16), nodeMat, L * NPL);
  nodeMesh.name = "neurons";
  A.add(nodeMesh);
  const m4 = new THREE.Matrix4();
  const edgePos: number[] = [];
  const edges: [THREE.Vector3, THREE.Vector3, number][] = [];
  for (let l = 0; l < L - 1; l++)
    for (const a of nodes[l])
      for (const b of nodes[l + 1]) {
        edgePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
        edges.push([a, b, l]);
      }
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePos, 3));
  const edgeMat = new THREE.LineBasicMaterial({ color: C.violet, transparent: true, opacity: 0.35 });
  const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
  edgeLines.name = "synapses";
  A.add(edgeLines);
  const PULSES = 160;
  const pr = rng(19);
  const pulseEdge = Array.from({ length: PULSES }, () => Math.floor(pr() * edges.length));
  const pulseMat = new THREE.MeshBasicMaterial({ color: C.cyan });
  const pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 10, 8), pulseMat, PULSES);
  pulses.name = "signals";
  pulses.frustumCulled = false;
  A.add(pulses);
  const netGlow = w.glow(C.cyan, 40, "net-glow");
  A.add(netGlow);
  const nodeCol = new THREE.Color();
  const hitCol = new THREE.Color();
  const eyeLook = V();

  /* ================= B · the von Neumann machine ================= */
  const B = new THREE.Group();
  B.name = "von-neumann-machine";
  B.position.set(0, 0, -1500);
  put(root, B, 1);
  const skyB = stars(700, V(200, 120, 200), 62, 0.4);
  B.add(skyB.points);
  const boxMat = new THREE.MeshStandardMaterial({ color: "#2a2250", roughness: 0.4, metalness: 0.6, emissive: "#1a0f44", emissiveIntensity: 0.5 });
  const edgeMatB = new THREE.LineBasicMaterial({ color: C.cyan });
  const makeUnit = (name: string, text: string, x: number) => {
    const g = new THREE.Group();
    g.name = name;
    const geo = new THREE.BoxGeometry(6, 4, 4);
    const box = new THREE.Mesh(geo, boxMat);
    box.name = `${name}-box`;
    const ed = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMatB);
    ed.name = `${name}-edges`;
    const lab = word(text, { size: 96, weight: 500, color: C.text }, 1 / 60, `${name}-label`);
    lab.position.z = 2.05;
    (lab.material as THREE.MeshBasicMaterial).depthTest = true;
    g.add(box, ed, lab);
    g.position.x = x;
    B.add(g);
    return g;
  };
  const cpu = makeUnit("cpu", "CPU", -6.5);
  const mem = makeUnit("memory", "Memory", 6.5);
  const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 12), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
  bus.rotation.z = Math.PI / 2;
  bus.name = "the-bottleneck";
  B.add(bus);
  const packet = w.glow(C.yellow, 1.6, "bus-packet");
  B.add(packet);
  const shardMat = new THREE.MeshStandardMaterial({ color: "#3a2d7a", emissive: C.cyan, emissiveIntensity: 0.6, flatShading: true });
  const shatterA = shards(160, 3, new THREE.BoxGeometry(0.9, 0.9, 0.9), shardMat, "cpu-shards");
  const shatterB = shards(160, 4, new THREE.BoxGeometry(0.9, 0.9, 0.9), shardMat, "memory-shards");
  shatterA.mesh.position.x = -6.5;
  shatterB.mesh.position.x = 6.5;
  B.add(shatterA.mesh, shatterB.mesh);
  const obsBurst = burst(300, 8, ["#ffffff", C.cyan, C.pink], 0.4, 30, 1.2, "obsolete-burst");
  B.add(obsBurst.points);

  /* ================= C · the sharp left turn ================= */
  const Cg = new THREE.Group();
  Cg.name = "corridor";
  Cg.position.set(0, 0, -3000);
  put(root, Cg, 1);
  const frameGeo = new THREE.RingGeometry(4.4, 5, 4, 1);
  frameGeo.rotateZ(Math.PI / 4);
  const fCyan = new THREE.MeshBasicMaterial({ color: C.cyan, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const fPink = new THREE.MeshBasicMaterial({ color: C.pink, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const CORNER = V(0, 0, -126);
  const frames: THREE.Mesh[] = [];
  for (let i = 0; i < 22; i++) {
    const f = new THREE.Mesh(frameGeo, i % 2 ? fPink : fCyan);
    f.name = `corridor-frame-${i}`;
    f.position.set(0, 0, -i * 6);
    Cg.add(f);
    frames.push(f);
  }
  for (let i = 1; i < 10; i++) {
    const f = new THREE.Mesh(frameGeo, i % 2 ? fPink : fCyan);
    f.name = `corridor-frame-left-${i}`;
    f.position.set(-i * 6, 0, CORNER.z);
    f.rotation.y = Math.PI / 2;
    Cg.add(f);
    frames.push(f);
  }
  const floorC = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: "#0b0620", roughness: 0.2, metalness: 0.8 }));
  floorC.rotation.x = -Math.PI / 2;
  floorC.position.set(-60, -3.6, -100);
  floorC.name = "corridor-floor";
  floorC.userData.pickable = false;
  Cg.add(floorC);
  // the chamber: the eye from the very first scene, huge
  const EYE_P = V(-120, 12, CORNER.z);
  const bigEye = createEye("there-you-are-eye");
  bigEye.group.scale.setScalar(16);
  bigEye.group.position.copy(EYE_P);
  bigEye.group.rotation.y = Math.PI / 2;
  Cg.add(bigEye.group);
  const eyeGlow = w.glow(C.cyan, 120, "chamber-glow");
  eyeGlow.position.copy(EYE_P).add(V(-10, 0, 0));
  Cg.add(eyeGlow);
  const halos = [0, 1, 2].map((i) => {
    const h = new THREE.Mesh(new THREE.TorusGeometry(24 + i * 6, 0.18, 8, 200), new THREE.MeshBasicMaterial({ color: i === 1 ? C.pink : C.cyan, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    h.name = `chamber-halo-${i}`;
    h.position.copy(EYE_P);
    Cg.add(h);
    return h;
  });
  const skyC = stars(1500, V(200, 150, 300), 63, 0.7);
  skyC.points.position.set(-120, 0, -126);
  Cg.add(skyC.points);
  const areRings = rings3(3, "#ffffff", 0.05, "there-you-are-shockwave");
  Cg.add(areRings.group);
  const RINGS_C: Ring3[] = [
    { t: ARE, pos: EYE_P.clone().add(V(17, 0, 0)), scale: 50, dur: 1.0 },
    { t: ARE + 0.12, pos: EYE_P.clone().add(V(17, 0, 0)), scale: 34, dur: 0.9 },
  ];
  const eyeLight = new THREE.PointLight("#ffffff", 800, 120, 1.5);
  eyeLight.position.copy(EYE_P).add(V(40, 10, 10));
  Cg.add(eyeLight);

  const streaks = warp(600, 12, "#ffffff");
  w.cam.add(streaks.lines);
  const lyrics = createLyrics(w, S, END, "sub");
  const meter = createPdoomMeter(w);
  w.seal();

  const camPos = V();
  const look = V();
  const p = V();
  const sc = V();
  const q = new THREE.Quaternion();
  const dirA = V(0, 0, -1);
  const dirB = V(-1, 0, 0);
  const dir = V();

  return ({ frame }) => {
    const t = w.T(frame);
    const bp = beatPulse(t, 6);
    const ep = eighthPulse(t, 8);
    const bpos = beatPos(t);
    A.visible = t < VN;
    B.visible = t >= VN && t < TURN;
    Cg.visible = t >= TURN;
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
      // the wavefront: a layer per beat forward, faster backward, then a strobe of both
      let front = -10;
      let back = false;
      if (t >= FWD && t < BWD) front = ((t - FWD) / SPB) % (L + 1);
      else if (t >= BWD && t < REP) {
        front = L - 1 - ((t - BWD) / SPB) * 3.2;
        back = true;
      } else if (t >= REP) {
        const k = (t - REP) / (SPB / 2);
        const cyc = Math.floor(k);
        back = cyc % 2 === 1;
        const f = (k - cyc) * (L - 1);
        front = back ? L - 1 - f : f;
      } else front = ((t - S) / SPB) * 0.5 - 1;
      for (let l = 0; l < L; l++)
        for (let n = 0; n < NPL; n++) {
          const i = l * NPL + n;
          const hit = Math.exp(-Math.abs(front - l) * 2.5);
          sc.setScalar(1 + hit * 0.9 + bp * 0.1);
          m4.compose(nodes[l][n], q.identity(), sc);
          nodeMesh.setMatrixAt(i, m4);
          nodeMesh.setColorAt(i, nodeCol.set("#ffffff").lerp(hitCol.set(back ? C.pink : C.cyan), hit));
        }
      nodeMesh.instanceMatrix.needsUpdate = true;
      if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;
      for (let i = 0; i < PULSES; i++) {
        const [a, b, l] = edges[pulseEdge[i]];
        const f = back ? l + 1 - front : front - l;
        const on = f > 0 && f < 1;
        if (back) p.lerpVectors(b, a, f);
        else p.lerpVectors(a, b, f);
        sc.setScalar(on ? 1 : 0);
        m4.compose(p, q.identity(), sc);
        pulses.setMatrixAt(i, m4);
      }
      pulses.instanceMatrix.needsUpdate = true;
      pulseMat.color.set(back ? C.pink : C.cyan);
      edgeMat.color.set(back ? C.pink : C.violet);
      edgeMat.opacity = 0.25 + bp * 0.25;
      netGlow.material.color.set(back ? C.pink : C.cyan);
      netGlow.material.opacity = 0.2 + bp * 0.25;
      // orbit the net; spin the other way on "backward"
      const dirSign = t >= BWD && t < REP ? -1 : 1;
      const a = -0.8 + (t - S) * 0.35 * dirSign + (t >= BWD ? (BWD - S) * 0.7 : 0) * (t < REP ? 1 : 1);
      const d = 26 - bp * 0.8 - (t > REP ? 4 : 0);
      camPos.set(Math.sin(a) * d, 5 + Math.sin(t * 0.7) * 2, Math.cos(a) * d);
      look.set(0, 0, 0);
      fov = 50 - kick(t, [FWD, BWD, REP], 7) * 8;
      roll = Math.sin(bpos * Math.PI * 0.25) * 0.08 + (t > REP ? Math.sin(t * 14) * 0.03 : 0);
      shake = kick(t, [FWD, BWD, REP], 8) * 0.4 + (t > REP ? ep * 0.2 : 0);
      flash = interpolate(t, [S, S + 0.25], [1, 0]) + kick(t, [FWD, BWD, REP], 12) * 0.3 + interpolate(t, [VN - 0.12, VN], [0, 1]);
    }

    /* -------- B -------- */
    if (B.visible) {
      skyB.update(t, 1, 0);
      const k = t - VN;
      const gone = t >= OBS;
      cpu.visible = mem.visible = bus.visible = !gone;
      cpu.scale.setScalar(pop(t, 78.24, 0.3));
      mem.scale.setScalar(pop(t, 78.92, 0.3));
      bus.scale.set(1, interpolate(t, [78.9, 79.2], [0, 1]), 1);
      // one lonely packet crawls across the bus: the bottleneck
      const crawl = ((t - 79.0) * 0.8) % 2;
      packet.visible = !gone && t > 79.0;
      packet.position.set(-3.5 + (crawl < 1 ? crawl : 2 - crawl) * 7, 0, 0);
      boxMat.emissiveIntensity = 0.4 + bp * 0.4;
      edgeMatB.color.set(t > 79.8 && Math.floor(t * 12) % 2 === 0 ? "#ff3b5c" : C.cyan);
      cpu.rotation.set(Math.sin(t * 40) * 0.02 * interpolate(t, [79.6, OBS], [0, 1]), 0, 0);
      mem.rotation.copy(cpu.rotation);
      shatterA.set(t - OBS, 22, 1.6, -6);
      shatterB.set(t - OBS, 22, 1.6, -6);
      obsBurst.fire(t, [OBS]);
      const a = 0.5 - k * 0.15;
      const d = 22 - k * 1.5 + kick(t, [OBS], 3) * 6;
      camPos.set(Math.sin(a) * d, 3 + Math.sin(k) * 0.8, Math.cos(a) * d).add(B.position);
      look.copy(B.position);
      fov = 45 + kick(t, [OBS], 3) * 15;
      roll = Math.sin(t * 0.6) * 0.04;
      shake = kick(t, [OBS], 4) * 1 + (t > 79.6 && t < OBS ? 0.1 : 0);
      flash = interpolate(t, [VN, VN + 0.2], [1, 0]) + kick(t, [OBS], 7) * 0.7 + interpolate(t, [TURN - 0.12, TURN], [0, 1]);
      inv = impactFrame(t, [OBS], 2);
    }

    /* -------- C -------- */
    if (Cg.visible) {
      skyC.update(t, 1, bp * 0.3);
      // straight down the corridor, whip left at the corner, glide into the chamber
      const turnU = interpolate(t, [LEFT - 0.05, LEFT + 0.22], [0, 1], Easing.easeInOut);
      const zRun = CORNER.z + 32 - Math.min(t - TURN, LEFT - TURN) * 64;
      const xRun = -interpolate(t, [LEFT, THERE, ARE + 0.6, END], [0, 48, 62, 70], Easing.easeOut);
      if (t < LEFT) camPos.set(0, 0.4, zRun);
      else camPos.set(xRun, 0.4 + interpolate(t, [THERE, ARE + 0.6], [0, 6], Easing.easeInOut), CORNER.z);
      camPos.add(Cg.position);
      dir.copy(dirA).lerp(dirB, turnU).normalize();
      const eyeFocus = interpolate(t, [THERE - 0.3, THERE + 0.4], [0, 1], Easing.easeInOut);
      look.copy(camPos).addScaledVector(dir, 10);
      p.copy(EYE_P).add(Cg.position);
      look.lerp(p, eyeFocus);
      frames.forEach((f, i) => {
        const beat = Math.exp(-(((bpos + i * 0.25) % 1) + 1) % 1 * 5);
        f.scale.setScalar(1 + beat * 0.08 + (i >= 22 ? interpolate(t, [THERE, ARE], [0, 3], Easing.easeIn) : 0));
        f.rotation.z = Math.sin(t * 2 + i) * 0.05 * kick(t, [LEFT], 2);
      });
      fCyan.opacity = fPink.opacity = 0.8 - interpolate(t, [THERE, ARE], [0, 0.8]);
      // the eye opens on "are"
      const open = interpolate(t, [ARE - 0.1, ARE + 0.25], [0, 1], Easing.easeOut);
      bigEye.set(t, {
        close: THREE.MathUtils.lerp(1, 0.14, open) + (t > 87.5 && t < 87.8 ? Math.sin(((t - 87.5) / 0.3) * Math.PI) * 0.8 : 0),
        pupil: 0.28 + bp * 0.05 - kick(t, [ARE], 4) * 0.1,
        look: eyeLook.copy(camPos),
        glow: 1 + bp * 0.3,
      });
      eyeGlow.material.opacity = 0.2 + open * 0.4 + bp * 0.2;
      halos.forEach((h, i) => {
        h.rotation.set(t * (0.2 + i * 0.1), Math.PI / 2 + Math.sin(t * 0.4 + i) * 0.4, t * 0.3 * (i % 2 ? -1 : 1));
        h.scale.setScalar(pop(t, THERE + i * 0.12, 0.4) * (1 + bp * 0.03));
        (h.material as THREE.MeshBasicMaterial).opacity = 0.7 + bp * 0.3;
      });
      areRings.update(t, RINGS_C, true);
      const run = t < LEFT ? 1 : 1 - interpolate(t, [LEFT, THERE], [0, 1]);
      warpAmt = run * 0.9;
      fov = 60 + run * 15 + kick(t, [LEFT], 5) * 12 - open * 8;
      roll = turnU * (1 - turnU) * 4 * 0.5 + Math.sin(t * 0.5) * 0.03 * open;
      shake = kick(t, [LEFT, 82.12], 6) * 0.5 + kick(t, [ARE], 4) * 0.5 + run * 0.08;
      flash = interpolate(t, [TURN, TURN + 0.2], [1, 0]) + kick(t, [ARE], 6) * 0.35 + interpolate(t, [END - 0.2, END], [0, 1], Easing.easeIn);
      inv = impactFrame(t, [LEFT], 2);
    }

    streaks.update(t, warpAmt, 110);
    w.shot(t, camPos, look, { fov, roll, shake });
    w.post({ flash, fade, invert: inv });
    meter.update(t, 1);
    lyrics.update(t);
  };
}
