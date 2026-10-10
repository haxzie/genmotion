import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { COLOR, FONT_FAMILY } from "../components/brand";
import { screenLayer } from "../components/stage";
import { label, setLabel, measure, withFonts } from "../components/type";
import { backdrop } from "../components/fx";
import { markPlane } from "../components/ui";

/*
 * End card: the mark resolves out of the white flood, slides left as the
 * wordmark arrives, and the address settles underneath.
 * Pacing follows the reference beat (global frames 2956-3060); all content ours.
 */
const F0 = 2956;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera } = ctx;
    const layer = screenLayer(scene, camera);

    const bg = backdrop();
    bg.grad("#ffffff", "#f7f8fb", [0, 1]);
    scene.add(bg);

    const lockup = new THREE.Group();
    lockup.name = "nova-lockup";
    layer.add(lockup);
    const mark = markPlane(150);
    mark.name = "nova-mark";
    const wordStyle = { size: 120, weight: 500, tracking: -0.03, pad: 30 };
    const word = label("Nova", wordStyle, COLOR.ink);
    word.name = "nova-wordmark";
    lockup.add(mark, word);
    const ww = measure("Nova", wordStyle);
    const gap = 36;
    const total = 130 + gap + ww;
    const markX = -total / 2 + 65;
    const wordX = markX + 65 + gap + ww / 2;

    const url = label("nova.example/work", { size: 34, weight: 450, pad: 20 }, "#5b6475");
    url.name = "nova-url";
    url.position.y = -130;
    layer.add(url);

    return ({ frame, time }) => {
      const f = frame + F0;

      bg.glow(0, { x: 0.15, y: 1.0, rx: 0.5, ry: 0.4, color: "#e6f6ef", amount: interpolate(f, [2956, 2980], [0.8, 0.35]) });
      bg.glow(1, { x: 0.9, y: 0.0, rx: 0.5, ry: 0.4, color: "#e8eefc", amount: 0.5 });

      // mark: scales in at centre, then slides to its place in the lockup
      const pop = interpolate(f, [2958, 2972], [0, 1], Easing.easeOut);
      const slide = interpolate(f, [2976, 2992], [0, 1], Easing.easeInOut);
      mark.position.set(THREE.MathUtils.lerp(0, markX, slide), 6, 0);
      mark.scale.setScalar(THREE.MathUtils.lerp(1.5, 0.87, slide) * (0.6 + 0.4 * pop));
      mark.material.opacity = pop;
      mark.rotation.z = (1 - pop) * -0.6;

      const wIn = interpolate(f, [2982, 2996], [0, 1], Easing.easeOut);
      word.position.set(wordX + (1 - wIn) * 60, 0, 0);
      setLabel(word, { opacity: wIn, blur: (1 - wIn) * 12 });

      const uIn = interpolate(f, [2994, 3006], [0, 1], Easing.easeOut);
      url.position.y = -130 - (1 - uIn) * 14;
      setLabel(url, { opacity: uIn, blur: (1 - uIn) * 8 });

      // the lockup breathes while it holds
      lockup.scale.setScalar(1 + Math.sin(time * 0.9) * 0.004 + interpolate(f, [2992, 3060], [0, 0.02]));
    };
  });
}
