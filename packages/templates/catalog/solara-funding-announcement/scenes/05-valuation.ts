import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, F } from "../components/brand";
import { at, keys, measure, rect, sizeForInk, stage, text, withFonts, wx, wy } from "../components/kit";

/** Global frames 170–222: "$8.4B valuation" on navy, growing in three hard steps. */
const START = 170;
const STATIC: number | null = null;

// Measured: main line ink box per step, and the gap opening between "$8.4B" and "valuation".
// step: [fromFrame, mainLeft, mainRight, mainInkBottom(baseline-ish), solaraLeft, solaraRight, solaraTop]
const STEPS: [number, number, number, number, number, number, number][] = [
  [170, 602, 1306, 594, 908, 1010, 458],
  [197, 576, 1356, 600, 910, 1020, 450],
  [205, 536, 1420, 608, 914, 1040, 440],
  [218, 470, 1524, 622, 922, 1072, 420],
];
// During the first step the words drift apart: ink left / right edges (global frames).
const DRIFT_L: [number, number][] = [[171, 618], [172, 614], [173, 612], [174, 610], [176, 608], [178, 606], [180, 604], [185, 602]];
const DRIFT_R: [number, number][] = [[171, 1294], [172, 1298], [173, 1300], [175, 1302], [177, 1304], [182, 1306]];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    stage(ctx, C.beige);
    const { scene } = ctx;
    const card = rect("valuation-panel", 60, 54, 1860, 1026, C.navy, 32);
    card.userData.pickable = false;

    const st = { font: F.poppins, weight: 400, size: 100, color: C.white };
    // Base size: "$8.4B valuation" ink width 704 at step one.
    const size = sizeForInk("$8.4B valuation", st, 704);
    const s = { ...st, size };
    const amount = text("valuation-amount", "$8.4B", s);
    const word = text("valuation-word", "valuation", s);
    const lab = { font: F.poppins, weight: 400, size: 100, color: C.white };
    const solara = text("valuation-solara", "Solara", { ...lab, size: sizeForInk("Solara", lab, 102) });

    // Words live in a group so the step scale is one transform.
    const main = new THREE.Group();
    main.name = "valuation-line";
    main.add(amount, word);
    const amtInk = measure("$8.4B", s).ink;
    const wordInk = measure("valuation", s).ink;
    const amtDesc = measure("$8.4B", s).descent;
    const solAsc = measure("Solara", { ...lab, size: solara.userData.size }).ascent;
    scene.add(card, main, solara);

    const baseW = STEPS[0][2] - STEPS[0][1];

    return ({ frame }) => {
      const g = STATIC ?? frame + START;
      let k = 0;
      for (let i = 0; i < STEPS.length; i++) if (g >= STEPS[i][0]) k = i;
      const [, l, r, bottom, sl, sr, stop] = STEPS[k];
      const scale = (r - l) / baseW;
      // in local (unscaled) px, centred on 0
      let L = l;
      let R = r;
      if (k === 0) {
        L = keys(g, DRIFT_L);
        R = keys(g, DRIFT_R);
      }
      const cx = (L + R) / 2;
      const halfLocal = (R - L) / 2 / scale;
      amount.position.set(-halfLocal, 0, 0);
      word.position.set(halfLocal - wordInk, 0, 0);
      main.scale.setScalar(scale);
      // "$" descends below the baseline: the measured bottom is the "$" tail
      main.position.set(wx(cx), wy(bottom - amtDesc * scale + 6 * scale), 0);
      void amtInk;

      solara.scale.setScalar((sr - sl) / 102);
      at(solara, sl, stop + solAsc * ((sr - sl) / 102));
    };
  });
}
