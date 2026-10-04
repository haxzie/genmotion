import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, F } from "../components/brand";
import { at, clipTo, keys, measure, rect, setBox, sizeForInk, stage, table, text, withFonts } from "../components/kit";
import type { Panel } from "../components/kit";

/** Global frames 29–85: "Solara announcing $400M" between two growing stacks of colour bars. */
const START = 29;
const STATIC: number | null = null;

// Per-frame bar edges measured off the reference (global frames 29..85), at the x = 960 column.
// Top stack: each bar's BOTTOM edge. Bottom stack: each bar's TOP edge.
const N = null;
const TOP = {
  cyan: [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, 101, 104, 107, 109, 109, 111, 111, 113, 113, 113, 113, 113, 113, 113, 113, 121, 121, 121, 121, 121, 121, 121, 121, 121, 121, 121, 121, 121, 121, 121, 121, 121, 121],
  yellow: [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, 131, 135, 139, 143, 146, 149, 151, 154, 156, 158, 160, 162, 163, 164, 165, 166, 166, 167, 167, 167, 167, 167, 167, 167, 174, 174, 174, 174, 174, 174, 174, 174, 174, 174, 174, 174, 174, 174, 174, 174, 174, 174],
  orange: [N, N, N, N, N, N, N, N, 169, 174, 179, 183, 187, 189, 193, 197, 199, 201, 205, 207, 209, 211, 213, 214, 215, 217, 218, 219, 220, 221, 221, 221, 221, 221, 221, 221, 221, 221, 221, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227],
  green: [185, 201, 210, 216, 221, 226, 230, 234, 237, 240, 243, 246, 248, 251, 253, 255, 257, 259, 260, 262, 263, 265, 266, 267, 268, 269, 270, 271, 271, 272, 272, 272, 272, 272, 272, 272, 272, 272, 272, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277],
};
const BOT = {
  green: [878, 862, 854, 848, 843, 839, 835, 832, 829, 826, 823, 820, 818, 816, 814, 812, 810, 808, 806, 806, 804, 802, 802, 800, 800, 798, 798, 796, 796, 796, 796, 796, 796, 796, 796, 796, 796, 796, 796, 832, 832, 832, 832, 832, 832, 832, 832, 832, 832, 832, 832, 832, 832, 832, 832, 832, 832],
  orange: [N, N, N, N, N, N, N, N, 894, 890, 886, 882, 878, 876, 872, 870, 866, 865, 862, 860, 858, 856, 854, 852, 852, 850, 848, 848, 846, 846, 846, 846, 846, 846, 846, 846, 846, 846, 846, 888, 888, 888, 888, 888, 888, 888, 888, 888, 888, 888, 888, 888, 888, 888, 888, 888, 888],
  yellow: [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, 930, 927, 922, 920, 916, 914, 911, 908, 906, 904, 902, 901, 900, 899, 898, 897, 897, 896, 896, 896, 896, 896, 896, 896, 947, 947, 947, 947, 947, 947, 947, 947, 947, 947, 947, 947, 947, 947, 947, 947, 947, 947],
  cyan: [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N, 958, 958, 956, 954, 952, 952, 950, 950, 948, 950, 948, 948, 948, 948, 948, 1006, 1006, 1006, 1006, 1006, 1006, 1006, 1006, 1006, 1006, 1006, 1006, 1006, 1006, 1006, 1006, 1006, 1006],
};
// Half widths (px) per bar, keyed on global frames.
const HW_TOP = {
  green: [[29, 266], [36, 240], [43, 212], [67, 211], [68, 274]] as [number, number][],
  orange: [[37, 290], [43, 273], [45, 252], [67, 250], [68, 326]] as [number, number][],
  yellow: [[44, 300], [49, 292], [67, 292], [68, 383]] as [number, number][],
  cyan: [[53, 347], [60, 339], [67, 339], [68, 447]] as [number, number][],
};
const HW_BOT = {
  green: [[29, 262], [31, 255], [37, 247], [43, 234], [52, 258], [67, 257], [68, 284]] as [number, number][],
  orange: [[37, 298], [52, 302], [67, 302], [68, 334]] as [number, number][],
  yellow: [[44, 330], [52, 310], [60, 350], [67, 350], [68, 390]] as [number, number][],
  cyan: [[53, 400], [67, 400], [68, 445]] as [number, number][],
};
// The exit (global 72..85): edges sweep out on this measured acceleration curve.
const EXIT = [0, 0.013, 0.027, 0.047, 0.067, 0.094, 0.128, 0.178, 0.235, 0.315, 0.426, 0.577, 0.779, 1];
const EXIT_TOP_RIGHT = 1185;
const EXIT_TOP_LEFT = { cyan: -120, yellow: 296, orange: 455, green: 630 };
const EXIT_BOT_LEFT = 750;
const EXIT_BOT_RIGHT = { green: 1317, orange: 1473, yellow: 1647, cyan: 2000 };

