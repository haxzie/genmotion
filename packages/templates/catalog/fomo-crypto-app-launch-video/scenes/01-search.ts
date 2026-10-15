/**
 * 0–115 · "search" → "just got"
 *
 * Shot A (0–75): the fomo coin spins in at centre, a frosted pill grows around
 * it while it slides left, "search" types in one letter a frame, then the pill
 * and word fold away as the coin dives off right.
 * Shot B (76–115): the coin, now big, sweeps up-right along an S-curve leaving
 * a blue ribbon trail, uncovering "just got" written along the ribbon.
 *
 * Every number here was tracked off the reference frames (px, y down).
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { withBrandFonts } from "../components/fonts";
import { stage, X, Y } from "../components/stage";
import { backdrop } from "../components/background";
import { coin, pose } from "../components/logo";
import { text, setText, fontString } from "../components/text";
import { roundRect, setRect } from "../components/shapes";
import { starfield } from "../components/stars";
import { curve, linear, step, type Key } from "../components/keys";
import { pathText } from "../components/pathtext";

const D2R = Math.PI / 180;

// ── Shot A: the coin ───────────────────────────────────────────────────────
const aX = curve([
  [0, 641.5], [2, 641.5], [6, 645], [10, 644.5], [14, 643.5], [20, 642], [26, 642], [28, 640.5], [30, 637],
  [32, 629.5], [34, 614.5], [36, 561], [38, 492], [40, 468], [42, 456], [44, 449.5], [46, 443.5], [48, 440],
  [50, 437], [52, 436], [54, 435], [56, 435.5], [58, 438.5], [60, 443.5], [62, 452], [64, 465], [66, 487],
  [68, 519], [70, 567], [72, 649], [74, 810], [75, 905],
]);
const aY = curve([
  [0, 360.5], [4, 360], [12, 359.5], [30, 359.5], [32, 359], [34, 358.5], [36, 358], [38, 356.5], [40, 356],
  [44, 355.5], [50, 355], [54, 355], [56, 355.5], [58, 356.5], [60, 358.5], [62, 362], [64, 366.5],
  [66, 373.5], [68, 383.5], [70, 400.5], [72, 423.5], [75, 424],
]);
const aD = curve([
  [0, 2], [1, 10], [2, 23], [4, 44], [6, 53], [8, 60], [10, 66], [12, 71], [14, 74], [16, 77], [18, 79],
  [20, 81], [22, 83], [24, 85], [28, 87], [32, 88], [34, 89], [36, 90], [38, 91], [40, 92], [44, 93],
  [50, 94], [56, 95], [62, 96], [75, 96],
]);
const aRotY = curve([
  [0, 210], [2, 150], [4, 110], [6, 82], [8, 58], [10, 42], [12, 32], [14, 25], [16, 21], [18, 18], [20, 16],
  [26, 15], [30, 12], [34, 2], [38, -10], [44, -14], [56, -14], [60, -12], [63, 0], [66, 18], [70, 26], [75, 28],
]);
const aRotZ = curve([[0, -40], [2, -35], [4, -15], [8, -5], [12, 0], [75, 0]]);
const aRotX = curve([[0, 0], [58, 0], [62, -10], [66, -18], [75, -18]]);
const aLook = curve([
  [0, 0], [8, -0.1], [10, -0.18], [16, -0.36], [20, -0.42], [32, -0.42], [42, -0.38], [44, -0.28], [46, -0.03],
  [48, 0], [62, 0], [66, 0.05], [75, 0.05],
]);
const blinkKeys: Key[] = [
  [0, 0], [10, 0], [12, 0.85], [13, 1], [18, 1], [20, 0.45], [22, 0],
  [32, 0], [34, 0.65], [36, 1], [42, 1], [44, 0.4], [46, 0],
  [68, 0], [70, 0.6], [72, 0.9], [75, 1],
  [79, 1], [80, 0.6], [82, 0.3], [84, 0], [112, 0], [114, 0.9], [115, 1],
];
const blink = linear(blinkKeys);
const handle = curve([[0, 0], [9, 0], [12, 0.5], [16, 0.9], [20, 1], [57, 1], [60, 0.45], [62, 0]]);

// ── Shot A: pill + word ────────────────────────────────────────────────────
const PILL_CX = 639;
const PILL_CY = 359.5;
const pillW = curve([
  [26, 120], [28, 150], [30, 162], [32, 181], [34, 216], [36, 327], [38, 470], [40, 518], [42, 545],
  [44, 563], [46, 575], [48, 585], [50, 591], [52, 596], [54, 597], [58, 599], [60, 599],
]);
const pillH = curve([[26, 120], [28, 147], [30, 154], [34, 158], [38, 161], [44, 164], [50, 165], [58, 167], [62, 167], [64, 166], [66, 142], [68, 120]]);
const pillL = curve([[60, 341], [62, 416], [64, 430], [66, 438], [68, 470]]);
const pillR = curve([[60, 940], [62, 940], [64, 928], [66, 897], [68, 860]]);
const pillA = curve([[26, 0], [28, 0.75], [30, 1], [60, 1], [62, 0.9], [64, 0.75], [66, 0.45], [68, 0]]);

const WORD = "search";
const WORD_SIZE = 104.25;
const WORD_X = 530.2;
const WORD_BASE = 393.5;
const typed = step([[0, 0], [44, 1], [45, 2], [46, 3], [47, 4], [48, 5], [49, 6]]);
/** the word folds away under a soft wipe that chases the coin (screen x of the wipe edge) */
const wordWipe = curve([[59, 380], [61, 470], [63, 590], [65, 700], [67, 830], [69, 960]]);
const caretOn = (f: number) => (f >= 39 && f <= 41) || f === 43 || (f >= 44 && f <= 54);

