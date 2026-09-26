/**
 * 05 — Outro. Opens inside the lime the credit-line card flooded to. A
 * glossy 3D LightPay mark drops in, the wordmark slides out beside it, then
 * the line and the URL. Faint white rays and drifting coins keep it alive
 * while the lockup holds to the end of the film.
 */
import * as THREE from "three";
import { interpolate, Easing, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { BRAND } from "../components/brand";
import { CAM_Z, label, measure, u } from "../components/text";
import { enter, glide, lerp } from "../components/motion";
import { boltShape, makeCoin, nameAs, roundedRectShape, studio, sunburst, type CoinGlyph, type CoinKind } from "../components/props";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, renderer, width, height, durationInFrames: D } = ctx;
  scene.background = new THREE.Color(BRAND.lime);
  studio(renderer, scene);
  camera.position.set(0, 0, CAM_Z);
  camera.lookAt(0, 0, 0);

  const rays = sunburst(32, "#ffffff", 18, 0.05);
  rays.name = "sunburst";
  rays.position.z = -5;
  scene.add(rays);

  /* ------------------------------------------------------------ the mark */
  const M = 1.9;
  const mark = new THREE.Group();
  mark.name = "lightpay-mark";
  const tile = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRectShape(M, M, 0.5), {
      depth: 0.28, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 6, curveSegments: 20,
    }),
    new THREE.MeshPhysicalMaterial({ color: BRAND.ink, metalness: 0.3, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),
  );
  tile.geometry.translate(0, 0, -0.28);
  tile.name = "lightpay-mark-tile";
  const bolt = new THREE.Mesh(
    new THREE.ExtrudeGeometry(boltShape(M * 0.68), {
      depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3,
    }),
    new THREE.MeshPhysicalMaterial({
      color: BRAND.lime, emissive: BRAND.lime, emissiveIntensity: 0.35, roughness: 0.3, clearcoat: 1,
    }),
  );
  bolt.position.z = 0.1;
  bolt.name = "lightpay-mark-bolt";
  mark.add(tile, bolt);

  /* ------------------------------------------------------------- lockup */
  const wordStyle = { size: 150, weight: 600, tracking: -0.035, color: BRAND.ink };
  const word = label("LightPay", wordStyle);
  word.name = "wordmark";
  const wordW = u(measure("LightPay", wordStyle));
  const gap = 0.55;
  const total = M + gap + wordW;
  const lockup = new THREE.Group();
  lockup.name = "lockup";
  const markX = -total / 2 + M / 2;
  const wordX = -total / 2 + M + gap + wordW / 2;
  mark.position.set(markX, 0, 0);
  word.position.set(wordX, 0.02, 0);
  lockup.add(mark, word);
  // Fit narrow (portrait) frames.
  const halfW = u(540) * (width / height);
  lockup.scale.setScalar(Math.min(1, (halfW * 2 * 0.86) / total));
  lockup.position.y = 0.55;
  scene.add(lockup);

  const tagline = label("Money at the speed of light.", { size: 50, weight: 500, color: BRAND.olive });
  tagline.name = "tagline";
  tagline.position.set(0, -1.15, 0);
  const url = label(BRAND.url, { size: 34, weight: 500, tracking: 0.02, color: BRAND.ink });
  url.name = "url";
  url.position.set(0, -2.9, 0);
  const rule = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.018), new THREE.MeshBasicMaterial({ color: BRAND.olive, transparent: true }));
  rule.name = "url-rule";
  rule.position.set(0, -2.35, 0);
  scene.add(tagline, url, rule);

  /* ------------------------------------------------------- drifting coins */
  const drift: [CoinKind, CoinGlyph, number, number, number, number][] = [
    ["ink", "bolt", -6.8, 2.6, -2.5, 0.75],
    ["silver", "$", 6.9, 2.9, -3.5, 0.6],
    ["ink", "€", 7.4, -2.8, -1.8, 0.7],
    ["silver", "bolt", -7.2, -3.0, -3, 0.55],
    ["silver", "£", -3.6, 4.4, -5, 0.45],
    ["ink", "$", 3.8, -4.6, -4.5, 0.5],
  ];
  const coins = drift.map(([k, g, x, y, z, r], i) => {
    const coin = nameAs(makeCoin(r, k, g), `drift-coin-${i + 1}`);
    scene.add(coin);
    return { coin, x, y, z, i };
  });

  return ({ frame, time }) => {
    rays.material.opacity = interpolate(frame, [0, 20], [0, 0.4], Easing.easeOut);
    rays.rotation.z = frame * 0.004;
    rays.scale.setScalar(lerp(0.6, 1, enter(frame, 0, 24)));

    // Mark drops out of the lens, turning to face us, with a small overshoot.
    const m = interpolate(frame, [3, 14, 20], [0, 1.05, 1], Easing.easeOut);
    mark.visible = frame >= 3;
    mark.position.z = lerp(6, 0, Math.min(1, m));
    mark.scale.setScalar(Math.max(0.001, lerp(0.6, 1, m)));
    mark.rotation.set(
      (1 - Math.min(1, m)) * 0.6 + Math.sin(time * 1.3) * 0.06,
      (1 - Math.min(1, m)) * -1.6 + Math.sin(time * 1.1) * 0.18,
      0,
    );

    const w = enter(frame, 12, 12);
    word.material.opacity = w;
    word.position.x = wordX - (1 - w) * 0.7;

    const t = enter(frame, 24, 12);
    tagline.material.opacity = t;
    tagline.position.y = -1.15 - (1 - t) * u(50);
    const r = enter(frame, 32, 12);
    url.material.opacity = r;
    url.position.y = -2.9 - (1 - r) * u(40);
    rule.material.opacity = r;
    rule.scale.x = Math.max(0.001, r);

    for (const c of coins) {
      const a = enter(frame, 6 + c.i * 2, 16);
      c.coin.scale.setScalar(Math.max(0.001, a));
      c.coin.position.set(c.x * lerp(1.3, 1, a), c.y + time * 0.12 + Math.sin(time + c.i) * 0.1, c.z);
      c.coin.rotation.set(0.4 + time * 0.3 + c.i, time * 0.6 + c.i * 1.7, 0.2);
    }

    // One slow push over the whole hold.
    camera.position.z = CAM_Z - glide(frame, 0, D) * 0.7;
  };
}
