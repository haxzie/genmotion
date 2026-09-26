/**
 * 01 — Hook. Kinetic type on white, one phrase per beat, the way the
 * reference cuts "Meme trading / is now / instant": "Sending money" →
 * "is now" → "instant" in electric blue, with glossy coins tumbling in
 * around it. Hands off by flooding the frame with LightPay lime.
 */
import * as THREE from "three";
import { interpolate, Easing, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { BRAND } from "../components/brand";
import { CAM_Z, label, u } from "../components/text";
import { enter, leave, pop, lerp } from "../components/motion";
import { makeCoin, nameAs, studio, type CoinKind, type CoinGlyph } from "../components/props";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, renderer, width, height, durationInFrames: D } = ctx;
  scene.background = new THREE.Color(BRAND.paper);
  studio(renderer, scene);
  camera.position.set(0, 0, CAM_Z);
  camera.lookAt(0, 0, 0);

  const aspect = width / height;
  const halfH = u(540);
  const halfW = halfH * aspect;
  // Portrait frames are narrow: shrink the type block to fit rather than crop it.
  const fit = Math.min(1, (halfW * 2 * 0.9) / u(1180));

  const type = new THREE.Group();
  type.scale.setScalar(fit);
  scene.add(type);

  const hero = { size: 150, weight: 600, tracking: -0.03, color: BRAND.ink };
  const sending = label("Sending", hero);
  sending.name = "headline-sending";
  const money = label("money", hero);
  money.name = "headline-money";
  const gap = u(34);
  const sw = sending.geometry.parameters.width - u(90);
  const mw = money.geometry.parameters.width - u(90);
  sending.position.x = -(sw + gap + mw) / 2 + sw / 2;
  money.position.x = (sw + gap + mw) / 2 - mw / 2;

  const isNow = label("is now", hero);
  isNow.name = "headline-is-now";

  const instant = label("instant", { size: 190, weight: 600, tracking: -0.035, color: BRAND.blue });
  instant.name = "headline-instant";
  type.add(sending, money, isNow, instant);

  // Coins that tumble in around "instant" — foreground ones big and close —
  // then get pulled into a spiral towards the centre until the lime flood.
  const coinSpecs: {
    name: string; kind: CoinKind; glyph: CoinGlyph; r: number;
    to: [number, number, number]; from: [number, number, number]; spin: [number, number]; at: number;
  }[] = [
    { name: "coin-lime", kind: "lime", glyph: "bolt", r: 1.25, to: [-5.6, -3.2, 1.2], from: [-10, -8, 3], spin: [0.5, -0.6], at: 48 },
    { name: "coin-silver", kind: "silver", glyph: "$", r: 0.62, to: [-2.9, 2.35, -0.5], from: [-4, 7, -1], spin: [0.35, 0.5], at: 50 },
    { name: "coin-ink", kind: "ink", glyph: "€", r: 1.05, to: [5.3, -2.9, 0.6], from: [10, -7, 2], spin: [-0.4, 0.7], at: 51 },
    { name: "coin-orange", kind: "orange", glyph: "£", r: 0.7, to: [4.6, 2.6, -1.2], from: [9, 6, -2], spin: [0.6, -0.3], at: 53 },
    { name: "coin-blue", kind: "blue", glyph: "$", r: 0.55, to: [-6.6, 1.1, -0.8], from: [-12, 2, -1], spin: [0.2, 0.9], at: 54 },
    { name: "coin-lime-2", kind: "lime", glyph: "$", r: 0.5, to: [0.4, 3.3, -1.6], from: [1, 8, -2], spin: [-0.7, 0.4], at: 55 },
    { name: "coin-silver-2", kind: "silver", glyph: "bolt", r: 0.9, to: [6.9, 0.2, 0.2], from: [13, 0.5, 1], spin: [0.3, -0.8], at: 56 },
    { name: "coin-ink-2", kind: "ink", glyph: "bolt", r: 0.48, to: [-1.2, -3.3, -1.0], from: [-2, -8, -1], spin: [0.8, 0.2], at: 57 },
    { name: "coin-orange-2", kind: "orange", glyph: "$", r: 0.95, to: [1.9, -3.4, 1.0], from: [4, -9, 2], spin: [-0.5, -0.5], at: 58 },
    { name: "coin-blue-2", kind: "blue", glyph: "€", r: 0.42, to: [-4.4, 3.4, -2.2], from: [-8, 8, -3], spin: [0.6, 0.6], at: 59 },
    { name: "coin-silver-3", kind: "silver", glyph: "¥", r: 0.45, to: [2.9, 3.7, -2.4], from: [5, 9, -3], spin: [-0.3, 0.7], at: 60 },
    { name: "coin-lime-3", kind: "lime", glyph: "€", r: 0.6, to: [7.4, 3.6, -2.0], from: [13, 7, -3], spin: [0.4, -0.4], at: 61 },
  ];
  const coins = coinSpecs.map((c) => {
    const g = nameAs(makeCoin(c.r, c.kind, c.glyph), c.name);
    g.visible = false;
    scene.add(g);
    return { g, c };
  });

  // The handoff: a lime flood that becomes the Deposit pill in scene 02.
  const flood = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ color: BRAND.lime }));
  flood.name = "lime-flood";
  flood.position.z = 2;
  flood.visible = false;
  scene.add(flood);
  const cover = Math.hypot(halfW, halfH) * ((CAM_Z - 2) / CAM_Z) * 1.05;

  const beat = (m: THREE.Mesh, i: number, inAt: number, outAt: number, baseY = 0) => {
    const mat = m.material as THREE.MeshBasicMaterial;
    return (frame: number) => {
      const a = enter(frame, inAt + i * 3, 9);
      const b = leave(frame, outAt, 6);
      mat.opacity = a * (1 - b);
      m.visible = mat.opacity > 0.001;
      m.position.y = baseY - (1 - a) * u(60) + b * u(40);
      const breathe = 1 + (frame - inAt) * 0.0009;
      m.scale.setScalar((0.96 + 0.04 * a) * breathe);
    };
  };
  const sendingBeat = beat(sending, 0, 0, 24);
  const moneyBeat = beat(money, 1, 0, 24);
  const isNowBeat = beat(isNow, 0, 27, 46);

  return ({ frame, time }) => {
    sendingBeat(frame);
    moneyBeat(frame);
    isNowBeat(frame);

    // "instant" lands with a little overshoot, then drifts bigger until it exits.
    const iIn = pop(frame, 48, 12, 1.06);
    const iOut = leave(frame, 78, 7);
    instant.material.opacity = Math.min(1, enter(frame, 48, 6)) * (1 - iOut);
    instant.visible = frame >= 48 && iOut < 1;
    instant.scale.setScalar(lerp(0.9, 1, iIn) * (1 + Math.max(0, frame - 60) * 0.0012) * (1 - iOut * 0.08));
    instant.position.y = (1 - Math.min(1, iIn)) * -u(50);

    // After landing, every coin is drawn into a tightening spiral towards
    // the centre — slow at first, accelerating into the lime flood.
    const pull = interpolate(frame, [62, D - 4], [0, 1], Easing.easeIn);
    const swirl = pull * 1.4;
    const cs = Math.cos(swirl);
    const sn = Math.sin(swirl);
    for (const { g, c } of coins) {
      const t = pop(frame, c.at, 14, 1.04);
      g.visible = frame >= c.at;
      const drift = Math.sin(time * 1.6 + c.r * 5) * 0.08 * (1 - pull);
      const bx = lerp(c.from[0], c.to[0], Math.min(t, 1.02));
      const by = lerp(c.from[1], c.to[1], Math.min(t, 1.02)) + drift;
      const k = 1 - pull;
      g.position.set(
        (bx * cs - by * sn) * k,
        (bx * sn + by * cs) * k,
        lerp(c.from[2], c.to[2], t) * k,
      );
      const spinUp = pull * pull * 9;
      g.rotation.set(
        c.spin[0] + (1 - t) * 2.4 + Math.sin(time * 1.1 + c.r) * 0.12 + spinUp * 0.6,
        c.spin[1] + (1 - t) * -3.2 + time * 0.35 + spinUp,
        (1 - t) * 1.2,
      );
      g.scale.setScalar(Math.max(0.001, t * lerp(1, 0.3, pull)));
    }

    // Lime floods out from the centre and fills the frame for the cut.
    const f = interpolate(frame, [81, D - 5], [0, 1], Easing.easeIn);
    flood.visible = f > 0;
    flood.scale.setScalar(Math.max(0.0001, f * cover));
  };
}
