/**
 * 05 — Orbit -> "Firebase Studio / Prototype · Build · Deploy" (film frames 318–429, 24 fps)
 * The four workflow tiles orbit the Fireworks mark inside a set of rings; the
 * rings collapse into a card, the lockup types itself in, light server racks
 * slide in from the sides, the card widens for "Training API" and a typed
 * badge lands underneath. Tracks are measured off the reference per frame.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { pixelStage, sx, sy, H } from "../components/stage";
import { withBrandFonts, FONT_MONO } from "../components/brand";
import { label, letters, setLabel, ink, type TypeStyle } from "../components/type";
import { inkPlacer } from "../components/place";
import { rrect } from "../components/rect";
import { texPlane } from "../components/ui";
import { flame, wordmarkReveal } from "../components/firebase";
import { C } from "../components/brand";
import { tileTexture } from "../components/tiles";
import { sparkleGrid } from "../components/sparkles";
import { ORBIT } from "../components/orbitData";
import { sampled, prog, inOutCubic, clamp01 } from "../components/ease";

const START = 318;
const PURPLE = C.red; // brand colour (name kept from the template)
const LOCK: TypeStyle = { size: 120.7, weight: 500, tracking: -0.025, color: PURPLE };
const LOCK2: TypeStyle = { size: 118, weight: 400, tracking: -0.025, color: C.red };
const ITEM: TypeStyle = { size: 129, weight: 500, tracking: -0.025, color: PURPLE };
const INK: TypeStyle = { size: 129, weight: 500, tracking: -0.025, color: "#000000" };
const BADGE: TypeStyle = { size: 38.3, weight: 400, tracking: 0, font: FONT_MONO, color: PURPLE };

function solid(w: number, h: number, color: string, name: string, order: number) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
  );
  m.name = name;
  m.renderOrder = order;
  return m;
}

/** A thin circle outline (SDF ring) of radius r. */
function ring(name: string, color: string, order: number, fill?: string) {
  const m = rrect(name, 10, 10, 5, fill ?? "#ffffff", fill ? 1 : 0);
  m.set({ stroke: color, strokeA: 1, strokeW: 1.2 });
  m.renderOrder = order;
  return m;
}

