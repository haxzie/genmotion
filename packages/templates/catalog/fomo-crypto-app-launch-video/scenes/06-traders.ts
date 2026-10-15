/**
 * 555–722 · traders
 *
 *  555–560  the phone settles; a cursor taps "Traders"
 *  556–590  five trader avatars fly in and land in their rows; rows fade in
 *  583–680  the phone glides up the list (Paste toast + glass tab bar ride with it)
 *  680–722  "Clans" rises into the tab row, which shrinks away
 *
 * Local frame = global − 555. Keys are global frames and composition px.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { withBrandFonts } from "../components/fonts";
import { X, Y } from "../components/stage";
import { discStack } from "../components/background";
import { text, setText } from "../components/text";
import { curve, type Key } from "../components/keys";
import { trainCamera, FOCAL } from "../components/train";
import { phone, layer, repaint, placePhone, statusBar, tabPills, txt, rrect, image, UI, PHONE_W, PT, INSET, type Painter } from "../components/phone";
import { bubble, loadBubble, setBubble } from "../components/bubble";
import trNadia from "../assets/ui/tr-nadia.png";
import trMoo from "../assets/ui/tr-moo.png";
import trJae from "../assets/ui/tr-jae.png";
import trSofia from "../assets/ui/tr-sofia.png";
import trBenji from "../assets/ui/tr-benji.png";
import trPriya from "../assets/ui/tr-priya.png";
import trMiko from "../assets/ui/tr-miko.png";
import trPoorgoat from "../assets/ui/tr-poorgoat.png";
import trAlbert from "../assets/ui/tr-albert.png";
import trRaizel from "../assets/ui/tr-raizel.png";
import trSlander from "../assets/ui/tr-slander.png";
import trHeadcat from "../assets/ui/tr-headcat.png";

const G = 555;
const SCREEN_Z = 40;
const k = (rows: number[][]) => curve(rows.map((r) => [r[0] - G, r[1]] as Key));

// ── the list ───────────────────────────────────────────────────────────────
const ROW = 61.4; // pt
// name, handle, pnl, count, followed?, avatar
const TRADERS: [string, string, string, string, boolean, string][] = [
  ["Nadia", "@nadiatrades", "+$77.5K", "29.3K", true, trNadia],
  ["moo capital", "@moocapital", "+$70K", "17.8K", true, trMoo],
  ["Jae", "@jaeeee", "+$56.7K", "9.9K", true, trJae],
  ["0xSofia", "@0xsofia", "+$45.6K", "6.4K", true, trSofia],
  ["Benji", "@benjitrades", "+$38.2K", "4.1K", true, trBenji],
  ["Priya M", "@priyam", "+$27.4K", "3.8K", true, trPriya],
  ["Miko", "@mikotrades", "-$12.4K", "1.9K", true, trMiko],
  ["PoorGoat 🐂🀄💛🐈", "@PoorGoat_", "+$21.9K", "1.9K", false, trPoorgoat],
  ["Ser Albert", "@ser_albert", "+$16.2K", "2.4K", false, trAlbert],
  ["Raizel", "@Raizel", "+$15K", "3.2K", false, trRaizel],
  ["slander", "@slander", "+$10.3K", "1K", false, trSlander],
  ["asta", "@asta", "+$9.8K", "1K", false, trHeadcat],
  ["kai", "@kaitrades", "+$8.1K", "980", false, trBenji],
];

function personIcon(g: OffscreenCanvasRenderingContext2D, cx: number, cy: number, plus: boolean) {
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.arc(cx - 1.6, cy - 3.6, 3.1, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(cx - 1.6, cy + 4.6, 5.6, 3.9, 0, Math.PI, 0);
  g.closePath();
  g.fill();
  g.strokeStyle = "#ffffff";
  g.lineWidth = 1.4;
  g.lineCap = "round";
  g.beginPath();
  if (plus) {
    g.moveTo(cx + 5.4, cy - 1.2); g.lineTo(cx + 5.4, cy + 3.6);
    g.moveTo(cx + 3, cy + 1.2); g.lineTo(cx + 7.8, cy + 1.2);
  } else {
    g.moveTo(cx + 3.4, cy + 1.6); g.lineTo(cx + 5, cy + 3.2); g.lineTo(cx + 8, cy - 0.2);
  }
  g.stroke();
}

function traderList(imgs: Record<string, CanvasImageSource>): Painter {
  return (g) => {
    TRADERS.forEach(([name, handle, pnl, count, followed, av], i) => {
      const y = i * ROW;
      image(g, imgs[av], 46.7, 30.6 + y, 45.8);
      txt(g, name, 79.1, 25.5 + y, 15.3, UI.white, 500);
      txt(g, handle, 79.6, 45 + y, 13.4, "#a9a7b4", 400);
      txt(g, pnl, 331, 26.4 + y, 13.7, pnl.startsWith("-") ? UI.red : "#25bc5f", 500, "right");
      txt(g, count, 331, 43.5 + y, 11.9, "#abaab6", 400, "right");
      g.fillStyle = followed ? "#171523" : "#5b67f3";
      rrect(g, 345.6, 12.7 + y, 34, 34.7, 8);
      g.fill();
      personIcon(g, 362.6, 30 + y, !followed);
    });
  };
}

/** glass tab bar and the Paste toast, pinned to the bottom of the screen (footer is 172 pt tall, top = 680 pt) */
const FOOT_TOP = 680;
function footer(g: OffscreenCanvasRenderingContext2D) {
  const y = (v: number) => v - FOOT_TOP;
  // toast
  g.fillStyle = "rgba(44,43,52,0.86)";
  rrect(g, 53.4, y(686.4), 301.6, 46, 23);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.75)";
  g.fillRect(72.6, y(698), 1.1, 22);
  g.fillStyle = "rgba(30,29,37,0.95)";
  rrect(g, 295, y(698.8), 40, 18.6, 6);
  g.fill();
  txt(g, "Paste", 315, y(712.2), 11, "#f2f1f6", 500, "center");
  // tab bar
  g.fillStyle = "rgba(30,29,38,0.84)";
  rrect(g, 25.8, y(761.9), 353.8, 48, 24);
  g.fill();
  g.fillStyle = "rgba(58,57,68,0.9)";
  rrect(g, 98.3, y(763.5), 68.6, 44.8, 22.4);
  g.fill();
  g.strokeStyle = "#c9c8d3";
  g.lineWidth = 1.6;
  g.lineJoin = "round";
  g.lineCap = "round";
  const cy = y(785.9);
  // home
  g.beginPath();
  g.moveTo(53.5, cy + 9); g.lineTo(53.5, cy - 1.5); g.lineTo(61.7, cy - 8.5); g.lineTo(69.9, cy - 1.5); g.lineTo(69.9, cy + 9); g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(58.9, cy + 9); g.lineTo(58.9, cy + 3); g.lineTo(64.5, cy + 3); g.lineTo(64.5, cy + 9);
  g.stroke();
  // search (selected)
  g.strokeStyle = "#ffffff";
  g.lineWidth = 2.1;
  g.beginPath();
  g.arc(131.6, cy - 1.4, 8.6, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(137.8, cy + 4.8); g.lineTo(142.3, cy + 9.3);
  g.stroke();
  // clans (two linked rounded squares)
  g.strokeStyle = "#c9c8d3";
  g.lineWidth = 1.6;
  rrect(g, 193.5, cy - 7.5, 13, 15, 6.5);
  g.stroke();
  rrect(g, 202.5, cy - 7.5, 13, 15, 6.5);
  g.stroke();
  // people
  g.beginPath();
  g.arc(272, cy - 3.6, 4, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(272, cy + 9.5, 7.4, Math.PI * 1.1, Math.PI * 1.9);
  g.stroke();
  g.beginPath();
  g.arc(280.5, cy - 5.6, 3.3, -Math.PI * 0.6, Math.PI * 0.6);
  g.stroke();
  // avatar dot
  const grad = g.createRadialGradient(343, cy - 4, 1, 346, cy, 11);
  grad.addColorStop(0, "#9ffff2");
  grad.addColorStop(1, "#17d9e6");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(346, cy, 11, 0, Math.PI * 2);
  g.fill();
}

// ── phone pose ─────────────────────────────────────────────────────────────
// glide up the list: cumulative content shift (px) from 583, measured by strip correlation
const SHIFT = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -2, -3, -4, -5, -7, -9, -11, -13, -16, -19, -22, -26, -30, -35, -41, -47, -54, -62, -71, -81, -93, -107, -124, -144, -169, -202, -247, -312, -393, -462, -512, -549, -579, -603, -624, -642, -658, -672, -685, -696, -706, -715, -724, -732, -739, -746, -752, -758, -763, -768, -773, -777, -781, -785, -789, -792, -795, -798, -801, -804, -807, -810, -814, -818, -823, -828, -834, -840, -847, -855, -864, -874, -885, -897, -910, -925, -941, -959, -980, -1004, -1032, -1066, -1108, -1166, -1286];
const PH = [
  [555, 200, 779, 950], [556, 160, 748, 856], [557, 144, 731, 810], [558, 136, 717, 774], [559, 130, 703, 754],
  [560, 120, 693, 726], [561, 116, 685, 710], [562, 114, 678, 696], [563, 110, 672, 684], [564, 108, 665, 670],
  [565, 104, 662, 664], [566, 104, 658, 656], [567, 104, 654, 652], [568, 103, 651, 648], [569, 103, 648, 644],
  [570, 102, 648, 640], [572, 102, 647, 638], [574, 102, 646.5, 634], [577, 103, 646.5, 631], [579, 103, 646.5, 627],
  [581, 104, 646.5, 625], [583, 104, 646, 622], [585, 104, 646, 620], [587, 104, 646, 617], [589, 104, 646, 615],
  [591, 104, 646, 613], [593, 104, 646, 612], [595, 104, 646, 610], [597, 104, 646, 609], [599, 104, 646, 608],
  [603, 104, 646, 606], [606, 104, 646, 604], [615, 104, 646, 604], [621, 104, 646, 606], [630, 104, 646, 608],
  [640, 104, 646, 611], [650, 104, 646, 612], [660, 104, 646, 614], [670, 104, 646, 616], [680, 104, 646, 617],
];
const phTop0 = k(PH.map((r) => [r[0], r[1]]));
const phX = k(PH.map((r) => [r[0], r[2]]));
const phW = k(PH.map((r) => [r[0], r[3]]));
/** from 633 the phone's bottom edge is in frame: measured directly */
const phBottom = k([[633, 709], [636, 675], [639, 650], [642, 629], [645, 613], [648, 600], [651, 589], [654, 581], [657, 573], [660, 561], [663, 544], [666, 520], [669, 488], [672, 444], [675, 381], [678, 278], [680, 150]]);
function phTop(g: number) {
  if (g < 583) return phTop0(g - G);
  if (g >= 633) {
    const s = phW(g - G) / PHONE_W;
    const t = phBottom(g - G) - 1427 * s;
    if (g >= 640) return t;
    // blend from the shift track into the measured bottom over 633–640
    const a = (g - 633) / 7;
    return shiftTop(g) * (1 - a) + t * a;
  }
  return shiftTop(g);
}
function shiftTop(g: number) {
  const i = Math.min(SHIFT.length - 1, g - 583);
  const fr = g - Math.floor(g);
  const a = SHIFT[Math.min(SHIFT.length - 1, Math.floor(i))];
  const b = SHIFT[Math.min(SHIFT.length - 1, Math.floor(i) + 1)];
  return 104 + a + (b - a) * fr;
}

