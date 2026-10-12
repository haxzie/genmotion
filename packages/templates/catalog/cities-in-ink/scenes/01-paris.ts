import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { PAPER } from "../components/brand";
import { createInk, boxes, blobs, beams, cloudPuffs, lines, seg, city, Box, Blob } from "../components/ink";
import { mulberry32 } from "../components/rand";
import { createFrame } from "../components/frame";
import { cameraRig, CamKey } from "../components/camera";
import { paperPlane, FlyKey } from "../components/plane";

/* Eiffel Tower profile, metres. Outer corner half-width as a function of height. */
const hw = (y: number) => 2.5 + 60 * Math.exp(-y / 88);
/** Leg depth: the four legs converge to one shaft at the second level (115 m). */
const legW = (y: number) => 22 - (3.3 * y) / 115;

function eiffelLines(): { S: number[]; B: number[]; T: number[] } {
  const S: number[] = [];
  const B: number[] = []; // heavy girders
  const T: number[] = []; // lighter girders
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const quads = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  // four legs, each a square lattice column of four rails
  const legLevels: number[] = [];
  for (let y = 0; y <= 115; y += 5) legLevels.push(y);
  for (const [sx, sz] of quads) {
    const rails = (y: number) => {
      const o = hw(y), i = Math.max(hw(y) - legW(y), 0);
      return [V(sx * o, y, sz * o), V(sx * i, y, sz * o), V(sx * i, y, sz * i), V(sx * o, y, sz * i)];
    };
    for (let k = 0; k < legLevels.length - 1; k++) {
      const a = rails(legLevels[k]), b = rails(legLevels[k + 1]);
      for (let r = 0; r < 4; r++) {
        seg(S, a[r], b[r]);
        seg(B, a[r], b[r]);
        seg(S, a[r], a[(r + 1) % 4]);
        if (k % 2 === 0) seg(T, a[r], a[(r + 1) % 4]);
        // X lattice on each face of the leg
        seg(S, a[r], b[(r + 1) % 4]);
        seg(S, a[(r + 1) % 4], b[r]);
        const m0 = a[r].clone().lerp(a[(r + 1) % 4], 0.5), m1 = b[r].clone().lerp(b[(r + 1) % 4], 0.5);
        seg(S, m0, m1);
      }
    }
  }

  // single shaft from the second level up, with corner girders and big X-braces
  const shaft: number[] = [];
  for (let y = 115; y <= 276; y += 4.6) shaft.push(y);
  const g = 2.4;
  const corner = (sx: number, sz: number, y: number) => {
    const o = hw(y);
    return { k: V(sx * o, y, sz * o), kx: V(sx * (o - g), y, sz * o), kz: V(sx * o, y, sz * (o - g)) };
  };
  for (let k = 0; k < shaft.length - 1; k++) {
    const y0 = shaft[k], y1 = shaft[k + 1];
    for (const [sx, sz] of quads) {
      const a = corner(sx, sz, y0), b = corner(sx, sz, y1);
      seg(S, a.k, b.k); seg(S, a.kx, b.kx); seg(S, a.kz, b.kz);
      seg(B, a.k, b.k); seg(T, a.kx, b.kx); seg(T, a.kz, b.kz);
      if (k % 2 === 0) { seg(S, a.k, b.kx); seg(S, a.k, b.kz); } else { seg(S, a.kx, b.k); seg(S, a.kz, b.k); }
    }
    if (k % 3 === 0 && k + 3 < shaft.length) {
      const y3 = shaft[k + 3];
      for (const s of [1, -1]) {
        // faces at z = ±hw and x = ±hw
        seg(S, corner(1, s, y0).kx, corner(-1, s, y3).kx); seg(S, corner(-1, s, y0).kx, corner(1, s, y3).kx);
        seg(S, corner(s, 1, y0).kz, corner(s, -1, y3).kz); seg(S, corner(s, -1, y0).kz, corner(s, 1, y3).kz);
        seg(S, corner(1, s, y0).kx, corner(-1, s, y0).kx); seg(S, corner(s, 1, y0).kz, corner(s, -1, y0).kz);
      }
    }
  }

  // the four great arches between the legs
  for (let f = 0; f < 4; f++) {
    const pts = (R: number, base: number, rise: number) => {
      const out: THREE.Vector3[] = [];
      for (let i = 0; i <= 40; i++) {
        const t = (i / 40) * Math.PI;
        const u = Math.cos(t) * R, y = base + Math.sin(t) * rise;
        const o = hw(y) + 0.3;
        out.push(f === 0 ? V(u, y, o) : f === 1 ? V(u, y, -o) : f === 2 ? V(o, y, u) : V(-o, y, u));
      }
      return out;
    };
    const outer = pts(40, 4, 35), inner = pts(37, 4, 31.5);
    for (let i = 0; i < outer.length - 1; i++) {
      seg(S, outer[i], outer[i + 1]);
      seg(S, inner[i], inner[i + 1]);
      seg(T, outer[i], outer[i + 1]);
      seg(S, i % 2 ? outer[i] : inner[i], i % 2 ? inner[i + 1] : outer[i + 1]);
    }
  }

  // antenna
  seg(S, [0, 300, 0], [0, 326, 0]);
  for (let y = 300; y < 324; y += 3) { seg(S, [-0.8, y, 0], [0.8, y + 3, 0]); seg(S, [0, y, -0.8], [0, y + 3, 0.8]); }
  return { S, B, T };
}

