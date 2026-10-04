import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, rx, ry } from "../components/stage";
import { glide, prog, outCubic, inCubic, inQuad } from "../components/ease";
import { line, measure, setLabel, withInter, GREY_FROM } from "../components/type";

/**
 * Global f551–f630 (scene frame = global - 551).
 * "All without breaking" assembles word by word. Six thin glassy slabs rise from below and
 * topple forward like dominoes, left to right, flattening out of frame. The first line
 * slides left and fades to a ghost while "years of custom logic." arrives over it.
 */
const G0 = 551;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#fdfdfd");
    fitCamera(camera, height, 50);

    const ST = { weight: 400, tracking: 0.01 };
    const size = 100 * (1044 / measure("years of custom logic.", { ...ST, size: 100 }));
    const style = { ...ST, size };

    /* ------------------------------------------------ line 1 */
    const l1 = line("All without breaking", style, "left");
    l1.group.position.y = ry(530);
    scene.add(l1.group);
    const allW = measure("All", style);
    const l1Left = glide([[550, 1038 - allW / 2], [553, 1000], [556, 623], [559, 537], [562, 490], [565, 456], [568, 426], [571, 306], [574, 167], [577, 140], [583, 130], [630, 118]]);
    const l1Spread = glide([[553, 120], [556, 70], [559, 30], [562, 12], [566, 0]]);
    const l1In = [549, 552, 554];
    const l1Ink = [new THREE.Color("#838383"), new THREE.Color("#838383"), new THREE.Color("#c2c2c2")];

    /* ------------------------------------------------ line 2 */
    const l2 = line("years of *custom* *logic.*", style, "left");
    l2.group.position.y = ry(530);
    scene.add(l2.group);
    const l2Left = glide([[575, 780], [577, 733], [580, 617], [583, 560], [586, 519], [589, 490], [592, 480], [600, 460], [610, 444], [622, 432]]);
    const l2Spread = glide([[576, 90], [580, 50], [584, 18], [588, 0]]);
    const l2In = [574, 576, 578, 580];
    const grey = new THREE.Color("#787878");
    const teal = new THREE.Color("#457f97");

    /* ------------------------------------------------ the slabs */
    const slabs = new THREE.Group();
    slabs.name = "slabs";
    scene.add(slabs);
    const W = 500 * PX, D = 30 * PX;
    // [left x px, top y px] measured on the standing pose; later ones are nearer the camera
    const POSE: [number, number][] = [[330, 704], [536, 690], [674, 770], [790, 730], [890, 810], [1076, 830]];
    // the slab's face: grey glass with a white rim on its left and top, hairline outlined
    const faceCanvas = new OffscreenCanvas(500, 450);
    {
      const g = faceCanvas.getContext("2d")!;
      g.fillStyle = "#d6d6d6";
      g.fillRect(0, 0, 500, 450);
      g.fillStyle = "#fbfbfb";
      g.fillRect(0, 0, 500, 16);
      g.fillRect(0, 0, 16, 450);
      g.strokeStyle = "#4a4a4a";
      g.lineWidth = 2.5;
      g.strokeRect(1.25, 1.25, 497.5, 1200);
      g.beginPath();
      g.moveTo(16, 450); g.lineTo(16, 16); g.lineTo(500, 16);
      g.stroke();
    }
    const faceTex = new THREE.CanvasTexture(faceCanvas as unknown as HTMLCanvasElement);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    faceTex.anisotropy = 8;
    const items = POSE.map(([x, top], i) => {
      const white = new THREE.MeshBasicMaterial({ color: "#fbfbfb", transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      const face = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, opacity: i >= 4 ? 0.72 : 0.96, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      // box material order: +x, -x, +y, -y, +z (front), -z
      // each slab stands on a floor just below the frame, so it pivots near the bottom edge
      const hPx = 1130 - top;
      const g0 = new THREE.BoxGeometry(W, hPx * PX, D);
      g0.translate(W / 2, (hPx * PX) / 2, -D / 2);
      const m = new THREE.Mesh(g0, [white, white, white, white, face, face]);
      m.name = `slab-${i + 1}`;
      const z = i * 40 * PX;
      // place so the standing top edge lands on the measured screen y (base 1000px below it)
      const g = new THREE.Group();
      g.position.set(rx(x), ry(1130), z);
      const shear = new THREE.Group();
      shear.matrixAutoUpdate = false;
      shear.add(m);
      g.add(shear);
      m.rotation.y = 0.45;
      slabs.add(g);
      return { g, m, shear, white, face, baseY: g.position.y, i };
    });
    const rise = (i: number, f: number) => prog(f, 554 + i * 1.7, 9, outCubic);
    const fall = (i: number, f: number) => prog(f, 566 + i * 1.1, 14, inQuad);

    const tint = new THREE.Color();

    return ({ frame: local }) => {
      const f = local + G0;

      /* line 1 */
      const ghost = prog(f, 570, 5, outCubic); // 0 -> 1 as it becomes a ghost
      const l1Gone = prog(f, 624, 5, inCubic);
      const left1 = l1Left(f);
      l1.words.forEach((w, i) => {
        const p = prog(f, l1In[i]!, 7, outCubic);
        w.position.x = rx(left1) + w.userData.restX + l1Spread(f) * i * PX + (1 - p) * 30 * PX;
        tint.copy(GREY_FROM).lerp(l1Ink[i]!, prog(f, l1In[i]! + 1, 8, outCubic));
        setLabel(w, {
          opacity: Math.min(1, p * 1.5) * (1 - ghost * 0.965) * (1 - l1Gone),
          blur: (1 - p) * 10 + ghost * 1.5,
          color: tint,
          maskX: f >= 575 ? rx(l2Left(f)) - 6 * PX : 1e9,
          maskSoft: f >= 575 ? 40 * PX : 0,
        });
      });

      /* line 2 */
      const out2 = prog(f, 610, 11);
      const left2 = l2Left(f);
      l2.words.forEach((w, i) => {
        const p = prog(f, l2In[i]!, 7, outCubic);
        w.visible = f >= l2In[i]!;
        w.position.x = rx(left2) + w.userData.restX + l2Spread(f) * i * PX + (1 - p) * 30 * PX;
        const ink = w.userData.accent ? teal : grey;
        tint.copy(GREY_FROM).lerp(ink, prog(f, l2In[i]! + 1, 8, outCubic));
        setLabel(w, { opacity: Math.min(1, p * 1.5) * (1 - out2), blur: (1 - p) * 10 + out2 * 3, color: tint });
      });

      /* slabs */
      for (const s of items) {
        const r = rise(s.i, f);
        const fl = fall(s.i, f);
        s.g.position.y = s.baseY - (1 - r) * 520 * PX - fl * 60 * PX;
        const a = fl * 1.25; // lean angle: the slab shears over to the left, top edge level
        s.shear.matrix.set(1, Math.sin(a), 0, 0, 0, Math.cos(a), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
        s.shear.matrixWorldNeedsUpdate = true;
        const o = r * (1 - prog(f, 586 + s.i * 0.8, 6, inCubic));
        s.g.visible = o > 0.01;
        s.white.opacity = o;
        s.face.opacity = o * (s.i >= 4 ? 0.72 : 0.96);
      }
    };
  });
}