type Key = "green" | "orange" | "yellow" | "cyan";
const ORDER: Key[] = ["green", "orange", "yellow", "cyan"]; // narrow first, wider bars drawn over them
// Horizontal motion blur on each bar's sides (gaussian sigma, px), measured from edge widths in the
// reference: the outer, wider bars are softer; the top and bottom edges stay sharp.
const SOFT_TOP: Record<Key, number> = { cyan: 9, yellow: 7, orange: 5, green: 3 };
const SOFT_BOT: Record<Key, number> = { cyan: 11, yellow: 10, orange: 8, green: 7 };

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    stage(ctx, C.navy);
    const { scene } = ctx;
    const CARD = [45, 44, 1875, 1035] as const;
    const card = rect("frame-card", ...CARD, C.beige, 26);
    card.userData.pickable = false;
    scene.add(card);

    const top: Record<Key, Panel> = {} as Record<Key, Panel>;
    const bot: Record<Key, Panel> = {} as Record<Key, Panel>;
    const topStack = new THREE.Group();
    topStack.name = "bar-stack-top";
    const botStack = new THREE.Group();
    botStack.name = "bar-stack-bottom";
    for (const k of ORDER) {
      top[k] = rect(`bar-top-${k}`, 0, 0, 1, 1, C[k], 22);
      bot[k] = rect(`bar-bottom-${k}`, 0, 0, 1, 1, C[k], 22);
      clipTo(top[k], ...CARD, 26);
      clipTo(bot[k], ...CARD, 26);
      top[k].material.uniforms.uSoftX.value = SOFT_TOP[k];
      bot[k].material.uniforms.uSoftX.value = SOFT_BOT[k];
      top[k].material.uniforms.uSoftY.value = SOFT_TOP[k] * 0.3;
      bot[k].material.uniforms.uSoftY.value = SOFT_BOT[k] * 0.5;
      topStack.add(top[k]);
      botStack.add(bot[k]);
    }
    scene.add(topStack, botStack);

    // Type: a small lockup (29..67) that snaps to a large one (68..).
    const ann = { font: F.poppins, weight: 500, size: 100, color: C.black };
    const num = { font: F.open, weight: 400, size: 100, color: C.ink400 };
    const annSmall = text("solara-announcing", "Solara announcing", { ...ann, size: sizeForInk("Solara announcing", ann, 292) }, "center");
    const numSmall = text("raise-400m", "$400M", { ...num, size: sizeForInk("$400M", num, 422) }, "center");
    const annBig = text("solara-announcing-large", "Solara announcing", { ...ann, size: sizeForInk("Solara announcing", ann, 573) }, "center");
    const numBig = text("raise-400m-large", "$400M", { ...num, size: sizeForInk("$400M", num, 725) }, "center");
    const lockup = new THREE.Group();
    lockup.name = "announcement";
    lockup.add(annSmall, numSmall, annBig, numBig);
    scene.add(lockup);

    const dSmall = measure("$400M", { ...num, size: numSmall.userData.size }).descent;
    const dBig = measure("$400M", { ...num, size: numBig.userData.size }).descent;
    const aSmall = measure("Solara announcing", { ...ann, size: annSmall.userData.size }).ascent;
    const aBig = measure("Solara announcing", { ...ann, size: annBig.userData.size }).ascent;
    // $400M ink bottom per frame while small
    const NUM_BOTTOM = [650, 646, 642, 640, 638, 636, 634, 632, 630, 630, 628, 626, 624, 624, 622, 622, 620, 620, 620, 620, 618];

    // During the exit a bar leaves the measuring column; hold its last measured edge (pure lookup).
    const held = (arr: (number | null)[], g: number) => {
      for (let i = Math.min(arr.length - 1, g - START); i >= 0; i--) if (arr[i] != null) return arr[i];
      return null;
    };

    return ({ frame }) => {
      const g = STATIC ?? frame + START;
      const ex = g >= 72 ? EXIT[Math.min(EXIT.length - 1, g - 72)] : 0;
      const cxT = g >= 68 ? 982 : 978;
      const cxB = g >= 68 ? 982 : 977;

      for (const k of ORDER) {
        // top stack
        const b = g >= 72 ? held(TOP[k], g) : table(g, START, TOP[k]);
        const t = top[k];
        if (b == null) t.visible = false;
        else {
          t.visible = true;
          const hw = keys(g, HW_TOP[k]);
          let l = cxT - hw;
          let r = cxT + hw;
          l += (EXIT_TOP_LEFT[k] - l) * ex;
          r += (EXIT_TOP_RIGHT - r) * ex;
          setBox(t, l, -200, r, b);
        }
        // bottom stack
        const a = g >= 72 ? held(BOT[k], g) : table(g, START, BOT[k]);
        const p = bot[k];
        if (a == null) p.visible = false;
        else {
          p.visible = true;
          const hw = keys(g, HW_BOT[k]);
          let l = cxB - hw;
          let r = cxB + hw;
          l += (EXIT_BOT_LEFT - l) * ex;
          r += (EXIT_BOT_RIGHT[k] - r) * ex;
          setBox(p, l, a, r, 1300);
        }
      }

      const big = g >= 68;
      annSmall.visible = numSmall.visible = !big;
      annBig.visible = numBig.visible = big;
      if (!big) {
        const nb = table(g, START, NUM_BOTTOM) ?? 618;
        at(numSmall, 975, nb - dSmall);
        at(annSmall, 977, 464 + aSmall);
      } else {
        at(numBig, 965, 682 - dBig);
        at(annBig, 983, 416 + aBig);
      }
    };
  });
}
