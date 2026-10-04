import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, rx, ry } from "../components/stage";
import { glide, clamp01 } from "../components/ease";
import { label, measure, setLabel, withInter } from "../components/type";
import { RES } from "../components/stage";

/**
 * Global f286–f395 (scene frame = global - 286). Hard cut in from the grid, hard cut out.
 * A true-isometric ground (three stacked layers, the top one gridded with a soft blue glow)
 * slides in from the top right and drifts. A ring travels a dashed route corner to corner;
 * at each corner a white tile pops up (building, box, people, store). "IT implementation"
 * stands on a card along the back edge. Iso projection is affine, so the ground is a group
 * with a sheared matrix and everything camera-facing is placed at its projected point.
 */
const G0 = 286;

// one world unit along a ground axis on screen (ref px), true isometric
const HX = 165;
const HY = 95.3;
const UP = 190; // one world unit of height, on screen

const C = {
  glow: "#a9c8d7",
  base: "#d6e5ec",
  edge: "#aebfc6",
  grid: "#f4f9fb",
  dash: "#ffffff",
  icon: "#93afc2",
  tileBorder: "#dbe8ed",
  ringFill: "#dbeaf1",
  ringStroke: "#a9c3d0",
  ink: "#2f2f2f",
};

/** ground (u, v) -> offset from the ground origin in ref px, y down */
const projX = (u: number, v: number) => (u - v) * HX;
const projY = (u: number, v: number) => (u + v) * HY;