// ── the cursor tap on "Traders" (555–559) ──────────────────────────────────
const curX = k([[555, 610], [556, 630], [557, 636], [558, 641]]);
const curY = k([[555, 463], [556, 384], [557, 352], [558, 330]]);
const curS = k([[555, 1.38], [556, 1.1], [557, 0.85], [558, 0.5], [559, 0]]);
const headerMix = k([[556, 0], [559, 0.6], [560, 1]]);

// ── avatars flying in: [frame, x, y, d] (row slots at 590 from the phone pose) ──
const FLY: [string, number[][]][] = [
  [trNadia, [[556, 1100, 84, 200], [557, 1126, 250, 180], [558, 1076, 374, 160], [559, 994, 440, 150], [560, 910, 474, 135], [561, 836, 490, 125], [562, 774, 500, 115], [563, 716, 500, 105], [564, 664, 500, 100], [565, 624, 490, 95], [566, 586, 480, 90], [567, 554, 466, 85], [568, 528, 450, 80], [569, 506, 430, 75], [570, 488, 416, 70], [572, 460, 384, 65], [574, 444, 364, 62], [577, 430, 334, 58], [581, 422, 320, 57], [586, 432, 309, 55], [590, 436.1, 305.1, 54.7]]],
  [trMoo, [[558, 1030, 16, 140], [559, 1114, 156, 180], [560, 1110, 300, 160], [561, 1046, 394, 145], [562, 974, 444, 130], [563, 900, 474, 120], [564, 836, 490, 112], [565, 780, 496, 100], [566, 730, 500, 95], [567, 684, 496, 88], [568, 644, 494, 85], [569, 610, 490, 80], [570, 578, 486, 75], [572, 530, 472, 68], [574, 490, 454, 62], [577, 454, 436, 58], [581, 430, 410, 56], [586, 434, 396, 55], [590, 436.1, 391.2, 54.7]]],
  [trJae, [[561, 1076, 70, 200], [562, 1106, 230, 175], [563, 1074, 344, 155], [564, 1012, 420, 140], [565, 940, 464, 125], [566, 874, 484, 115], [567, 816, 504, 100], [568, 764, 514, 95], [569, 716, 530, 85], [570, 676, 530, 80], [572, 606, 530, 70], [574, 554, 526, 65], [577, 490, 514, 60], [581, 444, 504, 58], [586, 437, 486, 55], [590, 436.1, 477.2, 54.7]]],
  [trSofia, [[563, 1020, 30, 200], [564, 1100, 160, 180], [565, 1092, 300, 160], [566, 1040, 394, 145], [567, 972, 454, 130], [568, 906, 494, 120], [569, 846, 520, 112], [570, 792, 540, 105], [572, 704, 564, 92], [574, 630, 580, 82], [577, 548, 590, 72], [581, 476, 590, 62], [586, 445, 572, 57], [590, 436.1, 563.3, 54.7]]],
  [trBenji, [[566, 1074, 84, 190], [567, 1096, 250, 170], [568, 1060, 370, 150], [569, 1000, 450, 135], [570, 934, 510, 125], [572, 820, 574, 110], [574, 726, 614, 95], [577, 616, 646, 80], [581, 520, 664, 70], [586, 460, 656, 60], [590, 436.1, 649.3, 54.7]]],
];
const LAND = 590;

