/**
 * 07 — "Full-parameter / More models / Longer contexts / The quality you train
 * is the quality you serve" (film frames 687–835, 24 fps)
 * The white cell from the mosaic fills the frame, words cut through one at a
 * time, then a crosshair lattice blooms, its middle turns into purple dashed
 * squares and the whole lattice zooms out while the second line types in.
 * Word edges, lattice pitch and every timing are measured off the reference.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { pixelStage, sx, sy } from "../components/stage";
import { withBrandFonts } from "../components/brand";
import { label, setLabel, type TypeStyle, type Label } from "../components/type";
import { inkPlacer } from "../components/place";
import { canvasTexture } from "../components/ui";
import { sampled, clamp01, lerp } from "../components/ease";

const START = 687;
const INK: TypeStyle = { size: 129, weight: 500, tracking: -0.025, color: "#000000", embolden: 0.8 };

/** Rise-in offsets (px below rest) per frame after a word's entrance frame, and the exit rise. */
const RISE_IN = [27, 14, 8, 4, 2, 1, 0];
const RISE_OUT = [0, -1, -3, -7, -18];

function solid(w: number, h: number, color: string, name: string, order: number) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
  );
  m.name = name;
  m.renderOrder = order;
  return m;
}

/** The lattice: one instanced crosshair layer (grey) and one dashed-square layer (purple). */
function lattice() {
  const S = 64;
  const cross = canvasTexture(S, S, (g) => {
    g.strokeStyle = "#d6d6db";
    g.lineWidth = 1.7;
    g.lineCap = "round";
    const c = S / 2;
    for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      g.beginPath(); g.moveTo(c + x * 5, c + y * 5); g.lineTo(c + x * 15.5, c + y * 15.5); g.stroke();
    }
  });
  // a square of side 40 (of 64) drawn as four sides with open corners
  const square = canvasTexture(S, S, (g) => {
    g.strokeStyle = "#F57C00"; // Firebase orange (site tone, a touch deeper so it reads on white)
    g.lineWidth = 2.8;
    g.lineCap = "butt";
    const c = S / 2, h = 20, d = 11;
    g.beginPath();
    g.moveTo(c - d, c - h); g.lineTo(c + d, c - h);
    g.moveTo(c - d, c + h); g.lineTo(c + d, c + h);
    g.moveTo(c - h, c - d); g.lineTo(c - h, c + d);
    g.moveTo(c + h, c - d); g.lineTo(c + h, c + d);
    g.stroke();
  });
  const cols = 36, rows = 22;
  const n = cols * rows;
  const mk = (tex: THREE.Texture, name: string) => {
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(S, S), mat, n);
    mesh.name = name;
    mesh.userData.pickable = false;
    mesh.renderOrder = 1;
    return mesh;
  };
  const grey = mk(cross, "lattice-crosshairs");
  const purple = mk(square, "lattice-squares");
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const cells: { i: number; j: number }[] = [];
  for (let j = -Math.floor(rows / 2); j < rows - Math.floor(rows / 2); j++) for (let i = -Math.floor(cols / 2); i < cols - Math.floor(cols / 2); i++) cells.push({ i, j });
  const set = (mesh: THREE.InstancedMesh, k: number, x: number, y: number, scale: number) => {
    if (scale <= 0.001) { mesh.setMatrixAt(k, zero); return; }
    p.set(sx(x), sy(y), 0); s.set(scale, scale, 1); m.compose(p, q, s); mesh.setMatrixAt(k, m);
  };
  return { grey, purple, cells, set, done: () => { grey.instanceMatrix.needsUpdate = true; purple.instanceMatrix.needsUpdate = true; } };
}

