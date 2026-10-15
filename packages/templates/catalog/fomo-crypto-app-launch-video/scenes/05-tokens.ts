/**
 * 255–554 · tokens, search, "to find others"
 *
 *  255–266  the coin train, closer, sweeping down-right over the gradient
 *  263–302  the tab row "All Tokens Traders Clans" scrolls in, word by word
 *  300–360  the phone rises showing the token list, then flies off
 *  360–554  "search" → "to find others" among avatars, then the row again
 *
 * Local frame = global − 255. Every key below is in global frames and
 * composition px, measured off the reference.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { withBrandFonts } from "../components/fonts";
import { X, Y } from "../components/stage";
import { sonar } from "../components/background";
import { bubble, loadBubble, setBubble, type Bubble } from "../components/bubble";
import { text, setText, type TextMesh } from "../components/text";
import { curve, type Key } from "../components/keys";
import { tokenCoin, type TokenKind } from "../components/tokens";
import { trainCamera, FOCAL } from "../components/train";
import { phone, layer, repaint, placePhone, statusBar, tabPills, txt, rrect, image, UI, PHONE_W, type Painter } from "../components/phone";
import { SVG } from "../components/tokens";
import avSol from "../assets/ui/tok-sol.png";
import avCashcat from "../assets/ui/tok-cashcat.png";
import avAnsem from "../assets/ui/tok-ansem.png";
import avUni from "../assets/ui/tok-uni.png";
import trRaizel from "../assets/ui/tr-raizel.png";
import trJae from "../assets/ui/tr-jae.png";
import trHeadcat from "../assets/ui/tr-headcat.png";
import trBenji from "../assets/ui/tr-benji.png";
import trMoo from "../assets/ui/tr-moo.png";
import trPriya from "../assets/ui/tr-priya.png";
import trSlander from "../assets/ui/tr-slander.png";
import trNadia from "../assets/ui/tr-nadia.png";
import trSofia from "../assets/ui/tr-sofia.png";

const G = 255;
/** depth of the flat (screen-space) layers in front of the camera */
const SCREEN_Z = 40;
const k = (rows: number[][]) => curve(rows.map((r) => [r[0] - G, r[1]] as Key));
const D2R = Math.PI / 180;

// ── 255–266 · the coins, closer ────────────────────────────────────────────
// [frame, cx, cy] per coin (face centre, px), logo roll (deg, clockwise)
const COINS: [TokenKind, number[][], number][] = [
  ["hl", [[255, 867, 640], [256, 1040, 790], [257, 1175, 900]], 30],
  ["rh", [[254, 480, 300], [255, 673, 450], [256, 840, 640], [257, 935, 760], [258, 1035, 880]], 35],
  ["x", [[254, 220, 120], [255, 440, 280], [256, 650, 430], [257, 775, 553], [258, 875, 660], [259, 965, 790]], 25],
  ["btc", [[254, -60, 80], [255, 173, 180], [256, 410, 260], [257, 575, 387], [258, 717, 510], [259, 842, 653], [260, 935, 790]], 42],
  ["eth", [[255, -60, 90], [256, 170, 155], [257, 322, 227], [258, 499, 336], [259, 642, 447], [261, 842, 627], [263, 975, 800]], 15],
  ["uni", [[256, -250, 60], [257, -52, 133], [258, 229, 190], [259, 408, 280], [261, 662, 467], [263, 825, 670], [265, 940, 865], [266, 985, 960]], 4],
];
const COIN_D = 470;
const COIN_Z = (2 * FOCAL) / COIN_D;
/** coin normal: faces down-right, so the wall shows up-left (ellipse long axis ≈ −58°, ratio ≈ 0.7) */
const COIN_N = new THREE.Vector3(0.606, -0.378, 0.7).normalize();
const COIN_Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), COIN_N);