const LINES_FRAG = /* glsl */ `
uniform float uPitch;
uniform float uPhase;
uniform vec3 uLine;
uniform vec3 uFill;
varying vec2 vS;
void main() {
  float d = abs(mod(vS.y - 0.5 - uPhase + uPitch * 0.5, uPitch) - uPitch * 0.5);
  float a = 1.0 - smoothstep(0.3, 0.9, d);
  gl_FragColor = vec4(mix(uFill, uLine, a), 1.0);
}`;
const LINES_VERT = /* glsl */ `
varying vec2 vS;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vS = vec2(w.x + 960.0, 540.0 - w.y);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const v3 = (hex: string) => {
  const c = new THREE.Color(hex).convertLinearToSRGB();
  return new THREE.Vector3(c.r, c.g, c.b);
};

/** One rack column: a fill with horizontal lines at a pitch/phase, set per frame. */
function rackColumn(name: string, fill: string, line: string) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uPitch: { value: 64 }, uPhase: { value: 0 }, uLine: { value: v3(line) }, uFill: { value: v3(fill) } },
    vertexShader: LINES_VERT,
    fragmentShader: LINES_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, H), mat);
  m.name = name;
  m.renderOrder = 1;
  m.userData.pickable = false;
  const edge = solid(1, H, "#e1e1e1", `${name}-edge`, 2);
  const set = (x0: number, x1: number, pitch: number, phase: number) => {
    const w = x1 - x0;
    m.visible = edge.visible = w > 0.5;
    if (!m.visible) return;
    m.scale.x = w;
    m.position.set(sx((x0 + x1) / 2), 0, 0);
    mat.uniforms.uPitch!.value = pitch;
    mat.uniforms.uPhase!.value = phase;
  };
  return { m, edge, set };
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => {
    const { scene } = ctx;
    pixelStage(ctx, "#ffffff");

    // ---- light racks either side (enter 354, widen with the card)
    const rack = {
      lo: rackColumn("rack-left-outer", "#fafafa", "#e9e9e9"),
      li: rackColumn("rack-left-inner", "#ffffff", "#e6e6e6"),
      ri: rackColumn("rack-right-inner", "#ffffff", "#e6e6e6"),
      ro: rackColumn("rack-right-outer", "#fafafa", "#e9e9e9"),
    };
    for (const c of Object.values(rack)) scene.add(c.m, c.edge);

    // ---- guides and lattice
    const guideV = solid(1, H, "#ececec", "guide-vertical", 3);
    const guideH = solid(1920, 1, "#ececec", "guide-horizontal", 3);
    scene.add(guideV, guideH);
    const grid = sparkleGrid();
    scene.add(grid.mesh);

    // ---- rings
    const disc = ring("orbit-outer", "#ececec", 4, "#fdfdfd");
    const ring2 = ring("orbit-ring-2", "#e4e4e4", 5);
    const ring3 = ring("orbit-ring-3", "#ececec", 5);
    const core = ring("orbit-core", "#e6e6e6", 6, "#f9f9f9");
    const ring5 = ring("orbit-ring-5", "#eeeeee", 7);
    scene.add(disc, ring2, ring3, core, ring5);

    // ---- the card the rings become
    const card = rrect("lockup-card", 893, 270, 0, "#fafafa");
    card.renderOrder = 8;
    scene.add(card);
    const dots = ["top", "bottom", "left", "right"].map((n) => {
      const d = solid(6, 6, C.orange, `edge-dot-${n}`, 20);
      scene.add(d);
      return d;
    });

    // ---- lockup: the real flame, the official wordmark (wiped in), then "Studio"
    const FLAME_H = 132; // flame height at full lockup size
    const logo = flame(FLAME_H, "firebase-flame");
    scene.add(logo.group);
    const WM_H = 92; // wordmark ink height (ascender to baseline) at full size
    const wm = wordmarkReveal(WM_H, C.wordmark, "firebase-wordmark");
    wm.mesh.renderOrder = 15;
    scene.add(wm.mesh);
    const training = label("Studio", LOCK2, "left");
    training.name = "studio";
    const api = label("", LOCK2, "left");
    api.name = "unused";
    api.visible = false;
    training.renderOrder = 15;
    const trInk = inkPlacer("Studio", LOCK2);
    scene.add(training);
    // lockup widths: phase 1 = flame + gap + wordmark, phase 2 adds a space + "Studio"
    const GAP_FW = 38, SPACE = 40;
    const W1 = logo.w + GAP_FW + wm.w;
    const W2 = W1 + SPACE + trInk.width;
    // the reference card fit "Fireworks" (893 wide) then "Fireworks Training API" (1525 wide)
    const CARD1 = W1 + 180, CARD2 = W2 + 222;
    const fitCard = (v: number, F: number) => {
      if (v <= 893) return v * (1 + (CARD1 / 893 - 1) * prog(F, 356, 5));
      return CARD1 + ((v - 893) * (CARD2 - CARD1)) / (1525 - 893);
    };

    // ---- badge
    const badgeBox = rrect("ga-badge-box", 600, 92, 0, "#fafafa");
    badgeBox.set({ stroke: "#e9e9e9", strokeA: 1, strokeW: 1 });
    badgeBox.renderOrder = 16;
    const BADGE_TEXT = "Prototype · Build · Deploy";
    const badge = letters(BADGE_TEXT, BADGE);
    badge.group.name = "badge-prototype-build-deploy";
    badge.letters.forEach((m) => (m.renderOrder = 17));
    const badgeFull = badge.track(0, "left");
    const badgeBase = ink("H", BADGE).descent;
    scene.add(badgeBox, badge.group);

    // ---- tiles (orbit) + the list remnants and "to" carried over the cut
    const names = ["train", "deploy", "evaluate", "retrain"];
    const tiles = names.map((n) => {
      const t = texPlane(101, 101, tileTexture(n), `${n}-tile`);
      t.renderOrder = 18;
      scene.add(t);
      return t;
    });
    const remTrain = label("Build", ITEM, "left");
    remTrain.name = "train-label";
    const remDeploy = label("Deploy", ITEM, "left");
    remDeploy.name = "deploy-label";
    const remTo = label("to", INK, "left");
    remTo.name = "word-to";
    for (const m of [remTrain, remDeploy, remTo]) {
      m.renderOrder = 18;
      scene.add(m);
    }
    const pTrain = inkPlacer("Build", ITEM), pDeploy = inkPlacer("Deploy", ITEM), pTo = inkPlacer("to", INK);

    // ---- measured tracks (global frames)
    const R1 = sampled([[318, 300], [320, 330], [322, 360], [324, 372], [326, 381], [330, 392], [336, 395], [350, 398], [353, 403]]);
    const R2 = sampled([[318, 254], [320, 290], [322, 312], [324, 325], [326, 334], [330, 344], [336, 349], [353, 349]]);
    const R3 = sampled([[318, 237], [320, 250], [322, 258], [324, 264], [326, 268], [330, 273], [336, 274], [353, 274]]);
    const R4 = sampled([[318, 158], [320, 164], [322, 168], [324, 170], [326, 172], [330, 174], [353, 174]]);
    const R5 = sampled([[318, 115], [320, 117], [322, 120], [324, 121], [326, 122], [330, 123], [349, 125], [350, 127], [352, 139], [353, 152], [355, 166]]);
    // card morph (circle -> squircle -> card), then widen for "Training API", then the exit pan
    const cardW = sampled([[353, 806], [354, 678], [355, 704], [356, 824], [357, 840], [358, 858], [359, 880], [360, 888], [361, 891], [362, 893], [376, 895], [377, 895], [378, 899], [379, 916], [380, 941], [381, 988], [382, 1088], [383, 1295], [384, 1405], [385, 1457], [386, 1489], [387, 1506], [388, 1516], [389, 1523], [390, 1525]]);
    const cardH = sampled([[353, 806], [354, 678], [355, 666], [356, 642], [357, 585], [358, 460], [359, 368], [360, 318], [361, 292], [362, 274], [363, 270]]);
    const cardR = sampled([[353, 403], [354, 339], [355, 333], [356, 321], [357, 260], [358, 160], [359, 90], [360, 45], [361, 22], [362, 8], [363, 2], [364, 0]]);
    const cardCx = sampled([[376, 959.5], [377, 959.5], [378, 958.5], [379, 960], [380, 959.5], [381, 960], [382, 960], [383, 959.5], [384, 959.5], [385, 959.5], [386, 959.5], [387, 960], [388, 959], [389, 959.5], [390, 959.5]]);
    const exitDx = sampled([[421, 0], [422, -1], [423, -2], [424, -4], [425, -7], [426, -12], [427, -20], [428, -32], [429, -52]]);
    const borderMix = sampled([[363, 0], [364, 0.05], [366, 0.33], [368, 0.7], [370, 1], [372, 0.8], [374, 0.5], [376, 0.25], [378, 0.05], [379, 0]]);
    const markLeft = sampled([[318, 889], [350, 889], [351, 885], [352, 880], [353, 871], [354, 859], [355, 843], [356, 818], [357, 776], [358, 709], [359, 658], [360, 632], [361, 619], [362, 611], [363, 607], [364, 606], [375, 606], [376, 605], [377, 605], [378, 602], [379, 595], [380, 583], [381, 561], [382, 514], [383, 416], [384, 364], [385, 339], [386, 324], [387, 316], [388, 311], [389, 308], [390, 307]]);
    const markW = sampled([[318, 133], [352, 134], [353, 136], [354, 138], [355, 140], [356, 145], [357, 152], [358, 164], [359, 173], [360, 177], [361, 179], [362, 181], [363, 182]]);
    const chars = sampled([[353, 0], [354, 1], [355, 1], [356, 2], [357, 4], [358, 6], [359, 8], [360, 9]]);
    const trLeft = sampled([[383, 1200], [384, 1137], [385, 1105], [386, 1085], [387, 1073], [388, 1065], [389, 1060], [390, 1057], [391, 1056], [392, 1055], [395, 1054]]);
    const apiLeft = sampled([[386, 1512], [387, 1493], [388, 1480], [389, 1473], [390, 1468], [391, 1465], [392, 1463], [395, 1459], [398, 1458]]);
    const badgeChars = sampled([[390, 0], [391, 10], [392, 13], [393, 15], [394, 18], [395, 20], [396, 21], [398, 22], [400, 22.5], [401, 23]]);
    const pitch = sampled([[375, 28], [376, 30], [377, 33], [378, 36], [379, 47], [380, 58], [381, 72], [382, 87], [383, 100], [384, 110], [385, 118], [386, 125], [387, 130], [388, 133], [389, 134], [390, 134.5]]);
    const entryXo = sampled([[357, 0], [358, 72], [359, 141], [360, 210], [361, 229], [362, 248], [363, 254], [364, 256]]);
    const entryXi = sampled([[353, 0], [354, 61], [355, 98], [356, 135], [357, 232], [358, 329], [359, 398], [360, 467], [361, 486], [362, 505], [363, 511], [364, 513]]);
    const revealH = sampled([[316, 200], [318, 450], [320, 800], [322, 820], [324, 1000], [325, 1100]]);
    const revealV = sampled([[317, 0], [318, 100], [320, 200], [322, 250], [324, 300], [326, 400], [330, 620]]);
    // measured clear: outer columns go first (|dx| limit shrinks), then the centre rows outward
    const goneX = sampled([[354, 1000], [356, 800], [358, 600], [360, 490], [361, 300], [362, -10]]);
    const goneY = sampled([[358, -60], [359, 240], [360, 470], [362, 640]]);
    // measured mark size: the lattice grows in rather than popping (median mark 12 -> 34 px)
    const dotSize = sampled([[352, 6], [353, 10.5], [354, 21], [356, 20.5], [357, 17.5], [358, 12.5], [359, 9], [360, 7], [361, 6]]);
    const dotY = sampled([[352, 152], [353, 160], [354, 171], [355, 186], [356, 209], [357, 248], [358, 309], [359, 357], [360, 381], [361, 394], [362, 401], [363, 404], [364, 405]]);
    const markGrow = sampled([[316, 0.5], [320, 0.45], [322, 0.62], [326, 0.78], [330, 0.86], [334, 1]]);

    const greyBorder = new THREE.Color("#e8e8e8"), lilacBorder = new THREE.Color("#f0b48c"), tmp = new THREE.Color();

    return ({ frame: local }) => {
      const F = local + START;
      const dx = F >= 421 ? exitDx(F) : 0;

      // ---- racks
      if (F < 354) {
        for (const c of Object.values(rack)) c.set(0, 0, 64, 27);
      } else {
        let xo: number, xi: number, xiR: number;
        // racks close in on the card's edge (scaled from the reference's 513 px edge to this card)
        const cardLeft = 960 - CARD1 / 2;
        if (F < 364) {
          xi = entryXi(F) * (cardLeft / 513); xiR = 1920 - xi;
          xo = entryXo(F) * (cardLeft / 513);
        } else {
          const left = cardCx(F) - fitCard(cardW(F), F) / 2 + dx;
          xi = left;
          xiR = left + fitCard(cardW(F), F);
          xo = Math.max(0, xi - 257);
        }
        const P = F < 376 ? 28 : pitch(F);
        const ph = 539 % P;
        rack.lo.set(0, xo, 64, 27);
        rack.li.set(xo, xi, P, ph);
        rack.ri.set(xiR, 1920 - xo, P, ph);
        rack.ro.set(1920 - xo, 1920, 64, 27);
        rack.lo.edge.position.set(sx(xo), 0, 0);
        rack.li.edge.position.set(sx(xi), 0, 0);
        rack.ri.edge.position.set(sx(xiR), 0, 0);
        rack.ro.edge.position.set(sx(1920 - xo), 0, 0);
        rack.lo.edge.visible = xo > 0.5;
        rack.ro.edge.visible = xo > 0.5;
      }

      // ---- guides
      guideV.position.set(sx(960 + dx), 0, 0);
      guideH.position.set(dx, sy(540), 0);

      // ---- lattice: blooms in, turns a quarter through 338–352, clears from the middle 356–362
      const H_ = revealH(F), V_ = revealV(F), gx = goneX(F), gy = goneY(F), grow = markGrow(F);
      const spin = (Math.PI / 2) * prog(F, 338, 14, inOutCubic);
      grid.mesh.visible = F < 363;
      grid.pts.forEach((p, i) => {
        const ax = Math.abs(p.x), ay = Math.abs(p.y);
        const late = Math.max(ax > H_ ? (ax - H_) / 70 : 0, ay > V_ ? (ay - V_) / 70 : 0);
        const inS = clamp01(1 - late) ** 1.5;
        // measured clear schedule: middle rows go first (centre outward, 350-354), then rows +-4, then +-5;
        // columns are trimmed from the outside in
        const row = Math.round(ay / 98.25);
        const rowEnd = row <= 3 ? 351 + ax / 300 : row === 4 ? 359 : 361.5;
        const colEnd = ax <= 520 ? 361.5 : ax <= 620 ? 359.5 : ax <= 880 ? 357.5 : 355;
        const outS = clamp01((Math.min(rowEnd, colEnd) - F) / 1.5);
        void gx; void gy;
        grid.pose(i, inS * outS * grow, -spin);
      });
      grid.done();

      // ---- rings (318–356)
      const ringsOn = F < 354;
      disc.visible = ring2.visible = ring3.visible = F < 354;
      core.visible = ring5.visible = F < 357;
      if (ringsOn) {
        const r1 = R1(F);
        disc.set({ w: r1 * 2, h: r1 * 2, r: r1 });
        ring2.set({ w: R2(F) * 2, h: R2(F) * 2, r: R2(F) });
        ring3.set({ w: R3(F) * 2, h: R3(F) * 2, r: R3(F) });
      }
      if (core.visible) {
        const fade = 1 - prog(F, 354, 3);
        core.set({ w: R4(F) * 2, h: R4(F) * 2, r: R4(F), opacity: fade });
        ring5.set({ w: R5(F) * 2, h: R5(F) * 2, r: R5(F), opacity: fade });
      }
      for (const m of [disc, ring2, ring3, core, ring5]) m.position.set(sx(960), sy(540), 0);

      // ---- card (353+)
      card.visible = F >= 354;
      let cl = 0, cr = 0, ct = 0, cb = 0;
      if (card.visible) {
        const w = fitCard(cardW(F), F), h = F < 363 ? cardH(F) : 270, cx = (F < 376 ? 959.5 : cardCx(F)) + dx;
        card.set({ w, h, r: cardR(F) });
        card.position.set(sx(cx), sy(540), 0);
        tmp.copy(greyBorder).lerp(lilacBorder, borderMix(F));
        card.set({ stroke: "#" + tmp.getHexString(), strokeA: 1, strokeW: 1 });
        cl = cx - w / 2; cr = cx + w / 2; ct = 540 - h / 2; cb = 540 + h / 2;
      }
      // edge dots: on the orbit's cardinal points, then on the card's edges
      const r1 = R1(F);
      const pts: [number, number][] = card.visible
        ? [[960 + dx, ct], [960 + dx, cb], [cl, 540], [cr, 540]]
        : [[960, 540 - r1], [960, 540 + r1], [960 - r1, 540], [960 + r1, 540]];
      dots.forEach((d, i) => {
        d.position.set(sx(pts[i]![0]), sy(pts[i]![1]), 0);
        d.visible = i < 2 || F < 382;
        d.scale.setScalar(1);
      });
      // top/bottom dots pulse while the rings become the card, on their own measured path
      if (F >= 352 && F <= 364) {
        const k = dotSize(F) / 6;
        const ty = dotY(F);
        dots[0]!.scale.setScalar(k);
        dots[1]!.scale.setScalar(k);
        dots[0]!.position.set(sx(960), sy(ty), 0);
        dots[1]!.position.set(sx(960), sy(1079 - ty), 0);
      }

      // ---- lockup
      const k = markW(F) / 182; // the reference mark's growth from ring core to lockup
      const exit = F >= 421 ? exitDx(F) : 0;
      // progress of the two layout phases, read off the reference mark's measured travel
      const p1 = clamp01((889 - markLeft(F)) / (889 - 606));
      const p2 = clamp01((606 - markLeft(F)) / (606 - 307));
      const width = (logo.w * k) + (W1 - logo.w) * p1 + (W2 - W1) * p2;
      const left = 960 - width / 2 + exit;
      logo.group.scale.setScalar(k);
      logo.group.position.set(sx(left + (logo.w * k) / 2), sy(539), 0);
      logo.ignite(prog(F, 318, 12));
      const wmLeft = left + logo.w * k + GAP_FW;
      const baseY = 539 + (FLAME_H * k) / 2 - 6; // wordmark baseline near the flame's foot
      wm.mesh.position.set(sx(wmLeft + wm.w / 2), sy(baseY - WM_H / 2) - 2, 0);
      const n = F >= 390 ? 9 : chars(F);
      wm.setOpacity(n > 0 ? 1 : 0);
      wm.reveal(n >= 9 ? 1e9 : sx(wmLeft + (wm.w * n) / 9 + 6), 22);
      training.visible = F >= 383;
      // "Studio" slides in from the right on the reference's "Training" track
      if (training.visible) trInk.atBase(training, wmLeft + wm.w + SPACE + (trLeft(F) - 1054) + exit, baseY);
      void api; void apiLeft; void setLabel;

      // ---- badge
      const bc = badgeChars(F);
      badgeBox.visible = F >= 389;
      badge.group.visible = bc > 0;
      if (badgeBox.visible) {
        const n = BADGE_TEXT.length;
        const typed = Math.min(Math.ceil((bc / 23) * n), n);
        const shown = badge.letters[typed - 1] ? badge.letters[typed - 1]!.position.x + (badge.letters[typed - 1]!.userData.w as number) : 0;
        const bw = F === 389 ? 20 : F === 390 ? 10 : shown + 71;
        badgeBox.set({ w: bw, h: 92 });
        badgeBox.position.set(sx(960 + dx), sy(882.5), 0);
        badge.group.position.set(sx(962 - shown / 2 + dx), sy(894) + BADGE.size * 0.04 + badgeBase, 0);
        badge.letters.forEach((m, i) => setLabel(m, { opacity: i < typed ? 1 : 0 }));
        void badgeFull;
      }

      // ---- tiles (components/orbitData.ts rows are [frame, x, y, size])
      // frames 318–319 of train/deploy are still list rows, fading with the list (measured opacities)
      const listAlpha: Record<string, Record<number, number>> = { train: { 318: 0.35, 319: 0.35 }, deploy: { 318: 0.75 } };
      names.forEach((nm, i) => {
        const row = orbitAt(nm, F);
        const t = tiles[i]!;
        t.visible = !!row && row[2] > 6;
        if (!row) return;
        const [x, y, size] = row;
        t.scale.setScalar(size / 97);
        t.position.set(sx(x), sy(y), 0);
        (t.material as THREE.MeshBasicMaterial).opacity = listAlpha[nm]?.[F] ?? 1;
      });

      // the list remnants and "to" (318–319)
      remTo.visible = F === 318;
      if (remTo.visible) pTo.atBase(remTo, 125, 588);
      remTrain.visible = F <= 319;
      remDeploy.visible = F === 318;
      if (F <= 319) {
        const tr = orbitAt("train", F)!;
        pTrain.atBase(remTrain, tr[0] - 48.5 + 130, tr[1] + 47);
        setLabel(remTrain, { opacity: listAlpha.train![F] ?? 1 });
      }
      if (F === 318) {
        const dp = orbitAt("deploy", F)!;
        pDeploy.atBase(remDeploy, dp[0] - 48.5 + 135, dp[1] + 47);
        setLabel(remDeploy, { opacity: listAlpha.deploy![F] ?? 1 });
      }
    };
  });
}

/** Orbit tile [x, y, size] at a film frame, or null when that tile is not on screen. */
function orbitAt(name: string, frame: number): [number, number, number] | null {
  const rows = ORBIT[name] ?? [];
  const r = rows.find((row) => row[0] === frame);
  return r ? [r[1], r[2], r[3]] : null;
}