interface Word { m: Label; p: ReturnType<typeof inkPlacer>; x: (f: number) => number; base: number; dy: (f: number) => number; from: number; to: number; clip?: (f: number) => number; oldW: number; rest: number }

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => {
    const { scene } = ctx;
    pixelStage(ctx, "#ffffff");

    // ---- the white cell's last two frames (687–688): purple flanks either side
    const flankL = solid(456, 1080, "#3a0c03", "flank-left", 20);
    flankL.position.set(sx(228), 0, 0);
    const flankR = solid(317, 1080, "#2a0802", "flank-right", 20);
    flankR.position.set(sx(1603 + 158.5), 0, 0);
    const flankTop = solid(1147, 7, "#3a0c03", "flank-top", 20);
    flankTop.position.set(sx(1029.5), sy(3.5), 0);
    scene.add(flankL, flankR, flankTop);

    const L = lattice();
    scene.add(L.grey, L.purple);

    const words: Word[] = [];
    const W = (text: string, x: [number, number][], base: number, from: number, to: number, opts: { inAt?: number; outAt?: number; dyKeys?: [number, number][]; clip?: [number, number][]; as?: string } = {}) => {
      const oldText = text;
      text = opts.as ?? text;
      const m = label(text, INK, "left");
      m.name = "word-" + text.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, "");
      m.renderOrder = 10;
      scene.add(m);
      const dyK = opts.dyKeys ? sampled(opts.dyKeys) : null;
      const dy = (f: number) => {
        if (dyK) return dyK(f);
        let d = 0;
        if (opts.inAt !== undefined && f >= opts.inAt) d += RISE_IN[Math.min(Math.round(f - opts.inAt), RISE_IN.length - 1)]!;
        if (opts.outAt !== undefined && f >= opts.outAt) d += RISE_OUT[Math.min(Math.round(f - opts.outAt), RISE_OUT.length - 1)]!;
        return d;
      };
      const w: Word = { m, p: inkPlacer(text, INK), x: sampled(x), base, dy, from, to, oldW: inkPlacer(oldText, INK).width, rest: x[x.length - 1]![1] };
      if (opts.clip) w.clip = sampled(opts.clip);
      words.push(w);
      return w;
    };

    // phase A — words that cut, drift and leave
    W("Full-", [[689, 592], [690, 582], [691, 576], [692, 572], [693, 569], [694, 567], [695, 566], [696, 565], [698, 565], [699, 564], [700, 563], [701, 560], [702, 557], [703, 550]], 573, 689, 704, { clip: [[689, 759], [690, 3000]] });
    const param = W("parameter", [[690, 822], [691, 813], [692, 807], [693, 802], [694, 799], [695, 797], [696, 796], [697, 795], [699, 795], [700, 794], [701, 792], [702, 788], [703, 782], [704, 771]], 573, 690, 705, { as: "stack" });
    void param;
    W("More", [[705, 637], [706, 627], [707, 621], [708, 617], [709, 614], [710, 612], [711, 611], [712, 610], [717, 610], [718, 608], [719, 606], [720, 602], [721, 595], [722, 578], [723, 539]], 572, 705, 724, { as: "More" });
    W("models", [[705, 960], [706, 945], [707, 935], [708, 929], [709, 925], [710, 922], [711, 920], [712, 919], [713, 918], [718, 918], [719, 916], [720, 913], [721, 906], [722, 894], [723, 865]], 572, 705, 724, { as: "platforms" });
    W("Longer", [[724, 551], [725, 541], [726, 535], [727, 531], [728, 528], [729, 526], [730, 525], [731, 524]], 573, 724, 741, { as: "Global", dyKeys: [[736, 0], [737, -1], [738, -3], [739, -5], [740, -10]] });
    W("contexts", [[724, 971], [725, 956], [726, 946], [727, 940], [728, 936], [729, 933], [730, 931], [731, 930], [732, 929]], 573, 724, 742, { as: "scale", dyKeys: [[737, 0], [738, -1], [739, -3], [740, -5], [741, -8]] });
    // phase B — "The quality you train", each word rising in 2 frames apart and leaving the same way
    W("The", [[0, 417]], 576, 741, 784, { inAt: 740, outAt: 779 });
    W("quality", [[0, 657]], 576, 742, 786, { inAt: 742, outAt: 781, as: "app" });
    W("you", [[0, 1040]], 576, 744, 788, { inAt: 744, outAt: 783 });
    W("train", [[0, 1265]], 576, 746, 790, { inAt: 746, outAt: 785, as: "prototype" });
    // phase C — "is the quality you serve"
    W("is", [[0, 347]], 576, 788, 900, { inAt: 788 });
    W("the", [[0, 456]], 576, 790, 900, { inAt: 790 });
    const q2 = W("quality ", [[0, 664]], 576, 792, 900, { inAt: 792, as: "app" });
    q2.m.name = "word-app-2";
    const y2 = W("you ", [[0, 1044]], 576, 794, 900, { inAt: 794 });
    y2.m.name = "word-you-2";
    W("serve", [[0, 1272]], 576, 796, 900, { inAt: 796, as: "ship" });

    // re-lay each phrase from the new words' widths: same centre and the same measured gaps,
    // every word keeping its own measured motion (an offset is added to its whole track)
    const relayout = (group: Word[]) => {
      const right = group[group.length - 1]!;
      const centre = (group[0]!.rest + right.rest + right.oldW) / 2;
      const gaps = group.slice(1).map((w, i) => w.rest - (group[i]!.rest + group[i]!.oldW));
      const total = group.reduce((a, w) => a + w.p.width, 0) + gaps.reduce((a, g) => a + g, 0);
      let x = centre - total / 2;
      group.forEach((w, i) => {
        const dx = x - w.rest;
        const base = w.x;
        w.x = (f: number) => base(f) + dx;
        x += w.p.width + (gaps[i] ?? 0);
      });
    };
    const byFrom = (a: number, b: number) => words.filter((w) => w.from >= a && w.from <= b);
    relayout(byFrom(689, 690)); // Full- stack
    relayout(byFrom(705, 705)); // More platforms
    relayout(byFrom(724, 724)); // Global scale
    relayout(byFrom(741, 746)); // The app you prototype
    relayout(byFrom(788, 796)); // is the app you ship

    // ---- lattice tracks
    const pitch = sampled([[779, 102.0], [780, 101.75], [781, 101.05], [782, 100.05], [783, 98.6], [784, 96.2], [785, 92.5], [786, 87.95], [787, 84.1], [788, 80.8], [789, 78.2], [790, 76.1], [791, 74.15], [792, 72.9], [793, 72.0], [794, 71.1], [795, 70.4], [796, 69.25], [797, 68.3], [798, 67.45], [799, 66.65], [800, 66.05], [801, 65.55], [802, 65.15], [803, 64.8], [804, 64.55], [805, 64.25], [806, 64.1], [807, 64.0], [808, 63.95], [810, 63.75], [812, 63.55], [814, 63.4], [816, 63.2], [818, 63.0], [820, 62.85], [822, 62.7], [824, 62.55], [826, 62.35], [828, 62.2], [830, 62.05], [832, 61.85], [834, 61.65], [835, 61.55]]);
    const pitchY = sampled([[779, 97.2], [780, 96.75], [781, 95.85], [782, 95.4], [783, 94.75], [784, 92.7], [785, 90.15], [786, 86.3], [787, 82.7], [788, 79.75], [789, 77.35], [790, 75.45], [791, 73.65], [792, 72.25], [793, 70.95], [794, 69.85], [795, 68.9], [796, 68.3], [797, 67.5], [798, 67.0], [799, 66.6], [800, 66.0], [801, 65.5], [802, 65.1], [803, 64.8], [804, 64.5], [805, 64.25], [806, 64.1], [807, 64.0], [808, 63.95], [810, 63.75], [812, 63.55], [814, 63.4], [816, 63.2], [818, 63.0], [820, 62.85], [822, 62.72], [824, 62.55], [826, 62.35], [828, 62.15], [830, 62.0], [832, 61.85], [834, 61.65], [835, 61.5]]);
    const phase = sampled([[781, 0.441], [786, 0.5]]);
    const revealH = sampled([[742, 300], [743, 600], [744, 722], [746, 760], [748, 850], [750, 1000]]);
    const revealV = sampled([[742, 0], [743, 90], [744, 190], [747, 200], [748, 290], [750, 390], [753, 420], [754, 490], [756, 620]]);
    const morphR = sampled([[780.4, 0], [781, 2.3], [782, 2.45], [783, 2.9], [784, 3.3], [785, 4.5], [786, 7], [787, 12]]);
    const sideF = sampled([[782, 0.32], [790, 0.26]]);

    return ({ frame: local }) => {
      const F = local + START;
      flankL.visible = flankR.visible = flankTop.visible = F <= 688;

      // ---- words
      let kx0 = 1e9, kx1 = -1e9;
      for (const w of words) {
        const on = F >= w.from && F < w.to;
        w.m.visible = on;
        if (!on) continue;
        const x = w.x(F);
        w.p.atBase(w.m, x, w.base + w.dy(F));
        setLabel(w.m, { maskX: w.clip ? sx(w.clip(F)) : 1e9 });
        if (F >= 740) { kx0 = Math.min(kx0, x); kx1 = Math.max(kx1, x + w.p.width); }
      }

      // ---- lattice
      const showLattice = F >= 742;
      L.grey.visible = L.purple.visible = showLattice;
      if (showLattice) {
        const p = F < 779 ? 102 : pitch(F);
        const q = F < 779 ? 97.2 : pitchY(F);
        const ph = phase(F);
        const H_ = revealH(F), V_ = revealV(F), R = morphR(F);
        const side = sideF(F) * p / 40; // the square texture's side is 40 px
        L.cells.forEach((c, k) => {
          const x = 960 + (c.i + ph) * p, y = 540 + c.j * q;
          const ax = Math.abs(x - 960), ay = Math.abs(y - 540);
          // reveal: rectangle growing from the line (scale-in at its edge)
          const late = Math.max(ax > H_ ? (ax - H_) / 70 : 0, ay > V_ ? (ay - V_) / 70 : 0);
          let s = clamp01(1 - late) ** 1.5;
          // knock out marks behind the words
          if (x > kx0 - 45 && x < kx1 + 45 && y > 440 && y < 640) s = 0;
          if (x < -40 || x > 1960 || y < -40 || y > 1120) s = 0;
          const d = Math.max(ax / (p * 3.75), ay / q);
          const isSq = R > 0 && d < R;
          L.set(L.grey, k, x, y, isSq ? 0 : s);
          L.set(L.purple, k, x, y, isSq ? s * side : 0);
        });
        L.done();
      }
      void lerp;
    };
  });
}
