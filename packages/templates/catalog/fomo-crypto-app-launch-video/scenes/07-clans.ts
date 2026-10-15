/**
 * 723–856 · clans
 *
 *  723–725  a cursor taps "Clans"; the tab lights
 *  724–756  three clan rows arrive as big frosted cards and shrink into the list
 *  756–770  a purple glow lights the first row and sweeps across it (the tap)
 *  762–799  the clan page pushes in from the right (both pages ride one strip)
 *  790–856  the phone glides up past the banner, PnL and chips to the members
 *
 * Every pose was tracked off the reference: the phone from its screen edges
 * (and, once they leave frame, by strip correlation), the cards from their
 * name text, the push by correlating against the settled page. Screen
 * content is laid out in iOS points measured on unwarped reference frames.
 * Local frame = global − 723; keys are global frames and composition px.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { withBrandFonts } from "../components/fonts";
import { X, Y } from "../components/stage";
import { raw } from "../components/background";
import { curve, linear, type Key } from "../components/keys";
import { trainCamera, FOCAL } from "../components/train";
import { layer, statusBar, tabPills, txt, rrect, UI, PT, type Painter } from "../components/phone";
import { roundRect, setRect } from "../components/shapes";
import clanConviction from "../assets/ui/clan-conviction.png";
import clanHeaven from "../assets/ui/clan-heaven.png";
import clanFantom from "../assets/ui/clan-fantom.png";
import clanBanner from "../assets/ui/clan-banner.jpg";
import clanLogo from "../assets/ui/clan-logo.png";
import chipEth from "../assets/ui/chip-eth.png";
import chipSol from "../assets/ui/chip-sol.png";
import chipAvatar from "../assets/ui/chip-avatar.png";
import memJohn from "../assets/ui/mem-johndoe.png";
import memGoat from "../assets/ui/mem-poorgoat.png";
import memJack from "../assets/ui/mem-jack.png";
import memCrypto from "../assets/ui/mem-cryptoolin.png";
import memAboc from "../assets/ui/mem-aboc.png";
import goatEmoji from "../assets/ui/mem-poorgoat-emoji.png";

const G = 723;
const SCREEN_Z = 40;
// the device as seen here: 639 × 1385 px screen at scale 1, a 15.6 px rim, no bezel
const SCREEN_W = 639;
const SCREEN_H = 1385;
const RIM_W = 15.6;
const SCREEN_R = 109;
const DEV_W = SCREEN_W + 2 * RIM_W;
const DEV_H = SCREEN_H + 2 * RIM_W;
const k = (rows: number[][]) => curve(rows.map((r) => [r[0] - G, r[1]] as Key));

// ── phone pose: [frame, screen top px, scale] ──────────────────────────────
const PHONE = [
  [723, 174.0, 1.1424], [724, 162.0, 1.0829], [725, 155.0, 1.0423], [726, 149.0, 1.0094], [727, 144.0, 0.9844],
  [728, 139.0, 0.9624], [729, 135.0, 0.9421], [730, 131.0, 0.9249], [731, 128.0, 0.9108], [732, 126.0, 0.8983],
  [733, 123.0, 0.8858], [734, 121.0, 0.8748], [735, 119.0, 0.8654], [736, 117.0, 0.8576], [737, 115.0, 0.8498],
  [738, 114.0, 0.8435], [739, 112.0, 0.8372], [740, 111.0, 0.831], [741, 110.0, 0.8279], [742, 108.5, 0.8216],
  [744, 106.5, 0.8153], [746, 105.0, 0.8106], [748, 104.0, 0.8075], [750, 103.0, 0.8056], [752, 102.0, 0.8048],
  [754, 101.0, 0.804], [756, 100.0, 0.8032], [758, 99.0, 0.8028], [760, 98.0, 0.8028], [762, 97.0, 0.8028],
  [764, 96.0, 0.8028], [766, 95.0, 0.802], [768, 94.0, 0.8005], [770, 93.0, 0.7997], [772, 92.0, 0.7997],
  [774, 91.0, 0.7997], [776, 90.0, 0.7997], [778, 89.0, 0.7997], [780, 88.0, 0.7989], [782, 87.0, 0.7975],
  [784, 86.0, 0.7964], [786, 85.0, 0.7952], [788, 84.0, 0.794], [790, 83.0, 0.7933], [792, 82.0, 0.793],
  [794, 81.0, 0.7926], [795, 80.0, 0.7925], [796, 79.0, 0.7923], [797, 78.0, 0.7922], [798, 76.0, 0.792],
  [799, 74.0, 0.7919], [800, 72.0, 0.7903], [801, 69.0, 0.7903], [802, 67.0, 0.7903], [803, 63.0, 0.7903],
  [804, 60.0, 0.7903], [805, 55.0, 0.7903], [806, 50.0, 0.7903], [807, 45.0, 0.7903], [808, 38.0, 0.7903],
  [809, 31.0, 0.7895], [810, 23.0, 0.7887], [811, 13.0, 0.7879], [812, 1.0, 0.7872], [813, -16.2, 0.787],
  [814, -36.4, 0.7868], [815, -62.7, 0.7866], [816, -99.9, 0.7864], [817, -164.1, 0.7862], [818, -256.3, 0.786],
  [819, -321.5, 0.7858], [820, -359.8, 0.7856], [821, -387.0, 0.7848], [822, -404.9, 0.784], [823, -420.6, 0.7838],
  [824, -433.4, 0.7836], [825, -444.1, 0.7835], [826, -452.8, 0.7833], [827, -460.5, 0.7831], [828, -468.0, 0.7829],
  [830, -479.0, 0.7825], [832, -487.6, 0.7816], [834, -495.0, 0.7809], [836, -501.0, 0.7805], [838, -505.5, 0.78],
  [840, -509.0, 0.7795], [842, -511.0, 0.7785], [844, -513.0, 0.7778], [846, -516.2, 0.7778], [847, -519.2, 0.7778],
  [848, -523.2, 0.7778], [849, -528.2, 0.7778], [850, -534.2, 0.777], [851, -539.6, 0.7762], [852, -546.5, 0.775],
  [853, -558.9, 0.7746], [854, -574.9, 0.7746], [855, -596.9, 0.7746], [856, -630.9, 0.7746],
];
const scrTop = k(PHONE.map((r) => [r[0], r[1]]));
const phScale = k(PHONE.map((r) => [r[0], r[2]]));
/** page scroll (pt) of the clan page, + = content up */
const pageScroll = k([[812, 0], [816, -3], [821, -8.5], [846, -7.7], [856, -7.0]]);

