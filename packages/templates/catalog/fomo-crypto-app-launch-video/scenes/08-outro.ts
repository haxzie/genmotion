/**
 * 857–998 · "try smarter [search] on fomo" → fomo
 *
 * "try smarter" focuses in rising from below; a faint blue magnifier rides
 * beside it, blinks into a white search pill, and "search" slides in from the
 * pill's right edge. The line re-centres as "on" and the fomo wordmark rise
 * into place, slowly pulls back, then shrinks and blurs away — cut to the big
 * fomo wordmark focusing in and settling.
 *
 * All positions/sizes tracked off the reference per frame (px, y down).
 * The line is one group in "line space": origin = "try" origin on the
 * baseline, 1 unit = 1 px at the size the line has on frame 866 (68.4 px type).
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { withBrandFonts } from "../components/fonts";
import { stage, X, Y } from "../components/stage";
import { backdrop } from "../components/background";
import { text, setText } from "../components/text";
import { roundRect, setRect } from "../components/shapes";
import { wordmark, setWordmark, WORDMARK_W } from "../components/wordmark";
import { curve, linear, type Key } from "../components/keys";

const G = 857;
const K = (rows: number[][]) => rows.map((r) => [r[0] - G, r[1]] as Key);
const SIZE = 68.4;
const SPAN = 347; // "try smarter" ink span at frame 866

// try-left ink x per frame (→ group x), and "try smarter" ink span (→ group scale)
const tryLeft = curve(K([
  [857, 413], [859, 414], [861, 415], [863, 416], [865, 417], [867, 414], [869, 406], [871, 388], [873, 362],
  [875, 343], [877, 332], [879, 326], [881, 323], [883, 321], [885, 318], [887, 312], [889, 301], [891, 267],
  [893, 228], [895, 212], [897, 203], [899, 198], [901, 194], [903, 192], [905, 192], [907, 192], [909, 194],
  [911, 196], [913, 200], [915, 205], [917, 211], [919, 219], [921, 230], [923, 246], [925, 277],
]));
const span = curve(K([
  [857, 350], [861, 350], [865, 349], [869, 348], [871, 347], [875, 346], [877, 345], [879, 345], [881, 343],
  [883, 342], [889, 341], [893, 340], [897, 338], [901, 337], [903, 336], [905, 334], [907, 334], [909, 332],
  [911, 330], [913, 327], [915, 324], [917, 320], [919, 315], [921, 308], [923, 298], [925, 279],
]));
// baseline y of the line
const baseline = curve(K([
  [857, 458], [858, 430], [859, 421], [860, 415.3], [861, 410.9], [862, 407.5], [863, 404.7], [864, 402.3],
  [865, 400.3], [866, 398.5], [867, 396.9], [868, 395.6], [869, 394.4], [871, 392], [873, 390], [875, 388.5],
  [877, 387], [879, 386], [881, 385.2], [883, 384.6], [885, 384], [890, 383.4], [895, 383], [905, 382.5],
  [911, 382], [915, 381.3], [919, 380.5], [921, 379.8], [923, 378.8], [925, 377.4],
]));
const lineBlur = curve(K([[857, 4], [858, 2], [859, 1], [860, 0], [921, 0], [922, 0.8], [923, 2], [924, 4], [925, 6.5]]));
const lineA = curve(K([[857, 0.85], [859, 1], [921, 1], [923, 0.94], [925, 0.86]]));

// the bubble, in SCREEN px while it forms: [frame, left, right, top, bottom]
const PILL_SCREEN = [
  [859, 800, 863, 405, 466], [861, 799, 866, 368, 435], [863, 798, 869, 358, 426], [865, 798, 875, 352, 419],
  [867, 796, 881, 346, 415], [869, 790, 925, 341, 413], [871, 766, 970, 336, 411], [873, 739, 964, 334, 408],
  [875, 719, 953, 332, 406], [877, 707, 947, 331, 405], [879, 700, 944, 330, 404], [881, 696, 941, 329, 403],
  [883, 693, 939, 328, 402], [885, 690, 935, 328, 401], [887, 684, 928, 327, 400], [889, 671, 915, 326, 399],
];
const pcol = (i: number) => curve(K(PILL_SCREEN.map((r) => [r[0], r[i]])));
const pL = pcol(1);
const pR = pcol(2);
const pT = pcol(3);
const pB = pcol(4);
/** final pill, line space */
const PILL = { l: 374, r: 624, t: -58.4, b: 15.9 };
/** 0 = faint blue magnifier, 1 = white pill */
const pillWhite = linear(K([[868, 0], [869, 1]]));
const pillA = linear(K([[858, 0], [859, 0.11], [861, 0.24], [867, 0.2], [868, 0.08], [869, 0.12], [870, 0.34], [871, 0.55], [872, 0.66], [874, 0.81], [876, 0.92], [878, 0.95], [882, 1]]));

// "search" slides in from the pill's right edge: screen px from pill-left to the ink
const searchOff = curve(K([[871, 160], [873, 103], [875, 59], [877, 43], [879, 34], [881, 29], [883, 25], [885, 22], [889, 21]]));
const SEARCH_X = 395.6; // line space, once settled

