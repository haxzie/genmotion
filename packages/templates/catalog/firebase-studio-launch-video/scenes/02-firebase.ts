/**
 * 02 — "Firebase makes it possible" (film frames 100–152, 24 fps)
 * The light clears to white, a crosshair lattice blooms, the Firebase pill (the
 * real flame igniting layer by layer)
 * types itself in, whips left trailing a line, and the cut lands on
 * "makes it possible" with the line's end still drifting in.
 * All tracks are measured off the reference, in global film frames.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { pixelStage, sx, sy } from "../components/stage";
import { withBrandFonts, FONT_MONO, C } from "../components/brand";
import { flame } from "../components/firebase";
import { label, setLabel, measure, type TypeStyle } from "../components/type";
import { glowLayer, glowAt } from "../components/glow";
import { GLOW_KEYS } from "../components/glowKeys";
import { rrect } from "../components/rect";
import { sparkleGrid } from "../components/sparkles";
import { prog, sampled, inOutCubic, clamp01 } from "../components/ease";

const START = 100; // this scene's first film frame
const PILL = C.ink; // Google dark grey, so the full-colour flame reads on it
const HERO: TypeStyle = { size: 129, weight: 500, tracking: -0.025, color: "#000000", embolden: 0.8 };
const PILL_TEXT: TypeStyle = { size: 118, weight: 500, tracking: -0.02, color: "#ffffff" };
const MONO: TypeStyle = { size: 32, weight: 400, tracking: 0, font: FONT_MONO, color: "#000000" };

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => {
    const { scene } = ctx;
    pixelStage(ctx, "#ffffff");

    const glow = glowLayer();
    scene.add(glow.mesh);

    const grid = sparkleGrid();
    scene.add(grid.mesh);

    // ---- the pill
    const pill = new THREE.Group();
    pill.name = "firebase-pill";
    const bg = rrect("firebase-pill-bg", 922, 291, 34, PILL);
    bg.renderOrder = 10;
    const logo = flame(176, "firebase-pill-flame");
    const word = label("Firebase", PILL_TEXT, "left");
    word.name = "firebase-pill-word";
    word.renderOrder = 11;
    pill.add(bg, logo.group, word);
    // the reference pill fit a 180 px mark + 46 px gap + "Fireworks"; scale its width track to this content
    const GAP = 52;
    const oldContent = 180 + 46 + measure("Fireworks", PILL_TEXT);
    const newContent = logo.w + GAP + measure("Firebase", PILL_TEXT);
    const fitW = (w: number) => (w - 200) * (newContent / oldContent) + 200;
    scene.add(pill);

    // the trailing line and its end square
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 2),
      new THREE.MeshBasicMaterial({ color: "#757575", transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
    );
    line.name = "lead-line";
    line.renderOrder = 5;
    const square = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
    );
    square.name = "lead-square";
    square.renderOrder = 6;
    scene.add(line, square);

    // ---- after the cut
    const makes = label("makes it possible", HERO);
    makes.name = "makes-it-possible";
    makes.renderOrder = 12;
    const eyebrow = label("Firebase", MONO);
    eyebrow.name = "firebase-eyebrow";
    eyebrow.renderOrder = 12;
    scene.add(makes, eyebrow);

    // measured tracks (global frames)
    const pillW = sampled([[101, 481], [102, 622], [103, 712], [104, 770], [105, 812], [106, 844], [107, 867], [108, 885], [109, 898], [110, 908], [111, 916], [112, 921], [113, 923], [114, 924]]);
    const pillX = sampled([[101, 960], [112, 960], [113, 958], [114, 953.5], [115, 948], [116, 940], [117, 929.5], [118, 915.5], [119, 898.5], [120, 875.5], [121, 847.5], [122, 809.5], [123, 758.5], [124, 690]]);
    const pillY = sampled([[101, 603.5], [102, 583], [103, 569.5], [104, 561.5], [105, 555], [106, 551], [107, 547.5], [108, 545], [109, 543], [110, 541], [111, 540], [112, 539.5], [113, 539]]);
    const lineLen = sampled([[113, 0], [114, 40], [116, 242], [118, 370], [120, 503], [122, 800], [123, 1100], [124, 1500]]);
    const makesRight = sampled([[124, 1473], [125, 1457], [126, 1446], [128, 1433], [130, 1426], [134, 1418], [138, 1415], [146, 1415], [150, 1421], [151, 1433], [152, 1453], [153, 1480]]);
    const sqLeft = sampled([[124, 73], [125, 81], [126, 87], [128, 97], [130, 105], [134, 118], [138, 129], [142, 139], [146, 147], [150, 164], [151, 182], [152, 209], [153, 240]]);
    // lattice bloom: half-extents of the revealed region, per frame
    const revealH = sampled([[98, 300], [99, 450], [100, 580], [101, 675], [104, 780], [107, 885], [109, 1000], [110, 1100]]);
    const revealV = sampled([[98, 0], [99, 50], [101, 120], [103, 195], [106, 296], [110, 390], [113, 500], [115, 620]]);
    const goneV = sampled([[128, -60], [131, 60], [134, 195], [140, 420], [146, 560], [149, 640]]);

    return ({ frame: local }) => {
      const F = local + START;

      // the last of the light, clearing from the corners
      glowAt(glow, Math.min(F, 122), GLOW_KEYS);
      (glow.mesh.material as THREE.ShaderMaterial).uniforms.uOpacity!.value = 1 - prog(F, 120, 3, inOutCubic);
      (glow.mesh.material as THREE.ShaderMaterial).uniforms.uRing!.value = 0;
      glow.mesh.visible = F < 123;

      // lattice: pop in on an expanding rectangle, spin 90 deg through the whip, shrink out from the middle
      const spin = (Math.PI / 2) * prog(F, 116, 14, inOutCubic);
      const H = revealH(F), V = revealV(F), out = goneV(F);
      grid.pts.forEach((p, i) => {
        const ax = Math.abs(p.x), ay = Math.abs(p.y);
        const late = Math.max(ax > H ? (ax - H) / 70 : 0, ay > V ? (ay - V) / 70 : 0);
        const inS = clamp01(1 - late) ** 1.5;
        const outS = clamp01(1 - (out - ay) / 90);
        grid.pose(i, inS * outS, -spin);
      });
      grid.done();

      // ---- pill (101–123)
      const pillOn = F >= 101 && F < 124;
      pill.visible = pillOn;
      if (pillOn) {
        const w = fitW(pillW(F));
        const cx = pillX(F);
        pill.position.set(sx(cx), sy(pillY(F)), 0);
        bg.set({ w });
        const left = -w / 2;
        logo.group.position.set(left + 100 + logo.w / 2, 0, 0);
        // the flame ignites as the pill opens (101–109)
        logo.ignite(prog(F, 101, 9));
        word.position.set(left + 100 + logo.w + GAP, -2, 0);
        setLabel(word, { maskX: sx(cx) + w / 2 - 70, maskSoft: 24 });
      }

      // ---- line + square
      const lineOn = F >= 113;
      line.visible = lineOn;
      square.visible = F >= 124;
      if (F < 124 && lineOn) {
        const x0 = sx(pillX(F)) + fitW(pillW(F)) / 2;
        const len = lineLen(F);
        line.scale.set(Math.max(len, 0.01), 1, 1);
        line.position.set(x0 + len / 2, sy(538), 0);
      } else if (F >= 124) {
        const sqX = sx(sqLeft(F) + 8);
        square.position.set(sqX, sy(540), 0);
        const x0 = sx(-10);
        line.scale.set(sqX - x0, 1, 1);
        line.position.set((x0 + sqX) / 2, sy(538), 0);
      }

      // ---- makes it possible (124–152)
      const tOn = F >= 124;
      makes.visible = tOn;
      eyebrow.visible = tOn;
      if (tOn) {
        makes.position.set(sx(makesRight(F) - 461), sy(529), 0);
        eyebrow.position.set(sx(959.5), sy(267.5), 0);
        setLabel(makes, { opacity: 1 });
      }
    };
  });
}