// ── 263–302 · the tab row ──────────────────────────────────────────────────
const TAB_SIZE = 64;
const TABS = ["All", "Tokens", "Traders", "Clans"];
const TAB_OFF = [0, 136, 393, 654];
const rowLeft = k([
  [263, 860], [264, 818], [265, 784], [266, 729], [267, 677], [268, 633], [269, 603], [270, 577], [271, 554],
  [272, 536], [274, 506], [276, 483], [278, 464], [280, 450], [282, 440], [284, 432], [286, 428], [288, 425],
  [290, 425], [292, 426], [294, 430], [296, 436], [298, 446], [300, 463], [302, 485],
]);
const rowScale = k([
  [274, 1], [276, 0.986], [278, 0.981], [280, 0.976], [282, 0.967], [284, 0.947], [286, 0.933], [288, 0.909],
  [290, 0.885], [292, 0.856], [294, 0.813], [296, 0.766], [298, 0.708], [300, 0.627], [302, 0.55],
]);
const rowBase = k([[292, 383], [294, 378], [296, 376], [298, 371], [300, 361], [302, 352]]);
const TAB_ALPHA = [
  k([[263, 0], [263.5, 0.08], [264, 0.28], [265, 0.49], [266, 0.7], [267, 0.88], [268, 0.97], [269, 1], [270, 0.96], [271, 0.78], [272, 0.61], [274, 0.34], [276, 0.33]]),
  k([[265, 0], [266, 0.1], [267, 0.25], [268, 0.36], [269, 0.49], [270, 0.63], [271, 0.76], [272, 0.89], [274, 1]]),
  k([[269, 0], [270, 0.1], [271, 0.15], [272, 0.19], [274, 0.27], [276, 0.29], [278, 0.32]]),
  k([[275, 0], [276, 0.1], [278, 0.22], [280, 0.3], [282, 0.32]]),
];
const TAB_IN = [264, 266, 270, 276];
const rowFade = k([[298, 1], [300, 0.64], [302, 0]]);
const rowBlurOut = k([[298, 0], [300, 2.5], [302, 6]]);

// ── 300–360 · the phone with the token list ────────────────────────────────
const HEADER_H = 100; // pt: status bar + pills
const ROW_H = 62.3;
type Tok = [string, string, string, string, boolean, string, string];
const TOKENS: Tok[] = [
  // name, chip, market cap, price, up?, change, avatar
  ["SOL", "sol", "$41.9B MC", "$77.66", true, "2.70%", avSol],
  ["CASHCAT", "feather", "$117.6M MC", "$0.118", false, "8.10%", avCashcat],
  ["ANSEM", "sol", "$249.7M MC", "$0.250", true, "20.80%", avAnsem],
  ["UNI", "eth", "$2.9B MC", "$3.27", true, "0.90%", avUni],
];

function chipIcon(g: OffscreenCanvasRenderingContext2D, kind: string, x: number, y: number, s: number) {
  g.save();
  g.translate(x, y);
  g.scale(s / 24, s / 24);
  g.fillStyle = "#c9c7d4";
  if (kind === "sol") {
    g.fill(new Path2D(SVG.solTop));
    g.fill(new Path2D(SVG.solMid));
    g.fill(new Path2D(SVG.solBot));
  } else if (kind === "feather") {
    g.translate(12, 12);
    g.rotate(0.2);
    g.translate(-12, -12);
    g.fill(new Path2D(SVG.robinhood));
  } else {
    g.beginPath();
    g.moveTo(12, 2); g.lineTo(18.5, 12.3); g.lineTo(12, 16.2); g.lineTo(5.5, 12.3); g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(12, 17.5); g.lineTo(18.5, 13.7); g.lineTo(12, 22.5); g.lineTo(5.5, 13.7); g.closePath(); g.fill();
  }
  g.restore();
}