function eiffelPlatforms(): Box[] {
  const ring = (y: number, h: number, outer: number, inner: number, win: number, floor: number): Box[] => {
    const band = outer - inner, mid = (outer + inner) / 2;
    const p = { y, h, win, floor, style: 3 };
    return [
      { ...p, x: 0, z: mid, w: outer * 2, d: band },
      { ...p, x: 0, z: -mid, w: outer * 2, d: band },
      { ...p, x: mid, z: 0, w: band, d: inner * 2 },
      { ...p, x: -mid, z: 0, w: band, d: inner * 2 },
    ];
  };
  return [
    ...ring(57, 7.5, 35.5, 14.5, 4.2, 7.5),
    ...ring(115, 5, 21, 8.5, 3, 5),
    { x: 0, z: 0, y: 276, h: 5, w: 16, d: 16, win: 2.6, floor: 5, style: 3 },
    { x: 0, z: 0, y: 281, h: 14, w: 10, d: 10, win: 2.2, floor: 3.4, style: 0 },
    { x: 0, z: 0, y: 295, h: 5, w: 6, d: 6, win: 0 },
    // stone pedestals under each leg; the front-right one is the masked cut
    ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz]) => ({ x: sx * 51.5, z: sz * 51.5, h: 9, w: 27, d: 27, win: 0, tone: -1 })),
  ];
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height, durationInFrames } = ctx;
  const cam = camera as THREE.PerspectiveCamera;
  cam.near = 1;
  cam.far = 5000;
  cam.updateProjectionMatrix();
  scene.background = new THREE.Color(PAPER);

  const ink = createInk({ fogNear: 400, fogFar: 4200, fogMax: 0.85 }, width, height);
  const rng = mulberry32(1889);

  /* ground and river */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), ink.plane({ strength: 0, spacing: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.name = "ground";
  ground.userData.pickable = false;
  const seine = new THREE.Mesh(new THREE.PlaneGeometry(9000, 112), ink.plane({ strength: 0.55, spacing: 2.4, dash: 0.3, wave: 1.2 }));
  seine.rotation.x = -Math.PI / 2;
  seine.position.set(0, 0.15, -205);
  seine.name = "seine";
  const lawn = ink.plane({ strength: 0.3, spacing: 1.5, dash: 0.55, wave: 0 });
  const lawns = new THREE.Group();
  lawns.name = "champ-de-mars-lawns";
  for (const x of [-26, 26]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 640), lawn);
    m.name = x < 0 ? "lawn-west" : "lawn-east";
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.1, 470);
    lawns.add(m);
  }
  scene.add(ground, seine, lawns);

  /* the tower */
  const tower = new THREE.Group();
  tower.name = "eiffel-tower";
  const E = eiffelLines();
  const girderMat = ink.line({ fade: 0.75 });
  const lattice = lines(E.S, girderMat, "eiffel-lattice");
  const girders = beams(E.B, 0.85, girderMat, "eiffel-girders");
  const struts = beams(E.T, 0.35, girderMat, "eiffel-struts");
  const platforms = boxes(eiffelPlatforms(), ink.box(1.2), "eiffel-platforms");
  tower.add(lattice, girders, struts, platforms);
  scene.add(tower);

  /* Paris: Haussmann blocks with slate mansards */
  const inPark = (x: number, z: number) =>
    (Math.abs(x) < 150 && z > -140 && z < 905) ||
    (z > -280 && z < -130) ||
    (Math.abs(x) < 175 && z < -270 && z > -560) ||
    Math.hypot(x, z) < 160;
  const blocks = city({
    rng, x0: -1700, x1: 1700, z0: -1700, z1: 1900, block: 60, street: 15,
    height: (_x, _z, r) => 17 + Math.floor(r() * 3) * 3,
    keep: (x, z) => !inPark(x, z),
    win: 3.3, floor: 3.4, mansard: true,
  });
  const ecole: Box[] = [
    { x: 0, z: 935, w: 300, d: 40, h: 20, win: 4, floor: 5 },
    { x: 0, z: 915, w: 50, d: 30, h: 28, win: 4, floor: 5.5 },
    { x: 0, z: 912, w: 22, d: 18, h: 36, win: 3, floor: 6, tone: 0.1 },
  ];
  // Palais de Chaillot: two wings on an arc
  const chaillot: Box[] = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const a = (0.25 + i * 0.12) * s;
      chaillot.push({ x: Math.sin(a) * 210, z: -330 - Math.cos(a) * 210, w: 30, d: 26, h: 24, rot: -a, win: 4, floor: 6, style: 3 });
    }
  }
  const city3d = boxes([...blocks, ...ecole, ...chaillot], ink.box(0.85), "paris-buildings");
  const bridge = boxes([
    { x: 0, z: -205, y: 7, w: 36, d: 120, h: 2.5, win: 0 },
    ...[-235, -205, -175].map((z) => ({ x: 0, z, w: 30, d: 5, h: 7, win: 0, tone: 0.2 })),
  ], ink.box(0.6), "pont-d-iena");
  scene.add(city3d, bridge);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), ink.round({ tone: 0.05, hatch: 0.4 }));
  dome.position.set(0, 36, 912);
  dome.name = "ecole-militaire-dome";
  scene.add(dome);

  /* trees: Champ de Mars rows, the Seine quays, the Trocadéro gardens */
  const trees: Blob[] = [];
  const tree = (x: number, z: number, s = 1) => {
    const r = (4.2 + rng() * 1.2) * s;
    trees.push({ x, y: r * 1.4, z, r });
    trees.push({ x: x + r * 0.5, y: r * 1.9, z: z + (rng() - 0.5) * r, r: r * 0.7 });
    trees.push({ x: x - r * 0.45, y: r * 1.75, z: z + (rng() - 0.5) * r, r: r * 0.65 });
  };
  for (const s of [-1, 1]) for (const x of [58, 72, 86, 100, 116]) for (let z = 88; z < 840; z += 11) tree(s * x, z);
  for (const z of [-140, -270]) for (let x = -1500; x < 1500; x += 13) if (Math.abs(x) > 24) tree(x, z, 0.9);
  for (let i = 0; i < 70; i++) tree((rng() - 0.5) * 300, -300 - rng() * 230, 1.1);
  const treeGroup = blobs(trees, ink.round({ tone: 0.18, hatch: 0.55 }), ink.hull(1.1), "trees", 9);
  scene.add(treeGroup);

  /* sky clouds */
  const sky = new THREE.Group();
  sky.name = "sky-clouds";
  const skyFill = ink.round({ tone: -0.12, hatch: 5 });
  const skyHull = ink.hull(1.3);
  const skyBase: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) {
    const g = blobs(cloudPuffs(rng, 160 + rng() * 140, 10), skyFill, skyHull, "cloud-" + i, 14);
    const p = new THREE.Vector3((rng() - 0.5) * 2600, 380 + rng() * 260, -700 - rng() * 1700);
    g.position.copy(p);
    skyBase.push(p);
    sky.add(g);
  }
  scene.add(sky);

  const frameUi = createFrame(scene, cam, width, height, {
    words: [{ t: "A" }, { t: "letter", accent: true }, { t: "left" }, { t: "Paris" }],
    mode: "panel",
    expandAt: 78,
    durationInFrames,
  });

  const CAM: CamKey[] = [
    { f: 0, p: [70, 180, 1150], look: [0, 100, 0] },
    { f: 90, p: [40, 122, 800], look: [0, 100, 0] },
    { f: 165, p: [16, 48, 430], look: [0, 92, 0] },
    { f: 215, p: [10, 15, 185], look: [2, 62, 0] },
    { f: 246, p: [24, 6, 98], look: [14, 18, 0] },
    { f: 270, p: [53, 4.6, 68], look: [56, 5.2, 0] },
  ];
  const fly = cameraRig(CAM, { easeIn: true, easeOut: false });

  /* the protagonist: a letter folded into a plane */
  const FLY: FlyKey[] = [
    { f: 0, p: [52, 196, 1100] },
    { f: 90, p: [30, 134, 748] },
    { f: 165, p: [4, 50, 392] },
    { f: 215, p: [-2, 19, 150] },
    { f: 242, p: [0, 18, 40] },
    { f: 270, p: [-6, 26, -40] },
  ];
  const letter = paperPlane(scene, ink, FLY, { size: 6.5, easeIn: false, easeOut: false });

  return ({ frame, time }) => {
    fly(cam, frame);
    letter(frame, time);
    sky.children.forEach((g, i) => (g.position.x = skyBase[i].x + time * 6));
    frameUi(frame);
  };
}
