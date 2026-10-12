import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import { PAPER } from "../components/brand";
import { createInk, boxes, blobs, cloudPuffs, lines, seg, Box } from "../components/ink";
import { mulberry32 } from "../components/rand";
import { createFrame } from "../components/frame";
import { cameraRig, CamKey } from "../components/camera";
import { paperPlane, FlyKey } from "../components/plane";

/* Burj Khalifa, metres: a Y-shaped plan whose three wings step back in a spiral. */
const TIER = 24;
const TIERS = 24;
const CORE_TOP = TIER * TIERS; // 576

function burjBoxes(): Box[] {
  const out: Box[] = [];
  const len = [62, 62, 62];
  for (let i = 0; i < TIERS; i++) {
    if (i >= 2) len[i % 3] -= 4.6;
    const width = 30 - i * 0.42;
    for (let k = 0; k < 3; k++) {
      const a = Math.PI / 2 + (k * Math.PI * 2) / 3;
      const L = Math.max(len[k], 16);
      out.push({
        x: Math.cos(a) * L / 2, z: Math.sin(a) * L / 2, y: i * TIER, h: TIER,
        w: L, d: width, rot: -a, win: 3.2, floor: 4, style: 1,
      });
    }
  }
  // the slender crown above the last setback
  out.push({ x: 0, z: 0, y: CORE_TOP, h: 60, w: 18, d: 18, win: 2.4, floor: 4, style: 1, rot: Math.PI / 4 });
  out.push({ x: 0, z: 0, y: CORE_TOP + 60, h: 40, w: 11, d: 11, win: 2, floor: 4, style: 1, rot: Math.PI / 4 });
  return out;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height, durationInFrames } = ctx;
  const cam = camera as THREE.PerspectiveCamera;
  cam.near = 1;
  cam.far = 9000;
  cam.updateProjectionMatrix();
  scene.background = new THREE.Color(PAPER);

  const ink = createInk({ fogNear: 500, fogFar: 4500, fogMax: 0.88, light: new THREE.Vector3(-0.6, 0.7, 0.4) }, width, height);
  const rng = mulberry32(2010);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), ink.plane({ strength: 0, spacing: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.name = "ground";
  ground.userData.pickable = false;
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(720, 260), ink.plane({ strength: 0.5, spacing: 1.6, dash: 0.3, wave: 0.8 }));
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(-40, 0.2, -260);
  lake.name = "burj-lake";
  scene.add(ground, lake);

  /* the tower */
  const burj = new THREE.Group();
  burj.name = "burj-khalifa";
  burj.add(boxes(burjBoxes(), ink.box(0.9), "burj-khalifa-wings"));
  const core = new THREE.Mesh(new THREE.CylinderGeometry(9, 17, CORE_TOP, 6), ink.round({ tone: 0.15, hatch: 0.8, rim: 1 }));
  core.position.y = CORE_TOP / 2;
  core.name = "burj-khalifa-core";
  const spire = new THREE.Mesh(new THREE.ConeGeometry(4.2, 196, 8), ink.round({ tone: 0.3, hatch: 0.4, rim: 1 }));
  spire.position.y = CORE_TOP + 100 + 98;
  spire.name = "burj-khalifa-spire";
  const S: number[] = [];
  for (let y = CORE_TOP + 100; y < 820; y += 6) {
    const r = 4.2 * (1 - (y - CORE_TOP - 100) / 196) + 0.3;
    seg(S, [-r, y, 0], [r, y + 6, 0]);
    seg(S, [0, y, -r], [0, y + 6, r]);
  }
  burj.add(core, spire, lines(S, ink.line({ fade: 0.8 }), "spire-rings"));
  scene.add(burj);

  /* Downtown: glass towers, low podiums */
  const towers: Box[] = [];
  const sightline = (x: number, z: number) => {
    // distance from the opening shot's line of sight, camera (120, 330) to the tower
    const t = THREE.MathUtils.clamp((x * 120 + z * 330) / (120 * 120 + 330 * 330), 0, 1.3);
    return Math.hypot(x - 120 * t, z - 330 * t);
  };
  const clearOf = (x: number, z: number, r: number) =>
    Math.hypot(x, z) > r && !(x > -420 && x < 340 && z < -110 && z > -410) && sightline(x, z) > 50;
  for (let i = 0; i < 260; i++) {
    const a = rng() * Math.PI * 2;
    const d = 230 + Math.pow(rng(), 0.8) * 2200;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!clearOf(x, z, 200)) continue;
    const near = Math.exp(-d / 900);
    const h = 40 + rng() * 120 + near * rng() * 260;
    const w = 26 + rng() * 22;
    towers.push({ x, z, w, d: w * (0.7 + rng() * 0.6), h, rot: rng() * Math.PI, win: 3.2, floor: 3.8, style: h > 70 ? 1 : 0 });
    if (rng() < 0.3) towers.push({ x, z, y: h, w: w * 0.6, d: w * 0.6, h: h * 0.18, rot: rng() * Math.PI, win: 3, floor: 3.8, style: 1 });
  }
  // the podium the scene whip-pans off (masked cut)
  towers.push({ x: 165, z: 335, w: 30, d: 40, h: 26, win: 0, tone: -1 });
  // a pair of towers to frame the worm's-eye opening
  towers.push({ x: 150, z: 205, w: 34, d: 30, h: 230, rot: 0.35, win: 3.2, floor: 3.8, style: 1 });
  towers.push({ x: 40, z: 250, w: 30, d: 34, h: 190, rot: -0.36, win: 3.2, floor: 3.8, style: 1 });
  for (let i = 0; i < 140; i++) {
    const x = (rng() - 0.5) * 1400, z = (rng() - 0.5) * 1400;
    if (!clearOf(x, z, 120)) continue;
    towers.push({ x, z, w: 30 + rng() * 40, d: 30 + rng() * 40, h: 8 + rng() * 14, rot: 0, win: 4, floor: 4 });
  }
  scene.add(boxes(towers, ink.box(1), "downtown-towers"));

  /* palms along the lake */
  const palms = [];
  for (let x = -400; x < 330; x += 14) for (const z of [-122, -400]) palms.push({ x, y: 9, z, r: 3.2, sy: 0.6 });
  scene.add(blobs(palms, ink.round({ tone: 0.25, hatch: 0.4 }), ink.hull(1), "palms", 8));

  /* the cloud deck the camera climbs through */
  const deck = new THREE.Group();
  deck.name = "cloud-deck";
  const fill = ink.round({ tone: -0.24, hatch: 11 });
  const hull = ink.hull(1.4);
  const base: THREE.Vector3[] = [];
  for (let i = 0; i < 46; i++) {
    const a = rng() * Math.PI * 2;
    const d = 110 + Math.pow(rng(), 0.7) * 2600;
    const g = blobs(cloudPuffs(rng, 120 + rng() * 220 + d * 0.08, 11), fill, hull, "deck-cloud-" + i, 14);
    const p = new THREE.Vector3(Math.cos(a) * d, 470 + rng() * 70, Math.sin(a) * d);
    g.position.copy(p);
    base.push(p);
    deck.add(g);
  }
  scene.add(deck);

  const frameUi = createFrame(scene, cam, width, height, {
    words: [{ t: "It" }, { t: "climbed" }, { t: "past" }, { t: "the" }, { t: "clouds", accent: true }],
    mode: "card",
    cardIn: 28,
    cardOut: 104,
    finale: { words: [{ t: "Some" }, { t: "words" }, { t: "travel" }, { t: "far.", accent: true }], at: 165 },
    durationInFrames,
  });

  const CAM: CamKey[] = [
    { f: 0, p: [147, 4, 333], look: [210, 8, 333], roll: 0 },
    { f: 20, p: [128, 6, 332], look: [0, 400, 0], roll: -0.14 },
    { f: 80, p: [126, 80, 346], look: [0, 430, 0], roll: -0.08 },
    { f: 150, p: [-90, 380, 232], look: [0, 600, 0], roll: 0 },
    { f: 205, p: [-232, 590, 20], look: [0, 840, 0], roll: 0 },
    { f: 270, p: [-200, 728, -250], look: [0, 830, 0], roll: 0 },
  ];
  const fly = cameraRig(CAM, { easeIn: false, easeOut: true });

  /* the protagonist: a letter folded into a plane */
  const FLY: FlyKey[] = [
    { f: 20, p: [82, 60, 154] },
    { f: 80, p: [-5, 230, 155] },
    { f: 150, p: [-99, 470, 99] },
    { f: 205, p: [-113, 660, -20] },
    { f: 240, p: [-40, 772, -44] },
    { f: 270, p: [40, 788, -95] },
  ];
  const letter = paperPlane(scene, ink, FLY, { size: 16, easeIn: false, easeOut: false });

  return ({ frame, time }) => {
    fly(cam, frame);
    letter(frame, time);
    deck.children.forEach((g, i) => (g.position.x = base[i].x + time * 4));
    frameUi(frame);
  };
}
