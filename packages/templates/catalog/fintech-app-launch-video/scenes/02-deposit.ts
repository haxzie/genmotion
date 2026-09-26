/**
 * 02 — Deposit. Opens inside the lime flood from 01, which contracts into a
 * glossy "Deposit" pill on a warm peach wash (the reference's orange button,
 * re-skinned). A cursor taps it, the pill flies home into the phone that
 * rises beneath it, the balance slot-rolls up and coins burst out of the top
 * of the phone. The hero coin swoops to centre for the cut into 03.
 */
import * as THREE from "three";
import { interpolate, Easing, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { BRAND, FONT } from "../components/brand";
import { CAM_Z, canvasTexture, label, roller, u } from "../components/text";
import { enter, leave, glide, lerp, mulberry32 } from "../components/motion";
import {
  drawBolt, makeCoin, makePhone, nameAs, peachWash, roundedPlane, studio,
  type CoinGlyph, type CoinKind,
} from "../components/props";

const CW = 1000;
const CH = 2170;

/** The app's home screen, painted once. Live pieces are overlaid in 3D. */
function drawHome(g: OffscreenCanvasRenderingContext2D) {
  const font = (size: number, weight = 500) => `${weight} ${size}px ${FONT}`;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, CW, CH);
  const top = g.createLinearGradient(0, 0, 0, 900);
  top.addColorStop(0, "#fbffe9");
  top.addColorStop(1, "#ffffff");
  g.fillStyle = top;
  g.fillRect(0, 0, CW, 900);

  g.fillStyle = BRAND.ink;
  g.textBaseline = "middle";
  g.font = font(46, 600);
  g.fillText("9:41", 96, 84);
  // Signal, wifi and battery, simply.
  for (let i = 0; i < 4; i++) g.fillRect(720 + i * 16, 96 - i * 9, 10, 12 + i * 9);
  g.beginPath();
  g.roundRect(812, 70, 84, 38, 11);
  g.fill();

  // Header: mark + name, avatar.
  g.fillStyle = BRAND.ink;
  g.beginPath();
  g.roundRect(80, 180, 84, 84, 24);
  g.fill();
  drawBolt(g, 122, 222, 56, BRAND.lime);
  g.fillStyle = BRAND.ink;
  g.font = font(50, 600);
  g.fillText("LightPay", 190, 224);
  g.fillStyle = "#eef0e6";
  g.beginPath();
  g.arc(890, 222, 44, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = BRAND.ink;
  g.font = font(40, 600);
  g.textAlign = "center";
  g.fillText("M", 890, 224);
  g.textAlign = "left";

  // Filter chips.
  const chips = ["All", "Card", "Savings", "Crypto"];
  let x = 80;
  g.font = font(42, 500);
  chips.forEach((c, i) => {
    const w = g.measureText(c).width + 60;
    g.fillStyle = i === 0 ? BRAND.lime : "#ffffff";
    g.strokeStyle = i === 0 ? BRAND.lime : "#d9dad5";
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(x, 318, w, 80, 40);
    g.fill();
    g.stroke();
    g.fillStyle = BRAND.ink;
    g.fillText(c, x + 30, 360);
    x += w + 18;
  });

  g.fillStyle = "#5e606a";
  g.font = font(46, 500);
  g.fillText("Balance", 80, 486);
  // Eye.
  g.strokeStyle = "#5e606a";
  g.lineWidth = 5;
  g.beginPath();
  g.ellipse(898, 486, 30, 18, 0, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(898, 486, 8, 0, Math.PI * 2);
  g.fillStyle = "#5e606a";
  g.fill();

  // Action row: slot 0 is where the 3D Deposit pill lands.
  const pills = [
    { cx: 202, text: "" },
    { cx: 500, text: "Send" },
    { cx: 798, text: "Request" },
  ];
  g.font = font(44, 500);
  g.textAlign = "center";
  for (const p of pills) {
    g.fillStyle = "#f1f2ee";
    g.beginPath();
    g.roundRect(p.cx - 140, 760 - 41, 280, 82, 41);
    g.fill();
    g.fillStyle = BRAND.ink;
    g.fillText(p.text, p.cx, 762);
  }
  g.textAlign = "left";

  // Recent activity.
  g.fillStyle = BRAND.ink;
  g.font = font(50, 600);
  g.fillText("Recent", 80, 930);
  const rows = [
    { t: "Salary", a: "+$3,200.00", c: BRAND.lime, glyph: "$" },
    { t: "Coffee Lab", a: "−$4.20", c: "#ffd9bf", glyph: "☕" },
    { t: "Sent to Maya", a: "−$60.00", c: "#dfe2ff", glyph: "M" },
    { t: "Refund · Nova", a: "+$48.00", c: "#e8e9ec", glyph: "N" },
    { t: "Streaming", a: "−$9.99", c: "#ffe0ea", glyph: "▶" },
  ];
  rows.forEach((r, i) => {
    const y = 1060 + i * 150;
    g.fillStyle = r.c;
    g.beginPath();
    g.arc(130, y, 50, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = BRAND.ink;
    g.font = font(40, 600);
    g.textAlign = "center";
    g.fillText(r.glyph, 130, y + 2);
    g.textAlign = "left";
    g.font = font(46, 500);
    g.fillText(r.t, 210, y);
    g.textAlign = "right";
    g.fillStyle = r.a.startsWith("+") ? "#2f7a00" : BRAND.ink;
    g.fillText(r.a, 920, y);
    g.textAlign = "left";
    g.fillStyle = "#ecece8";
    g.fillRect(210, y + 72, 710, 2);
  });
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, renderer, width, height, durationInFrames: D } = ctx;
  scene.background = new THREE.Color(BRAND.paper);
  studio(renderer, scene);
  camera.position.set(0, 0, CAM_Z);
  camera.lookAt(0, 0, 0);
  const rand = mulberry32(7);
  const halfH = u(540);
  const halfW = halfH * (width / height);

  const wash = peachWash(halfW * 2 * 1.5, halfH * 2 * 1.5, rand);
  wash.name = "peach-wash";
  wash.position.z = -3;
  scene.add(wash);

  /* ---------------------------------------------------------- the pill */
  const PW = 5.4;
  const PH = 1.56;
  const pillGeo = roundedPlane(PW, PH, PH / 2);
  const pillTex = canvasTexture(1080, 312, (g) => {
    const grad = g.createLinearGradient(0, 0, 1080, 312);
    grad.addColorStop(0, "#e2ff5c");
    grad.addColorStop(0.55, BRAND.lime);
    grad.addColorStop(1, "#b5e000");
    g.fillStyle = grad;
    g.fillRect(0, 0, 1080, 312);
    const shine = g.createLinearGradient(0, 0, 0, 312);
    shine.addColorStop(0, "rgba(255,255,255,0.55)");
    shine.addColorStop(0.45, "rgba(255,255,255,0)");
    shine.addColorStop(1, "rgba(80,110,0,0.18)");
    g.fillStyle = shine;
    g.fillRect(0, 0, 1080, 312);
    // Download arrow.
    g.strokeStyle = BRAND.ink;
    g.lineWidth = 16;
    g.lineCap = "round";
    g.lineJoin = "round";
    const ax = 250;
    g.beginPath();
    g.moveTo(ax, 92);
    g.lineTo(ax, 192);
    g.moveTo(ax - 42, 152);
    g.lineTo(ax, 194);
    g.lineTo(ax + 42, 152);
    g.moveTo(ax - 50, 232);
    g.lineTo(ax + 50, 232);
    g.stroke();
    g.fillStyle = BRAND.ink;
    g.font = `500 156px ${FONT}`;
    g.textBaseline = "middle";
    g.fillText("Deposit", 336, 166);
  });
  const pill = new THREE.Group();
  pill.name = "deposit-button";
  const pillFace = new THREE.Mesh(pillGeo, new THREE.MeshBasicMaterial({ map: pillTex, transparent: true }));
  pillFace.name = "deposit-button-face";
  const pillFlood = new THREE.Mesh(pillGeo, new THREE.MeshBasicMaterial({ color: BRAND.lime, transparent: true }));
  pillFlood.name = "deposit-button-flood";
  pillFlood.position.z = 0.01;
  pill.add(pillFace, pillFlood);
  const pulse = new THREE.Mesh(pillGeo, new THREE.MeshBasicMaterial({ color: BRAND.lime, transparent: true, depthWrite: false }));
  pulse.userData.pickable = false;
  pulse.position.z = -0.02;
  pill.add(pulse);
  const shadow = new THREE.Mesh(
    pillGeo,
    new THREE.MeshBasicMaterial({ color: "#ff9a5c", transparent: true, opacity: 0.25, depthWrite: false }),
  );
  shadow.userData.pickable = false;
  shadow.position.set(0, -0.22, -0.04);
  shadow.scale.set(0.94, 0.9, 1);
  pill.add(shadow);
  scene.add(pill);

  /* --------------------------------------------------------------- cursor */
  const cursorTex = canvasTexture(128, 128, (g) => {
    g.beginPath();
    g.moveTo(20, 12);
    g.lineTo(20, 104);
    g.lineTo(44, 82);
    g.lineTo(62, 118);
    g.lineTo(78, 110);
    g.lineTo(60, 76);
    g.lineTo(94, 74);
    g.closePath();
    g.lineJoin = "round";
    g.lineWidth = 10;
    g.strokeStyle = "#ffffff";
    g.stroke();
    g.fillStyle = BRAND.ink;
    g.fill();
  });
  const cursor = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.62),
    new THREE.MeshBasicMaterial({ map: cursorTex, transparent: true, depthWrite: false }),
  );
  cursor.name = "cursor";
  cursor.renderOrder = 50;
  scene.add(cursor);

  /* ---------------------------------------------------------------- phone */
  const SH = 13;
  const phone = makePhone(SH, CW, CH, drawHome);
  nameAs(phone.group, "phone");
  const phoneRest = new THREE.Vector3(0, 3.95 - SH / 2, -0.4);
  scene.add(phone.group);

  const balance = roller("$#,###.##", { size: 94, weight: 500, tracking: -0.02, color: BRAND.ink });
  nameAs(balance.group, "balance");
  balance.group.position.copy(phone.at(500, 600));
  balance.group.position.z += 0.01;
  phone.group.add(balance.group);

  const toast = new THREE.Group();
  toast.name = "deposit-toast";
  const toastBg = new THREE.Mesh(roundedPlane(1.5, 0.46, 0.23), new THREE.MeshBasicMaterial({ color: BRAND.lime, transparent: true }));
  toastBg.name = "deposit-toast-bg";
  const toastText = label("+$1,250", { size: 32, weight: 600, color: BRAND.ink });
  toastText.name = "deposit-toast-amount";
  toastText.position.z = 0.01;
  toast.add(toastBg, toastText);
  toast.position.copy(phone.at(680, 486));
  toast.position.z += 0.02;
  phone.group.add(toast);

  // Where the pill lands: slot 0 of the action row, in world space at rest.
  const slot = phone.at(202, 760).add(phoneRest);
  slot.z += 0.03;
  const slotScale = 280 / CW * phone.screenW / PW;

  /* ---------------------------------------------------------------- coins */
  const kinds: [CoinKind, CoinGlyph][] = [
    ["orange", "$"], ["silver", "€"], ["ink", "bolt"], ["lime", "$"], ["orange", "£"],
    ["blue", "$"], ["silver", "¥"], ["lime", "€"],
  ];
  const burst = kinds.map(([k, gl], i) => {
    const r = 0.45 + rand() * 0.45;
    const g = nameAs(makeCoin(r, k, gl), `burst-coin-${i + 1}`);
    const side = i % 2 === 0 ? -1 : 1;
    const to = new THREE.Vector3(
      side * (3.9 + rand() * 3.6),
      0.2 + rand() * 3.8,
      -1 + rand() * 3,
    );
    g.visible = false;
    scene.add(g);
    return { g, to, at: 74 + i * 2, spin: new THREE.Vector3(rand() * 4 - 2, rand() * 6 - 3, rand() * 2 - 1) };
  });
  const hero = nameAs(makeCoin(1.6, "lime", "bolt"), "hero-coin");
  hero.visible = false;
  scene.add(hero);
  const heroMid = new THREE.Vector3(-5.4, 1.4, 1.4);
  const origin = new THREE.Vector3(0, 3.2, -1.2);
  const tmp = new THREE.Vector3();

  return ({ frame, time }) => {
    /* Pill: contracts out of the flood, gets tapped, flies into the phone. */
    const shrink = interpolate(frame, [0, 13], [0, 1], Easing.easeOut);
    const tap = interpolate(frame, [33, 36, 43], [0, 1, 0], Easing.easeOut);
    const home = glide(frame, 46, 20);
    const drop = interpolate(frame, [104, 116], [0, 1], Easing.easeIn);
    pillFlood.material.opacity = 1 - interpolate(frame, [5, 13], [0, 1], Easing.easeOut);
    const baseScale = lerp(1, slotScale, home) * (1 - tap * 0.07) * (1 + Math.sin(time * 3) * 0.008 * (1 - home));
    pill.scale.set(lerp(5, 1, shrink) * baseScale, lerp(10, 1, shrink) * baseScale, 1);
    pill.position.set(lerp(0, slot.x, home), lerp(0.25, slot.y, home) - drop * 12, lerp(0.5, slot.z, home));
    pulse.material.opacity = interpolate(frame, [34, 50], [0.55, 0], Easing.easeOut) * (frame >= 34 ? 1 : 0);
    pulse.scale.setScalar(1 + interpolate(frame, [34, 50], [0, 0.4], Easing.easeOut));
    shadow.visible = home < 0.5;

    /* Cursor glides in, taps, leaves. */
    const cIn = glide(frame, 14, 18);
    const cOut = leave(frame, 44, 8);
    cursor.visible = frame >= 14 && cOut < 1;
    (cursor.material as THREE.MeshBasicMaterial).opacity = Math.min(1, cIn * 3) * (1 - cOut);
    cursor.position.set(lerp(5.2, 0.9, cIn) + cOut * 1.2, lerp(-4.2, -0.05, cIn) - cOut * 1.4, 1.2);
    cursor.scale.setScalar(1 - tap * 0.15);

    /* Phone rises underneath the pill, then drops away for the cut. */
    const rise = interpolate(frame, [42, 64], [0, 1], Easing.easeOut);
    phone.group.position.set(phoneRest.x, lerp(phoneRest.y - 16, phoneRest.y, rise) - drop * 12, phoneRest.z);
    phone.group.rotation.x = (1 - rise) * -0.25;
    phone.group.visible = rise > 0 && drop < 1;

    balance.roll("149320", "274320", interpolate(frame, [62, 94], [0, 1]), 1);
    const tIn = interpolate(frame, [92, 99, 103], [0, 1.1, 1], Easing.easeOut);
    toast.scale.setScalar(Math.max(0.001, tIn));
    toast.visible = tIn > 0.01;

    /* Coins burst out of the top of the phone, tumbling. */
    for (const c of burst) {
      const t = interpolate(frame, [c.at, c.at + 22], [0, 1], Easing.easeOut);
      const out = leave(frame, 106, 10);
      c.g.visible = frame >= c.at && out < 1;
      tmp.lerpVectors(origin, c.to, t);
      c.g.position.set(tmp.x * (1 + out * 0.8), tmp.y + out * 3 + Math.sin(time * 2 + c.at) * 0.05, tmp.z);
      c.g.rotation.set(c.spin.x * (t + time * 0.2), c.spin.y * (t + time * 0.2), c.spin.z * t);
      c.g.scale.setScalar(Math.max(0.001, Math.min(1, t * 2.5)) * (1 - out));
    }

    /* The hero coin bursts out with the rest, then swoops to centre, face on. */
    const hOut = interpolate(frame, [80, 100], [0, 1], Easing.easeOut);
    const hHome = glide(frame, 106, D - 106 - 2);
    hero.visible = frame >= 80;
    tmp.lerpVectors(origin, heroMid, hOut);
    hero.position.set(lerp(tmp.x, 0, hHome), lerp(tmp.y, 0, hHome), lerp(tmp.z, 0, hHome));
    hero.scale.setScalar(Math.max(0.001, lerp(Math.min(1, hOut * 2) * 0.42, 1, hHome)));
    hero.rotation.set(lerp(0.6 + time * 0.9, 0, hHome), lerp(-2.4 + time * 2.2, 0, hHome), lerp(0.3, 0, hHome));

    /* The warm wash drains to white so 03 opens on the same ground. */
    wash.material.opacity = 1 - interpolate(frame, [108, D - 6], [0, 1], Easing.easeInOut);
  };
}