// "on" and the wordmark rise into place (screen px below their rest)
const onRise = curve(K([[887, 72], [888, 45], [889, 36], [890, 30], [891, 26], [892, 24], [893, 22], [894, 19], [895, 17], [896, 15], [897, 14], [898, 12], [899, 11], [900, 10], [901, 9], [902, 8], [903, 7], [905, 6], [908, 5], [910, 4], [912, 3], [915, 2], [918, 1], [921, 0]]));
const fomoRise = curve(K([[892, 73], [893, 46], [894, 37], [895, 31], [896, 27], [897, 24], [898, 21], [899, 18], [900, 16], [901, 15], [902, 13], [903, 12], [904, 10], [905, 9], [906, 8], [908, 7], [910, 6], [911, 5], [913, 4], [915, 3], [919, 2], [921, 1], [922, 0]]));
const ON_X = 654;
const ON_BASE = 0;
const FOMO = { l: 766.5, t: -49.5, b: -0.3 };

// the big wordmark: width px, blur px, centred on (639, 360)
const bigW = curve(K([
  [926, 450], [927, 392], [928, 375], [930, 355], [932, 342], [935, 329], [940, 313], [945, 302], [950, 293],
  [955, 286], [960, 281], [965, 276], [970, 272], [980, 266], [990, 261.4], [995, 260], [998, 260],
]));
const bigBlur = curve(K([[926, 14], [927, 9], [928, 7], [930, 4.5], [932, 2.8], [935, 1.2], [938, 0.4], [940, 0]]));

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => {
    const { scene } = ctx;
    stage(ctx);
    scene.add(backdrop("#6370f1", "#949df5")); // this beat is graded a touch darker than the opening

    const line = new THREE.Group();
    line.name = "try-smarter-search-on-fomo";
    scene.add(line);

    const pill = roundRect("#ffffff", "search-pill");
    const handle = roundRect("#ffffff", "search-pill-handle");
    pill.renderOrder = 50;
    handle.renderOrder = 49;
    line.add(handle, pill);

    const trySmarter = text("try smarter", { size: SIZE, weight: 500, color: "#ffffff" }, "try-smarter");
    const search = text("search", { size: SIZE, weight: 500, color: "#4b4ced" }, "search");
    search.renderOrder = 120;
    const on = text("on", { size: SIZE, weight: 500, color: "#ffffff" }, "on");
    const fomoSmall = wordmark("#ffffff", "fomo-wordmark-small");
    line.add(trySmarter, search, on, fomoSmall);

    const big = wordmark("#ffffff", "fomo-wordmark");
    big.position.set(X(639), Y(360), 0);
    scene.add(big);

    const blue = new THREE.Color().setStyle("#4b4ced", THREE.NoColorSpace);
    const white = new THREE.Color(1, 1, 1);
    const pillCol = new THREE.Color();

    return ({ frame: f }) => {
      const g = f + G;
      const lineOn = g < 926;
      line.visible = lineOn;
      big.visible = !lineOn;

      if (lineOn) {
        const s = span(f) / SPAN;
        const gx = tryLeft(f) - 0.5 * s;
        const gy = baseline(f);
        line.position.set(X(gx), Y(gy), 0);
        line.scale.setScalar(s);
        const toLine = (px: number, py: number) => [(px - gx) / s, (py - gy) / s] as const;
        const blur = lineBlur(f);
        const a = lineA(f);

        setText(trySmarter, { blur, opacity: a });

        // pill (line space, y down → negate for world)
        let l: number, r: number, t: number, b: number;
        if (g < 889) {
          [l, t] = toLine(pL(f), pT(f));
          [r, b] = toLine(pR(f), pB(f));
        } else ({ l, r, t, b } = PILL);
        const h = b - t;
        const w = r - l;
        pillCol.copy(blue).lerp(white, pillWhite(f));
        pill.material.uniforms.uColor.value.copy(pillCol);
        handle.material.uniforms.uColor.value.copy(pillCol);
        const pa = g < 859 ? 0 : pillA(f) * a;
        setRect(pill, w, h, h / 2, pa, 0.75 + blur);
        pill.position.set(l + w / 2, -(t + h / 2), 0);
        // magnifier handle: a short bar off the bottom-right, at ~40°
        const k = h / 74.3;
        const hx0 = r - 12 * k;
        const hy0 = b - 14 * k;
        const hx1 = r + 8 * k;
        const hy1 = b + 3 * k;
        const hl = Math.hypot(hx1 - hx0, hy1 - hy0);
        setRect(handle, hl + 12 * k, 12 * k, 6 * k, pa, 0.75 + blur);
        handle.position.set((hx0 + hx1) / 2, -(hy0 + hy1) / 2, 0);
        handle.rotation.z = -Math.atan2(hy1 - hy0, hx1 - hx0);

        // "search" inside the pill, clipped to it
        const sx = g < 889 ? toLine(pL(f) + searchOff(f) - 2, 0)[0] : SEARCH_X;
        search.position.set(sx, 0.7, 0);
        setText(search, {
          opacity: g >= 873 ? a : 0,
          blur,
          maskL: l - sx + 4,
          maskR: r - sx - 4,
          maskSoft: 1,
        });

        // "on" and the small wordmark
        on.position.set(ON_X, -(ON_BASE + onRise(f) / s), 0);
        setText(on, { opacity: g >= 887 ? a : 0, blur });
        const fh = FOMO.b - FOMO.t;
        const unit = fh / 24;
        fomoSmall.scale.setScalar(unit);
        fomoSmall.position.set(FOMO.l + (WORDMARK_W * unit) / 2, -((FOMO.t + FOMO.b) / 2 + fomoRise(f) / s), 0);
        setWordmark(fomoSmall, { opacity: g >= 892 ? a : 0, blurPx: blur, pxPerUnit: unit });
      } else {
        const unit = bigW(f) / WORDMARK_W;
        big.scale.setScalar(unit);
        setWordmark(big, { opacity: 1, blurPx: bigBlur(f), pxPerUnit: unit });
      }
    };
  });
}
