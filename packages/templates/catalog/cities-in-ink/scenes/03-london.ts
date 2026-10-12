import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { PAPER } from "../components/brand";
import { createInk, boxes, blobs, beams, cloudPuffs, lines, seg, city, Box, Blob } from "../components/ink";
import { mulberry32 } from "../components/rand";
import { createFrame } from "../components/frame";
import { cameraRig, CamKey } from "../components/camera";
import { paperPlane, FlyKey } from "../components/plane";

/* Westminster, metres. The Thames runs along x; Parliament on the north bank (-z). */
const BB = new THREE.Vector3(-150, 0, 12); // Elizabeth Tower
const CLOCK_Y = 63.5;
const CLOCK_R = 3.6;
const EYE = new THREE.Vector3(-330, 72, 390);
const EYE_R = 60;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height, durationInFrames } = ctx;
  const cam = camera as THREE.PerspectiveCamera;
  cam.near = 0.1;
  cam.far = 6000;
  cam.updateProjectionMatrix();
  scene.background = new THREE.Color(PAPER);

  const ink = createInk({ fogNear: 300, fogFar: 2600, fogMax: 0.88 }, width, height);
  const rng = mulberry32(1859);
  const steel = ink.line({ fade: 0.8 });

  /* ground and river */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), ink.plane({ strength: 0, spacing: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.name = "ground";
  ground.userData.pickable = false;
  const thames = new THREE.Mesh(new THREE.PlaneGeometry(8000, 262), ink.plane({ strength: 0.5, spacing: 1.8, dash: 0.3, wave: 1.4 }));
  thames.rotation.x = -Math.PI / 2;
  thames.position.set(0, 0.2, 171);
  thames.name = "thames";
  scene.add(ground, thames);

  /* Palace of Westminster */
  const gothic = { style: 3, win: 3.4, floor: 8.4 };
  const palace: Box[] = [
    { x: -5, z: 14, w: 250, d: 28, h: 26, ...gothic },
    { x: -137, z: 8, w: 14, d: 20, h: 20, ...gothic },
    { x: -40, z: -18, w: 150, d: 30, h: 24, ...gothic, tone: 0.05 },
    { x: 60, z: -45, w: 110, d: 30, h: 22, ...gothic },
    { x: -80, z: -55, w: 60, d: 40, h: 28, ...gothic },
    // Victoria Tower
    { x: 132, z: -8, w: 22, d: 22, h: 98, style: 3, win: 3.2, floor: 9.5 },
    // Elizabeth Tower: shaft, clock stage, belfry
    { x: BB.x, z: BB.z, w: 12, d: 12, h: 55, style: 3, win: 2.4, floor: 6.2 },
    { x: BB.x, z: BB.z, y: 55, w: 15, d: 15, h: 17, win: 0 },
    { x: BB.x, z: BB.z, y: 72, w: 13, d: 13, h: 8, style: 3, win: 2.2, floor: 8 },
    // embankment walls
    { x: 0, z: 40, w: 8000, d: 2, h: 3.5, win: 0, tone: 0.1 },
    // south parapet: the scene opens rising over it (masked cut)
    { x: 0, z: 302, w: 8000, d: 2, h: 6, win: 0, tone: -1 },
    // County Hall, beside the Eye
    { x: -470, z: 360, w: 150, d: 50, h: 32, ...gothic, style: 0, floor: 4.2 },
  ];
  // Westminster Bridge deck and piers
  const bridgeBoxes: Box[] = [{ x: -215, z: 171, y: 9, w: 26, d: 290, h: 3, win: 0 }];
  for (let i = 0; i <= 7; i++) bridgeBoxes.push({ x: -215, z: 40 + i * 37.4, w: 28, d: 5, h: 9, win: 0, tone: 0.15 });

  const blocks = city({
    rng, x0: -1600, x1: 1600, z0: -1600, z1: 1800, block: 55, street: 14,
    height: (x, z, r) => (r() < 0.04 && Math.hypot(x, z) > 600 ? 70 + r() * 90 : 14 + r() * 22),
    keep: (x, z) => z < -110 || (z > 340 && !(x > -560 && x < -200 && z < 470) && !(x > -260 && x < 260 && z < 1300)),
    win: 3.3, floor: 3.5, style: (h) => (h > 60 ? 1 : 0),
  });
  scene.add(boxes([...palace, ...blocks], ink.box(0.8), "westminster-buildings"));
  scene.add(boxes(bridgeBoxes, ink.box(0.6), "westminster-bridge"));

  /* spires, pinnacles and roofs */
  const spireMat = ink.round({ tone: 0.3, hatch: 0.35, rim: 1 });
  const cone = (r: number, h: number, segs: number, x: number, y: number, z: number, name: string, rot = Math.PI / 4) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, segs, 1), spireMat);
    m.position.set(x, y + h / 2, z);
    m.rotation.y = rot;
    m.name = name;
    return m;
  };
  const elizabeth = new THREE.Group();
  elizabeth.name = "elizabeth-tower";
  elizabeth.add(cone(9.2, 15, 4, BB.x, 80, BB.z, "elizabeth-tower-roof"));
  elizabeth.add(cone(1.4, 7, 4, BB.x, 95, BB.z, "elizabeth-tower-spire"));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) elizabeth.add(cone(1.1, 7, 4, BB.x + sx * 7, 72, BB.z + sz * 7, "clock-pinnacle"));
  const victoria = new THREE.Group();
  victoria.name = "victoria-tower";
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) victoria.add(cone(1.6, 12, 4, 132 + sx * 10, 98, -8 + sz * 10, "victoria-pinnacle"));
  victoria.add(cone(13, 8, 4, 132, 98, -8, "victoria-roof"));
  const central = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 32, 8), ink.round({ tone: 0.05, hatch: 0.35, rim: 1 }));
  central.position.set(-5, 40, -15);
  central.name = "central-tower";
  scene.add(elizabeth, victoria, central, cone(8.5, 34, 8, -5, 56, -15, "central-spire", 0));

  // pinnacles along the river front roofline
  const pin = new THREE.InstancedMesh(new THREE.ConeGeometry(0.9, 6, 4), spireMat, 60);
  pin.name = "palace-pinnacles";
  const mm = new THREE.Matrix4();
  let pi = 0;
  for (let x = -126; x <= 116 && pi < 60; x += 8.4) {
    for (const z of [0.5, 27.5]) {
      if (pi >= 60) break;
      mm.makeTranslation(x, 29, z);
      pin.setMatrixAt(pi++, mm);
    }
  }
  pin.count = pi;
  pin.frustumCulled = false;
  scene.add(pin);

  /* the clock faces */
  const clock = new THREE.Group();
  clock.name = "big-ben-clock";
  const dialMat = ink.round({ tone: -0.4, hatch: 1 });
  const C: number[] = [];
  const H: number[] = [];
  const hands: { hour: THREE.Mesh; minute: THREE.Mesh }[] = [];
  const faces = [
    { n: new THREE.Vector3(0, 0, 1), u: new THREE.Vector3(1, 0, 0) },
    { n: new THREE.Vector3(0, 0, -1), u: new THREE.Vector3(-1, 0, 0) },
    { n: new THREE.Vector3(1, 0, 0), u: new THREE.Vector3(0, 0, -1) },
    { n: new THREE.Vector3(-1, 0, 0), u: new THREE.Vector3(0, 0, 1) },
  ];
  const handMat = ink.line({ fade: 0.8 });
  for (const f of faces) {
    const c = BB.clone().setY(CLOCK_Y).addScaledVector(f.n, 7.55);
    const P = (r: number, a: number, out = 0) =>
      c.clone().addScaledVector(f.u, Math.sin(a) * r).add(new THREE.Vector3(0, Math.cos(a) * r, 0)).addScaledVector(f.n, out);
    const dial = new THREE.Mesh(new THREE.CircleGeometry(CLOCK_R, 48), dialMat);
    dial.position.copy(c);
    dial.lookAt(c.clone().add(f.n));
    dial.name = "clock-dial";
    clock.add(dial);
    for (const r of [CLOCK_R, CLOCK_R * 0.97, CLOCK_R * 0.74, CLOCK_R * 0.7, CLOCK_R * 0.12]) {
      for (let i = 0; i < 72; i++) seg(C, P(r, (i / 72) * Math.PI * 2, 0.05), P(r, ((i + 1) / 72) * Math.PI * 2, 0.05));
    }
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const r0 = i % 5 === 0 ? CLOCK_R * 0.76 : CLOCK_R * 0.9;
      seg(i % 5 === 0 ? H : C, P(r0, a, 0.05), P(CLOCK_R * 0.95, a, 0.05));
    }
    // gothic square surround
    const sq = CLOCK_R * 1.18;
    const corner = (sx: number, sy: number) => c.clone().addScaledVector(f.u, sx * sq).add(new THREE.Vector3(0, sy * sq, 0)).addScaledVector(f.n, 0.05);
    seg(H, corner(-1, -1), corner(1, -1)); seg(H, corner(1, -1), corner(1, 1));
    seg(H, corner(1, 1), corner(-1, 1)); seg(H, corner(-1, 1), corner(-1, -1));
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) seg(C, corner(sx, sy), P(CLOCK_R, Math.atan2(sx, sy), 0.05));

    const mkHand = (len: number, thick: number, name: string) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(thick, len, 0.08), handMat);
      m.geometry.translate(0, len / 2 - len * 0.12, 0);
      const pivot = new THREE.Group();
      pivot.position.copy(c).addScaledVector(f.n, 0.2);
      pivot.lookAt(c.clone().addScaledVector(f.n, 5));
      const spinner = new THREE.Group();
      pivot.add(spinner);
      spinner.add(m);
      m.name = name;
      clock.add(pivot);
      return m;
    };
    hands.push({ hour: mkHand(CLOCK_R * 0.58, 0.32, "clock-hour-hand"), minute: mkHand(CLOCK_R * 0.86, 0.2, "clock-minute-hand") });
  }
  clock.add(lines(C, steel, "clock-rings"), beams(H, 0.14, steel, "clock-marks"));
  scene.add(clock);

  /* Westminster Bridge arches */
  const A: number[] = [];
  for (let i = 0; i < 7; i++) {
    const z0 = 42.5 + i * 37.4, z1 = z0 + 32.4;
    for (const x of [-228.2, -201.8]) {
      for (const [rise, base] of [[7.5, 1.2], [6.3, 1.2]]) {
        let prev: number[] | null = null;
        for (let k = 0; k <= 20; k++) {
          const t = k / 20;
          const p = [x, base + Math.sin(Math.PI * t) * rise, z0 + (z1 - z0) * t];
          if (prev) seg(A, prev, p);
          prev = p;
        }
      }
    }
  }
  scene.add(beams(A, 0.35, steel, "bridge-arches"));

  /* the London Eye */
  const eye = new THREE.Group();
  eye.name = "london-eye";
  const E: number[] = [];
  const R: number[] = [];
  const rim = (r: number, z: number, a: number) => new THREE.Vector3(Math.sin(a) * r, Math.cos(a) * r, z);
  for (const z of [-3.5, 3.5]) {
    for (let i = 0; i < 96; i++) seg(R, rim(EYE_R, z, (i / 96) * Math.PI * 2), rim(EYE_R, z, ((i + 1) / 96) * Math.PI * 2));
    for (let i = 0; i < 96; i++) seg(E, rim(EYE_R - 3, z, (i / 96) * Math.PI * 2), rim(EYE_R - 3, z, ((i + 1) / 96) * Math.PI * 2));
    for (let i = 0; i < 64; i++) seg(E, [0, 0, z * 1.8], rim(EYE_R, z, (i / 64) * Math.PI * 2));
  }
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2, b = ((i + 1) / 96) * Math.PI * 2;
    seg(E, rim(EYE_R, -3.5, a), rim(EYE_R - 3, 3.5, b));
    seg(E, rim(EYE_R, 3.5, a), rim(EYE_R - 3, -3.5, b));
  }
  // A-frame back-stay
  for (const sx of [-1, 1]) seg(R, [0, 0, 6], [sx * 34, -EYE.y, 60]);
  seg(R, [-34, -EYE.y, 60], [34, -EYE.y, 60]);
  const wheel = new THREE.Group();
  wheel.add(lines(E, steel, "eye-spokes"), beams(R, 0.9, steel, "eye-rim"));
  const capsules: Blob[] = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    capsules.push({ x: Math.sin(a) * (EYE_R + 2.5), y: Math.cos(a) * (EYE_R + 2.5), z: 0, r: 2.6, sy: 0.75 });
  }
  const pods = blobs(capsules, ink.round({ tone: 0.1, hatch: 0.25 }), ink.hull(1), "eye-capsules", 10);
  eye.add(wheel, pods);
  eye.position.copy(EYE);
  scene.add(eye);

  /* plane trees along both embankments */
  const trees: Blob[] = [];
  for (const z of [34, 308]) {
    for (let x = -1400; x < 1400; x += 11) {
      if (z === 34 && x > -175 && x < 165) continue;
      if (x > -232 && x < -198) continue;
      if (z === 308 && x > -110 && x < -10) continue; // clear the opening camera's spot
      const r = 4 + rng() * 1.3;
      trees.push({ x, y: r * 1.5, z: z + (rng() - 0.5) * 3, r });
      trees.push({ x: x + r * 0.5, y: r * 2, z: z + (rng() - 0.5) * r, r: r * 0.7 });
    }
  }
  for (let i = 0; i < 160; i++) {
    const x = -240 + rng() * 480, z = 330 + rng() * 950;
    if (x < -200 && z < 470) continue;
    const r = 4.5 + rng() * 1.5;
    trees.push({ x, y: r * 1.5, z, r });
    trees.push({ x: x + r * 0.5, y: r * 2, z: z + (rng() - 0.5) * r, r: r * 0.7 });
  }
  scene.add(blobs(trees, ink.round({ tone: 0.18, hatch: 0.5 }), ink.hull(1.1), "plane-trees", 9));

  /* sky */
  const sky = new THREE.Group();
  sky.name = "sky-clouds";
  const skyFill = ink.round({ tone: -0.12, hatch: 4 });
  const skyHull = ink.hull(1.3);
  const skyBase: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) {
    const g = blobs(cloudPuffs(rng, 140 + rng() * 140, 10), skyFill, skyHull, "cloud-" + i, 14);
    const p = new THREE.Vector3((rng() - 0.5) * 2400, 260 + rng() * 240, -500 - rng() * 1600);
    g.position.copy(p);
    skyBase.push(p);
    sky.add(g);
  }
  scene.add(sky);

  const frameUi = createFrame(scene, cam, width, height, {
    words: [{ t: "It" }, { t: "outran" }, { t: "every" }, { t: "clock", accent: true }],
    mode: "card",
    cardIn: 30,
    cardOut: 108,
    durationInFrames,
  });

  const CAM: CamKey[] = [
    { f: 0, p: [-60, 3.2, 305.5], look: [-60, 3.2, 0] },
    { f: 20, p: [-62, 11.5, 305], look: [-92, 27, 0] },
    { f: 95, p: [-86, 48, 284], look: [-140, 60, 0] },
    { f: 172, p: [-142, 60, 160], look: [-150, 64, 12] },
    { f: 222, p: [-150, 63.5, 50], look: [-150, 63.5, 12] },
    { f: 258, p: [-150, 62.2, 21.9], look: [-150, 62.2, 0] },
    { f: 270, p: [-150, 62.0, 20.05], look: [-150, 62.0, 0] },
  ];
  const fly = cameraRig(CAM, { easeIn: false, easeOut: false });

  /* the protagonist: a letter folded into a plane */
  const FLY: FlyKey[] = [
    { f: 0, p: [-66, 14, 262] },
    { f: 95, p: [-106, 47, 238] },
    { f: 172, p: [-158, 55, 118] },
    { f: 210, p: [-170, 60, 48] },
    { f: 240, p: [-186, 72, 10] },
    { f: 270, p: [-215, 78, -20] },
  ];
  const letter = paperPlane(scene, ink, FLY, { size: 6, easeIn: false, easeOut: false });

  return ({ frame, time }) => {
    fly(cam, frame);
    letter(frame, time);
    // ten past ten, ticking on
    const minutes = 8 + time * 0.5; // hands stay in the upper half of the dial
    for (const h of hands) {
      h.minute.parent!.rotation.z = -(minutes / 60) * Math.PI * 2;
      h.hour.parent!.rotation.z = -((10 + minutes / 60) / 12) * Math.PI * 2;
    }
    eye.rotation.y = 0;
    wheel.rotation.z = -time * 0.01;
    pods.rotation.z = -time * 0.01;
    sky.children.forEach((g, i) => (g.position.x = skyBase[i].x + time * 5));
    frameUi(frame);
  };
}
