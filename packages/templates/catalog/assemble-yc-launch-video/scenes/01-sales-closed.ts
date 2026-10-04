import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX } from "../components/stage";
import { glide, prog, outCubic, inCubic, clamp01 } from "../components/ease";
import { line, measure, setLabel, withInter, GREY_FROM } from "../components/type";
import { ring, poseRing } from "../components/rings";
import { BRAND, C } from "../components/brand";

/**
 * 0.00s–2.56s (f0–f64): three orbit lines tumble in 3D while "Sales closed the customer in"
 * assembles word by word in the middle, re-centring as each word lands, then leaves left to right.
 */
const SENTENCE = "Sales closed the customer in";
const IN = [26, 30, 35, 40, 43]; // entrance frame per word
const OUT = [52, 55, 58, 61, 63]; // exit frame per word

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color(BRAND.bg);
    fitCamera(camera, height, 18); // long lens: the rings tumble with gentle perspective

    /* ---------------------------------------------------------------- rings */
    const R = 5;
    const solid = ring({ name: "orbit-solid", radius: R, tube: 0.011, left: "#5a8fa0", right: "#1f3e48" });
    const inner = ring({ name: "orbit-dotted", radius: R, tube: 0.009, left: "#26343a", right: "#cfd8da", dashes: 260, duty: 0.55 });
    const outer = ring({ name: "orbit-dashed", radius: R, tube: 0.016, left: "#c8d6d6", right: "#2f9cc0", dashes: 120, duty: 0.6 });
    const rings = new THREE.Group();
    rings.name = "orbits";
    rings.add(outer, inner, solid);
    scene.add(rings);

    // Keyed poses, measured off the reference: [frame, value]
    const A = {
      rx: glide([[0, 480], [10, 527], [16, 559], [20, 553], [24, 527], [28, 530], [30, 640], [34, 680], [38, 700], [42, 740], [46, 772], [50, 803], [54, 835], [58, 880], [64, 960]]),
      asp: glide([[0, 0.46], [10, 0.52], [16, 0.63], [20, 0.82], [22, 1.0], [24, 1.25], [27, 1.3], [29, 0.6], [31, 0.25], [34, 0.12], [37, 0.2], [42, 0.25], [46, 0.37], [50, 0.49], [54, 0.56], [64, 0.62]]),
      roll: glide([[0, 0], [10, -5], [16, -15], [20, -30], [24, -10], [28, -8], [30, -38], [32, -27], [34, -17], [37, -4], [42, -2], [46, -5], [50, -12], [54, -15], [64, -18]]),
      cx: glide([[0, 960], [10, 957], [16, 968], [20, 985], [24, 1014], [28, 1025], [30, 980], [32, 990], [34, 950], [42, 956], [46, 968], [50, 973], [54, 1003], [64, 1030]]),
      cy: glide([[0, 575], [10, 576], [16, 596], [20, 602], [24, 640], [28, 600], [30, 490], [32, 500], [34, 518], [38, 560], [42, 588], [46, 616], [50, 640], [54, 680], [64, 720]]),
    };
    const B = {
      rx: glide([[0, 418], [10, 450], [16, 470], [22, 520], [26, 560], [30, 600], [34, 620], [38, 640], [42, 660], [46, 680], [54, 720], [64, 800]]),
      asp: glide([[0, 0.46], [10, 0.42], [16, 0.33], [22, 0.22], [26, 0.14], [30, 0.12], [34, 0.1], [38, 0.18], [42, 0.22], [46, 0.3], [54, 0.4], [64, 0.45]]),
      roll: glide([[0, 0], [10, -4], [16, -10], [22, -14], [26, -16], [30, -10], [34, -2], [38, 6], [42, 2], [46, -3], [54, -8], [64, -10]]),
      cx: glide([[0, 960], [16, 930], [26, 900], [34, 960], [46, 975], [64, 1000]]),
      cy: glide([[0, 512], [10, 505], [16, 490], [22, 470], [26, 480], [30, 500], [38, 540], [46, 580], [54, 620], [64, 660]]),
    };
    const Cc = {
      rx: glide([[0, 590], [10, 640], [16, 690], [22, 720], [26, 760], [30, 820], [36, 900], [42, 960], [46, 1000], [54, 1080], [64, 1180]]),
      asp: glide([[0, 0.51], [10, 0.56], [16, 0.7], [22, 1.1], [26, 1.4], [30, 0.7], [34, 0.35], [38, 0.4], [42, 0.45], [46, 0.55], [54, 0.62], [64, 0.68]]),
      roll: glide([[0, 0], [10, -3], [16, -12], [22, -20], [26, -14], [30, -20], [34, -14], [38, -10], [42, -14], [46, -20], [54, -24], [64, -26]]),
      cx: glide([[0, 960], [10, 975], [16, 1000], [22, 1040], [26, 1060], [30, 1000], [38, 1010], [46, 1060], [54, 1080], [64, 1100]]),
      cy: glide([[0, 595], [10, 600], [16, 600], [22, 560], [26, 520], [30, 560], [38, 640], [46, 600], [54, 600], [64, 620]]),
    };

    /* ----------------------------------------------------------------- type */
    // Sized so the finished line is 1032 px wide, as in the reference.
    const base = { size: 80, weight: 500, tracking: -0.005 };
    const size = 80 * (1032 / measure(SENTENCE, base));
    const style = { ...base, size };
    const sentence = line(SENTENCE, style, "left");
    sentence.group.name = "sales-closed-the-customer-in";
    scene.add(sentence.group);
    const space = measure(" ", style) * PX;
    const ink = C.ink;
    const tint = new THREE.Color();

    return ({ frame }) => {
      /* rings */
      const fadeRings = 1 - prog(frame, 54, 10, inCubic);
      const set = (m: typeof solid, k: typeof A, op: number) => {
        poseRing(m, R, k.rx(frame), k.asp(frame), k.roll(frame), k.cx(frame), k.cy(frame));
        m.material.uniforms.uOpacity!.value = op * fadeRings;
      };
      set(solid, A, 1);
      set(inner, B, 0.95);
      set(outer, Cc, 0.9);

      /* words: laid out centred on whatever is present, gaps opening as a word arrives */
      const pres = sentence.words.map((_, i) => outCubic(clamp01((frame - IN[i]!) / 9)));
      let total = 0;
      sentence.words.forEach((w, i) => {
        if (pres[i]! <= 0) return;
        total += (w.userData.w + (i > 0 ? space + (1 - pres[i]!) * 40 * PX : 0)) * Math.min(1, pres[i]! * 1.5);
      });
      let x = -total / 2;
      sentence.words.forEach((w, i) => {
        const p = pres[i]!;
        const pOut = inCubic(clamp01((frame - OUT[i]!) / 6));
        if (i > 0) x += (space + (1 - p) * 40 * PX) * Math.min(1, p * 1.5);
        w.position.set(x, 0, 0);
        x += w.userData.w * Math.min(1, p * 1.5);
        // grey -> ink lags the entrance (the last words are still grey when the line completes)
        const pInk = outCubic(clamp01((frame - IN[i]! - 2) / (i >= 3 ? 16 : 10)));
        tint.copy(GREY_FROM).lerp(ink, pInk).lerp(GREY_FROM, pOut);
        setLabel(w, {
          opacity: Math.min(1, p * 1.4) * (1 - pOut),
          blur: (1 - p) * 9 + pOut * 9,
          color: tint,
        });
      });
      sentence.group.position.y = 0;
    };
  });
}
