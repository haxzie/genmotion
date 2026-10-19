/**
 * Brands, now built into GenMotion: one long technical drawing the camera
 * pans across. A: the name. B: the kit (logo, colours, type, references).
 * C: every scene picks it up (the peak). D: where to find it.
 * Timed to assets/brands-vo-v2.mp3, placed at frame 10.
 */
import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import {
  PALETTE, Strokes, Label, basic, line, poly, arcPts, circle, rect, dashed, arrow, type Seg,
} from "../components/drawing";
import { genmotionMark } from "../components/mark";

const deg = THREE.MathUtils.degToRad;
const ip = interpolate;
/** 0→1 over `dur` frames from `start`. */
const prog = (f: number, start: number, dur: number, ease = Easing.easeOut) =>
  ip(f, [start, start + dur], [0, 1], ease);

// Station centres in world px (composition px at 1080p).
const AX = 15;
const BX = 1655;
const CX = 3360;
const DX = 4975;
const EX = 6580;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, width, height, setCamera, durationInFrames } = ctx;

  const VH = 1080;
  const VW = (VH * width) / height;
  const cam = new THREE.OrthographicCamera(-VW / 2, VW / 2, VH / 2, -VH / 2, -100, 100);
  cam.position.set(0, 0, 10);
  setCamera(cam);
  scene.background = new THREE.Color(PALETTE.bg);

  const INK = basic(PALETTE.ink);
  const DASH = basic(PALETTE.dash);
  const BG = basic(PALETTE.bg);

  const world = new THREE.Group();
  world.name = "drawing";
  scene.add(world);

  const strokes = (name: string, segs: Seg[], w = 2, mat: THREE.Material = INK, order = 1) => {
    const s = new Strokes(name, segs, w, mat, order);
    world.add(s.mesh);
    return s;
  };
  const label = (l: Label) => {
    world.add(l.group);
    return l;
  };

  // ------------------------------------------------------------ sheet
  const rulerSegs: Seg[] = [[-1300, -478, EX + 1500, -478]];
  for (let x = -1080; x < EX + 1500; x += 270) rulerSegs.push([x, -466, x, -490]);
  const ruler = strokes("ruler", rulerSegs, 2);
  ruler.mesh.userData.pickable = false;

  const header = new THREE.Group();
  header.name = "header";
  const hNum = new Label("header-number", "05", { size: 28, colour: PALETTE.muted, tracking: 2, align: "left" });
  const hTitle = new Label("header-section", "WHAT'S NEW", { size: 28, colour: PALETTE.muted, tracking: 2, align: "left" });
  const hBrand = new Label("header-brand", "GENMOTION · BRANDS", { size: 28, colour: PALETTE.muted, tracking: 2, align: "left" });
  hNum.at(-VW / 2 + 78, 466);
  hTitle.at(-VW / 2 + 150, 466);
  hBrand.at(VW / 2 - 78 - hBrand.width, 466);
  header.add(hNum.group, hTitle.group, hBrand.group);
  scene.add(header);

  // ------------------------------------------------------------ A: the name
  const arcC = { x: AX - 560, y: 950 };
  const R = 1000;
  const a0 = deg(-128);
  const a1 = deg(-26);
  const arcLine = strokes("hatched-arc-line", poly(arcPts(arcC.x, arcC.y, R, a0, a1, 260)), 2);
  const tickSegs: Seg[] = [];
  for (let a = a0; a <= a1; a += deg(1.1)) {
    const x = arcC.x + R * Math.cos(a);
    const y = arcC.y + R * Math.sin(a);
    tickSegs.push([x, y, x + 68 * Math.cos(a - 0.14), y + 68 * Math.sin(a - 0.14)]);
  }
  const arcTicks = strokes("hatched-arc", tickSegs, 2);

  const onArc = (d: number): [number, number] => [arcC.x + R * Math.cos(deg(d)), arcC.y + R * Math.sin(deg(d))];
  const [t1x, t1y] = onArc(-100);
  const [t2x, t2y] = onArc(-68);
  const codeA = label(new Label("code-br-1180", "BR-1180", { size: 30 }).at(t1x - 10, t1y + 46));
  const codeB = label(new Label("code-br-0421", "BR-0421", { size: 30 }).at(t2x - 30, t2y + 46));

  const title = label(new Label("headline-brands", "BRANDS", { size: 120, box: true, fill: PALETTE.bg }).at(AX + 480, 120));
  const titleSub = label(new Label("subline-built-in", "now built into genmotion", { size: 40, colour: PALETTE.muted }).at(AX + 480, -2));
  const [aSx, aSy] = onArc(-82);
  const arrowA = strokes("arrow-to-headline", arrow(aSx, aSy, title.group.position.x - title.width / 2 - 14, 100), 2);

  const newC = { x: AX + 200, y: -300 };
  const newCircle = strokes("new-circle", [...circle(newC.x, newC.y, 82), ...line(newC.x - 105, newC.y - 40, newC.x + 125, newC.y + 44)], 2);
  const newLabel = label(new Label("tag-new", "NEW", { size: 30 }).at(newC.x + 170, newC.y - 4));
  const dashA = strokes("construction-a", [
    ...dashed(t1x, t1y, newC.x, newC.y),
    ...dashed(t2x, t2y, newC.x, newC.y),
  ], 1.5, DASH, 0);
  const dashAB = strokes("construction-a-to-b", [
    ...dashed(newC.x, newC.y, BX - 570, -40),
    ...dashed(AX + 760, 120, BX - 300, 330),
  ], 1.5, DASH, 0);

  // ------------------------------------------------------------ B: the kit
  const titleB = label(new Label("headline-your-brand", "YOUR BRAND, ONCE", { size: 64, box: true, fill: PALETTE.bg }).at(BX, 330));
  const subB = label(new Label("subline-kit", "[ colours . logos . assets ]", { size: 34, colour: PALETTE.muted }).at(BX, 248));

  const logoRing = strokes("kit-logo-ring", circle(BX - 570, -40, 110), 2);
  const kitMark = genmotionMark("kit-logo", 150);
  kitMark.position.set(BX - 570, -40, 0);
  world.add(kitMark);
  const logoLabel = label(new Label("kit-logo-label", "LOGO.SVG", { size: 30 }).at(BX - 570, -215));

  const swatchGeo = new THREE.CircleGeometry(60, 96);
  const lime = new THREE.Mesh(swatchGeo, basic(PALETTE.lime));
  const teal = new THREE.Mesh(swatchGeo, basic(PALETTE.teal));
  lime.name = "kit-colour-lime";
  teal.name = "kit-colour-teal";
  lime.position.set(BX - 272, -40, 0);
  teal.position.set(BX - 128, -40, 0);
  lime.renderOrder = teal.renderOrder = 2;
  world.add(lime, teal);
  const swatchRings = strokes("kit-colour-rings", [...circle(BX - 272, -40, 60), ...circle(BX - 128, -40, 60)], 2, INK, 3);
  const colourLabel = label(new Label("kit-colour-label", "#C6F91E  #16F5BD", { size: 30 }).at(BX - 200, -215));

  const typeSpec = label(new Label("kit-typeface", "Aa", { size: 150, box: true }).at(BX + 190, -40));
  const typeLabel = label(new Label("kit-typeface-label", "TYPEFACE", { size: 30 }).at(BX + 190, -215));

  const refBack = strokes("kit-reference-back", rect(BX + 600, -10, 190, 120), 2, INK, 1);
  const refMidFill = new THREE.Mesh(new THREE.PlaneGeometry(190, 120), BG);
  refMidFill.position.set(BX + 580, -35, 0);
  refMidFill.renderOrder = 2;
  refMidFill.userData.pickable = false;
  const refMid = strokes("kit-reference-middle", rect(BX + 580, -35, 190, 120), 2, INK, 3);
  const refFrontFill = new THREE.Mesh(new THREE.PlaneGeometry(190, 120), BG);
  refFrontFill.position.set(BX + 560, -60, 0);
  refFrontFill.renderOrder = 4;
  refFrontFill.userData.pickable = false;
  world.add(refMidFill, refFrontFill);
  const hatchRef: Seg[] = [];
  for (let y = -60 - 52; y <= -60 + 4; y += 14) hatchRef.push([BX + 560 - 95, y, BX + 560 + 95, y]);
  const refFront = strokes("kit-reference-front", [...rect(BX + 560, -60, 190, 120), ...hatchRef], 2, INK, 5);
  const refLabel = label(new Label("kit-assets-label", "ASSETS", { size: 30 }).at(BX + 580, -215));

  // ------------------------------------------------------------ C: every scene (peak)
  const bc = { x: CX + 120, y: -10, r: 330 };
  const bigCircle = strokes("project-circle", circle(bc.x, bc.y, bc.r, deg(180)), 2);
  const titleC = label(new Label("headline-every-scene", "EVERY SCENE", { size: 64, box: true, fill: PALETTE.bg }).at(bc.x, 240));
  const subC = label(new Label("subline-on-brand", "on brand", { size: 40, colour: PALETTE.muted }).at(bc.x, 158));

  // Chord and the hatching below it, like the reference's model circle.
  const ch0: [number, number] = [bc.x + bc.r * Math.cos(deg(212)), bc.y + bc.r * Math.sin(deg(212))];
  const ch1: [number, number] = [bc.x + bc.r * Math.cos(deg(-12)), bc.y + bc.r * Math.sin(deg(-12))];
  const slope = (ch1[1] - ch0[1]) / (ch1[0] - ch0[0]);
  const hatchSegs: Seg[] = [...line(ch0[0], ch0[1], ch1[0], ch1[1], 16)];
  for (let y = ch1[1] - 10; y > bc.y - bc.r + 8; y -= 20) {
    const half = Math.sqrt(bc.r * bc.r - (y - bc.y) ** 2);
    const xChord = ch0[0] + (y - ch0[1]) / slope;
    const xa = Math.max(bc.x - half, xChord);
    const xb = bc.x + half;
    if (xb - xa > 4) hatchSegs.push([xa, y, xb, y]);
  }
  const hatchC = strokes("project-hatching", hatchSegs, 2);

  // The three scene frames that pick up the brand.
  const FW = 150, FH = 88, FY = 34;
  const fx = [bc.x - 180, bc.x, bc.x + 180];
  const frameOutlines = strokes("scene-frames", fx.flatMap((x) => rect(x, FY, FW, FH, 10)), 2, INK, 8);
  const frameNames = ["scene-frame-hex", "scene-frame-mark", "scene-frame-type"];

  const hexFill = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH).translate(FW / 2, 0, 0), basic(PALETTE.lime));
  hexFill.name = frameNames[0];
  hexFill.position.set(fx[0] - FW / 2, FY, 0);
  hexFill.renderOrder = 4;
  const hexBar = new THREE.Mesh(new THREE.PlaneGeometry(FW, 18).translate(FW / 2, 0, 0), basic(PALETTE.teal));
  hexBar.name = "scene-frame-hex-bar";
  hexBar.position.set(fx[0] - FW / 2, FY - FH / 2 + 9, 0);
  hexBar.renderOrder = 5;
  world.add(hexFill, hexBar);

  const frameMark = genmotionMark(frameNames[1], 58);
  frameMark.position.set(fx[1], FY, 0);
  world.add(frameMark);

  const frameType = label(new Label(frameNames[2], "Aa", { size: 56 }).at(fx[2], FY));
  const frameLabels = [
    label(new Label("scene-label-hex", "HEX", { size: 28 }).at(fx[0], FY - 82)),
    label(new Label("scene-label-mark", "MARK", { size: 28 }).at(fx[1], FY - 82)),
    label(new Label("scene-label-type", "TYPE", { size: 28 }).at(fx[2], FY - 82)),
  ];

  const att = { x: CX - 330, y: -300 };
  const attachCircle = strokes("attach-circle", [...circle(att.x, att.y, 85), ...line(att.x - 110, att.y - 36, att.x + 120, att.y + 40)], 2);
  const attachLabel = label(new Label("tag-attach", "ATTACH", { size: 30 }).at(att.x - 200, att.y + 6));
  const attachArrow = strokes("arrow-attach-to-project", arrow(att.x + 62, att.y + 58, ch0[0] - 10, ch0[1] - 8), 2);

  const arrowsBC = strokes("arrows-kit-to-project", [
    ...arrow(BX + 690, -40, bc.x - bc.r - 12, -10),
    ...arrow(BX + 300, 330, bc.x + bc.r * Math.cos(deg(148)) - 10, bc.y + bc.r * Math.sin(deg(148)) + 6),
  ], 2);
  const dashBC = strokes("construction-b-to-c", [
    ...dashed(BX - 570, -40, att.x, att.y),
    ...dashed(BX + 190, -40, ch1[0], ch1[1]),
    ...dashed(BX - 200, 30, bc.x, bc.y + bc.r),
  ], 1.5, DASH, 0);

  // ------------------------------------------------------------ D: where to find it
  const titleD = label(new Label("headline-composer", "PICK IT IN THE COMPOSER", { size: 60, box: true, fill: PALETTE.bg }).at(DX, 300));
  const composer = strokes("composer", [
    ...rect(DX, -20, 1000, 200, 14),
    ...circle(DX + 452, -70, 26, deg(90), 64),
    ...line(DX + 452, -82, DX + 452, -58, 6),
    [DX + 452, -58, DX + 443, -68],
    [DX + 452, -58, DX + 461, -68],
  ], 2);
  const placeholder = label(new Label("composer-placeholder", "describe your video…", { size: 36, colour: PALETTE.muted, align: "left" }).at(DX - 480, 34));

  const chip = { x: DX - 320, y: -70, w: 290, h: 58 };
  const chipOutline = strokes("brand-control", rect(chip.x, chip.y, chip.w, chip.h, 10), 2, INK, 3);
  const chipFill = new THREE.Mesh(new THREE.PlaneGeometry(chip.w, chip.h).translate(chip.w / 2, 0, 0), basic(PALETTE.ink));
  chipFill.name = "brand-control-selected";
  chipFill.position.set(chip.x - chip.w / 2, chip.y, 0);
  chipFill.renderOrder = 4;
  world.add(chipFill);
  const chipIdle = label(new Label("brand-control-label", "BRAND  ▾", { size: 30 }).at(chip.x, chip.y));
  const chipOn = label(new Label("brand-control-genmotion", "GENMOTION", { size: 30, colour: PALETTE.white }).at(chip.x + 22, chip.y)).order(9);
  const chipMark = genmotionMark("brand-control-mark", 32);
  chipMark.position.set(chip.x - 108, chip.y, 0);
  chipMark.renderOrder = 9;
  world.add(chipMark);

  const leader = strokes("leader-brand-control", [...line(chip.x, chip.y - chip.h / 2 - 6, chip.x, -250, 8), [chip.x - 10, -250, chip.x + 10, -250]], 2);
  const leaderLabel = label(new Label("tag-brand-control", "BRAND CONTROL", { size: 30 }).at(chip.x, -288));
  const leader2 = strokes("leader-composer", line(DX + 500, 60, DX + 590, 150, 8), 2);
  const leader2Label = label(new Label("tag-composer", "COMPOSER", { size: 30, align: "left" }).at(DX + 600, 166));

  // ------------------------------------------------------------ E: the call to action
  const endC = { x: EX - 470, y: 10, r: 150 };
  const endTicks: Seg[] = [];
  for (let a = 0; a < 360; a += 3) {
    const t = deg(a);
    endTicks.push([
      endC.x + Math.cos(t) * (endC.r + 8), endC.y + Math.sin(t) * (endC.r + 8),
      endC.x + Math.cos(t - 0.12) * (endC.r + 40), endC.y + Math.sin(t - 0.12) * (endC.r + 40),
    ]);
  }
  const endRing = strokes("end-mark-ring", [...circle(endC.x, endC.y, endC.r, deg(180)), ...endTicks], 2);
  const endMark = genmotionMark("end-mark", 190);
  endMark.position.set(endC.x, endC.y, 0);
  world.add(endMark);
  const ctaTitle = label(new Label("headline-download", "DOWNLOAD GENMOTION", { size: 72, box: true, fill: PALETTE.bg }).at(EX + 210, 60));
  const ctaUrl = label(new Label("cta-url", "genmotion.dev", { size: 44, colour: PALETTE.muted }).at(EX + 210, -56));
  const dashDE = strokes("construction-d-to-e", [
    ...dashed(DX + 452, -70, endC.x - endC.r - 44, endC.y),
    ...dashed(DX + 600, 166, EX - 200, 110),
  ], 1.5, DASH, 0);

  // Cursor: tip at the group origin.
  const cursor = new THREE.Group();
  cursor.name = "cursor";
  const cursorPts: [number, number][] = [[0, 0], [0, -36], [9, -27], [16, -42], [23, -39], [16, -25], [28, -25]];
  const cursorShape = new THREE.Shape(cursorPts.map(([x, y]) => new THREE.Vector2(x, y)));
  const cursorBody = new THREE.Mesh(new THREE.ShapeGeometry(cursorShape), basic(PALETTE.ink));
  cursorBody.renderOrder = 21;
  cursorBody.name = "cursor-arrow";
  const cursorEdge = new THREE.Mesh(new THREE.ShapeGeometry(cursorShape), basic(PALETTE.white));
  cursorEdge.name = "cursor-outline";
  cursorEdge.scale.setScalar(1.22);
  cursorEdge.position.set(-2.2, 3, 0);
  cursorEdge.renderOrder = 20;
  cursor.add(cursorEdge, cursorBody);
  world.add(cursor);
  const ringMat = basic(PALETTE.ink);
  const ring = new Strokes("click-ring", circle(0, 0, 1, deg(90), 64), 0.06, ringMat, 19);
  world.add(ring.mesh);
  ring.mesh.userData.pickable = false;

  // ------------------------------------------------------------ exit cover
  const coverMat = basic(PALETTE.bg);
  const cover = new THREE.Mesh(new THREE.PlaneGeometry(1, VH + 20).translate(0.5, 0, 0), coverMat);
  cover.renderOrder = 30;
  cover.userData.pickable = false;
  const coverEdge = new THREE.Mesh(new THREE.PlaneGeometry(2, VH + 20), basic(PALETTE.ink));
  coverEdge.renderOrder = 31;
  coverEdge.userData.pickable = false;
  scene.add(cover, coverEdge);

  // ------------------------------------------------------------ timing
  const EXIT = durationInFrames - 24; // cover wipe 576 → 590 at 600f
  const CLICK = 384;

  return ({ frame: f }) => {
    // Camera: three eased pans plus a slow constant drift, so it never parks.
    const camX =
      ip(f, [62, 116], [0, 1603], Easing.easeInOut) +
      ip(f, [200, 256], [0, 1649], Easing.easeInOut) +
      ip(f, [326, 374], [0, 1552], Easing.easeInOut) +
      ip(f, [388, 438], [0, 1600], Easing.easeInOut) +
      f * 0.35;
    cam.position.x = camX;
    header.position.x = camX;

    ruler.set(1);
    hNum.set(1);
    hTitle.set(1);
    hBrand.set(1);

    // A ---------------------------------------------------------------
    const arcP = prog(f, 0, 34);
    arcLine.set(arcP);
    arcTicks.set(arcP);
    codeA.set(prog(f, 14, 10));
    codeB.set(prog(f, 22, 10));
    title.set(prog(f, 4, 14));
    titleSub.set(prog(f, 12, 14));
    arrowA.set(prog(f, 18, 22));
    newCircle.set(prog(f, 20, 20));
    newLabel.set(prog(f, 32, 10));
    dashA.set(prog(f, 26, 26));
    dashAB.set(prog(f, 56, 56, Easing.easeInOut));

    // B ---------------------------------------------------------------
    titleB.set(prog(f, 88, 14));
    subB.set(prog(f, 96, 14));

    const s1 = ip(f, [136, 146, 150], [0, 1.06, 1], Easing.easeOut);
    const s2 = ip(f, [140, 150, 154], [0, 1.06, 1], Easing.easeOut);
    lime.scale.setScalar(Math.max(s1, 0.0001));
    teal.scale.setScalar(Math.max(s2, 0.0001));
    swatchRings.set(prog(f, 134, 16));
    colourLabel.set(prog(f, 142, 10));

    logoRing.set(prog(f, 150, 16));
    const lp = prog(f, 154, 12);
    kitMark.scale.setScalar(75 * (0.8 + 0.2 * lp));
    (kitMark.material as THREE.MeshBasicMaterial).opacity = lp;
    kitMark.visible = lp > 0;
    logoLabel.set(prog(f, 158, 10));

    typeSpec.set(prog(f, 162, 12));
    typeLabel.set(prog(f, 166, 10));

    refBack.set(prog(f, 170, 14));
    refMid.set(prog(f, 173, 14));
    refFront.set(prog(f, 176, 16));
    refMidFill.visible = f >= 173;
    refFrontFill.visible = f >= 176;
    refLabel.set(prog(f, 180, 10));

    // C ---------------------------------------------------------------
    arrowsBC.set(prog(f, 202, 56, Easing.easeInOut));
    dashBC.set(prog(f, 198, 60, Easing.easeInOut));
    attachCircle.set(prog(f, 222, 18));
    attachLabel.set(prog(f, 228, 10));
    attachArrow.set(prog(f, 238, 14));
    bigCircle.set(prog(f, 232, 34, Easing.easeInOut));
    titleC.set(prog(f, 252, 14));
    subC.set(prog(f, 258, 12));
    hatchC.set(prog(f, 262, 30));

    frameOutlines.set(prog(f, 266, 22));
    // The peak: each frame takes the brand on "every scene comes out on brand".
    const hx = prog(f, 288, 10);
    hexFill.scale.x = Math.max(hx, 0.0001);
    hexFill.visible = hx > 0;
    const hb = prog(f, 293, 10);
    hexBar.scale.x = Math.max(hb, 0.0001);
    hexBar.visible = hb > 0;
    const mk = ip(f, [300, 310, 315], [0, 1.08, 1], Easing.easeOut);
    frameMark.scale.setScalar(29 * Math.max(mk, 0.0001));
    frameMark.visible = mk > 0;
    frameType.set(prog(f, 312, 10));
    frameLabels[0].set(prog(f, 290, 10));
    frameLabels[1].set(prog(f, 302, 10));
    frameLabels[2].set(prog(f, 314, 10));

    // D ---------------------------------------------------------------
    titleD.set(prog(f, 346, 14));
    composer.set(prog(f, 336, 28, Easing.easeInOut));
    placeholder.set(prog(f, 352, 12));
    chipOutline.set(prog(f, 348, 12));
    leader2.set(prog(f, 356, 10));
    leader2Label.set(prog(f, 360, 10));

    const selected = prog(f, CLICK + 2, 10);
    chipFill.scale.x = Math.max(selected, 0.0001);
    chipFill.visible = selected > 0;
    chipIdle.set(prog(f, 352, 10), 1 - prog(f, CLICK + 1, 4));
    chipOn.set(prog(f, CLICK + 6, 10));
    const cm = ip(f, [CLICK + 8, CLICK + 16, CLICK + 20], [0, 1.1, 1], Easing.easeOut);
    chipMark.scale.setScalar(16 * Math.max(cm, 0.0001));
    chipMark.visible = cm > 0;

    leader.set(prog(f, CLICK + 14, 12));
    leaderLabel.set(prog(f, CLICK + 20, 10));

    // Cursor: arrives on an arc, rests, presses, then eases away a little.
    const travel = prog(f, 358, 20);
    const tx = chip.x + 40, ty = chip.y - 6;
    const sxp = DX + 380, syp = -330;
    const cx = THREE.MathUtils.lerp(sxp, tx, Easing.easeOut(travel));
    const cy = THREE.MathUtils.lerp(syp, ty, Easing.easeInOut(travel));
    const away = prog(f, CLICK + 18, 30, Easing.easeInOut);
    cursor.position.set(cx + away * 140, cy - away * 90, 0);
    const press = ip(f, [CLICK - 4, CLICK, CLICK + 6], [1, 0.86, 1], Easing.easeOut);
    cursor.scale.setScalar(press);
    const cursorIn = prog(f, 354, 8);
    (cursorBody.material as THREE.MeshBasicMaterial).opacity = cursorIn;
    (cursorEdge.material as THREE.MeshBasicMaterial).opacity = cursorIn;
    cursor.visible = f >= 354;

    const rr = prog(f, CLICK, 14);
    ring.mesh.position.set(tx, ty, 0);
    ring.mesh.scale.setScalar(12 + rr * 34);
    ring.set(f >= CLICK && rr < 1 ? 1 : 0);
    ringMat.opacity = 1 - rr;

    // E ---------------------------------------------------------------
    dashDE.set(prog(f, 386, 50, Easing.easeInOut));
    endRing.set(prog(f, 396, 30, Easing.easeInOut));
    const em = ip(f, [400, 412, 418], [0, 1.06, 1], Easing.easeOut);
    const breathe = 1 + Math.sin(Math.max(0, f - 418) * 0.06) * 0.015;
    endMark.scale.setScalar(95 * Math.max(em, 0.0001) * breathe);
    endMark.rotation.z = -Math.max(0, f - 400) * 0.0025;
    endMark.visible = em > 0;
    ctaTitle.set(prog(f, 404, 14));
    ctaUrl.set(prog(f, 414, 12));

    // Exit: an ink line sweeps the sheet clean, ending 10 frames before the cut.
    const wipe = prog(f, EXIT, 14, Easing.easeIn);
    cover.visible = coverEdge.visible = wipe > 0;
    cover.position.set(camX - VW / 2, 0, 0);
    cover.scale.x = Math.max(wipe * (VW + 4), 0.0001);
    coverEdge.position.set(camX - VW / 2 + wipe * (VW + 4), 0, 0);
    coverEdge.visible = wipe > 0 && wipe < 1;
  };
}
