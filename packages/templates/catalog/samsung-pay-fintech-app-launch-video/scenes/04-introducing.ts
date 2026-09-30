import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { text, setOpacity } from "../components/text";
import { backdrop, fitCamera } from "../components/stage";
import { payBadge, genmotionLockup } from "../components/marks";

/** 92 frames. "Introducing" → the Samsung Pay badge + "on GenMotion" → the badge rushes the lens into white. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height, durationInFrames } = ctx;
  const D = fitCamera(camera, height);
  scene.background = new THREE.Color(C.black);
  const bg = backdrop(width / height);
  bg.u.uShaft.value = 0.22;
  bg.u.uRadial.value = 0.55;
  scene.add(bg.mesh);

  const intro = text("Introducing", { size: 36, fill: C.text });
  intro.name = "caption-introducing";
  scene.add(intro);

  const badge = payBadge(300);
  badge.position.y = 0.55;
  const on = text("on", { size: 30, fill: C.muted, weight: 400 });
  on.name = "caption-on";
  const lockup = genmotionLockup(38, C.text);
  on.position.set(-(lockup.userData.w as number) / 2 - 0.05, -0.75, 0);
  lockup.position.set(0.25, -0.75, 0);
  const group = new THREE.Group();
  group.name = "samsung-pay-on-genmotion";
  group.add(badge, on, lockup);
  scene.add(group);

  return ({ frame, time }) => {
    bg.u.uShaftX.value = 0.1 + Math.sin(time * 0.5) * 0.05;

    // Beat 1: "Introducing" f2–40
    const inA = interpolate(frame, [2, 12], [0, 1], Easing.easeOut);
    const outA = interpolate(frame, [34, 40], [0, 1], Easing.easeIn);
    setOpacity(intro, inA * (1 - outA));
    intro.scale.setScalar(1 + frame * 0.001);

    // Beat 2: badge f42, caption f48
    const bIn = interpolate(frame, [42, 54], [0, 1], Easing.easeOut);
    setOpacity(badge, bIn);
    badge.scale.setScalar(0.94 + 0.06 * bIn + (frame - 42) * 0.0008);
    const cIn = interpolate(frame, [48, 58], [0, 1], Easing.easeOut);
    const cOut = interpolate(frame, [78, 84], [0, 1], Easing.easeIn);
    setOpacity(on, cIn * (1 - cOut));
    setOpacity(lockup, cIn * (1 - cOut));
    on.position.y = lockup.position.y = -0.75 - (1 - cIn) * 0.2;

    // Handoff: rush the badge into the lens → white
    const rush = interpolate(frame, [78, durationInFrames], [0, 1], Easing.easeIn);
    camera.position.set(0, 0.55 * rush, D - rush * (D - 0.35));
    camera.lookAt(0, 0.55 * rush, 0);
    bg.u.uWhite.value = interpolate(frame, [86, durationInFrames - 1], [0, 1], Easing.easeIn);
  };
}
