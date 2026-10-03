/**
 * 04 — "One platform … to train & serve" (film frames 248–317, 24 fps)
 * Two cards on a grey ground: the line on the left card, a Train / Deploy /
 * Evaluate / Retrain list scrolling through a highlight on the right card.
 * Words pop in and out as separate labels; every track is measured off the
 * reference (word ink edges, list position and per-row opacity per frame).
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { pixelStage, sx, sy } from "../components/stage";
import { withBrandFonts, C } from "../components/brand";
import { label, setLabel, measure, type TypeStyle } from "../components/type";
import { inkPlacer } from "../components/place";
import { rrect } from "../components/rect";
import { texPlane } from "../components/ui";
import { tileTexture } from "../components/tiles";
import { LIST } from "../components/listData";
import { sampled } from "../components/ease";

const START = 248;
const PURPLE = C.red; // the brand colour (name kept from the template)
const INK_STYLE: TypeStyle = { size: 129, weight: 500, tracking: -0.025, color: "#000000" };
const ITEM: TypeStyle = { size: 129, weight: 500, tracking: -0.025, color: PURPLE };
const BASELINE = 588; // measured baseline of the left line
const PITCH = 141.7;

function solid(w: number, h: number, color: string, name: string, order: number) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
  );
  m.name = name;
  m.renderOrder = order;
  return m;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => {
    const { scene } = ctx;
    pixelStage(ctx, "#f5f5f5");

    // ---- cards (screen-space rectangles, x shifted by the panel pan at the end)
    const layout = new THREE.Group();
    layout.name = "cards";
    scene.add(layout);
    const leftCard = rrect("left-card", 965, 1000, 24, "#ffffff");
    leftCard.set({ stroke: "#e2e2e2", strokeA: 1, strokeW: 1 });
    leftCard.renderOrder = 1;
    const bridge = solid(97, 538, "#ffffff", "card-bridge", 2); // white above the gutter
    const gutterTop = solid(94, 1, "#e5e5e5", "gutter-edge", 3);
    const rightCard = solid(800, 1080, "#ffffff", "right-card", 2);
    const rightEdgeL = solid(1, 1080, "#ececec", "right-card-edge-left", 3);
    const rightEdgeR = solid(1, 1080, "#ececec", "right-card-edge-right", 3);
    const farLine = solid(60, 2, "#d9d9d9", "guide-line", 3);
    const farEdge = solid(1, 1080, "#dddddd", "far-card-edge", 3);
    const dotA = solid(7, 7, C.orange, "anchor-dot-left", 4);
    const dotB = solid(7, 7, C.orange, "anchor-dot-right", 4);
    layout.add(leftCard, bridge, gutterTop, rightCard, rightEdgeL, rightEdgeR, farLine, farEdge, dotA, dotB);

    // ---- list
    const kinds = ["train", "deploy", "evaluate", "retrain"];
    const words = ["Build", "Deploy", "Monitor", "Scale"];
    const rows = kinds.map((k, i) => {
      const tile = texPlane(101, 101, tileTexture(k), `${k}-tile`);
      tile.renderOrder = 10;
      const word = label(words[i]!, ITEM, "left");
      word.name = `${k}-label`;
      word.renderOrder = 10;
      const place = inkPlacer(words[i]!, ITEM);
      scene.add(tile, word);
      return { tile, word, place };
    });

    // ---- the line on the left card: one label per word, each with its own measured ink-left track
    // `as` swaps the word's copy: its measured track is kept and shifted by `dx` so the gaps hold
    const W = (text: string, keys: [number, number][], from: number, to: number, as = text, dx = 0) => {
      text = as;
      keys = keys.map(([f, x]) => [f, x + dx]);
      const m = label(text, INK_STYLE, "left");
      m.name = `word-${text === "&" ? "and" : text.toLowerCase()}`;
      m.renderOrder = 12;
      scene.add(m);
      return { m, p: inkPlacer(text, INK_STYLE), x: sampled(keys), from, to };
    };
    // "train" -> "build": keep the word's right edge (next to "&") and slide "to" by the same amount
    const dBuild = measure("train", INK_STYLE) - measure("build", INK_STYLE);
    const line = [
      W("One", [[248, 94], [249, 85], [250, 79], [251, 76], [252, 73], [253, 72], [254, 71], [280, 71], [281, 72], [282, 76], [283, 88]], 248, 284),
      W("platform", [[251, 348], [252, 340], [253, 334], [254, 330], [255, 328], [256, 327], [257, 326], [258, 325], [279, 325], [280, 327], [281, 331], [282, 343]], 251, 283),
      W("serve", [[283, 556], [284, 564], [285, 570], [286, 574], [287, 576], [288, 578], [289, 579], [308, 579], [309, 580], [310, 585], [311, 596], [312, 628]], 283, 313),
      W("&", [[285, 455], [286, 463], [287, 469], [288, 473], [289, 476], [290, 477], [291, 478], [310, 478], [311, 479], [312, 484], [313, 495], [314, 527]], 285, 315),
      W("train", [[287, 188], [288, 197], [289, 202], [290, 206], [291, 209], [292, 210], [293, 211], [312, 211], [313, 212], [314, 217], [315, 228], [316, 260]], 287, 317, "build", dBuild),
      W("to", [[289, 53], [290, 61], [291, 67], [292, 71], [293, 73], [294, 75], [295, 76], [314, 76], [315, 77], [316, 82], [317, 93]], 289, 318, "to", dBuild),
    ];

    // the Retrain tile leaves the list for the orbit (316–317)
    const flyX = sampled([[316, 1120], [317, 1026]]);
    const flyY = sampled([[316, 559], [317, 768]]);

    return ({ frame: local }) => {
      const F = local + START;
      const L = LIST[Math.min(Math.max(F - START, 0), LIST.length - 1)]!;
      const [, top, alphas, dx, tileH] = L;

      // cards
      // the card runs off the top-left corner so only its bottom-right corner is rounded
      leftCard.set({ w: 995 + dx, h: 1030.5 });
      leftCard.position.set(sx((965.5 + dx - 30) / 2), sy((1000.5 - 30) / 2), 0);
      bridge.position.set(sx(965 + dx + 47.5), sy(269), 0);
      gutterTop.position.set(sx(965 + dx + 48), sy(538.5), 0);
      rightCard.position.set(sx(1060 + dx + 400), 0, 0);
      rightEdgeL.position.set(sx(1059.5 + dx), 0, 0);
      rightEdgeR.position.set(sx(1859.5 + dx), 0, 0);
      farLine.position.set(sx(1890 + dx), sy(539.5), 0);
      farEdge.position.set(sx(1918.5 + dx), 0, 0);
      dotA.position.set(sx(1060 + dx), sy(539), 0);
      dotB.position.set(sx(1860 + dx), sy(539), 0);

      // list rows
      const s = 1; void tileH; // measured height dips at 313-317 are the glyph splitting the scan, not a real scale
      rows.forEach((r, i) => {
        const a = alphas[i] ?? 0;
        const y = top + PITCH * i + tileH / 2;
        const flying = i === 3 && F >= 316;
        const tx = flying ? flyX(F) : 1120 + dx;
        const ty = flying ? flyY(F) + tileH / 2 : y;
        r.tile.visible = a > 0.003 || flying;
        r.tile.scale.setScalar(s);
        r.tile.position.set(sx(tx + 48.5 * s), sy(ty), 0);
        (r.tile.material as THREE.MeshBasicMaterial).opacity = flying ? 1 : a;
        const textA = flying ? 0 : a;
        setLabel(r.word, { opacity: textA });
        r.place.atBase(r.word, (i === 0 ? 1250 : 1255) + dx, y + 47);
      });

      // the line
      for (const w of line) {
        const on = F >= w.from && F < w.to;
        w.m.visible = on;
        if (on) w.p.atBase(w.m, w.x(F), BASELINE);
      }
    };
  });
}
