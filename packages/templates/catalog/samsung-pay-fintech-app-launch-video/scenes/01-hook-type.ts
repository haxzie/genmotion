import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { text, words, setOpacity, PX } from "../components/text";
import { smoke, fitCamera } from "../components/stage";

/** 112 frames. "The" → "The tap" → "your customers" → "already know by heart", then cut to black. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height } = ctx;
  fitCamera(camera, height);
  scene.background = new THREE.Color(C.black);
  const bg = smoke(width / height);
  scene.add(bg.mesh);

  const SIZE = 140;

  // Beat 1 — "The tap"
  const line1 = words([{ text: "The" }, { text: "tap" }], { size: SIZE, fill: C.text });
  line1.name = "headline-the-tap";
  const [wThe, wTap] = line1.userData.words as THREE.Mesh[];
  wThe.name = "headline-the";
  wTap.name = "headline-tap";
  scene.add(line1);

  // Beat 2 — "your customers"
  const line2 = text("your customers", { size: SIZE, fill: C.text });
  line2.name = "headline-your-customers";
  scene.add(line2);

  // Beat 3 — "already know by heart": ONE opaque copy per word, drawn in pure white and tinted
  // through material.color, so the accent is always the exact same violet as later slides
  // (a two-layer crossfade let the background show through and read as pale lavender).
  const parts = ["already", "know", "by", "heart"];
  const line3 = words(parts.map((t) => ({ text: t })), { size: SIZE, fill: "#ffffff" });
  line3.name = "headline-already-know-by-heart";
  scene.add(line3);
  const cText = new THREE.Color(C.text);
  const cAccent = new THREE.Color(C.violet);

  const theW = wThe.userData.w as number;

  return ({ frame, time }) => {
    bg.u.uTime.value = time;
    // smoke goes out with the final cut to black
    // reference opens on pure black; the light rises over ~15 frames
    bg.u.uIntensity.value =
      interpolate(frame, [0, 15], [0, 1], Easing.easeOut) * interpolate(frame, [100, 108], [1, 0], Easing.easeIn);

    // ---- beat 1: f0–40
    const grow = interpolate(frame, [9, 15], [0, 1], Easing.easeOut);
    const s = THREE.MathUtils.lerp(1.6, 1, grow);
    wThe.scale.setScalar(s);
    // "The" alone is centred; as "tap" arrives it settles to its word-slot
    const soloX = (-theW * s) / 2;
    wThe.position.x = THREE.MathUtils.lerp(soloX, wThe.userData.restX as number, grow);
    wThe.position.y = 0;
    const tapIn = interpolate(frame, [10, 16], [0, 1], Easing.easeOut);
    wTap.position.x = (wTap.userData.restX as number) + (1 - tapIn) * 4.5;
    const b1 = frame < 40 ? 1 : 0;
    setOpacity(wThe, b1 * interpolate(frame, [0, 3], [0, 1]));
    setOpacity(wTap, b1 * tapIn);

    // ---- beat 2: f40–64 (hard cut in, gentle settle)
    const b2 = frame >= 40 && frame < 64 ? 1 : 0;
    line2.scale.setScalar(interpolate(frame, [40, 52], [1.06, 1], Easing.easeOut));
    setOpacity(line2, b2);

    // ---- beat 3: f64–104
    const b3 = frame >= 64 ? interpolate(frame, [98, 104], [1, 0], Easing.easeIn) : 0;
    line3.scale.setScalar(interpolate(frame, [64, 78], [1.04, 1], Easing.easeOut) + frame * 0.0002);
    const ws = line3.userData.words as THREE.Mesh[];
    ws.forEach((w, i) => {
      // left-to-right colour sweep as the line lands (the reference is coloured on arrival)
      const sweep = i === 0 ? 0 : interpolate(frame, [64 + i * 2, 70 + i * 2], [0, 1], Easing.easeOut);
      (w.material as THREE.MeshBasicMaterial).color.lerpColors(cText, cAccent, sweep);
      setOpacity(w, b3);
    });
    // slow drift so the hold never freezes
    line3.position.x = -(frame - 64) * 0.08 * PX * 10;
  };
}