function canvasTex(w: number, h: number, draw: (g: OffscreenCanvasRenderingContext2D) => void) {
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d")!;
  draw(g);
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const BG = "#fdfdfd";
type Icon = "building" | "box" | "people" | "store";

function drawIcon(g: OffscreenCanvasRenderingContext2D, kind: Icon, s: number) {
  // s = canvas px per icon unit; icon drawn in a 100x100 box centred at (0,0)
  g.save();
  g.scale(s, s);
  g.fillStyle = C.icon;
  g.strokeStyle = C.icon;
  g.lineJoin = "round";
  g.lineCap = "round";
    if (kind === "building") {
    // back tower with a slanted roof, front block, right slab, base
    g.beginPath();
    g.moveTo(-16, -33); g.lineTo(18, -40); g.lineTo(18, 34); g.lineTo(-16, 34); g.closePath(); g.fill();
    g.fillRect(-33, -12, 22, 46);
    g.fillRect(22, -20, 7, 54);
    g.fillRect(-40, 33, 79, 5);
    g.fillStyle = BG; g.strokeStyle = BG;
    for (const y of [-2, 12]) for (const x of [-27, -20]) g.fillRect(x, y, 4, 8);
    for (const y of [-22, -8, 6, 20]) for (const x of [-4, 7]) g.fillRect(x, y, 4, 8);
    g.fillRect(-12, -14, 3, 48);
    g.fillRect(18, -40, 4, 74);
    g.fillStyle = C.icon; g.strokeStyle = C.icon;
  } else if (kind === "box") {
    g.beginPath();
    g.moveTo(0, -32); g.lineTo(30, -18); g.lineTo(30, 18); g.lineTo(0, 33); g.lineTo(-30, 18); g.lineTo(-30, -18); g.closePath();
    g.fill();
    g.fillStyle = BG; g.strokeStyle = BG;
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(-30, -18); g.lineTo(0, -3); g.lineTo(30, -18); g.moveTo(0, -3); g.lineTo(0, 33); g.stroke();
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(-16, -25); g.lineTo(14, -10); g.stroke();
    g.fillStyle = C.icon; g.strokeStyle = C.icon;
    g.beginPath(); g.moveTo(14, -10); g.lineTo(14, 2); g.lineTo(19, -1); g.lineTo(19, -12); g.fill();
  } else if (kind === "people") {
    const person = (x: number, y: number, r: number, bw: number, bh: number) => {
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.beginPath();
      g.moveTo(x - bw / 2, y + r + 4 + bh);
      g.lineTo(x - bw / 2, y + r + 4 + bw / 2);
      g.arc(x, y + r + 4 + bw / 2, bw / 2, Math.PI, 0);
      g.lineTo(x + bw / 2, y + r + 4 + bh);
      g.closePath(); g.fill();
    };
    person(-25, -10, 8, 22, 20);
    person(25, -10, 8, 22, 20);
    g.fillStyle = BG; g.strokeStyle = BG;
    g.beginPath(); g.arc(0, -16, 15, 0, Math.PI * 2); g.fill();
    g.fillRect(-19, -2, 38, 40);
    g.fillStyle = C.icon; g.strokeStyle = C.icon;
    person(0, -16, 11, 30, 26);
    g.fillStyle = BG; g.strokeStyle = BG;
    g.fillRect(-4, 14, 8, 12);
    g.fillStyle = C.icon; g.strokeStyle = C.icon;
  } else {
    // store: awning with scallops, body, door
    g.beginPath();
    g.moveTo(-30, -26); g.lineTo(30, -26); g.lineTo(36, -6); g.lineTo(-36, -6); g.closePath(); g.fill();
    for (let i = 0; i < 4; i++) {
      g.beginPath(); g.arc(-27 + i * 18, -6, 9, 0, Math.PI); g.fill();
    }
    g.fillRect(-28, 4, 56, 26);
    g.fillStyle = BG; g.strokeStyle = BG;
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(-12, -26); g.lineTo(-14, -6); g.moveTo(12, -26); g.lineTo(14, -6); g.stroke();
    g.fillRect(-7, 12, 14, 18);
    g.fillStyle = C.icon; g.strokeStyle = C.icon;
    g.fillRect(-28, 0, 56, 2);
  }
  g.restore();
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#fdfdfd");
    fitCamera(camera, height, 50);

    /* ----------------------------------------------------------- the ground */
    const U0 = -4, U1 = 4.2, V0 = -4, V1 = 3; // ground extent (cells)
    const GW = U1 - U0, GH = V1 - V0;

    // sheared groups, one per layer, all sharing the same origin O(f)
    const mkGround = (name: string) => {
      const g = new THREE.Group();
      g.name = name;
      g.matrixAutoUpdate = false;
      g.userData.pickable = false;
      scene.add(g);
      return g;
    };
    const ground = mkGround("ground");
    const layer2 = mkGround("ground-layer-2");
    const layer3 = mkGround("ground-layer-3");
    const ex = new THREE.Vector3(HX * PX, -HY * PX, 0);
    const ey = new THREE.Vector3(-HX * PX, -HY * PX, 0);
    const ez = new THREE.Vector3(0, 0, 1);

    const quad = new THREE.PlaneGeometry(1, 1);
    const addRect = (parent: THREE.Object3D, u: number, v: number, w: number, h: number, mat: THREE.Material, order: number) => {
      const m = new THREE.Mesh(quad, mat);
      m.position.set(u + w / 2, v + h / 2, 0);
      m.scale.set(w, h, 1);
      m.renderOrder = order;
      parent.add(m);
      return m;
    };

    // top layer: glow texture
    const TEX = 1024;
    const topTex = canvasTex(TEX, TEX, (g) => {
      const sx = TEX / GW, sy = TEX / GH;
      g.fillStyle = C.base;
      g.fillRect(0, 0, TEX, TEX);
      // radial glow centred near ground (-0.4, -0.4)
      const gx = (0 - U0) * sx, gy = (-0.2 - V0) * sy;
      const rg = g.createRadialGradient(gx, gy, 0, gx, gy, 5.2 * sx);
      rg.addColorStop(0, C.glow);
      rg.addColorStop(0.45, "#c2d8e3");
      rg.addColorStop(1, "rgba(214,229,236,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, TEX, TEX);
      // fade to near-white at the far (u = U0) edge and toward the front-left
      const lg = g.createLinearGradient(0, 0, 2.2 * sx, 0);
      lg.addColorStop(0, "rgba(246,252,254,0.95)");
      lg.addColorStop(1, "rgba(246,252,254,0)");
      g.fillStyle = lg;
      g.fillRect(0, 0, TEX, TEX);
      const lv = g.createLinearGradient(0, TEX, 0, TEX - 2 * sy);
      lv.addColorStop(0, "rgba(246,252,254,0.6)");
      lv.addColorStop(1, "rgba(246,252,254,0)");
      g.fillStyle = lv;
      g.fillRect(0, 0, TEX, TEX);
      // the right-hand back stretch lightens too
      const lr = g.createLinearGradient(TEX, 0, TEX - 2 * sx, 0);
      lr.addColorStop(0, "rgba(240,247,250,0.8)");
      lr.addColorStop(1, "rgba(240,247,250,0)");
      g.fillStyle = lr;
      g.fillRect(0, 0, TEX, TEX);
      // texture v runs top->bottom = V0 -> V1, but the plane's +y is +v: flip handled by UV below
    });
    topTex.flipY = false;
    const topMat = new THREE.MeshBasicMaterial({ map: topTex, transparent: true, depthWrite: false, depthTest: false });
    addRect(ground, U0, V0, GW, GH, topMat, 3);

    const layerTex = canvasTex(512, 512, (g) => {
      const rg = g.createRadialGradient(300, 260, 0, 300, 260, 360);
      rg.addColorStop(0, "#e2edf2");
      rg.addColorStop(1, "#f7fafb");
      g.fillStyle = rg;
      g.fillRect(0, 0, 512, 512);
    });
    const l2Mat = new THREE.MeshBasicMaterial({ map: layerTex, transparent: true, depthWrite: false, depthTest: false });
    const l3Mat = new THREE.MeshBasicMaterial({ color: "#fbfcfd", transparent: true, depthWrite: false, depthTest: false });
    addRect(layer2, U0, V0, GW, GH, l2Mat, 2);
    addRect(layer3, U0, V0, GW, GH, l3Mat, 1);

    // hairlines: a line in ground space has a constant on-screen width only if its thickness
    // is set per direction; u-lines and v-lines both project at 30 degrees, so 2px on screen
    // is 2 / (2 * HY) cells measured across.
    const lineMat = new THREE.MeshBasicMaterial({ color: C.grid, transparent: true, depthWrite: false, depthTest: false });
    const edgeMat = new THREE.MeshBasicMaterial({ color: C.edge, transparent: true, depthWrite: false, depthTest: false });
    const across = (px: number) => px / (2 * HY) / 0.866; // cells, measured along the other axis
    const t2 = across(1.6);
    for (let u = Math.ceil(U0 + 0.01); u < U1; u++) addRect(ground, u - t2 / 2, V0, t2, GH, lineMat, 4);
    for (let v = Math.ceil(V0 + 0.01); v < V1; v++) addRect(ground, U0, v - t2 / 2, GW, t2, lineMat, 4);
    const te = across(1.4);
    for (const layer of [ground, layer2, layer3]) {
      const o = layer === ground ? 5 : layer === layer2 ? 2.5 : 1.5;
      addRect(layer, U0, V0 - te / 2, GW, te, edgeMat, o);
      addRect(layer, U0 - te / 2, V0, te, GH, edgeMat, o);
      addRect(layer, U0, V1 - te / 2, GW, te, edgeMat, o);
      addRect(layer, U1 - te / 2, V0, te, GH, edgeMat, o);
    }

    // dashed route
    const route: [number, number][] = [[-2, 3], [-2, 2], [2, 2], [2, -2], [-2, -2], [-2, -4]];
    const dashMat = new THREE.MeshBasicMaterial({ color: C.dash, transparent: true, depthWrite: false, depthTest: false });
    const DASH = 22 / 190, GAP = 14 / 190, DW = across(7);
    for (let i = 0; i < route.length - 1; i++) {
      const [u0, v0] = route[i]!;
      const [u1, v1] = route[i + 1]!;
      const len = Math.hypot(u1 - u0, v1 - v0);
      const du = (u1 - u0) / len, dv = (v1 - v0) / len;
      for (let s = 0; s < len - 1e-3; s += DASH + GAP) {
        const l = Math.min(DASH, len - s);
        const cu = u0 + du * (s + l / 2), cv = v0 + dv * (s + l / 2);
        if (du !== 0) addRect(ground, cu - (Math.abs(du) * l) / 2, cv - DW / 2, Math.abs(du) * l, DW, dashMat, 6);
        else addRect(ground, cu - DW / 2, cv - (Math.abs(dv) * l) / 2, DW, Math.abs(dv) * l, dashMat, 6);
      }
    }

    /* ------------------------------------------- camera-facing things on top */
    const overlay = new THREE.Group();
    overlay.name = "iso-overlay";
    scene.add(overlay);

    // corner nodes: white dot with a blue ring
    const nodeTex = canvasTex(64, 64, (g) => {
      g.fillStyle = "#ffffff";
      g.strokeStyle = C.ringStroke;
      g.lineWidth = 7;
      g.beginPath(); g.arc(32, 32, 22, 0, Math.PI * 2); g.fill(); g.stroke();
    });
    const nodeMat = new THREE.MeshBasicMaterial({ map: nodeTex, transparent: true, depthWrite: false, depthTest: false });
    const corners: [number, number][] = [[-2, 2], [2, 2], [2, -2], [-2, -2]];
    const nodes = corners.map((_, i) => {
      const m = new THREE.Mesh(quad, nodeMat);
      m.name = `route-node-${i + 1}`;
      m.scale.set(34 * PX, 34 * PX, 1);
      m.renderOrder = 7;
      overlay.add(m);
      return m;
    });

    // the travelling ring (an iso circle: ellipse with a white core)
    const ringTex = canvasTex(400, 180, (g) => {
      g.fillStyle = C.ringFill;
      g.strokeStyle = C.ringStroke;
      g.lineWidth = 6;
      g.beginPath(); g.ellipse(200, 90, 190, 80, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = "#fdfdfd";
      g.strokeStyle = "#c9dbe4";
      g.lineWidth = 3;
      g.beginPath(); g.ellipse(200, 90, 88, 38, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.strokeStyle = C.ringStroke; g.lineWidth = 5;
      g.beginPath(); g.ellipse(200, 90, 34, 16, 0, 0, Math.PI * 2); g.stroke();
    });
    const ring = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, depthTest: false }));
    ring.name = "route-ring";
    ring.scale.set(164 * PX, 74 * PX, 1);
    ring.renderOrder = 8;
    overlay.add(ring);

    // tiles
    const TILE = 264;
    const mkTile = (kind: Icon) => {
      const S = TILE * RES;
      const tex = canvasTex(S, S, (g) => {
        g.fillStyle = "#fdfdfd";
        g.fillRect(0, 0, S, S);
        g.strokeStyle = C.tileBorder;
        g.lineWidth = 3 * RES;
        g.strokeRect(1.5 * RES, 1.5 * RES, S - 3 * RES, S - 3 * RES);
        g.translate(S / 2, S / 2);
        drawIcon(g, kind, 2.05 * RES);
      });
      const m = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
      m.name = `tile-${kind}`;
      m.renderOrder = 9;
      overlay.add(m);
      return m;
    };
    const tiles = [
      { mesh: mkTile("building"), off: [-498, -131], pop: [[288, 0], [290, 0.5], [292, 1.06], [295, 1], [400, 1]] as [number, number][] },
      { mesh: mkTile("box"), off: [0, 135], pop: [[305, 0], [307, 0.94], [310, 1.08], [313, 1.01], [316, 1], [400, 1]] as [number, number][] },
      { mesh: mkTile("people"), off: [816, -155], pop: [[326.5, 0], [328, 0.36], [331, 1.1], [334, 1.02], [337, 1], [400, 1]] as [number, number][] },
      { mesh: mkTile("store"), off: [-164, -513], pop: [[341.5, 0], [343.5, 0.45], [345.5, 0.75], [348, 1.03], [351, 1], [400, 1]] as [number, number][] },
    ].map((t) => ({ ...t, scaleK: glide(t.pop) }));

    // "IT implementation" on a card standing along the back edge
    const TXT = { size: 80, weight: 400, tracking: 0 };
    const txtSize = 80 * (735 / measure("IT implementation", TXT));
    const it = label("IT implementation", { ...TXT, size: txtSize, color: C.ink }, "left", 8);
    it.name = "it-implementation";
    setLabel(it, { color: new THREE.Color(C.ink) });
    const card = new THREE.Group();
    card.name = "it-implementation-card";
    card.matrixAutoUpdate = false;
    const cardMat = new THREE.MeshBasicMaterial({ color: "#fdfdfd", transparent: true, opacity: 0.6, depthWrite: false, depthTest: false });
    const cardEdge = new THREE.MeshBasicMaterial({ color: "#e9eef1", transparent: true, depthWrite: false, depthTest: false });
    const CARD_W = 1000 * PX, CARD_H = 150 * PX;
    const cb = new THREE.Mesh(quad, cardMat); cb.scale.set(CARD_W, CARD_H, 1); cb.position.set(CARD_W / 2 - 60 * PX, 0, 0); cb.renderOrder = 10;
    const ct = new THREE.Mesh(quad, cardEdge); ct.scale.set(CARD_W, 2 * PX, 1); ct.position.set(CARD_W / 2 - 60 * PX, CARD_H / 2, 0); ct.renderOrder = 10;
    const cbt = ct.clone(); cbt.position.y = -CARD_H / 2;
    it.renderOrder = 11;
    it.material.depthTest = false;
    card.add(cb, ct, cbt, it);
    card.userData.pickable = false;
    it.userData.pickable = true;
    scene.add(card);
    const skew = new THREE.Matrix4();
    const cos30 = Math.cos(Math.PI / 6), sin30 = Math.sin(Math.PI / 6);

    /* ------------------------------------------------------------ the camera */
    const OX = glide([[286, 2240], [287, 2055], [288, 1872], [291, 1320], [294, 1110], [295, 1065], [298, 982], [301, 950], [304, 922], [307, 914], [310, 910], [313, 902], [316, 894], [319, 886], [322, 874], [325, 858], [328, 850], [331, 834], [334, 818], [337, 800], [340, 782], [343, 762], [346, 746], [349, 726], [352, 714], [355, 694], [358, 674], [361, 658], [364, 638], [367, 624], [370, 614], [373, 598], [376, 590], [379, 574], [382, 564], [385, 550], [388, 530], [391, 490], [394, 396], [396, 300]]);
    const OY = glide([[286, 6], [287, 92], [288, 178], [291, 438], [294, 520], [295, 545], [298, 597], [301, 615], [304, 627], [307, 631], [310, 635], [313, 639], [316, 643], [319, 651], [322, 659], [325, 667], [328, 675], [331, 687], [334, 695], [337, 707], [340, 721], [343, 735], [346, 747], [349, 759], [352, 767], [355, 783], [358, 795], [361, 807], [364, 819], [367, 831], [370, 847], [373, 855], [376, 863], [379, 871], [382, 879], [385, 887], [388, 899], [391, 919], [394, 971], [396, 1025]]);
    // layer gaps close a little as the ground lands
    const gap2 = glide([[286, 1.45], [291, 1.3], [300, 1.15], [396, 1.1]]);
    const gap3 = glide([[286, 2.5], [291, 2.25], [300, 2.0], [396, 1.95]]);

    // ring route timing: [segment index, progress]
    const segAB = glide([[291, 0], [294, 0.15], [300, 0.74], [303, 0.86], [308, 1]]);
    const segBC = glide([[312, 0], [315, 0.09], [318, 0.45], [321, 0.84], [327, 1]]);
    const segCD = glide([[333, 0], [336, 0.25], [339, 0.9], [343, 1]]);
    const segDE = glide([[356, 0], [363, 0.9], [369, 1.9], [373, 2]]);
    const ringAt = (f: number): [number, number] => {
      if (f < 308) { const t = segAB(f); return [-2 + 4 * t, 2]; }
      if (f < 327) { const t = segBC(f); return [2, 2 - 4 * t]; }
      if (f < 343) { const t = segCD(f); return [2 - 4 * t, -2]; }
      return [-2, -2 - segDE(f)];
    };
    const ringShrink = glide([[356, 1], [364, 0.85], [372, 0.66]]);
    const nodeFrom = [293, 309, 330, 350];

    const m4 = new THREE.Matrix4();
    const setGround = (g: THREE.Group, ox: number, oy: number) => {
      m4.makeBasis(ex, ey, ez).setPosition(rx(ox), ry(oy), 0);
      g.matrix.copy(m4);
      g.matrixWorldNeedsUpdate = true;
    };

    return ({ frame: local }) => {
      const f = local + G0;
      const ox = OX(f), oy = OY(f);
      setGround(ground, ox, oy);
      setGround(layer2, ox, oy + gap2(f) * UP);
      setGround(layer3, ox, oy + gap3(f) * UP);

      const at = (u: number, v: number, o: THREE.Object3D, dx = 0, dy = 0) =>
        o.position.set(rx(ox + projX(u, v) + dx), ry(oy + projY(u, v) + dy), 0);

      const [ru, rv] = ringAt(f);
      at(ru, rv, ring);
      const rs = ringShrink(f);
      ring.scale.set(164 * rs * PX, 74 * rs * PX, 1);

      nodes.forEach((n, i) => {
        n.visible = f >= nodeFrom[i]!;
        at(corners[i]![0], corners[i]![1], n);
      });

      tiles.forEach((t) => {
        const s = t.scaleK(f);
        t.mesh.visible = s > 0.01;
        // grows out of its lower-left corner
        const half = (TILE / 2) * (1 - s);
        t.mesh.position.set(rx(ox + t.off[0]! - half), ry(oy + t.off[1]! + half), 0);
        t.mesh.scale.set(TILE * s * PX, TILE * s * PX, 1);
      });

      // card: baseline runs down-right along +u, letters stand straight up
      skew.set(
        cos30, 0, 0, rx(ox + 320),
        -sin30, 1, 0, ry(oy - 786 + 33 + txtSize * 0.36),
        0, 0, 1, 0,
        0, 0, 0, 1,
      );
      card.matrix.copy(skew);
      card.matrixWorldNeedsUpdate = true;
      void clamp01;
    };
  });
}
