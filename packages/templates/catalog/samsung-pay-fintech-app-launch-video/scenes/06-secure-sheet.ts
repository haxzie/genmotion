import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { words, setOpacity, PX } from "../components/text";
import { backdrop, fitCamera } from "../components/stage";
import { makePhone, phoneLights, screenPaySheet, SH } from "../components/phone";

/** 161 frames. Dark + violet floor. Pay sheet on a phone right; "Checkout in one tap" → "Verified on your device" + fingerprint. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height, durationInFrames } = ctx;
  const D = fitCamera(camera, height);
  scene.background = new THREE.Color(C.black);
  const bg = backdrop(width / height);
  bg.u.uGlowColor.value.set(C.violetDeep);
  bg.u.uGlow.value = 0.9;
  bg.u.uGlowX.value = 0.42;
  scene.add(bg.mesh);
  phoneLights(scene);

  const phone = makePhone("phone");
  phone.show(screenPaySheet());
  scene.add(phone.group);

  // two-line headlines, left-aligned
  const SIZE = 72;
  const mk = (a: string[], b: string[], name: string) => {
    const g = new THREE.Group();
    g.name = name;
    const l1 = words(a.map((t) => ({ text: t })), { size: SIZE, fill: C.text, align: "left" });
    const l2 = words(b.map((t) => ({ text: t })), { size: SIZE, fill: C.violet, align: "left" });
    l1.position.y = 0.44;
    l2.position.y = -0.44;
    g.add(l1, l2);
    g.userData.words = [...(l1.userData.words as THREE.Mesh[]), ...(l2.userData.words as THREE.Mesh[])];
    scene.add(g);
    return g;
  };
  const h1 = mk(["Checkout"], ["in", "one", "tap"], "headline-checkout-in-one-tap");
  const h2 = mk(["Verified"], ["on", "your", "device"], "headline-verified-on-your-device");

  // side-button double-press pulse
  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.26, 48),
    new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false }),
  );
  pulse.name = "side-button-press";
  pulse.position.set(2.15, 1.5, 0.05);
  phone.group.add(pulse);

  // fingerprint glyph that grows out of the camera island
  const fpCanvas = (colour: string, check: boolean) => {
    const S = 256;
    const cv = new OffscreenCanvas(S, S);
    const g = cv.getContext("2d")!;
    g.fillStyle = "#000";
    g.beginPath();
    g.roundRect(0, 0, S, S, 60);
    g.fill();
    g.strokeStyle = colour;
    g.lineCap = "round";
    g.lineWidth = 9;
    if (!check) {
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.arc(S / 2, S / 2 + 16, 18 + i * 17, Math.PI * (1.05 - i * 0.02), Math.PI * (1.95 + i * 0.02));
        g.stroke();
      }
      g.beginPath();
      g.moveTo(S / 2, S / 2 + 16);
      g.lineTo(S / 2, S / 2 + 70);
      g.stroke();
    } else {
      g.lineWidth = 12;
      g.beginPath();
      g.arc(S / 2, S / 2, 80, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(S / 2 - 38, S / 2 + 2);
      g.lineTo(S / 2 - 10, S / 2 + 30);
      g.lineTo(S / 2 + 42, S / 2 - 26);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(cv as unknown as HTMLCanvasElement);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const fpScan = new THREE.MeshBasicMaterial({ map: fpCanvas("#9b9cff", false), transparent: true, depthWrite: false });
  const fpOk = new THREE.MeshBasicMaterial({ map: fpCanvas(C.greenBright, true), transparent: true, depthWrite: false });
  const fp = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fpScan);
  fp.name = "fingerprint-check";
  fp.position.set(0, SH / 200 - 0.75, 0.01);
  phone.group.add(fp);

  const cam = new THREE.Vector3();
  return ({ frame, time }) => {
    // Handoff from 05: open on 05's last framing (close on the pay sheet, phone square-on),
    // then pull back and turn the phone into its parked pose over f0–26.
    const settle = interpolate(frame, [0, 26], [0, 1], Easing.easeInOut);
    bg.u.uGlow.value = THREE.MathUtils.lerp(0.9, 0.85 + Math.sin(time * 0.9) * 0.08, settle);
    bg.u.uGlowX.value = THREE.MathUtils.lerp(0.5, 0.42, settle);

    // camera: gentle push f63–95, blur-rush out at end
    const push = interpolate(frame, [63, 95], [0, 1], Easing.easeInOut);
    const rush = interpolate(frame, [durationInFrames - 10, durationInFrames], [0, 1], Easing.easeIn);
    const restY = push * 0.9 + rush * 0.4;
    const restZ = D * (1 - push * 0.22 - rush * 0.35);
    // start pose = phone base (3.3, -0.6, 0) minus 05's final phone→camera offset (1.9, -1.18, 0.6 - 0.8D)
    cam.set(
      THREE.MathUtils.lerp(1.4, 0, settle),
      THREE.MathUtils.lerp(0.58, restY, settle),
      THREE.MathUtils.lerp(0.8 * D - 0.6, restZ, settle),
    );
    camera.position.copy(cam);
    camera.lookAt(cam.x, cam.y, 0);

    // phone: parked right, slight turn, drifts (turn eases in from square-on)
    phone.group.position.set(3.3 - push * 0.3, -0.6 + push * 0.2 + Math.sin(time * 0.7) * 0.03 * settle, 0);
    phone.group.rotation.set(0.04 * settle, (-0.2 + frame * 0.0004) * settle, 0);

    // headline 1: f10–58, headline 2: f63–150 (the left edge tracks the camera's frame)
    const left = -6.9 * (1 - push * 0.22);
    const stage = (g: THREE.Group, a: number, b: number) => {
      g.position.set(left, restY, 0);
      (g.userData.words as THREE.Mesh[]).forEach((w, i) => {
        const e = interpolate(frame, [a + i * 2, a + i * 2 + 9], [0, 1], Easing.easeOut);
        const o = interpolate(frame, [b, b + 6], [1, 0], Easing.easeIn);
        setOpacity(w, e * o);
        w.position.x = (w.userData.restX as number) - (1 - e) * 40 * PX;
      });
    };
    stage(h1, 18, 55);
    stage(h2, 63, durationInFrames - 12);

    // double-press pulse ×2 at f80 and f92
    const p = (t0: number) => interpolate(frame, [t0, t0 + 10], [0, 1], Easing.easeOut);
    const k = frame < 90 ? p(80) : p(92);
    pulse.scale.setScalar(0.6 + k * 0.9);
    pulse.material.opacity = frame >= 80 && frame < 102 ? (1 - k) * 0.9 : 0;

    // fingerprint: island grows into a square f104–112, scanning, then green check f132
    const grow = interpolate(frame, [104, 112], [0, 1], Easing.easeOut);
    fp.scale.set(0.3 + grow * 0.95, 0.3 * (1 - grow) + grow * 1.25, 1);
    fp.visible = frame >= 104;
    fp.material = frame >= 132 ? fpOk : fpScan;
    fp.rotation.z = frame < 132 ? Math.sin(frame * 0.4) * 0.03 : 0;
    const shut = interpolate(frame, [durationInFrames - 12, durationInFrames - 6], [1, 0], Easing.easeIn);
    fp.material.opacity = shut;
  };
}
