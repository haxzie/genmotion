import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, F } from "../components/brand";
import { blur, keys, measure, rect, sizeForInk, solaraMark, stage, text, withFonts, wx, wy } from "../components/kit";

/** Global frames 552–595: the Solara lockup settles out of a blur and holds. */
const START = 552;
const STATIC: number | null = null;
const CARD = [44, 50, 1876, 1030] as const;

// Vertical centre of the lockup (global frames), measured, and its blur in px.
const CY: [number, number][] = [[552, 467], [553, 475], [554, 481], [555, 485], [556, 489], [557, 493], [558, 497], [559, 500], [560, 502], [561, 506], [562, 508], [563, 511], [564, 513], [565, 515], [566, 517], [567, 519], [568, 521], [569, 523], [570, 524], [572, 527], [580, 529], [595, 530]];
const BLUR: [number, number][] = [[552, 14], [555, 8], [558, 3], [561, 0]];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    stage(ctx, C.beige);
    const { scene } = ctx;
    const card = rect("end-panel", ...CARD, C.navy, 28);
    card.userData.pickable = false;

    const mark = solaraMark("end-mark", 108, "white");
    const lab = { font: F.poppins, weight: 500, size: 100, color: C.white };
    const word = text("end-solara", "Solara", { ...lab, size: sizeForInk("Solara", lab, 266) }, "left", 40);
    const asc = measure("Solara", { ...lab, size: word.userData.size }).ascent;
    const lockup = new THREE.Group();
    lockup.name = "end-lockup";
    lockup.add(mark, word);
    scene.add(card, lockup);

    return ({ frame }) => {
      const g = STATIC ?? frame + START;
      const cy = keys(g, CY);
      const b = keys(g, BLUR);
      mark.position.set(wx(810), wy(cy), 0);
      word.position.set(wx(890), wy(cy - asc / 2 + asc), 0);
      blur(mark, b);
      blur(word, b);
    };
  });
}
