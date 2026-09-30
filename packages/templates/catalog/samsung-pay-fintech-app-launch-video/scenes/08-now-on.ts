import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { text, setOpacity } from "../components/text";
import { backdrop, fitCamera } from "../components/stage";
import { payBadge, genmotionLockup } from "../components/marks";

/** 39 frames. Samsung Pay badge · "now on" · GenMotion Checkout. Exits into a white wipe (09 opens on it). */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height, durationInFrames } = ctx;
  fitCamera(camera, height);
  scene.background = new THREE.Color(C.black);
  const bg = backdrop(width / height);
  bg.u.uShaft.value = 0.3;
  bg.u.uRadial.value = 0.4;
  scene.add(bg.mesh);

  const badge = payBadge(260);
  badge.position.y = 1.05;
  const nowOn = text("now on", { size: 30, fill: C.muted, weight: 400 });
  nowOn.name = "caption-now-on";
  nowOn.position.y = -0.05;
  const lockup = genmotionLockup(48, C.text, { text: "Checkout", colour: C.text });
  lockup.position.y = -0.85;
  const group = new THREE.Group();
  group.name = "samsung-pay-now-on-genmotion-checkout";
  group.add(badge, nowOn, lockup);
  scene.add(group);
  const items = [badge, nowOn, lockup];

  return ({ frame, time }) => {
    bg.u.uShaftX.value = -0.2 + frame * 0.004;
    items.forEach((m, i) => {
      const e = interpolate(frame, [i * 3, i * 3 + 10], [0, 1], Easing.easeOut);
      const o = interpolate(frame, [durationInFrames - 10, durationInFrames - 4], [1, 0], Easing.easeIn);
      setOpacity(m, e * o);
      m.position.x = 0;
      m.scale.setScalar(0.96 + e * 0.04);
    });
    group.position.y = Math.sin(time * 0.8) * 0.02 + frame * 0.002;
    // white wipe up from the bottom over the last 8 frames
    bg.u.uWipe.value = interpolate(frame, [durationInFrames - 8, durationInFrames], [0, 1], Easing.easeIn);
  };
}