function tokenList(imgs: Record<string, CanvasImageSource>): Painter {
  return (g) => {
    TOKENS.forEach(([name, chip, mc, price, up, change, av], i) => {
      const y = i * ROW_H;
      image(g, imgs[av], 44, 30.5 + y, 62.3);
      txt(g, name, 77.4, 27 + y, 17.4, UI.white, 500);
      g.font = `500 17.4px "Aeonik", "Helvetica Neue", Helvetica, Arial, sans-serif`;
      const nx = 77.4 + g.measureText(name).width + 4.5;
      g.fillStyle = UI.chip;
      rrect(g, nx, 13.6 + y, 15.8, 15.8, 3.5);
      g.fill();
      chipIcon(g, chip, nx + 2.4, 16 + y, 11);
      txt(g, mc, 79, 51.3 + y, 13.5, UI.sub, 400);
      txt(g, price, 378.3, 26.6 + y, 16.8, UI.white, 500, "right");
      const col = up ? UI.green : UI.red;
      txt(g, change, 378.3, 51 + y, 13.5, col, 400, "right");
      g.font = `400 13.5px "Aeonik", "Helvetica Neue", Helvetica, Arial, sans-serif`;
      const tx = 378.3 - g.measureText(change).width - 6.2;
      g.fillStyle = col;
      g.beginPath();
      if (up) { g.moveTo(tx - 3, 47.6 + y); g.lineTo(tx + 3, 47.6 + y); g.lineTo(tx, 42.4 + y); }
      else { g.moveTo(tx - 3, 42.6 + y); g.lineTo(tx + 3, 42.6 + y); g.lineTo(tx, 47.8 + y); }
      g.closePath();
      g.fill();
    });
  };
}

const PH = [
  // frame, top, centre x, width px
  [302, 740, 639, 681], [303, 585, 639, 681], [304, 434, 638.5, 681], [305, 367, 637.5, 681], [306, 320, 637.5, 681],
  [307, 282, 637.5, 681], [308, 253, 637.5, 681], [309, 228, 637, 681], [310, 208, 637.5, 681], [311, 192, 637.5, 681],
  [312, 178, 637.5, 681], [313, 167, 637.5, 681], [314, 158, 638, 681], [315, 151, 638, 681], [316, 145, 638.5, 681],
  [317, 141, 638.5, 681], [318, 138, 638.5, 681], [319, 136, 639, 681], [320, 136, 639, 681], [321, 135, 639.5, 679],
  [322, 134, 639.5, 679], [323, 133, 640, 678], [324, 133, 640, 677], [325, 132, 640.5, 677], [326, 131, 640.5, 675],
  [327, 130, 641, 674], [328, 129, 641, 674], [329, 129, 641.5, 673], [330, 128, 641.5, 672], [331, 127, 641.5, 671],
  [332, 127, 641.5, 669], [333, 126, 642, 668], [334, 126, 642, 666], [335, 126, 642, 663], [336, 125, 642, 661],
  [337, 125, 642.5, 657], [338, 125, 642.5, 655], [339, 125, 642.5, 652], [340, 125, 643, 648], [341, 126, 643, 644],
  [342, 126, 643, 640], [343, 127, 643, 636], [344, 127, 643, 631], [345, 128, 643.5, 625], [346, 130, 643.5, 619],
  [347, 131, 643.5, 613], [348, 132, 643.5, 606], [349, 134, 644.5, 598], [350, 136, 645, 590], [351, 138, 645.5, 579],
  [352, 140, 646.5, 566], [353, 144, 647, 554], [354, 147, 648, 538], [355, 151, 649, 520], [356, 155, 650, 500],
  [357, 160, 651, 478], [358, 166, 652, 455],
];
const phTop = k(PH.map((r) => [r[0], r[1]]));
const phX = k(PH.map((r) => [r[0], r[2]]));
const phW = k(PH.map((r) => [r[0], r[3]]));
/** the exit: a soft diagonal wipe from the bottom-right (dot((x, y), (0.6, 0.8)) in px), plus blur */
const phFade = k([[350, 1250], [351, 1100], [352, 967], [353, 897], [354, 850], [355, 810], [356, 712], [357, 614], [358, 493], [359, 380]]);
const phBlur = k([[351, 0], [353, 1], [355, 2.5], [357, 4.5], [359, 6]]);

