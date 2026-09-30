import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { words, setOpacity } from "../components/text";
import { backdrop, fitCamera, mulberry32 } from "../components/stage";
import { tile, tileLights, GLYPHS, type Glyph } from "../components/tiles";

/** 105 frames. Tiles rush in from behind the camera into a slowly turning ring around the headline. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height, durationInFrames } = ctx;
  const D = fitCamera(camera, height);
  scene.background = new THREE.Color(C.black);
  const bg = backdrop(width / height);
  bg.u.uRadial.value = 0.35;
  scene.add(bg.mesh);
  tileLights(scene);

  const rnd = mulberry32(7);
  const ring = new THREE.Group();
  ring.name = "icon-ring";
  scene.add(ring);

  const N = 16;
  const skins = ["light", "light", "navy", "light", "dark", "light", "navy", "light"] as const;
  const RX = 6.8, RY = 3.75; // widened slightly so the larger tiles keep their spacing
  const tiles = Array.from({ length: N }, (_, i) => {
    const kind: Glyph = GLYPHS[i % GLYPHS.length];
    const t = tile(kind, skins[i % skins.length], 1.06 + rnd() * 0.56, `tile-${kind}-${i + 1}`);
    const a0 = (i / N) * Math.PI * 2 + (rnd() - 0.5) * 0.18;
    const r = 1 + (rnd() - 0.5) * 0.16;
    // start: scattered in front of / behind the lens, oversized
    const start = new THREE.Vector3((rnd() - 0.5) * 16, (rnd() - 0.5) * 9, D - 1.5 - rnd() * 3);
    const spin = new THREE.Euler((rnd() - 0.5) * 1.2, (rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.0);
    const tilt = new THREE.Euler((rnd() - 0.5) * 0.35, (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.3);
    ring.add(t);
    return { t, a0, r, start, spin, tilt, delay: rnd() * 5, bob: rnd() * 6.28 };
  });

  const headline = words(
    [{ text: "Now" }, { text: "live" }, { text: "in" }, { text: "your", fill: C.violet }, { text: "checkout", fill: C.violet }],
    { size: 52, fill: C.text },
  );
  headline.name = "headline-now-live-in-your-checkout";
  scene.add(headline);
  const hw = headline.userData.words as THREE.Mesh[];

  const target = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const qTilt = new THREE.Quaternion();
  const qSpin = new THREE.Quaternion();

  return ({ frame, time }) => {
    const turn = interpolate(frame, [0, durationInFrames], [0, 0.75], Easing.linear);

    tiles.forEach((o) => {
      const k = interpolate(frame, [o.delay, o.delay + 20], [0, 1], Easing.easeOut);
      const a = o.a0 + turn - (1 - k) * 0.8;
      target.set(Math.cos(a) * RX * o.r, Math.sin(a) * RY * o.r, Math.sin(a) * -1.2);
      target.y += Math.sin(time * 1.3 + o.bob) * 0.06;
      o.t.position.lerpVectors(o.start, target, k);
      qTilt.setFromEuler(o.tilt);
      qSpin.setFromEuler(o.spin);
      q.slerpQuaternions(qSpin, qTilt, k);
      o.t.quaternion.copy(q);
    });

    // word-by-word headline
    hw.forEach((w, i) => {
      const at = 6 + [0, 5, 8, 12, 14][i];
      const e = interpolate(frame, [at, at + 8], [0, 1], Easing.easeOut);
      const out = interpolate(frame, [durationInFrames - 14, durationInFrames - 6], [0, 1], Easing.easeIn);
      setOpacity(w, e * (1 - out));
      w.position.y = (1 - e) * -0.25;
    });

    // handoff: push into the ring
    const push = interpolate(frame, [durationInFrames - 26, durationInFrames], [0, 1], Easing.easeIn);
    camera.position.z = D - push * 7.5;
    bg.u.uRadial.value = 0.35 + Math.sin(time * 0.8) * 0.05;
  };
}
