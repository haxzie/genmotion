import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, F } from "../components/brand";
import { at, clipTo, halftone, measure, rect, sizeForInk, stage, text, trackingForInk, withFonts } from "../components/kit";

/** Global frames 143–169: "$8.4B" printed in halftone on a card, resolving solid, with a callout. */
const START = 143;
const STATIC: number | null = null;
const SOLID_AT = 159;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    stage(ctx, C.navy);
    const { scene } = ctx;
    const CARD = [45, 48, 1125, 1030] as const;
    const card = rect("valuation-card", ...CARD, C.beige, 42);

    const base = { font: F.inter, weight: 500, size: 100, color: C.grey };
    const size = (308 / measure("4", base).ascent) * 100;
    const s0 = { ...base, size };
    const s = { ...s0, tracking: trackingForInk("$8.4B", s0, 1082) };
    const big = text("valuation-8-4b", "$8.4B", s);
    at(big, 43, 688);
    clipTo(big, ...CARD, 42);

    const line = rect("callout-line", 1125, 539, 1357, 541, C.white);
    const dot = rect("callout-dot", 1379, 529, 1411, 561, C.white, 16);
    const lab = { font: F.poppins, weight: 400, size: 100, color: C.white };
    const label = text("solara-valuation", "Solara Valuation", { ...lab, size: sizeForInk("Solara Valuation", lab, 300) });
    at(label, 1427, 553);

    scene.add(card, big, line, dot, label);

    return ({ frame }) => {
      const g = STATIC ?? frame + START;
      halftone(big, g < SOLID_AT, 14);
    };
  });
}