// ── 358–452 · "search" ─────────────────────────────────────────────────────
/** group rotation (deg, clockwise) and zoom about the centre, from the tracked bubbles */
const spin = k([
  [360, -3.8], [368, -3.4], [380, -2.2], [396, 0], [400, 0.9], [404, 1.2], [408, 1.7], [412, 2.9], [416, 4.5],
  [420, 7.0], [424, 11.4], [428, 18.4], [432, 28.0], [436, 41.1], [440, 59.6], [444, 85.6], [446, 102], [448, 126.5],
  [449, 141.4], [450, 160.1], [452, 200],
]);
const zoom = k([
  [360, 0.975], [368, 0.98], [380, 0.99], [396, 1], [404, 1.003], [412, 1.018], [416, 1.033], [420, 1.048], [424, 1.078],
  [428, 1.108], [432, 1.148], [436, 1.193], [440, 1.253], [444, 1.328], [446, 1.39], [448, 1.439], [449, 1.474], [450, 1.529], [452, 1.65],
]);
// name, radius, angle (deg, y down) at zoom 1 / spin 0, avatar diameter, pop-in frame
const SEARCH_BUBBLES: [string, number, number, number, number, string][] = [
  ["raizel", 351.1, -49.2, 57.8, 364, trRaizel],
  ["jae", 337.5, -171.0, 63.6, 366, trJae],
  ["headcat", 260.8, 78.2, 50.1, 372, trHeadcat],
  ["benji", 339.7, -119.2, 43.4, 378, trBenji],
  ["moo", 195.9, -92.5, 64.6, 386, trMoo],
  ["priya", 340.5, 134.0, 50.1, 394, trPriya],
  ["slander", 338.7, 28.5, 46.3, 398, trSlander],
];
const pop = curve([[0, 0], [1, 0.15], [2, 0.5], [4, 0.8], [6, 0.95], [8, 1.05], [11, 1.07], [16, 1]]);
// "search": typed in, then deleted. Left ink edge, visible ink width, baseline, opacity.
const sLeft = k([[359, 639], [360, 632], [361, 620], [362, 605], [363, 592], [364, 584], [365, 577], [366, 572], [367, 568], [368, 565], [370, 560], [372, 556], [380, 551], [400, 548], [420, 541], [430, 534], [436, 526], [440, 519], [442, 515], [444, 508], [445, 504], [446, 499], [447, 494], [448, 487], [449, 479], [450, 470], [451, 462]]);
const sWidth = k([[359, 24], [360, 26], [361, 60], [362, 93], [363, 112], [364, 112], [365, 141], [367, 142], [368, 173], [370, 175], [372, 177], [380, 178], [400, 184], [420, 197], [430, 212], [436, 228], [440, 242], [442, 249], [443, 251], [444, 228], [445, 210], [446, 173], [447, 146], [448, 94], [449, 65], [450, 34], [451, 0]]);
const sScale = k([[396, 1], [420, 1.07], [430, 1.15], [436, 1.24], [440, 1.315], [442, 1.353], [444, 1.39], [446, 1.43], [448, 1.47], [450, 1.52]]);
const sBase = k([[400, 383], [420, 385], [430, 387], [436, 391], [440, 390], [442, 391], [444, 393], [446, 396], [450, 397]]);
const sAlpha = k([[358, 0], [359, 0.15], [360, 0.35], [361, 0.6], [362, 0.73], [363, 0.78], [364, 0.8], [365, 0.86], [367, 0.9], [368, 0.92], [380, 0.99], [400, 1], [445, 1], [446, 0.8], [447, 0.55], [448, 0.57], [449, 0.54], [450, 0.33], [451, 0]]);
const discsIn = k([[357, 0], [362, 1], [448, 1], [452, 0]]);

