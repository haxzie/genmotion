import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { words, text, setOpacity } from "../components/text";
import { backdrop, fitCamera } from "../components/stage";
import {
  makePhone, phoneLights, SH, PAY_BUTTON_Y,
  screenProduct, screenCheckout, screenPaymentOptions, screenPaySheet,
} from "../components/phone";

/**
 * 180 frames, white. Type beats, then a phone rises through the words and runs the
 * shop → bag → payment options → one-tap flow. Ends dark with the pay sheet open (handoff to 06).
 */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height, durationInFrames } = ctx;
  const D = fitCamera(camera, height);
  scene.background = new THREE.Color("#ffffff");
  const bg = backdrop(width / height);
  bg.u.uWhite.value = 1;
  bg.u.uGlowColor.value.set(C.violetDeep);
  scene.add(bg.mesh);
  phoneLights(scene);

  // ---- type
  const SIZE = 96;
  const lineA = words([{ text: "Built" }, { text: "for" }, { text: "every" }, { text: "storefront", fill: [C.navy, C.royal] }], { size: SIZE, fill: C.ink });
  lineA.name = "headline-built-for-every-storefront";
  const lineB = words([{ text: "and" }, { text: "every" }, { text: "screen", fill: [C.navy, C.royal] }], { size: SIZE, fill: C.ink });
  lineB.name = "headline-and-every-screen";
  scene.add(lineA, lineB);
  const aw = lineA.userData.words as THREE.Mesh[];
  const bw = lineB.userData.words as THREE.Mesh[];

  const oneTap = text("One tap", { size: 60, fill: C.royal, align: "right" });
  oneTap.name = "caption-one-tap";
  scene.add(oneTap);

  // ---- phone
  const phone = makePhone("phone");
  scene.add(phone.group);
  const tProduct = screenProduct();
  const tCheckout = screenCheckout();
  const tOptions = screenPaymentOptions();
  const tSheet = screenPaySheet();
  const sy = (screenY: number) => (SH / 2 - screenY) / 100; // screen px → phone-local y

  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();

  return ({ frame, time }) => {
    // ---------- type beats
    // A: f0–30. "Built for every" set, "storefront" slides in from the right at f6
    aw.forEach((w, i) => {
      const e = i < 3 ? interpolate(frame, [0, 6], [0, 1], Easing.easeOut) : interpolate(frame, [6, 14], [0, 1], Easing.easeOut);
      const x0 = w.userData.restX as number;
      w.position.x = x0 + (i === 3 ? (1 - e) * 2.2 : 0) - frame * 0.004;
      setOpacity(w, frame < 30 ? e : 0);
    });
    // B: f30–84. "and every" | "screen" part at f48 to let the phone through
    const part = interpolate(frame, [46, 60], [0, 1], Easing.easeInOut);
    const bOut = interpolate(frame, [74, 82], [0, 1], Easing.easeIn);
    bw.forEach((w, i) => {
      const e = interpolate(frame, [30 + i * 2, 38 + i * 2], [0, 1], Easing.easeOut);
      const x0 = w.userData.restX as number;
      w.position.x = x0 + (i < 2 ? -1 : 1) * part * 0.35 + (1 - e) * 0.6;
      setOpacity(w, frame >= 30 ? e * (1 - bOut) : 0);
    });

    // ---------- phone rise f48–72 (from below the frame into centre)
    const rise = interpolate(frame, [48, 72], [0, 1], Easing.easeOut);
    const slide = interpolate(frame, [134, 146], [0, 1], Easing.easeInOut); // shift right for "One tap"
    phone.group.position.set(slide * 2.3, THREE.MathUtils.lerp(-11, 0, rise), 0.6);
    phone.group.rotation.set((1 - rise) * 0.35, 0, 0);

    // screen sequence
    if (frame < 100) phone.show(tProduct);
    else if (frame < 116) phone.show(tCheckout);
    else if (frame < 166) phone.show(tOptions, interpolate(frame, [118, 132], [0, 150], Easing.easeInOut));
    else phone.show(tSheet);

    // touches: [start, screenX, screenY]
    const taps: [number, number, number][] = [
      [88, 250, 688], // Add to bag
      [106, 300, 656], // Continue
      [154, 230, PAY_BUTTON_Y - 150], // Samsung Pay button (scrolled 150)
    ];
    let shown = false;
    for (const [t0, x, y] of taps) {
      if (frame >= t0 - 6 && frame < t0 + 10) {
        const o = interpolate(frame, [t0 - 6, t0 - 2, t0 + 6, t0 + 10], [0, 1, 1, 0]);
        const p = interpolate(frame, [t0, t0 + 3, t0 + 6], [0, 1, 0]);
        phone.touchAt(x + (1 - interpolate(frame, [t0 - 6, t0], [0, 1], Easing.easeOut)) * 40, y, p, o);
        shown = true;
      }
    }
    if (!shown) phone.touchAt(0, 0, 0, 0);

    // ---------- camera: wide → down to "Add to bag" → up to the pay button → wide-ish
    // keyframes (world y target, distance factor)
    const ty = interpolate(frame, [70, 86, 112, 124], [0, sy(640), sy(640), sy(PAY_BUTTON_Y - 70)], Easing.easeInOut);
    const tz = interpolate(frame, [70, 86, 150, 170], [1, 0.62, 0.62, 0.8], Easing.easeInOut);
    const tx = interpolate(frame, [134, 146], [0, 0.4], Easing.easeInOut);
    camPos.set(tx, ty, D * tz);
    look.set(tx, ty, 0);
    camera.position.copy(camPos);
    camera.lookAt(look);

    // "One tap" f138–: left of the phone, in the camera's view
    const ot = interpolate(frame, [140, 150], [0, 1], Easing.easeOut);
    oneTap.position.set(-0.9 - (1 - ot) * 0.8, ty - 0.05, 0);
    setOpacity(oneTap, ot * interpolate(frame, [164, 170], [1, 0], Easing.easeIn));

    // ---------- handoff: white → dark with a violet floor glow, sheet open
    const dark = interpolate(frame, [166, durationInFrames - 4], [0, 1], Easing.easeInOut);
    bg.u.uWhite.value = 1 - dark;
    bg.u.uGlow.value = dark * 0.9;
    phone.group.rotation.y = Math.sin(time * 0.5) * 0.015;
  };
}
