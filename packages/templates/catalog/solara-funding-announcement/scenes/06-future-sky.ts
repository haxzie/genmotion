import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, F } from "../components/brand";
import skyUrl from "../assets/sky-landscape.jpg";
import { clipTo, cover, image, keys, measure, rect, setBox, stage, text, withFonts, wx, wy } from "../components/kit";
import type { TStyle, Txt } from "../components/kit";

/** Global frames 223–264: "The future of" typed over open sky, growing and sliding left. */
const START = 223;
const STATIC: number | null = null;

const CARD = [48, 54, 1872, 1026] as const;
// Ink-left edge of the line per frame (global), measured.
const LEFT: [number, number][] = [[223, 460], [225, 458], [226, 456], [227, 454], [228, 450], [229, 446], [230, 440], [231, 434], [232, 428], [233, 420], [234, 412], [235, 404], [236, 396], [237, 386], [238, 376], [239, 366], [240, 356], [241, 348], [242, 338], [243, 328], [244, 318], [245, 310], [246, 300], [247, 290], [248, 280], [249, 268], [250, 256], [251, 242], [252, 228], [253, 212], [254, 194], [255, 176], [256, 156], [257, 134], [258, 110], [259, 86], [260, 62], [261, 36], [262, 6], [263, -32], [264, -70]];
// Scale of the line (1 = the first frame), from its measured ink height.
const SCALE: [number, number][] = [[223, 1], [225, 1], [228, 1.016], [230, 1.03], [232, 1.055], [234, 1.08], [236, 1.11], [238, 1.135], [240, 1.15], [242, 1.175], [244, 1.19], [264, 1.19]];
// Characters typed (of "The future of"), by global frame.
const TYPED = (g: number) => (g < 238 ? 8 : g < 246 ? 9 : g < 255 ? 10 : g < 261 ? 12 : 13);

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    stage(ctx, C.beige);
    const { scene } = ctx;
    const sky = image(ctx, "sky", skyUrl, 1);
    setBox(sky, ...CARD);
    sky.userData.panX = 0.75;
    sky.userData.panY = 0;
    sky.userData.zoom = 2.1;
    cover(sky);
    sky.material.uniforms.uRadius.value = 26;
    sky.material.uniforms.uDim.value = 0.2;
    sky.material.uniforms.uColor.value.set("#c4d6ec");
    scene.add(sky);

    // Sans: T cap height 176 px. Serif italic: "f" spans 252 px from ascender to descender.
    const sansBase: TStyle = { font: F.inter, weight: 500, size: 100, color: C.white, tracking: -0.02 };
    const sansSize = (176 / measure("T", sansBase).ascent) * 100;
    const sans = { ...sansBase, size: sansSize };
    const serifBase: TStyle = { font: F.serif, weight: 400, size: 100, color: C.white, italic: true };
    const fm = measure("f", serifBase);
    const serif = { ...serifBase, size: (252 / (fm.ascent + fm.descent)) * 100 * 0.86 };

    // Lay the line out glyph by glyph (so it can be typed), relative to the ink-left of "T".
    const chars: { ch: string; st: TStyle }[] = [
      ..."The".split("").map((ch) => ({ ch, st: sans })),
      { ch: " ", st: sans },
      ..."future".split("").map((ch) => ({ ch, st: serif })),
      { ch: " ", st: sans },
      ..."of".split("").map((ch) => ({ ch, st: sans })),
    ];
    const line = new THREE.Group();
    line.name = "the-future-of";
    const glyphs: (Txt | null)[] = [];
    let pen = -measure("T", sans).left; // so the T's ink-left sits on 0
    let runStart = 0;
    let runText = "";
    let runStyle = chars[0].st;
    chars.forEach((c, i) => {
      if (c.st !== runStyle) {
        runStart += measure(runText, runStyle).adv;
        runText = "";
        runStyle = c.st;
      }
      const x = pen + runStart + measure(runText, runStyle).adv;
      runText += c.ch;
      if (c.ch === " ") {
        glyphs.push(null);
        return;
      }
      const t = text(`the-future-of-${i}`, c.ch, c.st, "left", 4);
      // text() anchors on ink-left; shift by the glyph's own ink offset so pen positions hold
      t.position.set(x + t.userData.inkL, 0, 0);
      clipTo(t, ...CARD, 26);
      line.add(t);
      glyphs.push(t);
    });
    scene.add(line);
    // vertical: "f" ink from 430 to 682 at scale 1 -> baseline
    const baseline = 622; // sans baseline at scale 1
    const midY = 556;

    return ({ frame }) => {
      const g = STATIC ?? frame + START;
      const s = keys(g, SCALE);
      const left = keys(g, LEFT);
      line.scale.setScalar(s);
      line.position.set(wx(left), wy(midY + (baseline - midY) * s), 0);
      const n = TYPED(g);
      glyphs.forEach((t, i) => {
        if (t) t.visible = i < n;
      });
      void rect;
    };
  });
}