// ── 452–512 · "to find others" in the avatar carousel; 513–554 · the Traders row ──
// [frame, x, y, avatar diameter] per bubble, read off gridded reference frames
const E_BUBBLES: Record<string, number[][]> = {
  priya: [[452, 124, 304, 100], [453, 230, 170, 96], [454, 360, 130, 90], [455, 510, 126, 90], [456, 660, 144, 90], [457, 806, 180, 90], [458, 940, 220, 90], [459, 1054, 264, 90], [460, 1154, 310, 90], [461, 1230, 350, 90]],
  raizel: [[452, 316, 200, 100], [453, 616, 160, 93], [454, 840, 200, 100], [455, 1030, 260, 105], [456, 1166, 320, 110], [504, 940, 710, 300], [506, 760, 700, 300], [508, 520, 660, 290], [510, 240, 580, 280], [512, 60, 390, 260]],
  jae: [[452, 96, 480, 200], [453, 40, 260, 150], [454, 60, 190, 130], [455, 100, 140, 120], [456, 164, 104, 120], [457, 244, 90, 118], [458, 330, 80, 116], [459, 424, 86, 116], [460, 520, 100, 116], [461, 614, 120, 116], [462, 710, 144, 116], [464, 876, 196, 116], [466, 1014, 250, 116], [468, 1120, 304, 116], [470, 1200, 340, 116]],
  moo: [[452, 1190, 590, 180], [453, 1000, 660, 220], [454, 710, 660, 260], [455, 460, 640, 300], [456, 260, 580, 300], [457, 136, 530, 300], [458, 80, 460, 300], [510, 676, 70, 110], [512, 1034, 240, 110]],
  sofia: [[462, 200, 540, 320], [464, 100, 480, 300], [466, 30, 420, 280]],
  headcat: [[466, 280, 40, 90], [468, 380, 50, 90], [470, 460, 64, 95], [472, 540, 90, 95], [474, 610, 100, 95], [476, 660, 120, 95], [478, 700, 130, 95], [480, 740, 144, 95], [482, 780, 160, 100], [484, 820, 176, 100], [486, 860, 190, 100], [488, 900, 200, 100], [490, 940, 220, 100], [492, 980, 240, 100], [494, 1024, 260, 100], [496, 1080, 280, 100], [498, 1150, 310, 100], [500, 1210, 340, 100]],
  nadia: [[464, 770, 700, 300], [466, 640, 660, 340], [468, 510, 610, 340], [470, 410, 590, 340], [472, 330, 570, 340], [474, 270, 540, 330], [476, 230, 540, 330], [478, 190, 500, 320], [480, 160, 480, 310], [482, 130, 470, 300], [486, 90, 450, 290], [490, 40, 420, 280]],
  slander: [[474, 1090, 700, 300], [476, 1010, 710, 300], [480, 940, 700, 300], [484, 880, 690, 300], [488, 800, 660, 300], [492, 710, 650, 300], [496, 580, 640, 290], [500, 400, 610, 280], [502, 290, 570, 280], [504, 170, 540, 270], [506, 90, 480, 260]],
  benji: [[502, 596, 80, 80], [504, 740, 120, 80], [506, 896, 170, 85], [508, 1064, 256, 90], [510, 1230, 370, 95]],
};
const F_BUBBLES: Record<string, number[][]> = {
  priya: [[514, 50, 80, 110], [516, 230, 30, 90], [518, 376, 20, 85], [520, 520, 40, 85], [522, 660, 72, 85], [525, 830, 150, 85], [528, 952, 226, 85], [532, 1064, 310, 85], [536, 1136, 370, 85], [540, 1210, 450, 85], [544, 1270, 560, 85]],
  raizel: [[514, 280, 30, 80], [516, 540, 40, 80], [518, 770, 120, 80], [520, 944, 220, 85], [522, 1074, 320, 90], [525, 1200, 430, 100], [528, 1256, 536, 100]],
  slander: [[514, 630, 70, 72], [516, 966, 240, 72], [518, 1160, 400, 75], [520, 1250, 530, 75]],
  nadia: [[514, 1050, 300, 100], [516, 1260, 550, 100], [554, 16, 140, 120]],
  jae: [[516, 40, 120, 150], [518, 120, 60, 125], [520, 210, 40, 105], [522, 300, 25, 100], [525, 420, 24, 100], [528, 530, 36, 100], [532, 644, 74, 100], [536, 736, 110, 100], [540, 844, 160, 100], [544, 980, 250, 100], [548, 1150, 384, 110], [551, 1256, 550, 115]],
  headcat: [[520, 20, 120, 100], [522, 60, 85, 105], [525, 146, 50, 100], [528, 216, 30, 90], [532, 290, 24, 80], [536, 350, 20, 75], [540, 434, 26, 75], [544, 560, 46, 75], [548, 754, 116, 80], [551, 966, 234, 85], [554, 1244, 490, 95]],
  benji: [[528, 10, 120, 110], [532, 50, 80, 95], [536, 100, 64, 85], [540, 156, 44, 80], [544, 236, 30, 75], [548, 364, 20, 70], [551, 540, 40, 70], [554, 896, 190, 75]],
  moo: [[540, 0, 160, 120], [544, 40, 120, 110], [548, 110, 60, 110], [551, 226, 26, 100], [554, 480, 30, 90]],
  sofia: [[551, 30, 120, 110], [554, 186, 44, 110]],
};

