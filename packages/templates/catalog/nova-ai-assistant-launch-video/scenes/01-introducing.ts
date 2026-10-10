import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { COPY, FONT_FAMILY } from "../components/brand";
import { screenLayer, designWidth, fy, track } from "../components/stage";
import { label, setLabel, haloOf, withFonts } from "../components/type";
import { backdrop, glowDot } from "../components/fx";
import { dotGrid, pointScale } from "../components/dotgrid";
import { curve, A_LEFT, A_CAP_H, A_CAP_Y, B_DX, B_SCALE, B_SQUASH_W, B_TOP, STAR_X, STAR_Y } from "../components/ref-curves";

/*
 * 0.0–2.8s  the big word sweeps in from the right, shrinking, and whips off left
 *           over a colour band travelling right-to-left along the bottom edge.
 * 2.7–4.6s  the line blurs in word by word over a dot floor that wipes in.
 * 4.6–5.0s  the words part, then collapse into one glowing star.
 * 5.0–6.7s  the star rises; the camera tilts down onto the floor and the star
 *           drops toward the lens — the next scene opens inside it.
 * Positions, scales and the star path are per-frame curves measured from the
 * reference (components/ref-curves.ts); the few hand keys left use monotone
 * interpolation so nothing stalls between keys.
 */

const WORD_BLUR = track([[0, 40], [6, 18], [12, 4], [16, 0], [52, 0], [62, 4], [72, 8], [78, 14], [84, 24]]);
const WORD_SLOPE = track([[0, 0], [36, 0], [48, 10], [60, 14], [84, 12]]);
const WORD_OP = track([[0, 0.55], [6, 0.95], [78, 0.92], [84, 0.7], [88, 0]]);

// colour band: x of its red stop, and its strength
const BAND_X = track([[0, 0.97], [9, 0.78], [21, 0.58], [33, 0.4], [42, 0.3], [51, 0.2], [60, 0.08], [69, -0.03], [84, -0.15]]);
const BAND_AMT = track([[0, 0.95], [56, 0.85], [72, 0.5], [86, 0.0]]);

// star
const STAR_CORE = track([[147, 2], [150, 5], [192, 5], [201, 9]]);
const STAR_HALO = track([[147, 90], [150, 70], [156, 34], [192, 32], [201, 80]]);

