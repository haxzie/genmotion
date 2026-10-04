import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX } from "../components/stage";
import { glide, prog, outCubic, inCubic, clamp01, lerp } from "../components/ease";
import { label, line, measure, setLabel, withInter, type Label } from "../components/type";

/**
 * Global f142–f285 (scene frame = global - 142).
 * "6" (handed over from the counter) is joined by "weeks"; a hairline grid frames it and
 * the camera pulls back. At f179 the pull-back zooms through into a finer grid where
 * "Custom Pricing" -> "New Payment terms" -> "New Compliance requirements" swap in place
 * (each rises out, the next rises in) while the pull-back keeps easing. Hard cut at f286.
 */
const G0 = 142;

const LINE_A = new THREE.Color("#dfe6ed");
const LINE_B = new THREE.Color("#e3e9ee");
const CROSS = new THREE.Color("#d6e0e8");
const INK = new THREE.Color("#313131");
const ACCENT = new THREE.Color("#4a8199");
const BLACK = new THREE.Color("#111111");

interface Grid {
  group: THREE.Group;
  lines: THREE.Mesh[];
  crosses: THREE.Mesh[];
  mat: THREE.MeshBasicMaterial;
  /** keep hairlines a constant on-screen width while the group scales */
  setScale: (s: number) => void;
}