const AVATARS: Record<string, string> = {
  raizel: trRaizel, jae: trJae, headcat: trHeadcat, benji: trBenji, moo: trMoo, priya: trPriya,
  slander: trSlander, nadia: trNadia, sofia: trSofia,
};
/** split a bubble's keys into runs (a gap of more than 6 frames = it left and came back) */
function runs(rows: number[][]) {
  const out: number[][][] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && r[0] - last[last.length - 1][0] <= 6) last.push(r);
    else out.push([r]);
  }
  return out.map((rs) => ({
    f0: rs[0][0] - G,
    f1: rs[rs.length - 1][0] - G,
    x: k(rs.map((r) => [r[0], r[1]])),
    y: k(rs.map((r) => [r[0], r[2]])),
    d: k(rs.map((r) => [r[0], r[3]])),
    // keep moving off-frame for a frame either side
    v0: rs.length > 1 ? [rs[1][1] - rs[0][1], rs[1][2] - rs[0][2]].map((v) => v / (rs[1][0] - rs[0][0])) : [0, 0],
    v1: rs.length > 1 ? [rs[rs.length - 1][1] - rs[rs.length - 2][1], rs[rs.length - 1][2] - rs[rs.length - 2][2]].map((v) => v / (rs[rs.length - 1][0] - rs[rs.length - 2][0])) : [0, 0],
  }));
}
/** depth of field: big (near) bubbles blur */
const dof = (d: number) => Math.max(0, (d - 110) * 0.065);

const FIND_WORDS: [string, number][] = [["to", 0], ["find", 90], ["others", 246]];
const findLeft = k([
  [452, 690], [453, 651], [454, 624], [455, 602], [456, 585], [457, 569], [458, 556], [459, 544], [460, 533], [462, 514],
  [464, 498], [466, 485], [468, 474], [470, 464], [475, 446], [480, 435], [485, 428], [490, 421], [495, 410], [500, 389],
  [503, 370], [504, 362], [505, 353], [506, 342], [507, 331], [509, 300], [510, 281], [511, 256], [512, 230],
]);
const FIND_ALPHA = [
  k([[451, 0], [452, 0.45], [453, 0.85], [455, 0.88], [502, 0.88], [503, 0.62], [504, 0.41], [505, 0]]),
  k([[454, 0], [455, 0.4], [456, 0.53], [457, 0.65], [458, 0.78], [459, 0.87], [505, 0.87], [506, 0.76], [507, 0.49], [508, 0.22], [509, 0]]),
  k([[460, 0], [462, 0.31], [464, 0.41], [466, 0.53], [468, 0.64], [470, 0.67], [475, 0.84], [480, 0.88], [509, 0.88], [510, 0.62], [511, 0.4], [512, 0.1], [513, 0]]),
];

const TR_WORDS: [string, number][] = [["Tokens", -246], ["Traders", 0], ["Clans", 253]];
const trLeft = k([
  [513, 741], [514, 703], [515, 676], [516, 656], [517, 640], [518, 626], [519, 614], [520, 604], [522, 587], [524, 575],
  [526, 565], [528, 557], [530, 552], [534, 546], [538, 544], [542, 544], [546, 545], [550, 550], [552, 555], [554, 560],
]);
const trScale = k([[538, 1], [542, 0.966], [546, 0.9375], [550, 0.875], [552, 0.817], [554, 0.75]]);
const trBase = k([[542, 383], [546, 380], [550, 377], [552, 367], [554, 360]]);
const TR_ALPHA = [
  k([[513, 0.33]]),
  k([[513, 0.33], [514, 0.42], [515, 0.59], [516, 0.74], [517, 0.88], [518, 0.95]]),
  k([[516, 0.1], [518, 0.2], [522, 0.28], [528, 0.3]]),
];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => build(ctx));
}

