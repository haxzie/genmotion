/**
 * 209–254 · the coin train
 *
 * The fomo coin flies off to the right and a train of token coins sweeps
 * through on black. Measured off the reference: the coins ride one circle
 * (radius 5.30, centre (−0.12, −4.39) in a camera with a 2529 px focal length),
 * 15.47° apart, each at its own depth, sharing one phase S(t) that eases in,
 * slows through the middle and accelerates out. All coins share one yaw that
 * turns from wall-on-the-right to wall-on-the-left as they arrive.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { curve, type Key } from "../components/keys";
import { tokenCoin, type TokenKind } from "../components/tokens";
import { coin, pose, tint } from "../components/logo";
import { trainCamera, trainPose, FOCAL } from "../components/train";

const G = 209;
const k = (rows: number[][]) => curve(rows.map((r) => [r[0] - G, r[1]] as Key));

/** Chain phase S(t), degrees (coin i sits at S − 15.47·i). */
export const PHASE = k([
  [209, -46], [210, -31], [211, -13.5], [212, -6.4], [213, -0.2], [214, 5.0], [215, 9.4], [216, 13.1],
  [217, 16.3], [218, 19.0], [219, 21.35], [220, 23.57], [221, 25.68], [222, 27.72], [223, 29.55],
  [224, 31.2], [225, 32.72], [226, 34.23], [227, 35.73], [228, 37.4], [229, 39.01], [230, 40.13],
  [231, 41.14], [232, 42.21], [233, 43.35], [234, 44.53], [235, 45.79], [236, 47.15], [237, 48.64],
  [238, 50.28], [239, 52.1], [240, 54.06], [241, 56.26], [242, 58.73], [243, 61.48], [244, 64.53],
  [245, 68.05], [246, 72.25], [247, 76.92], [248, 81.54], [249, 86.86], [250, 91.9], [251, 97.62],
  [252, 105.39], [253, 115.29], [254, 125.78],
]);

/** Shared yaw of every coin face, degrees (positive turns the face to the right). */
export const YAW = k([
  [209, -34], [211, -30], [213, -20], [215, -9], [217, 2], [219, 13], [221, 22], [223, 30], [225, 36],
  [227, 40.6], [230, 41.2], [233, 42.9], [236, 44.2], [240, 44.9], [244, 45.4], [248, 46.3], [251, 46.5],
  [254, 48.6],
]);

export const TRAIN: [TokenKind, number, number][] = [
  // kind, index on the wheel, depth
  ["sol", 1, 13.18],
  ["hl", 2, 14.03],
  ["rh", 3, 15.17],
  ["x", 4, 16.0],
  ["btc", 5, 16.58],
  ["eth", 6, 17.45],
  ["uni", 7, 18.3],
];