// ── "Clans" rising into the row (680–722) ──────────────────────────────────
const clBase = k([[680, 616], [682, 514], [684, 472], [686, 447], [688, 430], [690, 420], [692, 413], [694, 407], [696, 402], [698, 398], [700, 394], [702, 391], [704, 388], [706, 385], [708, 383], [710, 381], [712, 379], [714, 377], [716, 374], [718, 368], [720, 354], [722, 319]]);
const clScale = k([[690, 1], [696, 0.96], [700, 0.934], [704, 0.894], [708, 0.841], [712, 0.762], [714, 0.722], [716, 0.662], [718, 0.596], [720, 0.517], [722, 0.364]]);
const clAlpha = k([[679, 0], [680, 0.55], [682, 0.85], [684, 0.9], [690, 0.95], [716, 0.97], [718, 0.95], [720, 0.8], [722, 0.55]]);
/** gap between "Traders" right ink edge and "Clans" left ink edge, unscaled */
const CL_GAP = 46;

// the lit disc stack behind the phone (left of it): first edge, spacing, fill
const stX0 = k([[555, -30], [583, 26], [600, 46], [620, 82], [635, 60], [650, 36], [665, 58], [679, 74]]);
const stSp = k([[555, 125], [583, 120], [600, 132], [620, 120], [650, 100], [665, 96], [679, 94]]);
const stB = k([[555, 1], [600, 2], [620, 4], [650, 8], [665, 11], [679, 12]]);

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => build(ctx));
}