function build(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  trainCamera(ctx);
  const bg = sonar("#5576ff");
  scene.add(bg);

  // flat layers: a plane of composition px at depth SCREEN_Z in front of the camera
  const flat = new THREE.Group();
  flat.name = "flat-layers";
  flat.position.set(0, 0, -SCREEN_Z);
  flat.scale.setScalar(SCREEN_Z / FOCAL);
  scene.add(flat);

  // coins live under the coin camera's frame (camera at origin looking −z)
  const coinRoot = new THREE.Group();
  coinRoot.name = "coin-train";
  scene.add(coinRoot);
  const coins = COINS.map(([kind, keys, roll]) => {
    const c = tokenCoin(kind);
    coinRoot.add(c);
    const q = COIN_Q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -roll * D2R));
    c.quaternion.copy(q);
    return { c, x: k(keys.map((r) => [r[0], r[1]])), y: k(keys.map((r) => [r[0], r[2]])), f0: keys[0][0] - G, f1: keys[keys.length - 1][0] - G };
  });

  const tabs: TextMesh[] = TABS.map((t) => {
    const m = text(t, { size: TAB_SIZE, weight: 400, color: "#ffffff" }, `tab-${t.toLowerCase()}`);
    flat.add(m);
    return m;
  });

  // ── the phone ──
  const imgs: Record<string, CanvasImageSource> = {};
  const header = layer(HEADER_H, (g) => {
    statusBar(g);
    tabPills(g, 1);
  });
  const list = layer(ROW_H * 6, tokenList(imgs));
  const ph = phone(header, list, undefined, "phone-tokens");
  flat.add(ph);
  const loader = new THREE.ImageLoader(ctx.manager);
  for (const url of [avSol, avCashcat, avAnsem, avUni])
    loader.load(url, (img) => {
      imgs[url] = img;
      repaint(list, tokenList(imgs));
    });

  // ── "search" ──
  const word = text("search", { size: 64, weight: 400, color: "#ecfcff", tracking: -0.02 }, "search");
  flat.add(word);
  const sBubbles = SEARCH_BUBBLES.map(([name, r, a, d, f0, url]) => {
    const b = bubble(name);
    loadBubble(b, url, ctx.manager);
    flat.add(b);
    return { b, r, a, d, f0 };
  });

  const eBubbles: { b: Bubble; segs: ReturnType<typeof runs> }[] = [];
  for (const table of [E_BUBBLES, F_BUBBLES])
    for (const [name, rows] of Object.entries(table)) {
      const b = bubble(`${name}-${eBubbles.length}`);
      loadBubble(b, AVATARS[name], ctx.manager);
      flat.add(b);
      eBubbles.push({ b, segs: runs(rows) });
    }
  const findWords = FIND_WORDS.map(([w]) => {
    const m = text(w, { size: 80, weight: 400, color: "#ecfcff" }, `find-${w}`);
    flat.add(m);
    return m;
  });
  const trWords = TR_WORDS.map(([w]) => {
    const m = text(w, { size: 60, weight: 400, color: "#ffffff" }, `row-${w.toLowerCase()}`);
    flat.add(m);
    return m;
  });

  return ({ frame: f }) => {
    const g = f + G;

    // ── "search" beat ──
    const inSearch = g >= 357 && g < 452;
    const Z = zoom(f);
    const R = spin(f) * D2R;
    const bu = bg.material.uniforms;
    // from the phone onward the gradient deepens: #5463f0 → #adb5f6
    (bu.uTop.value as THREE.Color).setRGB(g < 302 ? 101 / 255 : 84 / 255, g < 302 ? 114 / 255 : 99 / 255, g < 302 ? 242 / 255 : 240 / 255);
    (bu.uBottom.value as THREE.Color).setRGB(g < 302 ? 156 / 255 : 173 / 255, g < 302 ? 164 / 255 : 181 / 255, g < 302 ? 245 / 255 : 246 / 255);
    const dIn = inSearch ? discsIn(f) : 0;
    (bu.uCenter.value as THREE.Vector2).set(640, 360);
    (bu.uRadius.value as THREE.Vector4).set(175 * Z, 235 * Z, 284 * Z, 330 * Z);
    (bu.uAlpha.value as THREE.Vector4).set(0.167 * dIn, 0.173 * dIn, 0.073 * dIn, 0.022 * dIn);
    (bu.uFadeTop.value as THREE.Vector4).set(0, 0, 0, 0);
    (bu.uFadeBottom.value as THREE.Vector4).set(0, 0, 0, 0);
    for (const { b, r, a, d, f0 } of sBubbles) {
      const t = g - f0;
      if (!inSearch || t < 0) {
        b.visible = false;
        continue;
      }
      const ang = a * D2R + R;
      setBubble(b, 640 + Math.cos(ang) * r * Z, 360 + Math.sin(ang) * r * Z, d * Z * pop(t));
    }
    word.visible = g >= 359 && g < 452;
    // ── "to find others" + Traders row ──
    for (const { b, segs } of eBubbles) {
      b.visible = false;
      for (const sg of segs) {
        if (f < sg.f0 - 1 || f > sg.f1 + 1) continue;
        let x = sg.x(f), y = sg.y(f);
        if (f < sg.f0) { x -= sg.v0[0]; y -= sg.v0[1]; }
        if (f > sg.f1) { x += sg.v1[0]; y += sg.v1[1]; }
        const d = sg.d(f);
        setBubble(b, x, y, d, 1, dof(d));
      }
    }
    findWords.forEach((m, i) => {
      m.position.set(X(findLeft(f) + FIND_WORDS[i][1] - m.userData.inkLeft), Y(381), 0);
      setText(m, { opacity: g >= 452 && g < 514 ? FIND_ALPHA[i](f) : 0 });
    });
    const ts = trScale(f);
    trWords.forEach((m, i) => {
      m.scale.setScalar(ts);
      m.position.set(X(trLeft(f) + (TR_WORDS[i][1] - m.userData.inkLeft) * ts), Y(trBase(f)), 0);
      setText(m, { opacity: g >= 513 && g < 555 ? TR_ALPHA[i](f) : 0, maskL: (380 - 640 - m.position.x) / ts, maskR: (905 - 640 - m.position.x) / ts, maskSoft: 18 / ts });
    });
    if (word.visible) {
      const sc = sScale(f);
      word.scale.setScalar(sc);
      word.position.set(X(sLeft(f) - word.userData.inkLeft * sc), Y(sBase(f)), 0);
      setText(word, { opacity: sAlpha(f), maskR: word.userData.inkLeft + sWidth(f) / sc + 0.5, maskSoft: 0.8 });
    }

    // ── phone ──
    ph.visible = g >= 302 && g < 360;
    placePhone(ph, phX(f), phTop(f), phW(f) / PHONE_W);
    const pu = ph.material.uniforms;
    const fd = phFade(f);
    (pu.uFadeDir.value as THREE.Vector2).set(0.6, 0.8);
    (pu.uFade.value as THREE.Vector2).set(g < 350 ? 1 : fd - 75, g < 350 ? 0 : fd + 75);
    pu.uBlur.value = phBlur(f);

    // ── coins (the coin camera) ──
    coinRoot.visible = g < 267;
    for (const { c, x, y, f0, f1 } of coins) {
      c.visible = f >= f0 && f <= f1;
      c.position.set(((x(f) - 640) * COIN_Z) / FOCAL, ((360 - y(f)) * COIN_Z) / FOCAL, -COIN_Z);
    }

    // ── tab row ──
    const s = rowScale(f);
    const L = rowLeft(f);
    const B = rowBase(f) - 0.5;
    tabs.forEach((m, i) => {
      m.position.set(X(L - 1.5 * s + TAB_OFF[i] * s), Y(B), 0);
      m.scale.setScalar(s);
      const blurIn = Math.max(0, 6 - (g - TAB_IN[i]) * 1.6);
      setText(m, { opacity: TAB_ALPHA[i](f) * rowFade(f), blur: Math.max(blurIn, rowBlurOut(f)) });
    });
  };
}
