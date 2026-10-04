import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, F } from "../components/brand";
import grassUrl from "../assets/grass-hills.jpg";
import { at, blur, clipTo, cover, image, keys, measure, rect, setBox, stage, text, tint, trackingForInk, withFonts } from "../components/kit";

/** Global frames 86–142: "Series F" repeated in five ruled bands that shear apart; the centre band turns to grass. */
const START = 86;
const STATIC: number | null = null;

// Ink-left x of the row just above / below centre, measured every 2 frames (global).
const ROW_UP: [number, number][] = [[86, 540], [88, 492], [90, 450], [92, 416], [94, 388], [96, 366], [98, 348], [100, 334], [102, 324], [104, 314], [106, 306], [108, 302], [110, 296], [112, 292], [114, 288], [116, 286], [118, 282], [120, 280], [122, 278], [124, 276], [126, 274], [128, 272], [130, 270], [134, 268], [136, 266], [138, 264]];
const ROW_DOWN: [number, number][] = [[86, 540], [88, 582], [90, 618], [92, 648], [94, 672], [96, 692], [98, 706], [100, 720], [102, 728], [104, 736], [106, 744], [108, 748], [110, 752], [112, 756], [114, 760], [116, 762], [118, 764], [120, 766], [122, 768], [124, 770], [126, 772], [128, 774], [130, 776], [134, 778], [138, 780]];
const OUTER = 1.8; // the outer rows travel 1.8x as far
const GRASS_AT = 123;

const CARD = [45, 44, 1875, 1035] as const;
const BANDS: [number, number][] = [[44, 192], [192, 393], [393, 683], [683, 887], [887, 1035]];
const INK_BOTTOM = [287, 437, 636, 840, 1000]; // ink bottom of each row ("S" sits on the baseline)
const BLUR = [9, 5, 0, 5, 9];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    stage(ctx, C.navy);
    const { scene } = ctx;
    const card = rect("frame-card", ...CARD, C.beige, 26);
    card.userData.pickable = false;
    scene.add(card);

    const grass = image(ctx, "grass-band", grassUrl, 1);
    setBox(grass, CARD[0], 393, CARD[2], 683);
    grass.userData.panY = 0.5;
    cover(grass);
    clipTo(grass, ...CARD, 26);
    scene.add(grass);

    const style = { font: F.poppins, weight: 500, size: 100, color: C.grey };
    // Cap height 181 px; the face is set tight so the word spans 892 px of ink.
    const size = (181 / measure("F", style).ascent) * 100;
    const s0 = { ...style, size };
    const s = { ...s0, tracking: trackingForInk("Series F", s0, 892) };
    const desc = measure("Series F", s).descent;

    const rows = BANDS.map((band, i) => {
      const t = text(i === 2 ? "series-f" : `series-f-echo-${i}`, "Series F", s);
      clipTo(t, CARD[0], band[0], CARD[2], band[1], 0);
      blur(t, BLUR[i]);
      return t;
    });
    const rules = [192, 393, 683, 887].map((y, i) => {
      const r = rect(`rule-${i}`, CARD[0], y - 0.75, CARD[2], y + 0.75, "#8a8682");
      r.userData.pickable = false;
      return r;
    });
    const dot = rect("series-f-dot", 1660, 570, 1700, 610, C.white, 20);
    const group = new THREE.Group();
    group.name = "series-f-stack";
    group.add(...rows, ...rules, dot);
    scene.add(group);

    return ({ frame }) => {
      const g = STATIC ?? frame + START;
      const up = keys(g, ROW_UP);
      const down = keys(g, ROW_DOWN);
      const xs = [540 + OUTER * (up - 540), up, 538, down, 540 + OUTER * (down - 540)];
      rows.forEach((t, i) => at(t, xs[i], INK_BOTTOM[i] - desc));
      const green = g >= GRASS_AT;
      grass.visible = green;
      dot.visible = green;
      tint(rows[2], green ? C.white : C.grey);
    };
  });
}