/** Per-coin screen corrections (px) measured from each face's genuine left edge. */
export const CORR: Partial<Record<TokenKind, number[][]>> = {
  sol: [[213, -44, 30], [214, -37, 21], [215, -28, 16], [216, -20, 12], [217, -12, 11], [218, -4, 9], [219, 2, 9], [220, 6, 9], [221, 7, 8], [222, 5, 7], [223, -3, 5], [224, -10, 3], [225, -16, 1], [226, -23, -1], [227, -30, -3], [228, -39, -8], [229, -47, -12], [230, -48, -13], [231, -46, -13], [232, -45, -14], [233, -44, -15], [234, -44, -16], [235, -45, -17], [236, -44, -19], [237, -45, -21], [238, -45, -22]],
  hl: [
    [215, 49, -15], [216, 54, -10], [217, 57, -6], [218, 59, -3], [219, 59, -1], [220, 54, 1],
    [221, 47, 4], [222, 37, 6], [223, 27, 7], [224, 18, 7], [225, 10, 8], [226, 0, 7],
    [227, -10, 6], [228, -20, 5], [229, -29, 4], [230, -29, 3], [231, -29, 3], [232, -29, 2],
    [233, -30, 2], [234, -30, 1], [235, -30, 1], [236, -30, 0], [237, -30, -1], [238, -30, -1],
    [239, -30, -2], [240, -29, -3], [241, -27, -3], [242, -26, -3], [243, -24, -4], [244, -21, -3],
    [245, -19, -3], [246, -19, -5], [247, -17, -5],
  ],
  rh: [
    [215, 72, -63], [216, 78, -54], [217, 84, -46], [218, 88, -40], [219, 90, -35], [220, 88, -30],
    [221, 83, -25], [222, 75, -19], [223, 66, -15], [224, 59, -12], [225, 51, -8], [226, 43, -6],
    [227, 34, -3], [228, 25, -1], [229, 16, 1], [230, 14, 2], [231, 14, 2], [232, 13, 3],
    [233, 11, 3], [234, 10, 4], [235, 9, 4], [236, 7, 4], [237, 6, 5], [238, 5, 5],
    [239, 3, 4], [240, 2, 4], [241, 0, 4], [242, -1, 4], [243, -2, 3], [244, -2, 3],
    [245, -4, 3], [246, -8, 0], [247, -11, -2], [248, -4, 2], [249, 3, 7], [250, 25, 27],
  ],
  x: [
    [218, 110, -102], [219, 115, -94], [220, 116, -87], [221, 113, -77], [222, 108, -67], [223, 101, -61],
    [224, 96, -53], [225, 90, -48], [226, 83, -42], [228, 66, -30], [229, 59, -25], [230, 57, -22],
    [231, 55, -20], [232, 54, -19], [233, 52, -16], [234, 51, -13], [235, 48, -11], [236, 45, -10],
    [237, 43, -6], [238, 39, -5], [239, 36, -2], [240, 33, -2], [241, 29, 1], [242, 24, 2],
    [243, 20, 3], [244, 16, 4], [245, 9, 4], [246, 0, 3], [247, -9, 0], [248, -7, 0],
    [249, -6, -1], [250, 11, 8], [251, 32, 24], [252, 42, 40],
  ],
  btc: [
    [224, 113, -120], [225, 109, -113], [226, 104, -104], [227, 98, -96], [228, 92, -86], [229, 86, -76],
    [230, 85, -71], [231, 84, -67], [232, 83, -63], [233, 81, -58], [234, 79, -54], [235, 76, -50],
    [236, 74, -44], [237, 71, -39], [238, 67, -34], [239, 62, -29], [240, 58, -23], [241, 52, -18],
    [242, 46, -12], [243, 39, -7], [244, 31, -3], [245, 21, 1], [246, 7, 4], [247, -8, 5],
    [248, -14, 4], [249, -20, 1], [250, -9, 3], [251, 7, 8], [252, 11, 13], [253, 15, 21],
    [254, 46, 63],
  ],
  uni: [
    [242, 45, -97], [243, 39, -83], [244, 34, -67], [245, 26, -50], [246, 12, -31], [247, -3, -14],
    [248, -15, -2], [249, -29, 7], [250, -31, 9], [251, -29, 9], [252, -38, 6], [253, -46, -1],
    [254, -14, -1],
  ],
};

/** The wheel's shape correction by path angle (world units), fitted across all coins. */
const PATH_A = [-60, -52, -44, -36, -28, -20, -12, -4, 4, 12, 20, 28, 36, 44, 52, 60];
const PATH_X = [0.663, 0.662, 0.66, 0.563, 0.468, 0.342, 0.257, 0.138, 0.021, -0.065, -0.035, -0.043, 0.011, 0.097, 0.271, 0.446];
const PATH_Y = [1.548, 1.141, 0.733, 0.432, 0.243, 0.104, 0.024, -0.022, -0.034, -0.023, -0.021, -0.015, -0.044, -0.134, -0.378, -0.622];
const lin = (xs: number[], ys: number[], x: number) => {
  if (x <= xs[0]) return ys[0] + ((ys[1] - ys[0]) / (xs[1] - xs[0])) * (x - xs[0]);
  const n = xs.length - 1;
  if (x >= xs[n]) return ys[n] + ((ys[n] - ys[n - 1]) / (xs[n] - xs[n - 1])) * (x - xs[n]);
  let i = 0;
  while (x > xs[i + 1]) i++;
  const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
  return ys[i] + (ys[i + 1] - ys[i]) * t;
};
/** Per-coin phase trim (deg) from the same fit. */
const DELTA: Record<TokenKind, number> = { sol: -0.77, hl: -0.77, rh: 0, x: 0.53, btc: -0.12, eth: -2.5, uni: -4.91 };

/** Common-model correction in px for coin `kind` (index i, depth z) at frame f. */
function commonPx(kind: TokenKind, i: number, z: number, f: number): [number, number] {
  const a = PHASE(f) - 15.4707 * i;
  const d = DELTA[kind];
  const r = (5.3048 * Math.PI) / 180;
  const ar = THREE.MathUtils.degToRad(a);
  const wx = lin(PATH_A, PATH_X, a) + d * r * Math.cos(ar);
  const wy = lin(PATH_A, PATH_Y, a) - d * r * Math.sin(ar);
  return [(wx * FOCAL) / z, (-wy * FOCAL) / z];
}

