import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { words, setOpacity } from "../components/text";
import { backdrop, fitCamera } from "../components/stage";
import { genmotionLockup, samsungPayMark } from "../components/marks";

/** 86 frames, white. CTA → GenMotion | Samsung Pay (holds) → hard cut to black. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height, durationInFrames } = ctx;
  fitCamera(camera, height);
  scene.background = new THREE.Color("#ffffff");
  const bg = backdrop(width / height);
  bg.u.uWhite.value = 1;
  scene.add(bg.mesh);

  // ---- CTA: grey words first, inked a beat later
  const SIZE = 64;
  const L1 = ["Bring", "one-tap", "pay"];
  const L2 = ["to", "your", "checkout", "today"];
  const mkLine = (ws: string[], fill: string, y: number, name: string) => {
    const g = words(ws.map((t) => ({ text: t })), { size: SIZE, fill });
    g.position.y = y;
    g.name = name;
    scene.add(g);
    return g.userData.words as THREE.Mesh[];
  };
  const grey = [...mkLine(L1, C.grey, 0.42, "cta-line-1-shadow"), ...mkLine(L2, C.grey, -0.42, "cta-line-2-shadow")];
  const ink = [
    ...mkLine(L1, C.ink, 0.42, "cta-bring-one-tap-pay"),
    ...mkLine(L2, C.ink, -0.42, "cta-to-your-checkout-today"),
  ];
  grey.forEach((g) => (g.parent!.userData.pickable = false));

  // ---- lockup: GenMotion | Samsung Pay
  const lock = new THREE.Group();
  lock.name = "genmotion-samsung-pay-lockup";
  const gm = genmotionLockup(40, C.ink);
  const sp = samsungPayMark(150);
  const gmW = gm.userData.w as number;
  const div = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.56), new THREE.MeshBasicMaterial({ color: "#c8cad2", transparent: true }));
  div.name = "lockup-divider";
  gm.position.x = -gmW / 2 - 0.3;
  sp.position.x = 0.3 + 0.75;
  const centre = (-gmW - 0.3 + 1.8) / 2; // optical centre of mark…logo span
  [gm, div, sp].forEach((m) => (m.position.x -= centre));
  lock.add(gm, div, sp);
  scene.add(lock);

  const black = new THREE.Color(C.black);
  return ({ frame }) => {
    // CTA f0–46
    const ctaOut = interpolate(frame, [40, 46], [1, 0], Easing.easeIn);
    grey.forEach((w, i) => {
      const e = interpolate(frame, [i * 2, i * 2 + 7], [0, 1], Easing.easeOut);
      setOpacity(w, e * ctaOut);
      w.position.y = (1 - e) * -0.3;
    });
    ink.forEach((w, i) => {
      const e = interpolate(frame, [i * 2 + 5, i * 2 + 11], [0, 1], Easing.easeOut);
      setOpacity(w, e * ctaOut);
      w.position.y = (1 - interpolate(frame, [i * 2, i * 2 + 7], [0, 1], Easing.easeOut)) * -0.3;
    });

    // lockup f48 → holds until the hard cut
    const cut = frame >= durationInFrames - 5 ? 1 : 0;
    const lIn = interpolate(frame, [48, 58], [0, 1], Easing.easeOut);
    setOpacity(lock, lIn * (1 - cut));
    lock.scale.setScalar(0.96 + lIn * 0.04 + Math.max(0, frame - 48) * 0.0006);

    // final cut to black
    bg.u.uWhite.value = 1 - cut;
    bg.u.uBase.value.copy(black);
  };
}
