import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { COLOR, COPY, FONT_FAMILY } from "../components/brand";
import { screenLayer, fy, track } from "../components/stage";

/** Global frame of this scene's first frame (the measured curves use global frames). */
const F0 = 285;
import { label, setLabel, withFonts } from "../components/type";
import { backdrop } from "../components/fx";
import { curve, D_SCALE, D_Y, D_SWEEP } from "../components/ref-curves";

/** Glow that darkens a light ground toward `target` (negative light). */
function tintGlow(paper: string, target: string) {
  const a = new THREE.Color(paper);
  const b = new THREE.Color(target);
  return new THREE.Color(a.r - b.r, a.g - b.g, a.b - b.b);
}

/*
 * Hard cut from the push into white: the line lands from far away (scale
 * 0.3 -> 1 in ~8 frames), the accent sweeps across the last word left to
 * right, and a blue-lavender light rises from the bottom edge.
 */
const BAND_RY = track([[0, 0.12], [8, 0.22], [20, 0.27], [42, 0.31]]);

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera } = ctx;
    const layer = screenLayer(scene, camera);

    const bg = backdrop();
    bg.grad(COLOR.paper, COLOR.paper, [0, 1]);
    scene.add(bg);
    const blue = tintGlow(COLOR.paper, "#4a84f4");
    const lav = tintGlow(COLOR.paper, "#a99cf4");

    const style = { size: 112, weight: 450 };
    const w1 = label(COPY.built[0], style);
    const w2 = label(COPY.built[1], style);
    const line = new THREE.Group();
    line.name = "made-to-listen";
    line.add(w1, w2);
    const gap = style.size * 0.27;
    const a = w1.userData.inkWidth as number;
    const b = w2.userData.inkWidth as number;
    w1.position.x = -(a + gap + b) / 2 + a / 2;
    w2.position.x = (a + gap + b) / 2 - b / 2;
    layer.add(line);

    return ({ frame: f }) => {
      bg.glow(0, { x: 0.45, y: 1.08, rx: 0.8, ry: BAND_RY(f), color: blue, amount: -interpolate(f, [0, 6], [0.7, 1.15]) });
      bg.glow(1, { x: 1.0, y: 1.06, rx: 0.3, ry: 0.13, color: lav, amount: -interpolate(f, [4, 16], [0, 0.5]) });

      line.scale.setScalar(curve(D_SCALE, f + F0));
      line.position.y = fy(curve(D_Y, f + F0));
      const op = interpolate(f, [0, 3], [0.5, 1]);
      setLabel(w1, { color: COLOR.ink, opacity: op });
      // pad on each side of the ink, so the sweep runs from the first to the last letter
      // measured sweep: the accent edge crosses the word in 12 frames (global 296-308)
      const p = (curve(D_SWEEP, f + F0) - 0.446) / (0.746 - 0.446);
      const planeW = w2.geometry.parameters.width;
      const sweep = ((planeW - b) / 2 + p * b) / planeW;
      setLabel(w2, { color: COLOR.ink, sweepColor: COLOR.accent, sweep, sweepSoft: 0.07, opacity: op });
    };
  });
}