// camera over the floor (degrees, units)
const PITCH = track([[78, 22], [96, 5.5], [140, 5.5], [160, 8], [180, 7], [186, 0], [192, -14], [198, -38], [201, -50]]);
const HEIGHT = track([[78, 1.3], [180, 1.3], [186, 1.6], [192, 2.5], [198, 4.0], [201, 4.6]]);

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera, renderer, width, height } = ctx;
    const layer = screenLayer(scene, camera);
    const W = designWidth(width, height);

    const bg = backdrop();
    scene.add(bg);
    const BAND = ["#2a5ee0", "#ff3b3b", "#ffc21a", "#34c759", "#2f7cf6"];
    const BAND_OFF = [-0.24, 0, 0.22, 0.45, 0.68];
    const NIGHT_TOP = [new THREE.Color("#000103"), new THREE.Color("#060c16")];
    const NIGHT_BOT = [new THREE.Color("#0a1a31"), new THREE.Color("#04070d")];
    const top = new THREE.Color();
    const bottom = new THREE.Color();

    const big = label(COPY.intro, { size: 420, weight: 450, tracking: -0.02, dpr: 1.4, pad: 60 }, "#ffffff", "left");
    big.name = "introducing";
    layer.add(big);

    const grid = dotGrid({ cols: 34, rows: 80, spacing: 1, zNear: 1, size: 0.04, fadeNear: 7, fadeFar: 20 });
    scene.add(grid);
    const gridU = (grid.material as THREE.ShaderMaterial).uniforms;

    const style = { size: 112, weight: 450, pad: 50 };
    const one = label(COPY.oneThing[0], style);
    const two = label(COPY.oneThing[1], style);
    const oneGlow = haloOf(one, 22, 0.4);
    const twoGlow = haloOf(two, 22, 0.4);
    const lineGroup = new THREE.Group();
    lineGroup.name = "one-assistant";
    lineGroup.add(oneGlow, twoGlow, one, two);
    layer.add(lineGroup);
    const gap = style.size * 0.27;
    const w1 = one.userData.inkWidth as number;
    const w2 = two.userData.inkWidth as number;

    const star = glowDot(10, 90, "#ffffff", "#cfe0ff");
    star.name = "star";
    layer.add(star);
    const starU = star.material.uniforms;

    camera.near = 0.05;
    camera.updateProjectionMatrix();

    return ({ frame: f, time }) => {
      /* backdrop */
      const toNight = interpolate(f, [70, 96], [0, 1], Easing.easeInOut);
      top.copy(NIGHT_TOP[0]!).lerp(NIGHT_TOP[1]!, toNight);
      bottom.copy(NIGHT_BOT[0]!).lerp(NIGHT_BOT[1]!, toNight);
      bg.grad(top, bottom, [-0.35, 0.95]);
      bg.glow(0, { x: 0.8, y: 0.15, rx: 0.65, ry: 0.55, color: "#1f4d8f", amount: interpolate(f, [0, 30, 60, 84, 100], [0.05, 0.45, 0.7, 0.35, 0]) });
      bg.glow(1, { x: 0.5, y: 0.35, rx: 0.6, ry: 0.45, color: "#16294a", amount: interpolate(f, [80, 100, 190, 201], [0, 0.32, 0.32, 0.12]) });
      const bx = BAND_X(f);
      const ba = BAND_AMT(f);
      BAND.forEach((c, i) => {
        const x = bx + BAND_OFF[i]!;
        const fadeLeft = THREE.MathUtils.smoothstep(x, -0.05, 0.55);
        bg.glow(2 + i, { x, y: 1.05, rx: 0.12, ry: 0.13, color: c, amount: ba * fadeLeft * (i === 0 ? 0.4 : 1) });
      });
      bg.glow(7, { x: 0.72, y: 1.05, rx: 0.32, ry: 0.12, color: "#2a5ad8", amount: interpolate(f, [80, 88, 100, 112], [0, 0.8, 0.5, 0]) });

      /* big word */
      const s = (curve(A_CAP_H, f) * 1080) / (big.userData.capHeight as number);
      big.scale.setScalar(s);
      // the curve tracks the first glyph's ink edge; the plane origin is the text origin
      big.position.set((curve(A_LEFT, f) - 0.5) * W - (big.userData.inkLeft as number) * s, fy(curve(A_CAP_Y, f)), 0);
      setLabel(big, {
        opacity: WORD_OP(f),
        blur: WORD_BLUR(f) / s,
        blurSlope: WORD_SLOPE(f) / s,
        color: "#eef2fa",
        colorRight: "#7f9bc4",
        smear: interpolate(f, [70, 84], [0, 0.6]),
      });
      big.visible = f < 89;

      /* line: blur in by word, settle (slide + shrink), squash, collapse */
      const in1 = interpolate(f, [80, 88], [0, 1], Easing.easeOut);
      const in2 = interpolate(f, [85, 93], [0, 1], Easing.easeOut);
      const gone = interpolate(f, [148, 151], [1, 0]);
      // part: the words drift apart at normal proportions (measured total width,
      // peak 1.2x), then the whole line shrinks uniformly into the star
      const R = f >= 133 ? curve(B_SQUASH_W, f) : 1;
      const R_PEAK = 1.197;
      const base = w1 + gap + w2;
      const shrink = f > 143 ? Math.max(0.02, R / R_PEAK) : 1;
      const spread = f > 143 ? (R_PEAK - 1) * interpolate(f, [143, 148], [1, 0.4]) : Math.max(0, R - 1);
      const g = gap + base * spread;
      one.position.x = -(w1 + g + w2) / 2 + w1 / 2;
      two.position.x = (w1 + g + w2) / 2 - w2 / 2;
      oneGlow.position.x = one.position.x;
      twoGlow.position.x = two.position.x;
      const settle = curve(B_SCALE, f);
      const HALF = 0.05; // half the line's measured ink height (fraction of frame)
      const cy = f >= 133 ? curve(B_TOP, Math.min(f, 149)) + HALF * shrink : 0.498;
      const cyStar = f > 149 ? THREE.MathUtils.lerp(cy, curve(STAR_Y, 150), f - 149) : cy;
      lineGroup.position.set(curve(B_DX, f) * W, fy(cyStar), 0);
      lineGroup.scale.setScalar(settle * shrink);
      const flare = interpolate(f, [137, 146, 150], [0, 1, 1]);
      setLabel(one, { opacity: Math.min(1, in1 * 1.6) * gone, blur: (1 - in1) * 16 + flare * 5, color: "#f2f4f8" });
      setLabel(two, { opacity: Math.min(1, in2 * 1.6) * gone, blur: (1 - in2) * 16 + flare * 5, color: "#f2f4f8" });
      setLabel(oneGlow, { opacity: (0.4 + flare * 1.0) * in1 * gone });
      setLabel(twoGlow, { opacity: (0.4 + flare * 1.0) * in2 * gone });
      lineGroup.visible = f >= 79 && f < 152;

      /* star */
      star.visible = f >= 147;
      star.position.set((curve(STAR_X, f) - 0.5) * W, fy(f < 150 ? cyStar : curve(STAR_Y, f)), 1);
      const halo = STAR_HALO(f);
      star.scale.setScalar(halo / 90);
      starU.uCore!.value = Math.min(1, (STAR_CORE(f) + Math.sin(time * 5) * 0.3) / halo);
      starU.uHalo!.value = 0.85;
      starU.uOpacity!.value = interpolate(f, [147, 150], [0, 1]);

      /* floor + camera */
      camera.position.set(0, HEIGHT(f), 0);
      camera.rotation.set(THREE.MathUtils.degToRad(PITCH(f)), 0, 0);
      camera.updateMatrixWorld();
      gridU.uScale!.value = pointScale(renderer, camera);
      // the floor breathes: a gentle swell that rolls toward the camera
      gridU.uTime!.value = time;
      gridU.uWave!.value = 0.17;
      gridU.uReveal!.value = interpolate(f, [80, 96], [0, 1], Easing.easeOut);
      gridU.uOpacity!.value = interpolate(f, [140, 156, 178, 196], [1, 0.5, 0.55, 1]);
      gridU.uFadeFar!.value = interpolate(f, [180, 198], [20, 30]);
      grid.visible = f >= 78;
    };
  });
}