// ── cursor tap on "Clans" ──────────────────────────────────────────────────
const curX = k([[723, 660], [724, 668], [725, 671]]);
const curY = k([[723, 340], [724, 318], [725, 305]]);
const curS = k([[723, 0.55], [724, 0.3], [725, 0.08], [726, 0]]);
const tabMix = k([[723, 0], [724, 0.45], [725, 1]]);

// ── the list (page A) ──────────────────────────────────────────────────────
const ROW = 75.2;
const ICON_Y = 150.1; // icon centre of row 0 (pt)
const CLANS: [string, string, string, string][] = [
  ["Conviction Capital", "+$118.4K", "24", clanConviction],
  ["Heaven", "+$93.5K", "11", clanHeaven],
  ["Fantom Troupe", "+$87.9K", "10", clanFantom],
];
const LIST_GREEN = "#4ff38f";

function people(g: OffscreenCanvasRenderingContext2D, x: number, base: number, color: string) {
  // two little busts, ~8 pt wide, sitting on the baseline
  g.fillStyle = color;
  g.beginPath(); g.arc(x + 2.6, base - 5.6, 1.9, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(x + 2.6, base - 0.4, 3.0, 2.6, 0, Math.PI, 0); g.fill();
  g.globalAlpha = 0.75;
  g.beginPath(); g.arc(x + 6.4, base - 5.9, 1.6, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(x + 6.9, base - 0.8, 2.2, 2.4, 0, Math.PI, 0); g.fill();
  g.globalAlpha = 1;
}

/** one clan row, drawn at pt offset (0, dy): used by the list page and by the flying cards */
function clanRow(g: OffscreenCanvasRenderingContext2D, i: number, dy: number, imgs: Record<string, CanvasImageSource>) {
  const [name, pnl, count, icon] = CLANS[i];
  const cy = ICON_Y + dy;
  if (imgs[icon]) {
    g.save();
    rrect(g, 49.6 - 19.65, cy - 19.65, 39.3, 39.3, 9);
    g.clip();
    g.drawImage(imgs[icon], 49.6 - 19.65, cy - 19.65, 39.3, 39.3);
    g.restore();
  }
  txt(g, name, 81.2, cy + 5.7, 15.4, UI.white, 500);
  txt(g, pnl, 360.2, cy - 0.5, 15.3, LIST_GREEN, 500, "right");
  txt(g, count, 360.4, cy + 15.9, 11, "#8e8f9b", 400, "right");
  g.font = `400 11px "Aeonik", "Helvetica Neue", Helvetica, Arial, sans-serif`;
  const cw = g.measureText(count).width;
  people(g, 360.4 - cw - 10.6, cy + 15.9, "#8e8f9b");
}

const PAGE_A_H = 420;
function pageA(active: number, imgs: Record<string, CanvasImageSource> | null): Painter {
  return (g) => {
    tabPills(g, active);
    if (imgs) for (let i = 0; i < 3; i++) clanRow(g, i, i * ROW, imgs);
  };
}

// ── the clan page (page B) ─────────────────────────────────────────────────
const PAGE_B_H = 880;
const MEMBERS: [string, string, string, string | null, string][] = [
  ["John Doe", "@fomo", "+$91,240.00", "You", memJohn],
  ["PoorGoat", "@PoorGoat_", "+$21,983.00", null, memGoat],
  ["Jack", "@boosteryting", "+$13,528.00", null, memJack],
  ["cryptoolin", "@cryptoolin", "+$9,770.00", null, memCrypto],
  ["aboc", "@1aboc", "+$7,646.00", null, memAboc],
];

function personPlus(g: OffscreenCanvasRenderingContext2D, cx: number, cy: number) {
  g.fillStyle = "#ffffff";
  g.beginPath(); g.arc(cx - 1.6, cy - 3.4, 3.0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx - 1.6, cy + 4.6, 5.4, 3.8, 0, Math.PI, 0); g.closePath(); g.fill();
  g.strokeStyle = "#ffffff"; g.lineWidth = 1.4; g.lineCap = "round";
  g.beginPath(); g.moveTo(cx + 5.2, cy - 1.2); g.lineTo(cx + 5.2, cy + 3.6); g.moveTo(cx + 2.8, cy + 1.2); g.lineTo(cx + 7.6, cy + 1.2); g.stroke();
}

function pageB(imgs: Record<string, CanvasImageSource>): Painter {
  return (g) => {
    const img = (u: string, x: number, y: number, w: number, h: number) => imgs[u] && g.drawImage(imgs[u], x, y, w, h);
    // banner (lifted art), logo over its bottom edge
    img(clanBanner, 0, 55, 393, 126);
    img(clanLogo, 59.9 - 32, 182.4 - 32, 64, 64);
    // two square icon buttons: leave, share
    for (const x0 of [286, 326]) {
      g.fillStyle = "#13111f";
      rrect(g, x0, 184, 32, 32.3, 8);
      g.fill();
    }
    g.strokeStyle = "#ffffff"; g.lineWidth = 1.5; g.lineCap = "round"; g.lineJoin = "round";
    rrect(g, 296.2, 193.6, 8, 13, 2.2); g.stroke();
    g.beginPath(); g.moveTo(303, 200.1); g.lineTo(310.6, 200.1); g.moveTo(308, 197.4); g.lineTo(310.8, 200.1); g.lineTo(308, 202.8); g.stroke();
    g.beginPath(); g.moveTo(335.5, 201.5); g.lineTo(335.5, 206.4); g.lineTo(348.5, 206.4); g.lineTo(348.5, 201.5); g.stroke();
    g.beginPath(); g.moveTo(342, 202.6); g.lineTo(342, 193.8); g.moveTo(338.8, 196.8); g.lineTo(342, 193.6); g.lineTo(345.2, 196.8); g.stroke();
    // title block
    txt(g, "Conviction Capital", 27.5, 244.1, 21.2, UI.white, 500);
    txt(g, "CC ON TOP", 27.5, 273.8, 14.3, UI.white, 500);
    g.fillStyle = "#12101c";
    rrect(g, 26.7, 289, 138, 31.3, 15.6);
    g.fill();
    // X mark
    g.strokeStyle = "#ffffff"; g.lineWidth = 1.7; g.lineCap = "butt";
    g.beginPath(); g.moveTo(40.2, 299.6); g.lineTo(50.6, 310.6); g.moveTo(50.4, 299.6); g.lineTo(40.4, 310.6); g.stroke();
    txt(g, "@Convictioncap", 57.1, 307.9, 12.43, UI.white, 500);
    // stats
    people(g, 40.5, 341, "#9e9ca8");
    txt(g, "24 members", 49.1, 341, 10.9, "#9e9ca8", 400);
    g.strokeStyle = "#9e9ca8"; g.lineWidth = 1.2;
    g.beginPath(); g.arc(130.5, 337.2, 4.4, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(129, 335.4); g.lineTo(132.2, 335.4); g.moveTo(129, 338.8); g.lineTo(132.2, 338.8); g.stroke();
    txt(g, "329 trades", 138.7, 341, 10.9, "#9e9ca8", 400);
    g.fillStyle = "#0f0d1a";
    g.fillRect(10.7, 354, 360, 1.7);
    // PnL
    txt(g, "Clan PnL", 27.8, 380.2, 12.5, "#a9a7b4", 400);
    g.fillStyle = "#151320";
    rrect(g, 263, 366, 30, 19.3, 6);
    g.fill();
    txt(g, "24h", 269, 379.6, 10.84, UI.white, 500);
    txt(g, "7d", 306.7, 379.6, 10.84, "#4d4b58", 500);
    txt(g, "30d", 338.7, 379.6, 10.84, "#4d4b58", 500);
    txt(g, "+$118,400.00", 30.8, 414.1, 24.56, "#27da6a", 500);
    txt(g, "#1", 180.6, 414.1, 11.5, "#a4a2af", 500);
    // chips
    for (const [x0, x1] of [[33.3, 168.3], [174.7, 319.7], [325, 372.7]]) {
      g.fillStyle = "#110f1c";
      rrect(g, x0, 432.3, x1 - x0, 49.4, 10);
      g.fill();
    }
    img(chipEth, 58.2 - 9.5, 457 - 9.5, 19, 19);
    img(chipSol, 199.3 - 11.5, 457 - 11.5, 23, 23);
    img(chipAvatar, 340.7 - 14.5, 457 - 14.5, 29, 29);
    txt(g, "ETH", 78.6, 453.8, 12.5, UI.white, 500);
    txt(g, "+$35,520.00", 80.2, 468.3, 10.3, "#2fd06e", 500);
    txt(g, "SOL", 220.3, 453.8, 12.5, UI.white, 500);
    txt(g, "+$17,760.00", 221.2, 468.3, 10.3, "#2fd06e", 500);
    // tabs
    txt(g, "Members (24)", 21.2, 513.5, 12.56, UI.white, 500);
    txt(g, "Holdings", 124.6, 513.5, 12.3, "#514f5c", 500);
    txt(g, "Feed", 225, 513.5, 12.3, "#514f5c", 500);
    txt(g, "Thesis", 310.3, 513.5, 12.3, "#514f5c", 500);
    g.fillStyle = "#16141f";
    g.fillRect(10, 527.3, 373, 1);
    g.fillStyle = "#5d61ee";
    rrect(g, 12.3, 526, 90, 2.2, 1.1);
    g.fill();
    txt(g, "Follow all", 303.6, 549.9, 12.3, "#6463f2", 500);
    // members
    MEMBERS.forEach(([name, handle, pnl, you, av], r) => {
      const cy = 584 + r * 54.3;
      img(av, 44.3 - 18, cy - 18, 36, 36);
      txt(g, name, 72, cy - 4.5, 14.2, UI.white, 500);
      if (r === 1) {
        g.font = `500 14.2px "Aeonik", "Helvetica Neue", Helvetica, Arial, sans-serif`;
        const nw = g.measureText(name).width;
        img(goatEmoji, 72 + nw + 1.2, cy - 17.7, 68, 20);
      }
      txt(g, handle, 71.4, cy + 13.4, 12.45, "#a3a0ad", 400);
      txt(g, pnl, 313.6, cy + 3.9, 14, "#2fd06e", 500, "right");
      if (you) txt(g, you, 331.6, cy + 3.1, 11.6, "#a8a6b3", 500);
      else {
        g.fillStyle = "#4c5af8";
        rrect(g, 324.7, cy - 16.2, 32.6, 32.4, 7.5);
        g.fill();
        personPlus(g, 341, cy);
      }
    });
  };
}

// ── page push & the row glow ───────────────────────────────────────────────
/** px the clan page still has to travel (0 = settled); the list rides 505 px ahead of it */
const pushDx = k([
  [760, 505], [762, 505], [763, 501], [764, 497], [765, 494], [766, 489], [767, 483], [768, 475], [769, 465],
  [770, 450], [771, 436], [772, 412], [773, 376], [774, 316], [775, 242], [776, 188], [777, 152], [778, 126],
  [779, 106], [780, 90], [781, 78], [782, 66], [783, 56], [784, 48], [785, 42], [786, 34], [787, 30], [788, 24],
  [789, 20], [790, 16], [791, 14], [792, 10], [793, 8], [794, 6], [795, 4], [797, 2], [799, 0],
]);
/** glow centre (pt, page A) and strength */
const glowX = k([[756, 375], [760, 372], [761, 341], [762, 311], [763, 263.6], [764, 220], [765, 192], [766, 167], [767, 128], [768, 105], [769, 66.7], [770, 46], [771, 32]]);
const glowA = k([[755, 0], [756, 0.25], [757, 0.45], [758, 0.65], [759, 0.85], [760, 1], [769, 1], [771, 0.7], [773, 0]]);

// ── the flying cards: [frame, name ink left px, cap top px, name ink width px] ──
const CARDS: { name: { left: number; top: number; w: number }; keys: number[][] }[] = [
  { name: { left: 81.7, top: 144.3, w: 127 }, keys: [[724, 300, 718, 380], [725, 329, 646, 344], [726, 357, 586, 313], [727, 378, 539, 289], [728, 396, 501, 269], [729, 411, 469, 253], [730, 424, 442, 238], [731, 434, 419, 227], [732, 443, 400, 217], [733, 451, 383, 208], [734, 458, 368, 201], [735, 464, 355, 194], [736, 469, 344, 188], [737, 473, 335, 184], [738, 477, 326, 180], [739, 480, 319, 176], [740, 482, 313, 174], [741, 484, 309, 172], [742, 486, 305, 170], [743, 487, 301, 168], [744, 488, 299, 167], [745, 489, 297, 166], [746, 489, 296, 166], [748, 490, 294, 165], [750, 490, 293, 165], [752, 490, 292, 165], [754, 490, 290.5, 165], [756, 490, 289.5, 165]] },
  { name: { left: 82, top: 220, w: 51.7 }, keys: [[729, 340, 740, 133], [730, 364, 682, 123], [731, 385, 635, 114], [732, 402, 597, 106], [733, 416, 566, 100], [734, 428, 539, 94], [735, 438, 516, 90], [736, 447, 496, 86], [737, 454, 479, 83], [738, 461, 464, 79], [739, 466, 451, 77], [740, 471, 440, 75], [741, 475, 430, 73], [742, 479, 422, 71], [743, 482, 416, 69.5], [744, 484, 410, 69], [745, 486, 406, 68], [746, 488, 401, 67], [747, 489, 397.5, 67], [748, 490, 395, 66], [750, 491, 393, 66], [752, 491, 391.5, 66], [754, 491, 390, 66], [756, 491, 389, 66]] },
  { name: { left: 82.3, top: 295.7, w: 105 }, keys: [[735, 380, 735, 236], [736, 400, 699, 220], [737, 415, 666, 206], [738, 427, 638, 195], [739, 437, 614, 186], [740, 446, 594, 177], [741, 454, 577, 170], [742, 460, 561, 164], [743, 466, 548, 159], [744, 471, 537, 154], [745, 475, 527, 150], [746, 478, 519, 148], [747, 481, 512, 145], [748, 484, 506, 142], [749, 486, 501, 140], [750, 488, 497, 139], [751, 489, 494, 138], [752, 490, 492, 137], [753, 490, 490, 137], [754, 491, 488, 136], [756, 491, 486, 136]] },
];
const HANDOVER = 756;

// ── backdrop ───────────────────────────────────────────────────────────────
// the pale disc at top-left: centre (159, cy), r 460, lifts R/G by ~14
const discCy = k([[723, -370], [729, -330], [735, -306], [750, -306], [756, -320], [762, -411], [768, -460], [772, -520]]);
// red-channel lift (levels) of the backdrop at rows 20,130,250,370,490,610,700: left edge and right edge
const LIFT_Y = [20, 130, 250, 370, 490, 610, 700];
const LIFT_L: [number, number[]][] = [
  [723, [0, 0, 1, 1, 4, 5, 2]], [770, [0, 0, 1, 1, 4, 5, 2]], [775, [17, 15, 12, 8, 4, 5, 0]],
  [790, [28, 28, 21, 12, 4, -2, -9]], [805, [22, 27, 22, 12, 5, -2, -11]], [820, [17, 23, 21, 13, 7, -3, -12]],
  [835, [16, 22, 20, 13, 7, -3, -13]], [850, [7, 20, 20, 13, 7, -3, -13]], [856, [7, 17, 19, 13, 7, -3, -13]],
];
const LIFT_R: [number, number[]][] = [
  [723, [0, 2, 2, 4, 7, 6, 2]], [775, [0, 2, 2, 4, 7, 6, 2]], [790, [1, 2, 6, 10, 8, 4, -5]],
  [805, [1, 2, 7, 12, 8, 4, -7]], [820, [1, 1, 9, 12, 8, 3, -6]], [835, [1, 1, 12, 12, 8, 3, -6]],
  [850, [1, 7, 14, 14, 9, 3, -6]], [856, [1, 8, 14, 14, 9, 4, -5]],
];
const liftCurves = (tab: [number, number[]][]) => LIFT_Y.map((_, j) => k(tab.map(([f, v]) => [f, v[j]])));
const liftL = liftCurves(LIFT_L);
const liftR = liftCurves(LIFT_R);

const BG_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.9999, 1.0); }
`;
const BG_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform float uL[7];
  uniform float uR[7];
  uniform vec2 uDisc;    // cy, lift (levels)
  varying vec2 vUv;
  float rowLift(float y, float v[7]) {
    float ys[7];
    ys[0] = 20.0; ys[1] = 130.0; ys[2] = 250.0; ys[3] = 370.0; ys[4] = 490.0; ys[5] = 610.0; ys[6] = 700.0;
    if (y <= ys[0]) return v[0];
    for (int i = 0; i < 6; i++) {
      if (y <= ys[i + 1]) return mix(v[i], v[i + 1], (y - ys[i]) / (ys[i + 1] - ys[i]));
    }
    return v[6];
  }
  void main() {
    vec2 px = vec2(vUv.x * 1280.0, (1.0 - vUv.y) * 720.0);
    vec3 col = mix(uTop, uBottom, px.y / 719.0);
    float t = smoothstep(230.0, 1050.0, px.x);
    float lift = mix(rowLift(px.y, uL), rowLift(px.y, uR), t);
    float d = length(px - vec2(159.0, uDisc.x)) - 460.0;
    lift += uDisc.y * (1.0 - smoothstep(-1.5, 1.5, d));
    col += vec3(lift, lift * 0.88, lift * 0.08) / 255.0;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── the screen overlay: both pages on one strip, the status bar on top ─────
const OVERLAY_VERT = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const OVERLAY_FRAG = /* glsl */ `
  uniform sampler2D uA0;      // list page, no tab lit
  uniform sampler2D uA1;      // list page, Clans lit (+ rows once landed)
  uniform float uTabMix;
  uniform sampler2D uB;       // clan page
  uniform sampler2D uStatus;  // status bar (transparent)
  uniform float uAH;
  uniform float uBH;
  uniform float uStatusH;
  uniform float uStrip;       // pt the list has moved left
  uniform float uScroll;      // pt the clan page has scrolled up
  uniform vec3 uGlow;         // x centre pt, strength, sigma pt
  uniform vec2 uSize;
  uniform float uPT;
  uniform float uInset;
  uniform float uRadius;
  varying vec2 vP;
  float sdRound(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  vec4 pageA(vec2 sp) {
    if (sp.x < 0.0 || sp.x > 393.0 || sp.y > uAH) return vec4(0.0);
    vec2 uv = vec2(sp.x / 393.0, 1.0 - sp.y / uAH);
    vec3 c = mix(texture2D(uA0, uv).rgb, texture2D(uA1, uv).rgb, uTabMix);
    if (uGlow.y > 0.0) {
      // purple glow clipped to row 0's rounded panel
      float d = sdRound(sp - vec2(195.75, 147.9), vec2(179.75, 31.4), 14.0);
      float inside = 1.0 - smoothstep(-0.8, 0.8, d);
      float g = exp(-pow((sp.x - uGlow.x) / uGlow.z, 2.0));
      vec3 glow = vec3(0.169, 0.153, 0.400);
      float a = inside * g * uGlow.y;
      // the glow sits under the row's text and icon: only tint the dark ground
      float ground = 1.0 - smoothstep(0.12, 0.3, max(c.r, max(c.g, c.b)));
      c = mix(c, glow, a * ground);
    }
    return vec4(c, 1.0);
  }
  vec4 pageB(vec2 sp) {
    float y = sp.y + uScroll;
    if (sp.x < 0.0 || sp.x > 393.0 || y < 0.0 || y > uBH) return vec4(0.0);
    return vec4(texture2D(uB, vec2(sp.x / 393.0, 1.0 - y / uBH)).rgb, 1.0);
  }
  void main() {
    vec2 p = vP;
    float dOuter = sdRound(p, uSize * 0.5, uRadius);
    float aOuter = 1.0 - smoothstep(-0.75, 0.75, dOuter);
    if (aOuter <= 0.0) discard;
    float dScreen = sdRound(p, uSize * 0.5 - uInset, uRadius - uInset);
    float inScreen = 1.0 - smoothstep(-0.75, 0.75, dScreen);
    vec4 rim = vec4(1.0, 0.80, 1.0, 0.27);
    // a hairline of shadow where the glass meets the screen
    float edge = 1.0 - smoothstep(0.0, 2.2, abs(dScreen + 0.6));
    rim = mix(rim, vec4(0.12, 0.11, 0.25, 0.85), edge * 0.8);
    if (inScreen <= 0.0) { gl_FragColor = vec4(rim.rgb, rim.a * aOuter); return; }
    vec2 top = vec2(p.x + uSize.x * 0.5, uSize.y * 0.5 - p.y);
    vec2 sp = (top - uInset) / uPT;
    vec4 c = vec4(vec3(0.0235, 0.0157, 0.0667), 1.0);
    vec4 a = pageA(sp + vec2(uStrip, 0.0));
    if (a.a > 0.0) c = a;
    vec4 b = pageB(sp + vec2(uStrip - 393.0, 0.0));
    if (b.a > 0.0) c = b;
    if (sp.y < uStatusH) {
      vec4 s = texture2D(uStatus, vec2(sp.x / 393.0, 1.0 - sp.y / uStatusH));
      c.rgb = mix(c.rgb, s.rgb, s.a);
    }
    vec4 o = mix(rim, vec4(c.rgb, 1.0), inScreen);
    gl_FragColor = vec4(o.rgb, o.a * aOuter);
  }
`;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => build(ctx));
}

function build(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  trainCamera(ctx);
  const bgMat = new THREE.ShaderMaterial({
    vertexShader: BG_VERT,
    fragmentShader: BG_FRAG,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTop: { value: raw("#5463f0") },
      uBottom: { value: raw("#adb5f6") },
      uL: { value: new Array(7).fill(0) },
      uR: { value: new Array(7).fill(0) },
      uDisc: { value: new THREE.Vector2(-370, 14) },
    },
  });
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bgMat);
  bg.frustumCulled = false;
  bg.renderOrder = -1000;
  bg.name = "backdrop";
  bg.userData.pickable = false;
  scene.add(bg);
  const flat = new THREE.Group();
  flat.name = "flat-layers";
  flat.position.set(0, 0, -SCREEN_Z);
  flat.scale.setScalar(SCREEN_Z / FOCAL);
  scene.add(flat);

  // the device: a thin translucent lilac rim around the screen (drawn by the overlay)
  const ph = new THREE.Group();
  ph.name = "phone-clans";
  flat.add(ph);

  const imgs: Record<string, CanvasImageSource> = {};
  const a0 = layer(PAGE_A_H, pageA(-1, null));
  const a1 = layer(PAGE_A_H, pageA(3, null));
  const b = layer(PAGE_B_H, () => {});
  const status = layer(52, (g) => statusBar(g), true);
  for (const l of [a0, a1, b, status]) l.tex.colorSpace = THREE.NoColorSpace;

  const overlayMat = new THREE.ShaderMaterial({
    vertexShader: OVERLAY_VERT,
    fragmentShader: OVERLAY_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uA0: { value: a0.tex },
      uA1: { value: a1.tex },
      uTabMix: { value: 0 },
      uB: { value: b.tex },
      uStatus: { value: status.tex },
      uAH: { value: PAGE_A_H },
      uBH: { value: PAGE_B_H },
      uStatusH: { value: 52 },
      uStrip: { value: 0 },
      uScroll: { value: 0 },
      uGlow: { value: new THREE.Vector3(0, 0, 55) },
      uSize: { value: new THREE.Vector2(DEV_W, DEV_H) },
      uPT: { value: PT },
      uInset: { value: RIM_W },
      uRadius: { value: SCREEN_R + RIM_W },
    },
  });
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(DEV_W, DEV_H), overlayMat);
  overlay.name = "phone-clans-screen";
  overlay.renderOrder = 51;
  ph.add(overlay);

  // flying cards: a frosted panel + the row, in pt, posed per frame
  const ROW_H = 60; // canvas rows are drawn into a 393 × 60 pt strip, icon centre at 30
  const cards = CARDS.map((c, i) => {
    const panel = roundRect("#ffffff", `card-${i}-panel`);
    panel.renderOrder = 60 + i * 2;
    const cv = layer(ROW_H, () => {}, true);
    cv.tex.colorSpace = THREE.NoColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(393, ROW_H),
      new THREE.MeshBasicMaterial({ map: cv.tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
    );
    mesh.name = `card-${i}-${CLANS[i][0].toLowerCase().replace(/ /g, "-")}`;
    mesh.renderOrder = 61 + i * 2;
    flat.add(panel, mesh);
    const kk = c.keys;
    return {
      c,
      i,
      panel,
      mesh,
      cv,
      f0: kk[0][0],
      left: k(kk.map((r) => [r[0], r[1]])),
      top: k(kk.map((r) => [r[0], r[2]])),
      w: k(kk.map((r) => [r[0], r[3]])),
    };
  });

  // cursor (same lilac kite as the traders tap)
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

  // images → repaint the canvases once they're in
  const repaintAll = () => {
    const ga1 = a1.canvas.getContext("2d")!;
    ga1.setTransform(3, 0, 0, 3, 0, 0);
    ga1.fillStyle = UI.screen;
    ga1.fillRect(0, 0, 393, PAGE_A_H);
    pageA(3, null)(ga1, 393, PAGE_A_H);
    a1.tex.needsUpdate = true;
    const gb = b.canvas.getContext("2d")!;
    gb.setTransform(3, 0, 0, 3, 0, 0);
    gb.fillStyle = UI.screen;
    gb.fillRect(0, 0, 393, PAGE_B_H);
    pageB(imgs)(gb, 393, PAGE_B_H);
    b.tex.needsUpdate = true;
    for (const cd of cards) {
      const g = cd.cv.canvas.getContext("2d")!;
      g.setTransform(3, 0, 0, 3, 0, 0);
      g.clearRect(0, 0, 393, ROW_H);
      clanRow(g, cd.i, 30 - ICON_Y, imgs);
      cd.cv.tex.needsUpdate = true;
    }
  };
  const listRows = layer(PAGE_A_H, () => {});
  const urls = [clanConviction, clanHeaven, clanFantom, clanBanner, clanLogo, chipEth, chipSol, chipAvatar, memJohn, memGoat, memJack, memCrypto, memAboc, goatEmoji];
  const loader = new THREE.ImageLoader(ctx.manager);
  let pending = urls.length;
  for (const url of urls)
    loader.load(url, (img) => {
      imgs[url] = img;
      if (--pending === 0) repaintAll();
    });
  void listRows;

  // a second A texture with the rows, used from the hand-over on
  const a2 = layer(PAGE_A_H, () => {});
  a2.tex.colorSpace = THREE.NoColorSpace;
  const paintA2 = () => {
    const g = a2.canvas.getContext("2d")!;
    g.setTransform(3, 0, 0, 3, 0, 0);
    g.fillStyle = UI.screen;
    g.fillRect(0, 0, 393, PAGE_A_H);
    pageA(3, imgs)(g, 393, PAGE_A_H);
    a2.tex.needsUpdate = true;
  };
  const loader2 = new THREE.LoadingManager();
  void loader2;

  let a2Painted = false;

  return ({ frame: f }) => {
    const g = f + G;
    if (!a2Painted && pending === 0) {
      paintA2();
      a2Painted = true;
    }

    // backdrop
    const bu = bgMat.uniforms;
    for (let j = 0; j < 7; j++) {
      (bu.uL.value as number[])[j] = liftL[j](f);
      (bu.uR.value as number[])[j] = liftR[j](f);
    }
    (bu.uDisc.value as THREE.Vector2).set(discCy(f), g < 772 ? 14 : 0);

    // phone
    const s = phScale(f);
    const sTop = scrTop(f);
    ph.scale.setScalar(s);
    ph.position.set(0, 360 - (sTop + (SCREEN_H / 2) * s), 0);
    const u = overlayMat.uniforms;
    u.uTabMix.value = tabMix(f);
    u.uA1.value = g >= HANDOVER && a2Painted ? a2.tex : a1.tex;
    const ppt = PT * s;
    const dx = pushDx(f);
    u.uStrip.value = (505 - dx) / ppt;
    u.uScroll.value = g < 812 ? 0 : pageScroll(f);
    (u.uGlow.value as THREE.Vector3).set(glowX(f), glowA(f), 55);

    // cursor
    cursor.visible = g < 726 && curS(f) > 0.01;
    cursor.position.set(curX(f) - 640, 360 - curY(f), 0);
    cursor.scale.setScalar(Math.max(curS(f), 0.001));

    // cards
    for (const cd of cards) {
      const on = g >= cd.f0 && g < HANDOVER;
      cd.panel.visible = on;
      cd.mesh.visible = on;
      if (!on) continue;
      const cp = cd.w(f) / cd.c.name.w; // px per pt on this card
      const ox = cd.left(f) - cd.c.name.left * cp; // px of pt x = 0
      const rowTop = ICON_Y + cd.i * ROW - 30; // pt y of the strip's top in list space
      const oy = cd.top(f) - (cd.c.name.top - rowTop) * cp; // px of the strip's top
      cd.mesh.scale.setScalar(cp);
      cd.mesh.position.set(X(ox + 196.5 * cp), Y(oy + (ROW_H / 2) * cp), 0);
      // frosted panel: x 14.7–380.6 pt, from 33.6 above to 29.2 below the icon centre
      const pa = 0.24 * THREE.MathUtils.smoothstep(cp, 1.32, 1.62);
      setRect(cd.panel, 365.9 * cp, 62.8 * cp, 14 * cp, pa, 0.75);
      cd.panel.position.set(X(ox + 197.65 * cp), Y(oy + (30 - 33.6 + 31.4) * cp), 0);
    }
  };
}
