import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, F } from "../components/brand";
import { at, blur, clipTo, measure, rect, solaraMark, stage, table, text, withFonts, wx, wy } from "../components/kit";

/** Global frames 0–28: the raise counting up to $400M, rising into frame. */
const START = 0;
const STATIC: number | null = null; // set to a global frame to freeze the pose

// Top of the "$" glyph per frame, measured off the reference (global frames 0-28).
const DOLLAR_TOP = [740, 716, 699, 684, 670, 660, 648, 638, 628, 620, 610, 602, 596, 588, 582, 576, 572, 566, 562, 557, 553, 550, 547, 544, 542, 540, 538, 462, 425];
// Value shown per frame (last two digits), and the ink left edge of the "$".
const VALUE = (g: number) => (g < 5 ? 96 : g < 14 ? 97 : g < 24 ? 98 : 99);
const LEFT = (g: number) => (g < 5 ? 126 : g < 14 ? 164 : g < 24 ? 124 : 132);

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    stage(ctx, C.navy);
    const { scene } = ctx;
    const CARD = [45, 44, 1875, 1035] as const;
    const card = rect("frame-card", ...CARD, C.beige, 26);
    card.userData.pickable = false;

    const mark = solaraMark("solara-mark", 66, "sphere");
    mark.position.set(wx(862), wy(500), 0);
    const wordStyle = { font: F.poppins, size: 52, weight: 500, color: C.black };
    const word = text("solara-wordmark", "Solara", wordStyle);
    at(word, 911, 520);

    // The number: "$3", the tens digit "9", and the rolling ones digit, each its own plane.
    const NUM = { font: F.inter, size: 100, weight: 500, color: C.numInk };
    const digitH = measure("3", NUM).ascent;
    const size = (490 / digitH) * 100;
    const style = { ...NUM, size };
    const dollarTopAbove = measure("$", style).ascent - measure("3", style).ascent; // "$" rises above the digits

    const lead = text("counter-dollar", "$", style);
    const three = text("counter-hundreds", "3", style);
    const nine = text("counter-tens", "9", style);
    const ones = [6, 7, 8, 9].map((d) => text(`counter-ones-${d}`, String(d), style));
    const em = text("counter-m", "M", style);
    const group = new THREE.Group();
    group.name = "raise-counter";
    group.add(lead, three, nine, ...ones, em);
    for (const m of [lead, three, nine, ...ones, em]) clipTo(m, ...CARD, 26);

    scene.add(card, mark, word, group);

    // Ink-left offsets of each glyph from the "$", measured on the reference (it is set tight).
    const OFF = [0, 385, 760, 1150, 1550];

    return ({ frame }) => {
      const g = STATIC ?? frame + START;
      const top = table(g, 0, DOLLAR_TOP) ?? 540;
      const baseline = top + dollarTopAbove + 490;
      const left = LEFT(g);
      const v = VALUE(g);

      at(lead, left, baseline);
      at(three, left + OFF[1], baseline);
      at(nine, left + OFF[2], baseline);
      ones.forEach((m, i) => {
        m.visible = 6 + i === v % 10;
        at(m, left + OFF[3], baseline);
        blur(m, 0, 22); // the ones digit is always mid-roll: vertical smear
      });
      at(em, left + OFF[4], baseline);
      blur(em, 0, 0);
      // the first frames still carry the tens/hundreds smear from the roll before
      const early = Math.max(0, 1 - g / 5);
      blur(nine, 0, 16 * early);
      blur(three, 0, 12 * early);
      blur(lead, 0, 0);
    };
  });
}