function makeGrid(name: string, cellW: number, cellH: number, cy: number, colour: THREE.Color, crosses: boolean): Grid {
  const group = new THREE.Group();
  group.name = name;
  group.userData.pickable = false;
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.MeshBasicMaterial({ color: colour, transparent: true, depthWrite: false });
  const crossMat = new THREE.MeshBasicMaterial({ color: CROSS, transparent: true, depthWrite: false });
  const lines: THREE.Mesh[] = [];
  const LEN = 12000;
  for (let k = -4; k <= 4; k++) {
    const h = new THREE.Mesh(geo, mat);
    h.position.set(0, -(cy + (k + 0.5) * cellH) * PX, 0);
    h.scale.set(LEN * PX, 2 * PX, 1);
    h.userData.horiz = true;
    const v = new THREE.Mesh(geo, mat);
    v.position.set((k + 0.5) * cellW * PX, -cy * PX, 0);
    v.scale.set(2 * PX, LEN * PX, 1);
    group.add(h, v);
    lines.push(h, v);
  }
  const cr: THREE.Mesh[] = [];
  if (crosses) {
    for (let i = -3; i <= 3; i++)
      for (let j = -3; j <= 3; j++) {
        const x = (i + 0.5) * cellW * PX;
        const y = -(cy + (j + 0.5) * cellH) * PX;
        const a = new THREE.Mesh(geo, crossMat);
        a.position.set(x, y, 0.001);
        a.userData.horiz = true;
        const b = new THREE.Mesh(geo, crossMat);
        b.position.set(x, y, 0.001);
        group.add(a, b);
        cr.push(a, b);
      }
  }
  return {
    group,
    lines,
    crosses: cr,
    mat,
    setScale(s) {
      group.scale.setScalar(s);
      const t = (2 * PX) / s;
      for (const l of lines) {
        if (l.userData.horiz) l.scale.y = t;
        else l.scale.x = t;
      }
      const arm = (70 * PX) / s;
      const th = (3 * PX) / s;
      for (const c of cr) {
        if (c.userData.horiz) c.scale.set(arm, th, 1);
        else c.scale.set(th, arm, 1);
      }
      crossMat.opacity = mat.opacity;
    },
  };
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#fdfdfd");
    fitCamera(camera, height, 50);

    /* ------------------------------------------------- grid A: "6 weeks" */
    const rootA = new THREE.Group();
    rootA.name = "six-weeks-shot";
    scene.add(rootA);
    const gridA = makeGrid("grid-wide", 1619, 440, 0, LINE_A, false);
    gridA.group.position.x = -3 * PX; // cell centre sits at x 957
    rootA.add(gridA.group);

    const BIG = { size: 332, weight: 500, tracking: -0.02 };
    const six = label("6", BIG, "left", 40);
    six.name = "six";
    const sixW = measure("6", BIG);
    const space = measure(" ", BIG);
    const weeks = label("weeks", {
      ...BIG,
      paint: (g, w, h) => {
        const gr = g.createLinearGradient(w * 0.15, h * 0.25, w * 0.85, h * 0.8);
        gr.addColorStop(0, "#343233");
        gr.addColorStop(0.35, "#38393b");
        gr.addColorStop(1, "#4f86a0");
        return gr;
      },
    }, "left", 40);
    weeks.name = "weeks";
    const textW = sixW + space + measure("weeks", BIG);
    // rest: text spans x 394..1548 with the group scaled about the frame centre
    const left0 = (394 - 960) * PX;
    six.position.set(left0, 0, 0.01);
    const weeksRest = left0 + (sixW + space) * PX;
    weeks.position.set(weeksRest, 0, 0.01);
    rootA.add(six, weeks);
    void textW;

    const panA = glide([[142, 470], [144, 470], [146, 448], [148, 401], [150, 268], [152, 154], [154, 55], [156, 18], [158, 4], [160, 0]]);
    const weeksExtra = glide([[144, 260], [146, 100], [148, 60], [150, 30], [154, 6], [158, 0]]);
    const sA = glide([[142, 1], [158, 1], [160, 0.993], [164, 0.97], [168, 0.94], [172, 0.898], [174, 0.834], [176, 0.768], [178, 0.543]]);
    const sixGrow = glide([[142, 225 / 235], [144, 1]]);

    /* --------------------------------------- grid B: the phrases that pile up */
    const rootB = new THREE.Group();
    rootB.name = "requirements-shot";
    scene.add(rootB);
    const gridB = makeGrid("grid-fine", 1644, 300, 6, LINE_B, true);
    rootB.add(gridB.group);

    const PH = { weight: 500, tracking: 0.005 } as const;
    const fit = (text: string, widthPx: number) => {
      const plain = text.replace(/\*/g, "");
      return (100 * widthPx) / measure(plain, { ...PH, size: 100 });
    };
    type Phrase = { words: Label[]; group: THREE.Group; inks: THREE.Color[]; cx: number; t0: number; t1: number };
    const mk = (text: string, widthPx: number, cx: number, inks: THREE.Color[], t0: number, t1: number): Phrase => {
      const l = line(text, { ...PH, size: fit(text, widthPx) }, "center");
      l.group.position.x = (cx - 960) * PX;
      rootB.add(l.group);
      return { words: l.words, group: l.group, inks, cx, t0, t1 };
    };
    const phrases = [
      mk("Custom Pricing", 648, 961, [INK, ACCENT], 179, 198),
      mk("New Payment terms", 783, 951, [INK, ACCENT, BLACK], 205, 237),
      mk("New Compliance requirements", 1330, 967, [INK, ACCENT, INK], 243, Infinity),
    ];

    const sB = glide([[179, 1.68], [180, 1.433], [182, 1.25], [184, 1.173], [186, 1.13], [188, 1.09], [190, 1.077], [194, 1.047], [196, 1.037], [200, 1.03], [206, 1.017], [210, 1.01], [220, 0.99], [230, 0.973], [240, 0.957], [250, 0.933], [260, 0.917], [270, 0.9], [276, 0.895], [280, 0.88], [285, 0.865]]);
    const endDx = glide([[274, 0], [278, -8], [281, -12], [285, -26]]);
    const endDy = glide([[274, 0], [278, 4], [281, 12], [285, 30]]);

    return ({ frame: local }) => {
      const f = local + G0;

      /* shot A */
      const inA = f < 179;
      rootA.visible = inA;
      if (inA) {
        const s = sA(f);
        gridA.mat.opacity = prog(f, 145, 4, outCubic);
        gridA.setScale(s);
        rootA.scale.setScalar(1);
        // pan in screen px, then the whole shot scales about the frame centre
        rootA.position.x = panA(f) * PX * s;
        gridA.group.position.x = -3 * PX;
        six.scale.setScalar(sixGrow(f) * s);
        six.position.x = left0 * s;
        setLabel(six, { opacity: 1, blur: 0, color: INK });
        const pW = prog(f, 144.5, 5, outCubic);
        weeks.scale.setScalar(s);
        weeks.position.x = (weeksRest + weeksExtra(f) * PX) * s;
        setLabel(weeks, { opacity: Math.min(1, pW * 1.4), blur: (1 - pW) * 14 });
      }

      /* shot B */
      const inB = f >= 179;
      rootB.visible = inB;
      if (inB) {
        const s = sB(f);
        rootB.scale.setScalar(s);
        rootB.position.set(endDx(f) * PX, -endDy(f) * PX, 0);
        gridB.mat.opacity = 1;
        gridB.setScale(1);
        // setScale works on the inner group; compensate for the root's scale instead
        const t = (2 * PX) / s;
        for (const l of gridB.lines) {
          if (l.userData.horiz) l.scale.y = t;
          else l.scale.x = t;
        }
        for (const c of gridB.crosses) {
          if (c.userData.horiz) c.scale.set((70 * PX) / s, (3 * PX) / s, 1);
          else c.scale.set((3 * PX) / s, (70 * PX) / s, 1);
        }
        phrases.forEach((p, i) => {
          const first = i === 0;
          const pIn = first ? 1 : prog(f, p.t0, 11, outCubic);
          const pOut = prog(f, p.t1, 7, inCubic);
          const shown = f >= p.t0 && pOut < 1;
          p.group.visible = shown;
          if (!shown) return;
          p.group.position.y = (16 - (1 - pIn) * 50 + pOut * 75) * PX;
          p.words.forEach((w, k) => {
            setLabel(w, {
              opacity: Math.min(1, pIn * 4) * (1 - clamp01((pOut - 0.55) / 0.45)),
              blur: (1 - pIn) * 16 + pOut * 12,
              color: p.inks[k]!,
            });
          });
        });
      }
      void lerp;
    };
  });
}