function build(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  trainCamera(ctx);
  const bg = discStack("#5463f0", "#adb5f6");
  scene.add(bg);
  const flat = new THREE.Group();
  flat.name = "flat-layers";
  flat.position.set(0, 0, -SCREEN_Z);
  flat.scale.setScalar(SCREEN_Z / FOCAL);
  scene.add(flat);

  // phone
  const imgs: Record<string, CanvasImageSource> = {};
  const headerA = layer(100, (g) => {
    statusBar(g);
    tabPills(g, -1);
    // "Traders" is still arriving: blank its label
    g.fillStyle = UI.screen;
    g.fillRect(124, 72, 60, 24);
  });
  const headerB = layer(100, (g) => {
    statusBar(g);
    tabPills(g, 2);
  });
  const list = layer(ROW * TRADERS.length + 40, traderList(imgs));
  const foot = layer(172, footer, true);
  const ph = phone(headerA, list, foot, "phone-traders");
  ph.material.uniforms.uHeader2.value = headerB.tex;
  ph.material.uniforms.uRowH.value = ROW;
  headerB.tex.colorSpace = THREE.NoColorSpace;
  flat.add(ph);
  const loader = new THREE.ImageLoader(ctx.manager);
  for (const url of new Set(TRADERS.map((t) => t[5])))
    loader.load(url, (img) => {
      imgs[url] = img;
      repaint(list, traderList(imgs));
    });

  // cursor: a lilac kite
  const curCanvas = new OffscreenCanvas(120, 180);
  {
    const g = curCanvas.getContext("2d")!;
    const grad = g.createLinearGradient(20, 10, 100, 170);
    grad.addColorStop(0, "#c9cdff");
    grad.addColorStop(1, "#4f5ef3");
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(52, 6); g.lineTo(108, 96); g.lineTo(58, 174); g.lineTo(12, 104); g.closePath();
    g.fill();
  }
  const curTex = new THREE.CanvasTexture(curCanvas as unknown as HTMLCanvasElement);
  curTex.colorSpace = THREE.SRGBColorSpace;
  const cursor = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), new THREE.MeshBasicMaterial({ map: curTex, transparent: true, depthTest: false }));
  cursor.name = "cursor";
  cursor.renderOrder = 80;
  flat.add(cursor);

  const flyers = FLY.map(([url, keys], i) => {
    const b = bubble(`fly-${i}`);
    loadBubble(b, url, ctx.manager);
    flat.add(b);
    return { b, f0: keys[0][0], x: k(keys.map((r) => [r[0], r[1]])), y: k(keys.map((r) => [r[0], r[2]])), d: k(keys.map((r) => [r[0], r[3]])) };
  });

  const tradersW = text("Traders", { size: 62, weight: 400, color: "#ffffff" }, "row-traders");
  const clans = text("Clans", { size: 62, weight: 400, color: "#ffffff" }, "row-clans");
  flat.add(tradersW, clans);

  return ({ frame: f }) => {
    const g = f + G;
    const bu = bg.material.uniforms;
    bu.uCount.value = g < 680 ? 5 : 0;
    bu.uX0.value = stX0(f);
    bu.uSpacing.value = stSp(f);
    bu.uB.value = stB(f) / 255;

    // phone
    const w = phW(f);
    ph.visible = g < 681;
    placePhone(ph, phX(f), phTop(g), w / PHONE_W);
    const u = ph.material.uniforms;
    u.uHeaderMix.value = headerMix(f);
    (u.uReveal.value as THREE.Vector3).set(g - 569, 2.5, 8);
    (u.uHideAv.value as THREE.Vector3).set(g < LAND ? 5 : 0, 46.7, 30.6);

    cursor.visible = g < 559;
    cursor.position.set(curX(f) - 640, 360 - curY(f), 0);
    cursor.scale.setScalar(Math.max(curS(f), 0.001));

    for (const fl of flyers) {
      if (g < fl.f0 || g >= LAND) {
        fl.b.visible = false;
        continue;
      }
      setBubble(fl.b, fl.x(f), fl.y(f), fl.d(f), 1, 0, 0);
    }

    // "Clans" row
    const on = g >= 680;
    const s = clScale(f);
    const base = clBase(f);
    clans.visible = on;
    tradersW.visible = on;
    if (on) {
      clans.scale.setScalar(s);
      const cw = clans.userData.inkRight - clans.userData.inkLeft;
      const cLeft = 640 - (cw * s) / 2;
      clans.position.set(X(cLeft - clans.userData.inkLeft * s), Y(base), 0);
      setText(clans, { opacity: clAlpha(f) });
      tradersW.scale.setScalar(s);
      const tRight = cLeft - CL_GAP * s;
      tradersW.position.set(X(tRight - tradersW.userData.inkRight * s), Y(base), 0);
      setText(tradersW, { opacity: 0.3 * clAlpha(f), maskL: (400 - 640 - tradersW.position.x) / s, maskSoft: 18 / s });
    }
    void PT;
    void INSET;
  };
}
