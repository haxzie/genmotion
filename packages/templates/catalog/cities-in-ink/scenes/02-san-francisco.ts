import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { PAPER } from "../components/brand";
import { createInk, boxes, blobs, beams, cloudPuffs, lines, seg, city, Box } from "../components/ink";
import { mulberry32, fbm } from "../components/rand";
import { createFrame } from "../components/frame";
import { cameraRig, CamKey } from "../components/camera";
import { paperPlane, FlyKey } from "../components/plane";

/* Golden Gate Bridge, metres. Bridge runs along x; ocean is -z, the bay +z. */
const TOWER_X = 640;
const TOWER_TOP = 227;
const DECK_Y = 58;
const DECK_H = 8;
const CABLE_Z = 16;
const ANCHOR_X = 985;

function cableY(x: number): number {
  const ax = Math.abs(x);
  if (ax <= TOWER_X) return 76 + (TOWER_TOP - 76) * (ax / TOWER_X) ** 2;
  const t = Math.min((ax - TOWER_X) / (ANCHOR_X - TOWER_X), 1);
  return TOWER_TOP + (72 - TOWER_TOP) * t - 22 * Math.sin(Math.PI * t);
}

function towerBoxes(sx: number): Box[] {
  const x = sx * TOWER_X;
  const out: Box[] = [{ x, z: 0, w: 46, d: 70, h: 14, win: 0, tone: 0.05 }];
  const tiers: [number, number, number, number][] = [
    [14, 72, 12.5, 11], [72, 122, 11.5, 10], [122, 172, 10.5, 9.2], [172, TOWER_TOP, 9.5, 8.4],
  ];
  for (const zs of [-1, 1]) {
    for (const [y0, y1, w, d] of tiers) {
      // the south tower's bay-side leg opens the scene as a masked cut: keep its lower shaft plain
      const plain = sx < 0 && zs > 0 && y0 === 72;
      out.push({ x, z: zs * CABLE_Z, y: y0, h: y1 - y0, w, d, win: plain ? 0 : 1.5, floor: 4, style: 2, tone: plain ? -1 : 0 });
    }
    out.push({ x, z: zs * CABLE_Z, y: TOWER_TOP, h: 4, w: 6, d: 6, win: 0 }); // saddle housing
  }
  for (const [y0, h] of [[DECK_Y - 9, 6], [108, 10], [148, 9], [188, 9]] as [number, number][]) {
    out.push({ x, z: 0, y: y0, h, w: 7.5, d: CABLE_Z * 2 - 8, win: 1.3, floor: 4, style: 2, tone: 0.06 });
  }
  // the crown strut: plain stone-white, it is what sweeps over the lens at the cut
  out.push({ x, z: 0, y: 211, h: 16, w: 7.5, d: CABLE_Z * 2 - 8, win: 0, tone: -1 });
  return out;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height, durationInFrames } = ctx;
  const cam = camera as THREE.PerspectiveCamera;
  cam.near = 1;
  cam.far = 12000;
  cam.updateProjectionMatrix();
  scene.background = new THREE.Color(PAPER);

  const ink = createInk({ fogNear: 600, fogFar: 6500, fogMax: 0.88, light: new THREE.Vector3(0.5, 0.75, 0.45) }, width, height);
  const rng = mulberry32(1937);

  /* the bay */
  const water = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), ink.plane({ strength: 0.42, spacing: 3.2, dash: 0.35, wave: 3 }));
  water.rotation.x = -Math.PI / 2;
  water.name = "golden-gate-strait";
  water.userData.pickable = false;
  scene.add(water);

  /* headlands: contour-lined hills either side */
  const terrain = (x0: number, x1: number, z0: number, z1: number, h: (x: number, z: number) => number, name: string) => {
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 110, 150);
    geo.rotateX(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setY(i, h(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, ink.round({ tone: 0.22, hatch: 3.5, contour: 7 }));
    m.name = name;
    return m;
  };
  const ss = THREE.MathUtils.smoothstep;
  const marin = terrain(1050, 6000, -5000, 3500, (x, z) => {
    const coast = ss(x, 1120, 1500);
    return -12 + coast * (40 + fbm(x / 900, z / 900, 3) * 330) * (0.75 + 0.25 * ss(-z, -2500, 500));
  }, "marin-headlands");
  const presidio = terrain(-7000, -1050, -5000, 5000, (x, z) => {
    const coast = ss(-x, 1120, 1450);
    return -12 + coast * (18 + fbm(x / 700, z / 700, 9) * 75);
  }, "presidio");
  scene.add(marin, presidio);

  /* the city, east of the Presidio */
  const sfBlocks = city({
    rng, x0: -6500, x1: -1700, z0: -400, z1: 4200, block: 70, street: 18,
    height: (x, z, r) => {
      const downtown = Math.exp(-((x + 4300) ** 2 + (z - 2800) ** 2) / 900 ** 2);
      return 12 + r() * 18 + downtown * r() * 160;
    },
    keep: (x, z) => !(x > -2600 && z < 900),
    win: 3.4, floor: 3.4, style: (h) => (h > 60 ? 1 : 0),
  });
  const terrainH = (x: number, z: number) => -12 + ss(-x, 1120, 1450) * (18 + fbm(x / 700, z / 700, 9) * 75);
  for (const b of sfBlocks) b.y = terrainH(b.x, b.z) - 2;
  scene.add(boxes(sfBlocks, ink.box(1.2), "san-francisco-buildings"));
  const transamerica = new THREE.Mesh(new THREE.ConeGeometry(26, 260, 4, 1), ink.round({ tone: 0.1, hatch: 1.8 }));
  transamerica.position.set(-4300, terrainH(-4300, 2700) + 128, 2700);
  transamerica.rotation.y = Math.PI / 4;
  transamerica.name = "transamerica-pyramid";
  scene.add(transamerica);

  /* the bridge */
  const bridge = new THREE.Group();
  bridge.name = "golden-gate-bridge";
  const steel = ink.line({ fade: 0.8 });
  const towers = boxes([...towerBoxes(-1), ...towerBoxes(1)], ink.box(0.7), "bridge-towers");
  const deck = boxes([
    { x: 0, z: 0, y: DECK_Y, h: DECK_H, w: 2 * 1400, d: 23, win: 0 },
    ...[-1, 1].map((s) => ({ x: s * ANCHOR_X, z: 0, y: 0, w: 48, d: 46, h: 74, win: 0, tone: 0.08 })),
    ...[-1, 1].flatMap((s) => [-1, 1].map((zs) => ({ x: s * ANCHOR_X, z: zs * CABLE_Z, y: 74, w: 8, d: 8, h: 6, win: 0 }))),
  ], ink.box(0.6), "bridge-deck");
  bridge.add(towers, deck);

  const S: number[] = [];
  const C: number[] = [];
  const truss: number[] = [];
  for (const zs of [-1, 1]) {
    const z = zs * CABLE_Z;
    // main cables
    for (let x = -ANCHOR_X; x < ANCHOR_X; x += 10) {
      const x2 = Math.min(x + 10, ANCHOR_X);
      seg(C, [x, cableY(x) + 1, z], [x2, cableY(x2) + 1, z]);
    }
    // suspenders
    for (let x = -ANCHOR_X + 15; x < ANCHOR_X - 10; x += 15.2) {
      if (Math.abs(Math.abs(x) - TOWER_X) < 8) continue;
      seg(S, [x, cableY(x), z], [x, DECK_Y + DECK_H, z * 0.75]);
    }
    // stiffening truss on the deck sides
    const tz = zs * 11.6;
    for (let x = -1400; x < 1400; x += 7.6) {
      const up = Math.round(x / 7.6) % 2 === 0;
      seg(truss, [x, up ? DECK_Y : DECK_Y + DECK_H, tz], [x + 7.6, up ? DECK_Y + DECK_H : DECK_Y, tz]);
      seg(truss, [x, DECK_Y, tz], [x, DECK_Y + DECK_H, tz]);
    }
  }
  // X-bracing between the legs below the deck
  for (const sx of [-1, 1]) {
    const x = sx * TOWER_X;
    for (const xo of [-4, 4]) {
      seg(C, [x + xo, 14, -CABLE_Z + 5], [x + xo, DECK_Y - 9, CABLE_Z - 5]);
      seg(C, [x + xo, 14, CABLE_Z - 5], [x + xo, DECK_Y - 9, -CABLE_Z + 5]);
    }
  }
  bridge.add(
    lines(S, steel, "suspenders"),
    lines(truss, steel, "deck-truss"),
    lines(C, steel, "main-cable-lines"),
    beams(C, 1.3, steel, "main-cables"),
  );
  scene.add(bridge);

  /* the famous fog */
  const fog = new THREE.Group();
  fog.name = "fog-banks";
  const fogFill = ink.round({ tone: -0.14, hatch: 7 });
  const fogHull = ink.hull(1.3);
  const fogBase: THREE.Vector3[] = [];
  const addCloud = (p: THREE.Vector3, w: number, i: number) => {
    const g = blobs(cloudPuffs(rng, w, 12), fogFill, fogHull, "fog-" + i, 14);
    g.position.copy(p);
    fogBase.push(p.clone());
    fog.add(g);
  };
  let ci = 0;
  for (let i = 0; i < 7; i++) addCloud(new THREE.Vector3(1500 + rng() * 2600, 230 + rng() * 140, -2600 + rng() * 3200), 500 + rng() * 400, ci++);
  for (let i = 0; i < 6; i++) addCloud(new THREE.Vector3(-2600 + rng() * 5000, 420 + rng() * 260, -2400 - rng() * 2600), 450 + rng() * 450, ci++);
  for (let i = 0; i < 3; i++) addCloud(new THREE.Vector3(-1800 + rng() * 1200, 330 + rng() * 120, -800 - rng() * 1000), 300 + rng() * 200, ci++);
  scene.add(fog);

  const frameUi = createFrame(scene, cam, width, height, {
    words: [{ t: "It" }, { t: "crossed" }, { t: "the" }, { t: "fog", accent: true }],
    mode: "card",
    cardIn: 26,
    cardOut: 104,
    durationInFrames,
  });

  const CAM: CamKey[] = [
    { f: 0, p: [-648.7, 95, 15.2], look: [0, 96, 15] },
    { f: 40, p: [-605, 104, 42], look: [600, 108, 10] },
    { f: 110, p: [-290, 126, 60], look: [640, 142, 0] },
    { f: 175, p: [150, 150, 62], look: [640, 170, 0] },
    { f: 226, p: [495, 177, 32], look: [700, 204, 0] },
    { f: 250, p: [598, 196, 9], look: [800, 210, 0] },
    { f: 270, p: [633.2, 219, 0], look: [900, 224, 0] },
  ];
  const fly = cameraRig(CAM, { easeIn: false, easeOut: false });

  /* the protagonist: a letter folded into a plane */
  const FLY: FlyKey[] = [
    { f: 0, p: [-600, 101, 26] },
    { f: 40, p: [-560, 110, 38] },
    { f: 110, p: [-245, 131, 50] },
    { f: 175, p: [195, 155, 50] },
    { f: 226, p: [540, 191, 22] },
    { f: 250, p: [628, 228, 5] },
    { f: 270, p: [676, 258, -6] },
  ];
  const letter = paperPlane(scene, ink, FLY, { size: 10, easeIn: false, easeOut: false });

  return ({ frame, time }) => {
    fly(cam, frame);
    letter(frame, time);
    fog.children.forEach((g, i) => (g.position.x = fogBase[i].x - time * 9));
    frameUi(frame);
  };
}