// ── Shot B: the ribbon flight ──────────────────────────────────────────────
const bX = curve([
  [76, 477], [78, 631], [80, 715], [82, 771], [84, 809], [86, 837], [88, 858], [90, 875], [92, 890],
  [94, 903], [96, 916], [98, 929], [100, 944], [102, 961], [104, 979], [106, 999], [108, 1020],
  [110, 1041], [112, 1066], [114, 1104], [115, 1135],
]);
/** the trail's centre-line (also the coin's path), px */
const PATH: [number, number][] = [
  [-120, 150], [-60, 177], [0, 203], [60, 229], [100, 246], [140, 263], [160, 272], [200, 290], [240, 308], [280, 323], [320, 337], [360, 348], [400, 356],
  [440, 362], [477, 364], [520, 365.5], [560, 365], [600, 362], [631, 357], [670, 349], [715, 339],
  [771, 327], [809, 315], [837, 305], [858, 297], [875, 291], [890, 285], [903, 280], [916, 275],
  [929, 270], [944, 265], [961, 260], [979, 254], [999, 248], [1020, 243], [1041, 239], [1066, 235],
  [1104, 230], [1135, 226], [1200, 218],
];
const pathY = linear(PATH as unknown as Key[]);
const RIBBON_W = 178;
const COIN_B = 178;
const tailCut = () => -200;
const alphaZero = curve([[76, 20], [92, 20], [112, 225], [115, 260]]);
const alphaSlope = curve([[76, 0.00085], [92, 0.00085], [112, 0.00117], [115, 0.0012]]);
const ribbonFade = curve([[76, 1], [111, 1], [115, 0.7]]);

const justX = curve([[80, 546], [84, 502], [88, 482], [92, 471], [96, 463], [100, 455], [104, 447], [108, 439], [112, 418], [115, 395]]);
const JUST_SIZE = 99;
const JUST_OFFSET = 37;
const JUST_STRETCH = 1.03;
const justA = curve([[76, 1], [112, 1], [114, 0.7], [115, 0.45]]);

// ── stars ──────────────────────────────────────────────────────────────────
const starShift = curve(
  Object.entries({
    56: 0.0, 58: -7.6, 60: -24.5, 62: -49.5, 64: -82.7, 66: -124.2, 68: -174.0, 70: -231.9, 72: -297.9,
    74: -372.0, 76: -454.0, 78: -539.4, 80: -616.2, 82: -684.1, 84: -743.3, 86: -795.0, 88: -840.4,
    90: -881.4, 92: -920.1, 94: -958.8, 96: -1000.3, 98: -1048.0, 100: -1105.2, 102: -1176.8,
    104: -1268.6, 105: -1324.3, 106: -1388.0, 107: -1461.1, 108: -1545.1, 109: -1641.5, 110: -1752.2,
    111: -1879.2, 112: -2023.9, 113: -2187.0, 114: -2365.7, 115: -2547.0,
  }).map(([k, v]) => [Number(k), v] as Key),
);
const starA = curve([[50, 0], [56, 0.6], [60, 1]]);

// ── ribbon shader ──────────────────────────────────────────────────────────
const RIB_VERT = /* glsl */ `
  attribute float aX;
  varying float vX;
  void main() {
    vX = aX;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const RIB_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uZero;
  uniform float uSlope;
  uniform float uTail;
  uniform float uHead;
  uniform float uFade;
  varying float vX;
  void main() {
    if (vX < uTail || vX > uHead) discard;
    float a = clamp((vX - uZero) * uSlope, 0.0, 0.95);
    float cap = smoothstep(uTail, uTail + 3.0, vX);
    gl_FragColor = vec4(uColor, a * cap * uFade);
  }
`;