function corrFn(kind: TokenKind, i: number, z: number) {
  const rows = CORR[kind];
  if (!rows) return (f: number) => commonPx(kind, i, z, f);
  const f0 = rows[0][0] - G;
  const f1 = rows[rows.length - 1][0] - G;
  const cx = k(rows.map((r) => [r[0], r[1]]));
  const cy = k(rows.map((r) => [r[0], r[2]]));
  const c0 = commonPx(kind, i, z, f0);
  const c1 = commonPx(kind, i, z, f1);
  return (f: number): [number, number] => {
    if (f >= f0 && f <= f1) return [cx(f), cy(f)];
    const [ex, ey, c] = f < f0 ? [cx(f0), cy(f0), c0] : [cx(f1), cy(f1), c1];
    const m = commonPx(kind, i, z, f);
    return [m[0] + ex - c[0], m[1] + ey - c[1]];
  };
}

// the fomo coin leaving: [frame, cx px, cy px, yaw°]
const FOMO = [
  [209, 950, 380, 0], [210, 1050, 382, 8], [211, 1153, 396, 35], [212, 1302, 446, 55], [213, 1450, 520, 68],
];
const fx = k(FOMO.map((r) => [r[0], r[1]]));
const fy = k(FOMO.map((r) => [r[0], r[2]]));
const fyaw = k(FOMO.map((r) => [r[0], r[3]]));

const ENTRY: Record<TokenKind, number> = { sol: 210, hl: 211, rh: 212, x: 213, btc: 215, eth: 217, uni: 220 };
const a = new THREE.Vector3();

/** Fine trims (px) from comparing renders against the reference, zero outside their keys. */
const FINE: Partial<Record<TokenKind, number[][]>> = {
  uni: [[214, -60, 0], [220, -45, -3], [222, -31, -1], [224, -20, -1], [226, -12, -2], [228, -7, 0], [230, -4, 1], [232, 0, 0], [236, 7, 0], [240, 7, 7], [244, 2, 6], [247, 0, 0]],
  btc: [[214, -18, 40], [215, -18, 40], [217, 3, 29], [219, 11, 41], [221, 5, 21], [223, 1, 9], [225, 0, 6], [243, 0, 4], [246, 0, 0]],
};
const fine = Object.fromEntries(
  Object.entries(FINE).map(([kind, rows]) => {
    const f0 = rows![0][0] - G, f1 = rows![rows!.length - 1][0] - G;
    const fx = k(rows!.map((r) => [r[0], r[1]])), fy = k(rows!.map((r) => [r[0], r[2]]));
    return [kind, (f: number): [number, number] => (f < f0 || f > f1 ? [0, 0] : [fx(f), fy(f)])];
  }),
) as Partial<Record<TokenKind, (f: number) => [number, number]>>;

function placeAt(c: THREE.Object3D, i: number, z: number, f: number, corr: (f: number) => [number, number]) {
  trainPose(c, PHASE(f), i, z, YAW(f));
  const [cx0, cy0] = corr(f);
  const [fx0, fy0] = fine[c.userData.kind as TokenKind]?.(f) ?? [0, 0];
  const dx = cx0 + fx0, dy = cy0 + fy0;
  c.position.x += (dx * z) / FOCAL;
  c.position.y -= (dy * z) / FOCAL;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  trainCamera(ctx);
  scene.background = new THREE.Color("#060411");

  const coins = TRAIN.map(([kind, i, z]) => {
    const c = tokenCoin(kind);
    c.userData.kind = kind;
    scene.add(c);
    return { c, i, z, corr: corrFn(kind, i, z), entry: ENTRY[kind] - G };
  });

  const fomo = coin(0.3, "fomo-coin");
  tint(fomo, { eyes: "#ebecfe", wall: "#e6e8fc" });
  scene.add(fomo);
  const FZ = 6.84;

  return ({ frame: f }) => {
    const yaw = YAW(f);
    for (const { c, i, z, corr, entry } of coins) {
      if (f >= entry) {
        placeAt(c, i, z, f, corr);
      } else {
        // before it enters, it carries on along its entry velocity, off the left edge
        placeAt(c, i, z, entry + 1, corr);
        a.copy(c.position);
        placeAt(c, i, z, entry, corr);
        c.position.addScaledVector(a.sub(c.position), f - entry);
      }
      c.rotation.y = THREE.MathUtils.degToRad(yaw);
    }

    fomo.visible = f < 213 - G;
    fomo.position.set(((fx(f) - 640) * FZ) / FOCAL, ((360 - fy(f)) * FZ) / FOCAL, -FZ);
    fomo.rotation.order = "YXZ";
    fomo.rotation.set(THREE.MathUtils.degToRad(-3), THREE.MathUtils.degToRad(fyaw(f)), THREE.MathUtils.degToRad(-6));
    pose(fomo, { blink: 0, lookX: -0.36, lookY: 0, skew: -0.42, handle: 0 });
  };
}
