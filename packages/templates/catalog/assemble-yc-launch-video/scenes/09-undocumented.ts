import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, rx, ry } from "../components/stage";
import { glide, prog, outCubic } from "../components/ease";
import { label, letters, line, measure, setLabel, withInter } from "../components/type";

/**
 * Global f727–f810 (scene frame = global - 727). Hard cut in (the film's midpoint) and out.
 * "Undocumented" types itself huge behind a caret of slate blocks while the camera pulls back;
 * "decisions" rises in under it. The column scrolls up and "Teams trying to" rises word by
 * word from below, "understand" typing out beneath it as the pair recedes.
 */
const G0 = 727;
const INK = new THREE.Color("#333333");
const TEAL = new THREE.Color("#4a82a0");
const PENDING = new THREE.Color("#a9a9a9");
const WHITE = new THREE.Color("#ffffff");

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#fdfdfd");
    fitCamera(camera, height, 50);

    /* ------------------------------------------------ Undocumented decisions */
    const ST = { weight: 400, tracking: 0.005 };
    const BASE_W = 795; // "Undocumented" width (px) at scale 1
    const size = 100 * (BASE_W / measure("Undocumented", { ...ST, size: 100 }));
    const group1 = new THREE.Group();
    group1.name = "undocumented-decisions";
    scene.add(group1);
    const word = letters("Undocumented", { ...ST, size });
    word.group.name = "undocumented";
    group1.add(word.group);
    const decisions = label("decisions", { ...ST, size: size * 1.17, color: "#4a82a0" }, "center");
    decisions.name = "decisions";
    group1.add(decisions);

    const w1 = glide([[729, 1900], [731, 1650], [733, 1420], [735, 1330], [737, 1260], [739, 1225], [743, 1185], [745, 1150], [747, 1045], [749, 880], [751, 850], [753, 815], [755, 800], [757, 795], [761, 787], [765, 772], [767, 760], [771, 740]]);
    const y1 = glide([[729, 800], [731, 723], [733, 635], [735, 592], [737, 562], [739, 542], [743, 537], [745, 532], [747, 517], [749, 495], [751, 492], [753, 487], [755, 485], [757, 480], [759, 467], [761, 450], [763, 420], [765, 375], [767, 307], [769, 195], [771, -60], [773, -300]]);
    const decOff = glide([[747, 280], [749, 190], [751, 170], [753, 133], [755, 115], [757, 112], [760, 110]]);
    const decScale = glide([[749, 1], [751, 0.94], [753, 0.88], [757, 0.8]]);
    const typed = glide([[728, 0], [729, 2], [731, 8], [733, 10], [735, 12]]);

    // caret: a little cluster of slate blocks trailing the typed edge
    const quad = new THREE.PlaneGeometry(1, 1);
    // a 4 x 3 cluster of slate blocks behind the newest letters (tall middle row)
    const TONES = [
      ["#bcd3dd", "#8fb2c3", "#8fb2c3", "#dce8ec"],
      ["#a5c2d0", "#4a83a0", "#4a83a0", "#cfdee6"],
      ["#a9c5d2", "#6a9ab2", "#6a9ab2", "#dbe7ec"],
    ];
    const COL = 58, ROWS = [26, 83, 26];
    const caret = new THREE.Group();
    caret.name = "type-caret";
    const blocks: THREE.Mesh[] = [];
    let yTop = (ROWS[0]! + ROWS[1]! + ROWS[2]!) / 2;
    TONES.forEach((row, r) => {
      const h = ROWS[r]!;
      row.forEach((c, col) => {
        const m = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ color: c, transparent: true, depthWrite: false }));
        m.position.set((col + 0.5) * COL * PX, (yTop - h / 2) * PX, -0.02);
        m.scale.set(COL * PX, h * PX, 1);
        m.userData.col = col;
        caret.add(m);
        blocks.push(m);
      });
      yTop -= h;
    });
    word.group.add(caret);
    const bar = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ color: "#6f98ad", transparent: true, depthWrite: false }));
    bar.name = "type-bar";
    scene.add(bar);

    /* --------------------------------------------- Teams trying to / understand */
    const ST2 = { weight: 400, tracking: 0.005 };
    const size2 = 100 * (739 / measure("Teams trying to", { ...ST2, size: 100 }));
    const group2 = new THREE.Group();
    group2.name = "teams-trying-to-understand";
    scene.add(group2);
    const l2 = line("Teams trying to", { ...ST2, size: size2 }, "center");
    group2.add(l2.group);
    const under = letters("understand", { ...ST2, size: size2, tracking: 0.005 });
    under.group.name = "understand";
    group2.add(under.group);
    const s2 = glide([[769, 1.08], [775, 1.04], [779, 1], [783, 0.936], [787, 0.913], [791, 0.897], [795, 0.882], [799, 0.851], [803, 0.8], [807, 0.66], [810, 0.55]]);
    const y2 = glide([[779, 565], [783, 519], [787, 490], [791, 485], [810, 485]]);
    const wordY = [
      glide([[768, 1250], [771, 987], [775, 652], [779, 565]]),
      glide([[769, 1250], [771, 1080], [775, 692], [779, 567]]),
      glide([[770, 1300], [772, 1150], [775, 767], [779, 575], [781, 565]]),
    ];
    const underOff = glide([[777, 300], [779, 225], [783, 136], [787, 120], [791, 109], [799, 108]]);
    const LETTER_T = [776, 777, 778, 779, 782, 786, 788, 790, 794, 797];

    const tint = new THREE.Color();

    return ({ frame: local }) => {
      const f = local + G0;

      /* group 1 */
      const sc = w1(f) / BASE_W;
      group1.visible = f < 773;
      group1.scale.setScalar(sc);
      group1.position.set(rx(960), ry(y1(f)), 0);
      const n = typed(f);
      word.letters.forEach((l, i) => {
        const shown = i < Math.floor(n);
        const nn = Math.floor(n);
        const onDark = i === nn - 1 && f < 736;
        const pending = i === nn - 2 && f < 736;
        tint.copy(onDark ? WHITE : pending ? PENDING : INK);
        setLabel(l, { opacity: shown ? 1 : 0, color: tint });
      });
      // caret sits on the newest letters, then dissolves
      const edge = Math.min(11, Math.max(0, Math.floor(n) - 2));
      const el = word.letters[edge]!;
      caret.position.set(el.position.x - 8 * PX, 4 * PX, -0.02);
      const caretOn = f >= 730 && f < 739;
      caret.visible = caretOn;
      blocks.forEach((b) => {
        const fade = 1 - prog(f, 733.5 - b.userData.col * 0.8, 2.5, outCubic);
        (b.material as THREE.MeshBasicMaterial).opacity = fade;
      });
      bar.visible = f >= 728 && f < 731;
      bar.scale.set(680 * PX * prog(f, 728, 1.5, outCubic), 7 * PX, 1);
      bar.position.set(rx(160) + bar.scale.x / 2, ry(690), 0);

      const pd = prog(f, 746, 6, outCubic);
      decisions.position.y = -decOff(f) * PX;
      decisions.scale.setScalar(decScale(f));
      setLabel(decisions, { opacity: Math.min(1, pd * 1.6), blur: (1 - pd) * 8 });

      /* group 2 */
      group2.visible = f >= 768;
      const sc2 = s2(f);
      group2.scale.setScalar(sc2);
      group2.position.set(rx(972), ry(y2(f)), 0);
      l2.words.forEach((w, i) => {
        const p = prog(f, 768 + i, 7, outCubic);
        // each word rises on its own clock until it joins the line
        w.position.y = f < 781 ? -(wordY[i]!(f) - (f < 779 ? 565 : y2(f))) * PX / sc2 : 0;
        setLabel(w, { opacity: Math.min(1, p * 1.5) * (1 - prog(f, 808, 3)), color: INK });
      });
      under.group.position.y = -underOff(f) * PX;
      under.letters.forEach((l, i) => {
        const p = prog(f, LETTER_T[i]!, 3, outCubic);
        l.visible = p > 0.01;
        setLabel(l, { opacity: p * (1 - prog(f, 808, 3)), blur: (1 - p) * 6, color: INK });
      });
    };
  });
}
