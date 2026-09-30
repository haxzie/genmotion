import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, FONT } from "../components/brand";
import { backdrop, fitCamera } from "../components/stage";
import { makePhone, phoneLights, screenConfirming, screenSuccess, SH } from "../components/phone";

/** 106 frames. Confirming (spinning coin + swoosh) → successful → green receipt → phone lifts out on green glow. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height, durationInFrames } = ctx;
  const D = fitCamera(camera, height);
  scene.background = new THREE.Color(C.black);
  const bg = backdrop(width / height);
  bg.u.uGlowColor.value.set(C.violetDeep);
  bg.u.uGlow.value = 0.9;
  scene.add(bg.mesh);
  phoneLights(scene);

  const phone = makePhone("phone");
  scene.add(phone.group);
  const tConfirm = screenConfirming(false);
  const tDone = screenConfirming(true);
  const tSuccess = screenSuccess();

  const COIN_Y = (SH / 2 - 420) / 100;
  // gold coin
  // face: gold radial gradient, raised rim, ₹ mark (drawn once)
  const fc = new OffscreenCanvas(512, 512);
  const fg = fc.getContext("2d")!;
  const rg = fg.createRadialGradient(200, 180, 20, 256, 256, 256);
  rg.addColorStop(0, "#ffe27a");
  rg.addColorStop(0.55, "#f5b820");
  rg.addColorStop(1, "#c98a06");
  fg.fillStyle = rg;
  fg.fillRect(0, 0, 512, 512);
  fg.lineWidth = 22;
  fg.strokeStyle = "#b87c05";
  fg.beginPath(); fg.arc(256, 256, 214, 0, Math.PI * 2); fg.stroke();
  fg.lineWidth = 8;
  fg.strokeStyle = "#ffe9a3";
  fg.beginPath(); fg.arc(256, 256, 196, 0, Math.PI * 2); fg.stroke();
  fg.font = `600 250px ${FONT}`;
  fg.textAlign = "center";
  fg.textBaseline = "middle";
  fg.fillStyle = "#b87c05";
  fg.fillText("₹", 262, 272);
  fg.fillStyle = "#ffe49a";
  fg.fillText("₹", 256, 264);
  const faceTex = new THREE.CanvasTexture(fc as unknown as HTMLCanvasElement);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  faceTex.anisotropy = 8;
  // cylinder cap UVs run sideways once the coin is stood up; turn the art upright
  faceTex.center.set(0.5, 0.5);
  faceTex.rotation = Math.PI / 2;
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex, emissiveMap: faceTex, emissive: "#ffffff", emissiveIntensity: 0.45, metalness: 0.3, roughness: 0.4,
  });
  const edgeMat = new THREE.MeshStandardMaterial({ color: "#d99a0b", metalness: 0.45, roughness: 0.35, emissive: "#6b4700", emissiveIntensity: 0.5 });
  // CylinderGeometry groups: 0 = side, 1 = top cap, 2 = bottom cap
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.12, 64), [edgeMat, faceMat, faceMat]);
  coin.name = "gold-coin";
  coin.rotation.x = Math.PI / 2;
  const coinPivot = new THREE.Group();
  coinPivot.name = "coin";
  coinPivot.position.set(0, COIN_Y, 0.62); // radius 0.52 + margin: the spinning edge never dips behind the screen
  coinPivot.add(coin);
  phone.group.add(coinPivot);

  // blue swoosh ribbon trailing into the coin
  const sw = new OffscreenCanvas(512, 128);
  const sg = sw.getContext("2d")!;
  const grad = sg.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, "rgba(90,110,255,0)");
  grad.addColorStop(0.6, "rgba(90,110,255,0.55)");
  grad.addColorStop(1, "rgba(40,60,230,0.95)");
  sg.fillStyle = grad;
  sg.beginPath();
  sg.moveTo(0, 20);
  sg.quadraticCurveTo(300, 20, 512, 54);
  sg.lineTo(512, 74);
  sg.quadraticCurveTo(300, 108, 0, 108);
  sg.closePath();
  sg.fill();
  const swTex = new THREE.CanvasTexture(sw as unknown as HTMLCanvasElement);
  swTex.colorSpace = THREE.SRGBColorSpace;
  const swoosh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.6).translate(-0.8, 0, 0), // stays inside the 3.56-wide screen
    new THREE.MeshBasicMaterial({ map: swTex, transparent: true, depthWrite: false }),
  );
  swoosh.name = "payment-swoosh";
  swoosh.position.set(-0.05, COIN_Y, 0.02);
  phone.group.add(swoosh);

  // green check badge (replaces coin)
  const ck = new OffscreenCanvas(256, 256);
  const cg = ck.getContext("2d")!;
  cg.fillStyle = C.greenBright;
  cg.beginPath(); cg.arc(128, 128, 120, 0, Math.PI * 2); cg.fill();
  cg.fillStyle = "#e9ffef";
  cg.beginPath(); cg.arc(128, 128, 90, 0, Math.PI * 2); cg.fill();
  cg.strokeStyle = C.green; cg.lineWidth = 20; cg.lineCap = "round"; cg.lineJoin = "round";
  cg.beginPath(); cg.moveTo(86, 130); cg.lineTo(116, 160); cg.lineTo(172, 100); cg.stroke();
  const ckTex = new THREE.CanvasTexture(ck as unknown as HTMLCanvasElement);
  ckTex.colorSpace = THREE.SRGBColorSpace;
  const check = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: ckTex, transparent: true, depthWrite: false }));
  check.name = "success-check";
  phone.group.add(check);

  // light rays around the check on the green screen
  const rays = new THREE.Group();
  rays.name = "success-rays";
  const rayMat = new THREE.MeshBasicMaterial({ color: "#b8ffcf", transparent: true, opacity: 0, depthWrite: false });
  for (let i = 0; i < 8; i++) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.05), rayMat);
    const a = (i / 8) * Math.PI * 2 + 0.3;
    r.position.set(Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0);
    r.rotation.z = a;
    r.name = `success-ray-${i + 1}`;
    rays.add(r);
  }
  phone.group.add(rays);

  const green = new THREE.Color(C.green);
  const violet = new THREE.Color(C.violetDeep);

  return ({ frame, time }) => {
    // camera close on upper-middle of the phone
    camera.position.set(0, 0.4, D * 0.78);
    camera.lookAt(0, 0.4, 0);

    const lift = interpolate(frame, [durationInFrames - 12, durationInFrames - 2], [0, 1], Easing.easeIn);
    phone.group.position.set(0, -1.1 + interpolate(frame, [0, 60], [0, 0.25], Easing.easeOut) + lift * 9, 0);

    // screens
    if (frame < 59) phone.show(tConfirm);
    else if (frame < 67) phone.show(tDone);
    else phone.show(tSuccess);

    // coin spin f0–59, flips to check at f59–65
    coinPivot.rotation.y = time * 5;
    const flip = interpolate(frame, [59, 65], [0, 1], Easing.easeInOut);
    coinPivot.scale.setScalar(1 - flip);
    coinPivot.visible = flip < 1;

    // swoosh grows in f22–48, fades f52–58
    const sIn = interpolate(frame, [22, 44], [0, 1], Easing.easeOut);
    swoosh.scale.set(sIn, 1 + Math.sin(time * 6) * 0.06, 1);
    swoosh.material.opacity = sIn * interpolate(frame, [52, 58], [1, 0]);

    // check: appears where the coin was, then jumps to the top of the green screen
    const cIn = interpolate(frame, [61, 68], [0, 1], Easing.easeOut);
    const up = interpolate(frame, [67, 76], [0, 1], Easing.easeInOut);
    check.position.set(0, THREE.MathUtils.lerp(COIN_Y, (SH / 2 - 190) / 100, up), 0.03);
    check.scale.setScalar(interpolate(frame, [61, 66, 70], [0.4, 1.08, 1], Easing.easeOut));
    check.visible = cIn > 0;
    (check.material as THREE.MeshBasicMaterial).opacity = cIn;
    rays.position.copy(check.position);
    rays.scale.setScalar(1 + interpolate(frame, [72, 84], [0, 0.35], Easing.easeOut));
    rayMat.opacity = interpolate(frame, [72, 76, 84, 90], [0, 0.9, 0.9, 0]);

    // backdrop glow violet → green as the screen goes green
    const g = interpolate(frame, [64, 80], [0, 1], Easing.easeInOut);
    bg.u.uGlowColor.value.copy(violet).lerp(green, g);
    bg.u.uGlow.value = 0.9 + g * 0.2 + Math.sin(time) * 0.04;
    bg.u.uRadial.value = g * 0.25;
    bg.u.uRadialColor.value.copy(green);
  };
}