function ribbonMesh(): THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> {
  // dense resample of the path
  const pts: THREE.Vector2[] = [];
  for (let x = PATH[0][0]; x <= PATH[PATH.length - 1][0]; x += 4) pts.push(new THREE.Vector2(x, pathY(x)));
  const n = pts.length;
  const pos = new Float32Array(n * 2 * 3);
  const ax = new Float32Array(n * 2);
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const t = new THREE.Vector2().subVectors(b, a).normalize();
    const nx = -t.y;
    const ny = t.x;
    const h = RIBBON_W / 2;
    const p = pts[i];
    // px space (y down) → world
    pos.set([X(p.x + nx * h), Y(p.y + ny * h), 0], i * 6);
    pos.set([X(p.x - nx * h), Y(p.y - ny * h), 0], i * 6 + 3);
    ax[i * 2] = p.x;
    ax[i * 2 + 1] = p.x;
    if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aX", new THREE.BufferAttribute(ax, 1));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    vertexShader: RIB_VERT,
    fragmentShader: RIB_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color().setStyle("#4b4ced", THREE.NoColorSpace) },
      uZero: { value: 20 },
      uSlope: { value: 0.00085 },
      uTail: { value: 150 },
      uHead: { value: 477 },
      uFade: { value: 1 },
    },
  });
  const m = new THREE.Mesh(geo, mat);
  m.name = "ribbon-trail";
  m.renderOrder = 10;
  m.frustumCulled = false;
  return m;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => {
    const { scene } = ctx;
    stage(ctx);
    scene.add(backdrop());

    const stars = starfield();
    scene.add(stars);

    const pill = roundRect("#ffffff", "search-pill");
    pill.renderOrder = 20;
    scene.add(pill);

    const word = text(WORD, { size: WORD_SIZE, weight: 400, color: "#ffffff" }, "search");
    word.position.set(X(WORD_X), Y(WORD_BASE), 0);
    word.renderOrder = 30;
    scene.add(word);
    // per-letter reveal: advances of each prefix
    const g = new OffscreenCanvas(8, 8).getContext("2d")!;
    g.font = fontString(WORD_SIZE, 400);
    const prefix = Array.from({ length: WORD.length + 1 }, (_, i) => g.measureText(WORD.slice(0, i)).width);

    const caret = roundRect("#505bea", "search-caret");
    caret.renderOrder = 31;
    scene.add(caret);

    const ribbon = ribbonMesh();
    scene.add(ribbon);

    const just = pathText("just got", { size: JUST_SIZE, weight: 400, color: "#ffffff" }, PATH, "just-got");
    just.glyphs.forEach((g) => g && (g.renderOrder = 40));
    scene.add(just.group);

    const c = coin(0.4, "fomo-coin");
    c.rotation.order = "ZYX";
    c.renderOrder = 50;
    c.traverse((o) => (o.renderOrder = 50));
    c.userData.face && ((c.children[3] as THREE.Mesh).renderOrder = 51);
    scene.add(c);

    return ({ frame: f, time }) => {
      const shotA = f < 76;

      // stars
      stars.material.uniforms.uShift.value = starShift(f);
      stars.material.uniforms.uTime.value = time;
      stars.material.uniforms.uOpacity.value = starA(f);

      // pill
      if (f < 60) {
        setRect(pill, pillW(f), pillH(f), 200, 0.093 * pillA(f));
        pill.position.set(X(PILL_CX), Y(PILL_CY), 0);
      } else {
        const l = pillL(f);
        const r = pillR(f);
        setRect(pill, r - l, pillH(f), 200, 0.093 * pillA(f));
        pill.position.set(X((l + r) / 2), Y(PILL_CY), 0);
      }
      if (!shotA) pill.visible = false;

      // word + caret
      const n = typed(f);
      setText(word, { opacity: shotA ? 1 : 0, maskR: prefix[n] + 0.5, maskL: wordWipe(f) - WORD_X, maskSoft: 0.5 });
      if (f >= 59) word.material.uniforms.uMaskSoft.value = 45;
      if (n === 0) word.visible = false;
      const on = shotA && caretOn(f);
      setRect(caret, 4, 88, 1, on ? 1 : 0);
      caret.position.set(X(WORD_X + prefix[n] + 12), Y(357), 0);

      // ribbon + "just got"
      ribbon.visible = !shotA;
      just.group.visible = !shotA;
      if (!shotA) {
        const head = bX(f);
        const u = ribbon.material.uniforms;
        u.uTail.value = tailCut(f);
        u.uHead.value = head;
        u.uZero.value = alphaZero(f);
        u.uSlope.value = alphaSlope(f);
        u.uFade.value = ribbonFade(f);

        const s0 = just.arcAtX(justX(f) + JUST_SIZE * 0.05);
        just.layout(s0, JUST_OFFSET, JUST_STRETCH);
        just.glyphs.forEach((g) => {
          if (!g) return;
          // a glyph exists once the coin has passed it; the coin hides the seam
          const local = (head - (g.position.x + 640)) / Math.cos(g.rotation.z);
          setText(g, { opacity: justA(f), maskR: local, maskSoft: 2 });
        });
      }

      // coin
      if (shotA) {
        const d = aD(f);
        c.scale.setScalar(d / 2);
        c.position.set(X(aX(f)), Y(aY(f)), 0);
        c.rotation.set(aRotX(f) * D2R, aRotY(f) * D2R, aRotZ(f) * D2R);
        pose(c, { blink: blink(f), lookX: aLook(f), lookY: 0, handle: handle(f) });
      } else {
        const x = bX(f);
        c.scale.setScalar(COIN_B / 2);
        c.position.set(X(x), Y(pathY(x)), 0);
        c.rotation.set(-20 * D2R, 16 * D2R, 0);
        pose(c, { blink: blink(f), lookX: -0.38, lookY: 0.02, handle: 0 });
      }
    };
  });
}
