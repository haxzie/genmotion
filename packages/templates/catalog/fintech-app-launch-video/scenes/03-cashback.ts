/**
 * 03 — Cashback. The reference's prize burst: the hero coin from 02 sits
 * centre-frame, lime rays blast open behind it, it spins and a shower of
 * notes, coins and sparkles explodes outward. Then the chunky glossy
 * "2% cashback" slams in. Rays keep turning through the cut — they are the
 * handoff into 04's score gauge.
 */
import * as THREE from "three";
import { interpolate, Easing, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { BRAND } from "../components/brand";
import { CAM_Z, extrudedLabel, label, setGroupOpacity, u } from "../components/text";
import { enter, leave, lerp, mulberry32, RAY_SPIN, RAY_START } from "../components/motion";
import {
  glow, makeBill, makeCoin, nameAs, sparkleGeometry, studio, sunburst,
  type CoinGlyph, type CoinKind,
} from "../components/props";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, renderer } = ctx;
  scene.background = new THREE.Color(BRAND.paper);
  studio(renderer, scene);
  camera.position.set(0, 0, CAM_Z);
  camera.lookAt(0, 0, 0);
  const rand = mulberry32(31);

  const rays = sunburst(30);
  rays.name = "sunburst";
  rays.position.z = -4;
  const core = glow(9, "#ffffff", 1);
  core.name = "core-glow";
  core.position.z = -3.5;
  scene.add(rays, core);

  const hero = nameAs(makeCoin(1.6, "lime", "bolt"), "hero-coin");
  scene.add(hero);

  /* The prize shower. */
  type Prize = { o: THREE.Object3D; dir: THREE.Vector3; dist: number; spin: THREE.Vector3; at: number; s: number };
  const prizes: Prize[] = [];
  const add = (o: THREE.Object3D, i: number, n: number, dist: number, at: number) => {
    const a = (i / n) * Math.PI * 2 + rand() * 0.5;
    const dir = new THREE.Vector3(Math.cos(a) * 1.25, Math.sin(a) * 0.95, 0.2 + rand() * 0.6);
    o.visible = false;
    scene.add(o);
    prizes.push({ o, dir, dist, spin: new THREE.Vector3(rand() * 3 - 1.5, rand() * 3 - 1.5, rand() * 2 - 1), at, s: 1 });
  };
  for (let i = 0; i < 7; i++) add(nameAs(makeBill(1.5 + rand() * 0.5), `note-${i + 1}`), i, 7, 5.2 + rand() * 1.6, 8 + (i % 3));
  const kinds: [CoinKind, CoinGlyph][] = [
    ["orange", "$"], ["silver", "$"], ["ink", "bolt"], ["blue", "€"], ["lime", "$"], ["silver", "£"], ["orange", "¥"], ["ink", "$"],
  ];
  kinds.forEach(([k, g], i) => add(nameAs(makeCoin(0.35 + rand() * 0.35, k, g), `prize-coin-${i + 1}`), i + 0.5, 8, 3.6 + rand() * 2.8, 9 + (i % 4)));
  const sparkMat = new THREE.MeshBasicMaterial({ color: BRAND.limeDeep, side: THREE.DoubleSide });
  const inkSpark = new THREE.MeshBasicMaterial({ color: BRAND.ink, side: THREE.DoubleSide });
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(sparkleGeometry(0.16 + rand() * 0.18), i % 3 === 0 ? inkSpark : sparkMat);
    m.name = `sparkle-${i + 1}`;
    add(m, i + 0.25, 10, 2.8 + rand() * 3.6, 10 + (i % 5));
  }

  /* The headline. */
  const headline = extrudedLabel("2% cashback", {
    size: 190, weight: 600, tracking: -0.03,
    top: BRAND.greenTop, bottom: BRAND.greenBottom, side: BRAND.greenSide,
    depth: 30, layers: 16,
  });
  nameAs(headline, "headline-cashback");
  headline.position.y = -0.1;
  scene.add(headline);

  const sub = label("On every tap. Paid out instantly.", { size: 46, weight: 500, color: BRAND.ink });
  sub.name = "subline-every-tap";
  sub.position.set(0, -1.95, 0.2);
  const eyebrow = label("REWARDS", { size: 26, weight: 600, tracking: 0.22, color: BRAND.ink });
  eyebrow.name = "eyebrow-rewards";
  eyebrow.position.set(0, 1.62, 0.2);
  scene.add(sub, eyebrow);

  const plate = glow(15, "#ffffff", 0.95);
  plate.name = "headline-plate";
  plate.scale.set(1, 0.55, 1);
  plate.position.set(0, -0.4, -1);
  scene.add(plate);

  return ({ frame, time }) => {
    /* Rays blast open behind the coin and never stop turning. */
    const open = interpolate(frame, [0, 14], [0.25, 1], Easing.easeOut);
    rays.scale.setScalar(open);
    rays.rotation.z = RAY_START + frame * RAY_SPIN;
    rays.material.opacity = interpolate(frame, [0, 8], [0, 1], Easing.easeOut);
    core.scale.setScalar(1 + Math.sin(time * 2.2) * 0.04);

    /* Hero coin: a full spin as it bursts, then it lifts up and away. */
    const spin = interpolate(frame, [2, 30], [0, Math.PI * 2], Easing.easeOut);
    const lift = interpolate(frame, [30, 44], [0, 1], Easing.easeInOut);
    const gone = leave(frame, 40, 6);
    hero.rotation.set(Math.sin(time * 1.4) * 0.12 * lift, spin + lift * 0.5, 0);
    hero.position.set(lerp(0, 5.2, lift), lerp(0, 2.2, lift), lerp(0, -3, lift));
    hero.scale.setScalar(Math.max(0.001, (1 - interpolate(frame, [4, 7, 12], [0, 0.08, 0], Easing.easeOut)) * (1 - gone)));
    hero.visible = gone < 1;

    /* Prizes fly out, keep drifting, and clear before the cut. */
    for (const p of prizes) {
      const t = interpolate(frame, [p.at, p.at + 26], [0, 1], Easing.easeOut);
      const out = leave(frame, 96 + (p.at % 4), 9);
      p.o.visible = frame >= p.at && out < 1;
      const d = p.dist * t + (frame - p.at) * 0.006 + out * 5;
      p.o.position.set(p.dir.x * d, p.dir.y * d + Math.sin(time * 1.3 + p.at) * 0.06, -1.5 + p.dir.z * d * 0.6);
      p.o.rotation.set(p.spin.x * (t * 3 + time * 0.4), p.spin.y * (t * 3 + time * 0.4), p.spin.z * (t + time * 0.3));
      p.o.scale.setScalar(Math.max(0.001, Math.min(1, t * 3)));
    }

    /* The slam: from right in front of the lens down onto the page. */
    const slam = interpolate(frame, [42, 50, 56], [0, 1.04, 1], Easing.easeOut);
    const hOut = leave(frame, 100, 8);
    const hIn = interpolate(frame, [42, 47], [0, 1]);
    headline.visible = frame >= 42 && hOut < 1;
    headline.position.z = lerp(6, 0, Math.min(1, slam)) + hOut * -2;
    headline.scale.setScalar((0.7 + 0.3 * slam) * (1 + Math.max(0, frame - 56) * 0.0008) * (1 - hOut * 0.2));
    headline.rotation.set(-0.12 + Math.sin(time * 0.9) * 0.03, Math.sin(time * 0.7) * 0.1, 0);
    setGroupOpacity(headline, hIn * (1 - hOut));
    plate.material.opacity = enter(frame, 40, 10) * (1 - hOut);

    const eIn = enter(frame, 52, 10);
    const sIn = enter(frame, 55, 10);
    const sOut = leave(frame, 98, 7);
    eyebrow.material.opacity = eIn * (1 - sOut);
    eyebrow.position.y = 1.62 - (1 - eIn) * u(30);
    sub.material.opacity = sIn * (1 - sOut);
    sub.position.y = -1.95 - (1 - sIn) * u(50) - sOut * u(30);
    sub.visible = frame >= 55 && sOut < 1;
    eyebrow.visible = frame >= 52 && sOut < 1;
  };
}
