import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { letters, setOpacity } from "../components/text";
import { backdrop, fitCamera } from "../components/stage";

/** 87 frames, white. "fast" → "safe" → "simple", built letter by letter. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height, durationInFrames } = ctx;
  fitCamera(camera, height);
  scene.background = new THREE.Color("#ffffff");
  const bg = backdrop(width / height);
  bg.u.uWhite.value = 1;
  bg.u.uGlowColor.value.set("#c9c6ff");
  scene.add(bg.mesh);

  const SIZE = 180;
  const beats = [
    { word: "fast", at: 4, end: 26 },
    { word: "safe", at: 26, end: 48 },
    { word: "simple", at: 48, end: durationInFrames - 6 },
  ].map((b) => {
    const g = letters(b.word, { size: SIZE, weight: 500, fill: [C.ink, C.royal] });
    g.name = `word-${b.word}`;
    scene.add(g);
    return { ...b, g, ls: g.userData.letters as THREE.Mesh[] };
  });

  return ({ frame, time }) => {
    // lavender haze clearing off the top as the white settles
    bg.u.uGlow.value = 0;
    bg.u.uWhite.value = 1;
    beats.forEach((b) => {
      const alive = frame >= b.at && frame < b.end;
      b.g.visible = alive;
      if (!alive) return;
      b.g.scale.setScalar(1 + (frame - b.at) * 0.0012);
      b.ls.forEach((l, i) => {
        const t0 = b.at + i * 2;
        const e = interpolate(frame, [t0, t0 + 7], [0, 1], Easing.easeOut);
        setOpacity(l, e);
        l.position.y = (1 - e) * -0.8;
      });
      // last word exits ~6 frames before the cut
      if (b.word === "simple") {
        const o = interpolate(frame, [b.end - 6, b.end], [1, 0], Easing.easeIn);
        b.ls.forEach((l) => setOpacity(l, ((l.material as THREE.MeshBasicMaterial).opacity) * o));
      }
    });
    void time;
  };
}
