/**
 * 06 — "Your app / backend / users / data" -> Serverless -> LoRA -> Dedicated
 * (film frames 430–686, 24 fps)
 * A purple ground with a hairline frame; the carousel of words slides left
 * behind "Your" under a soft mask. Then headlines cut in over a pixel mosaic
 * that darkens, flips, and zooms into one white cell that fills the frame.
 * All tracks are measured off the reference (components/mosaicData.ts holds
 * the per-frame mosaic fit).
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { pixelStage, sx, sy, H } from "../components/stage";
import { withBrandFonts, C } from "../components/brand";
import { label, setLabel, measure, type TypeStyle, type Label } from "../components/type";
import { inkPlacer } from "../components/place";
import { mosaicLayer } from "../components/mosaic";
import { MOSAIC } from "../components/mosaicData";
import { sampled, clamp01 } from "../components/ease";

const START = 430;
const WHITE: TypeStyle = { size: 129, weight: 500, tracking: -0.025, color: "#ffffff" };
const CAROUSEL: TypeStyle = { size: 132.5, weight: 500, tracking: -0.025, color: "#ffffff" };

function solid(w: number, h: number, color: string, name: string, order: number, opacity = 1) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, toneMapped: false }),
  );
  m.name = name;
  m.renderOrder = order;
  return m;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => {
    const { scene } = ctx;
    pixelStage(ctx, C.flood);

    const mosaic = mosaicLayer();
    scene.add(mosaic.mesh);

    // ---- hairline frame (430–524)
    const frame = new THREE.Group();
    frame.name = "hairline-frame";
    const lineTop = solid(1920, 1, "#ffffff", "frame-line-top", 2, 0.9);
    const lineBottom = solid(1920, 1, "#ffffff", "frame-line-bottom", 2, 0.9);
    const lineV = solid(1, H, "#ffffff", "frame-line-vertical", 2, 0.9);
    const lead = solid(1, 1, "#ffffff", "lead-line", 2, 0.9);
    const leadDot = solid(10, 10, "#ffffff", "lead-dot", 3);
    const sqTop = solid(10, 10, "#ffffff", "corner-top", 3);
    const sqBottom = solid(10, 10, "#ffffff", "corner-bottom", 3);
    frame.add(lineTop, lineBottom, lineV, lead, leadDot, sqTop, sqBottom);
    scene.add(frame);

    // ---- "Your" + the word strip
    const your = label("Your", CAROUSEL, "left");
    your.name = "your";
    your.renderOrder = 10;
    const pYour = inkPlacer("Your", CAROUSEL);
    scene.add(your);
    const strip = [
      { text: "app", rel: 0, t0: 428.5, lit: -1e9 },
      { text: "backend", rel: 0, t0: 437, lit: 450 },
      { text: "users", rel: 0, t0: 453, lit: 472.5 },
      { text: "data", rel: 0, t0: 474.5, lit: 500 },
    ].map((w) => {
      const m = label(w.text, CAROUSEL, "left");
      m.name = w.text.replace(/ /g, "-");
      m.renderOrder = 10;
      scene.add(m);
      return { ...w, m, p: inkPlacer(w.text, CAROUSEL) };
    });

    // lay the strip out from the words' real widths with the reference's measured gap,
    // and remap the measured slide track so each slide still lands the next word in the slot
    {
      const GAPW = 574 - 280 - measure("loop", CAROUSEL);
      let r = 280;
      strip.forEach((w) => {
        w.rel = r;
        r += w.p.width + GAPW;
      });
    }
    const OLD_STOPS = [0, -290, -1218, -1720];
    const NEW_STOPS = [0, -(strip[1]!.rel - 284), -(strip[2]!.rel - 281), -(strip[3]!.rel - 274)];
    const remapShift = (v: number) => {
      for (let i = 1; i < OLD_STOPS.length; i++) {
        const a = OLD_STOPS[i - 1]!, b = OLD_STOPS[i]!;
        if (v >= b || i === OLD_STOPS.length - 1) {
          const t = (v - a) / (b - a);
          return NEW_STOPS[i - 1]! + t * (NEW_STOPS[i]! - NEW_STOPS[i - 1]!);
        }
      }
      return v;
    };

    // ---- headlines over the mosaic
    const heads: { m: Label; p: ReturnType<typeof inkPlacer>; left: number; top: (f: number) => number; from: number; to: number }[] = [
      { text: "Start free on Spark", left: 449, from: 525, to: 562, keys: [[525, 545], [526, 527], [527, 516], [528, 509], [529, 504], [530, 500], [531, 497], [532, 495], [536, 492], [552, 492], [556, 490], [560, 480], [561, 476]] },
      { text: "with generous free quotas.", left: 364, from: 562, to: 611, keys: [[562, 512], [563, 501], [564, 494], [565, 489], [566, 485], [568, 481], [572, 478], [604, 477], [608, 472], [609, 469], [610, 466]] },
      { text: "Scale up on Blaze", left: 305, from: 611, to: 670, keys: [[611, 502], [612, 495], [613, 490], [614, 486], [616, 482], [620, 479]] },
    ].map((h) => {
      const m = label(h.text, WHITE, "left");
      m.name = h.text.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, "");
      m.renderOrder = 10;
      scene.add(m);
      return { m, p: inkPlacer(h.text, WHITE), left: h.left, top: sampled(h.keys as [number, number][]), from: h.from, to: h.to };
    });
    // "Dedicated" is wiped out right to left (ink right edge per frame)
    const wipe = sampled([[658, 1620], [659, 1592], [660, 1545], [661, 1493], [662, 1424], [663, 1341], [664, 1239], [665, 1113], [666, 961], [667, 777], [668, 576], [669, 397], [670, 250]]);

    // ---- measured tracks
    const vx = sampled([[430, 365.5], [431, 274.5], [432, 212.0], [433, 183.5], [434, 166.5], [435, 156.0], [436, 149.0], [437, 145.0], [438, 142.5], [439, 142.0], [440, 142.0], [441, 142.0], [442, 142.0], [443, 142.0], [444, 142.0], [445, 142.0], [446, 142.0], [447, 142.0], [448, 142.0], [449, 142.0], [450, 142.0], [451, 142.0], [452, 142.0], [453, 142.0], [454, 142.0], [455, 142.0], [456, 142.0], [457, 142.0], [458, 142.0], [459, 142.0], [460, 142.0], [461, 142.0], [462, 142.0], [463, 142.0], [464, 142.0], [465, 142.0], [466, 142.0], [467, 142.0], [468, 142.0], [469, 142.5], [470, 143.5], [471, 146.5], [472, 151.5], [473, 161.0], [474, 181.5], [475, 216.0], [476, 240.0], [477, 255.5], [478, 266.5], [479, 275.5], [480, 283.0], [481, 289.0], [482, 294.5], [483, 299.0], [484, 303.0], [485, 306.5], [486, 309.5], [487, 312.5], [488, 314.5], [489, 317.0], [490, 319.0], [491, 321.5], [492, 324.0], [493, 327.0], [494, 330.0], [495, 333.5], [496, 337.5], [497, 341.5], [498, 346.5], [499, 352.5], [500, 359.5], [501, 367.5], [502, 376.5], [503, 386.5], [504, 395.5], [505, 403.5], [506, 409.5], [507, 414.5], [508, 418.5], [509, 422.5], [510, 425.0], [511, 427.5], [512, 429.5], [513, 431.5], [514, 432.5], [515, 434.0], [516, 434.5], [517, 436.0], [518, 437.0], [519, 437.5], [520, 438.0], [521, 438.5], [522, 439.0], [523, 439.5], [524, 439.5]]);
    const topSqX = sampled([[430, 394], [432, 274], [434, 190], [436, 156], [438, 145], [440, 142]]);
    const yTop = sampled([[430, 393.5], [432, 371.5], [434, 359.5], [436, 351.5], [438, 346.5], [440, 343.5], [442, 341.5], [444, 340.5], [446, 340], [520, 339.5], [522, 333.5], [524, 318.5]]);
    const yBot = sampled([[430, 684.5], [432, 707], [434, 719.5], [436, 727], [438, 732.5], [440, 735.5], [442, 737.5], [444, 738.5], [520, 738.5], [522, 732.5], [524, 717.5]]);
    const exitDy = sampled([[519, 0], [520, -1], [521, -3], [522, -7], [523, -13], [524, -22]]);
    const leadEntry = sampled([[434, -20], [436, 18], [438, 61], [440, 80], [442, 89], [444, 91]]);
    const stripS = sampled([[448, 0], [449, -2], [450, -9], [451, -24], [452, -55], [453, -115], [454, -180], [455, -222], [456, -247], [457, -264], [458, -275], [459, -282], [460, -287], [461, -289], [462, -290], [471, -290], [472, -296], [473, -321], [474, -381], [475, -552], [476, -848], [477, -993], [478, -1073], [479, -1124], [480, -1160], [481, -1184], [482, -1200], [483, -1210], [484, -1216], [485, -1218], [498, -1218], [499, -1222], [500, -1242], [501, -1300], [502, -1476], [503, -1588], [504, -1642], [505, -1674], [506, -1694], [507, -1706], [508, -1714], [509, -1718], [510, -1720]]);

    return ({ frame: local }) => {
      const F = local + START;

      // ---- carousel (430–524)
      const carousel = F < 525;
      frame.visible = your.visible = carousel;
      strip.forEach((w) => (w.m.visible = carousel));
      if (carousel) {
        const x = vx(F), dy = exitDy(F);
        lineTop.position.set(0, sy(yTop(F)), 0);
        lineBottom.position.set(0, sy(yBot(F)), 0);
        lineV.position.set(sx(x), 0, 0);
        sqTop.position.set(sx(topSqX(F) > x ? topSqX(F) : x), sy(yTop(F)), 0);
        sqBottom.position.set(sx(x), sy(yBot(F)), 0);
        const le = F < 444 ? leadEntry(F) : x - 51;
        lead.visible = leadDot.visible = le > 0;
        lead.scale.x = Math.max(le, 0.01);
        lead.position.set(sx(le / 2), sy(540 + dy), 0);
        leadDot.position.set(sx(le - 5), sy(540 + dy), 0);
        const yl = x + 192; // strip offsets were measured from this edge
        const base = 576 + dy;
        pYour.atBase(your, x + 189, base);
        const s = remapShift(stripS(F));
        // words slide under a soft mask at the right edge of "Your" only while the strip moves
        // words slide under a soft edge just right of "Your"; once fully past it they are gone
        const sliding = (F >= 449 && F < 463) || (F >= 471 && F < 487) || (F >= 499 && F < 512);
        // mid-slide the outgoing word is cut off a clear gap right of "Your" (measured), at rest nothing passes
        const slot = sliding ? yl + 266 : yl + 236;
        strip.forEach((w) => {
          const rel = w.rel + s;
          // a word turns from lilac to white as its slide begins
          const b = 0.55 + 0.45 * clamp01((F - w.lit) / 5);
          const appear = clamp01((F - w.t0) / 5);
          w.p.atBase(w.m, yl + rel, base);
          const passed = yl + rel + w.p.width < slot + 4;
          w.m.visible = !passed;
          setLabel(w.m, { opacity: passed ? 0 : b * appear, maskL: sx(slot), maskLSoft: sliding ? 26 : 40 });
        });
      }

      // ---- mosaic ground (526–686)
      const k = F - 526;
      mosaic.mesh.visible = k >= 0;
      if (k >= 0) {
        const row = MOSAIC[Math.min(k, MOSAIC.length - 1)]!;
        const [cw, ch, ox, oy, coef, acc] = row;
        (mosaic.u.uCell!.value as THREE.Vector2).set(cw, ch);
        (mosaic.u.uOff!.value as THREE.Vector2).set(ox, oy);
        const c = mosaic.u.uC!.value as number[];
        for (let i = 0; i < 10; i++) c[i] = coef[i] ?? 0;
        const accP = mosaic.u.uAccent!.value as THREE.Vector3[];
        const accC = mosaic.u.uAccentCol!.value as THREE.Vector3[];
        for (let i = 0; i < 3; i++) {
          const a = acc[i];
          accP[i]!.set(a ? a[0]! : 0, a ? a[1]! : 0, a ? 1 : 0);
          if (a) accC[i]!.set(1, 145 / 255, 0); // accent cells in Firebase orange
        }
        // the white cell: half a cell at 651–652, then the whole cell, zooming with the grid
        const w4 = mosaic.u.uWhite!.value as THREE.Vector4;
        if (F >= 651 && F !== 669 && F !== 670) {
          const hx = F <= 652 ? 0.5 : F === 653 ? 0.56 : 1;
          w4.set(ox + Math.round((1356 - ox) / cw) * cw, oy + Math.round((216 - oy) / ch) * ch, cw * hx, ch * hx);
          if (F >= 653) {
            // anchor to the measured cell (the grid offset is fitted from it)
            const wx = ox + Math.floor((whiteX(F) - ox) / cw + 0.5) * cw;
            const wy = oy + Math.floor((whiteY(F) - oy) / ch + 0.5) * ch;
            w4.set(wx, wy, cw, ch);
            if (F >= 664 && F <= 672) {
              (mosaic.u.uAccent!.value as THREE.Vector3[])[0]!.set(wx + cw * 1.5, wy + ch * 1.5, 1);
              (mosaic.u.uAccentCol!.value as THREE.Vector3[])[0]!.set(122 / 255, 22 / 255, 0);
            }
          }
        } else w4.set(0, 0, 0, 0);
      }

      // ---- headlines
      heads.forEach((h) => {
        const on = F >= h.from && F < h.to;
        h.m.visible = on;
        if (!on) return;
        h.p.at(h.m, 960 - h.p.width / 2, h.top(F)); // centred, like the reference lines
        // the last line erases right to left on the reference's measured wipe, remapped to this line's extent
        const wl = 960 - h.p.width / 2, wr = 960 + h.p.width / 2;
        const wx = wl + ((wipe(F) - 305) / (1614 - 305)) * (wr - wl);
        setLabel(h.m, { maskX: F >= 658 && h.left === 305 ? sx(wx + 66) : 1e9, maskSoft: 66 });
      });
    };
  });
}

const whiteX = sampled([[653, 1357], [656, 1356], [660, 1356], [661, 1354], [662, 1351], [663, 1346], [664, 1340], [665, 1330], [666, 1318], [667, 1302], [668, 1280], [669, 1245], [670, 1210], [671, 1175], [672, 1077], [673, 989], [674, 937], [675, 905], [676, 886], [677, 874], [678, 865], [679, 858], [680, 852], [681, 845], [682, 833], [683, 816], [684, 790], [685, 768], [686, 768]]);
const whiteY = sampled([[653, 216], [656, 217], [660, 217], [661, 218], [662, 220], [663, 222], [664, 225], [665, 229], [666, 234], [667, 241], [668, 251], [669, 280], [670, 310], [671, 338], [672, 364], [673, 387], [674, 405], [675, 418], [676, 426], [677, 431], [678, 433], [679, 431], [680, 426], [681, 418], [682, 406], [683, 387], [684, 359], [685, 336], [686, 336]]);
