import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { ACTIVE as T } from "../components/copy";
import { atmosphere, coinRain, rayBurst, sheen } from "../components/fx";
import { backdrop } from "../components/backdrop";
import {
  Counter, HudLabel, PixelField, Polyline, Txt, disc, ease, glow, gridCells, groupOpacity, kf, pxCamera, px, py, ramp, typed,
} from "../components/kit";
import { L1_FILL, L2_FILL, mat, pill } from "../components/ui";


/**
 * 9.4–16.4s of the reference. The "You" pill draws on and starts earning;
 * L1 and L2 hang off it, commission packets climb back up, the camera pushes,
 * punches into the number, and pulls back for the explainer HUD.
 */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  pxCamera(ctx);
  const bg = backdrop(scene, { seed: 33, haze: 0.7, hazeLeft: 1 });

  const tree = new THREE.Group();
  tree.name = "referral-tree";
  scene.add(tree);

  const white = "#e9e9ea";
  const youToL1 = new Polyline([[px(279), py(413)], [px(279), py(566)], [px(407), py(566)]], 2.5, white, 1, "link-you-l1");
  const l1ToL2 = new Polyline([[px(562), py(650)], [px(562), py(801)], [px(690), py(801)]], 2.5, white, 1, "link-l1-l2");
  const green = new Polyline([[px(912), py(478)], [px(912), py(373)], [px(870), py(373)]], 2.5, C.yellow, 1, "link-l1-you");
  const teal = new Polyline([[px(1098), py(713)], [px(1098), py(280)], [px(866), py(280)]], 2.5, C.red, 1, "link-l2-you");
  for (const l of [youToL1, l1ToL2, green, teal]) tree.add(l.group);
  const joints = ([[279, 483], [666, 801]] as const).map(([x, y], i) => {
    const d = disc(8, "#ffffff", 1, `joint-${i + 1}`);
    d.position.set(px(x), py(y), 3);
    tree.add(d);
    return d;
  });

  const youGroup = new THREE.Group();
  youGroup.name = "you";
  youGroup.position.set(px(519), py(327), 1);
  const you = pill(718, 173, { fill: "#030404", stroke: "#f0f0f0", strokeW: 2.5, name: "pill-you", res: 3 });
  youGroup.add(you);
  const youTxt = new Txt(T.you, { size: 74, weight: 400, color: "#f2f2f2", res: 3, name: "you-label" }).at(247 - 519, 0, 1);
  youGroup.add(youTxt.mesh);
  const earnings = new Counter("$ -0123456789.", { size: 74, color: C.loss, maxLen: 14, anchor: "right", res: 3, name: "you-earnings" });
  earnings.group.position.set(810 - 519, 0, 1);
  youGroup.add(earnings.group);
  const numGlitch = new PixelField(gridCells(0, 0, 150, 60, 30), 29, { seed: 31, color: "#360a0b", hot: "#761518" });
  numGlitch.mesh.position.set(672 - 519, 0, 2);
  youGroup.add(numGlitch.mesh);
  tree.add(youGroup);

  const l1Group = new THREE.Group();
  l1Group.name = "l1";
  l1Group.position.set(px(407 + 295.5), py(563), 1);
  l1Group.add(pill(591, 173, { fill: L1_FILL, stroke: "#3b403d", strokeW: 1.5, name: "pill-l1", res: 3 }));
  l1Group.add(new Txt(T.l1, { size: 74, weight: 400, color: C.yellow, res: 3, name: "l1-label" }).at(485 - 702.5, 0, 1).mesh);
  const l2Group = new THREE.Group();
  l2Group.name = "l2";
  l2Group.position.set(px(690 + 231), py(800), 1);
  l2Group.add(pill(462, 173, { fill: L2_FILL, stroke: "#2f3a3c", strokeW: 1.5, name: "pill-l2", res: 3 }));
  l2Group.add(new Txt(T.l2, { size: 74, weight: 400, color: C.red, res: 3, name: "l2-label" }).at(765 - 921, 0, 1).mesh);
  tree.add(l1Group, l2Group);

  const mkPacket = (name: string, colour: string) => {
    const g = new THREE.Group();
    g.name = name;
    const core = disc(10, colour, 1, `${name}-core`);
    const halo = glow(95, colour, 0.6);
    const trail = glow(60, colour, 0.35);
    trail.scale.set(28, 120, 1);
    g.add(trail, halo, core);
    g.position.z = 3;
    tree.add(g);
    return { g, core, halo, trail };
  };
  const pGreen = mkPacket("packet-l1", C.yellow);
  const pTeal = mkPacket("packet-l2", "#e36266");

  const tag1 = new HudLabel(T.tag1, { size: 30, color: C.yellow, fill: "#2b0809", bracket: C.hudBracketYellow, padX: 8, padY: 4 });
  tag1.group.position.set(px(905), py(338), 4);
  const tag2 = new HudLabel(T.tag2, { size: 30, color: "#e77478", fill: "#2a0809", bracket: "#ce242a", padX: 10, padY: 4 });
  tag2.group.position.set(px(1128), py(637), 4);
  tree.add(tag1.group, tag2.group);

  // HUD
  const earnA = new HudLabel(T.earnA, { size: 64, weight: 400, color: C.yellow, fill: C.hudFill, bracket: C.hudBracketYellow, padX: 16, padY: 22 });
  earnA.group.position.set(px(1197), py(257), 5);
  const earnB = new HudLabel(T.earnB, { size: 44, weight: 400, color: "#e4e4e6", fill: null, bracket: C.hudBracketGrey, padX: 36, padY: 18 });
  earnB.group.position.set(px(1172), py(408), 5);
  scene.add(earnA.group, earnB.group);
  const earnBFull = earnB.set(earnB.txt.count, false);

  const v2 = new THREE.Vector2();
  const runPacket = (p: ReturnType<typeof mkPacket>, line: Polyline, R: number, start: number, period: number, on: number) => {
    const k = R < start ? 0 : ((R - start) / period) % 1;
    const kk = 1 - k; // reversed: the money drains from you down to them
    line.pointAt(kk, v2);
    p.g.position.set(v2.x, v2.y, 3);
    const b = on * Math.min(1, Math.sin(Math.min(1, k * 1.15) * Math.PI) * 1.6);
    p.g.visible = R >= start && on > 0;
    mat(p.core).opacity = b;
    mat(p.halo).opacity = 0.6 * b;
    mat(p.trail).opacity = 0.3 * b;
    // trail hangs behind the direction of travel (right along the top, then down)
    const vertical = kk < 0.8;
    p.trail.scale.set(vertical ? 26 : 110, vertical ? 110 : 26, 1);
    p.trail.position.set(vertical ? 0 : -45, vertical ? 45 : 0, -0.1);
  };

  const fx = atmosphere(ctx, { seed: 33, start: 9.4, hits: [10.05, 12.42] });
  // your balance leaks coins the whole time it counts down
  const drain = coinRain(tree, {
    seed: 34, count: 72, from: 10.3, to: 15.8, radius: 20, name: "draining-coins",
    emit: (_, r) => [px(610 + r() * 220), py(432), 30 + r() * 140],
    kick: (_, r) => [(r() - 0.35) * 240, -30 - r() * 100, 40 + r() * 200],
  });

  return ({ frame, time }) => {
    const R = time + 9.4;
    bg.update(R);
    fx.update(R, frame);
    drain.update(R, 1 - ramp(R, 16.05, 16.3));

    // ---- camera (world → screen = s·w + o, centred coords) ----
    const K: [number, number, number, number][] = [
      // t,    s,    ox,   oy
      [9.4, 1.18, 536, -235],
      [10.2, 1.18, 536, -235],
      [10.8, 1.2, 470, -200],
      [11.1, 1.28, 437, -165],
      [11.5, 1.29, 204, 147],
      [12.05, 1.29, 186, 168],
      [12.45, 2.6, -47, -424],
      [13.0, 2.6, 425, -526],
      [13.5, 2.1, 332, -367],
      [13.95, 1.0, 0, 0],
      [16.0, 1.02, 0, 0],
      [16.4, 1.18, 234, 99],
    ];
    const pick = (j: number) => kf(R, K.map((k) => [k[0], k[j]!] as [number, number]));
    const s = pick(1);
    tree.scale.set(s, s, 1);
    tree.position.set(pick(2), pick(3), 0);

    // ---- You pill ----
    const draw = ramp(R, 9.42, 10.05, ease.inOut);
    const youOut = ramp(R, 16.05, 16.3, ease.in);
    youGroup.scale.set(Math.max(0.02, draw), 1, 1);
    groupOpacity(you, ramp(R, 9.42, 9.55) * (1 - youOut));
    youTxt.mat.opacity = ramp(R, 9.6, 9.8) * (1 - youOut);
    const v = Math.max(0, R - 10.2) * 270.2;
    earnings.set(`${T.counterPrefix}-${v.toFixed(2)}`);
    earnings.opacity(ramp(R, 10.05, 10.2) * (1 - youOut));
    numGlitch.set(ramp(R, 12.35, 12.85, ease.linear) * 1.2, 0.9);

    // ---- L1 / L2 ----
    const l1In = ramp(R, 10.75, 11.05, ease.out);
    const l2In = ramp(R, 11.3, 11.6, ease.out);
    l1Group.position.x = px(702.5) + (1 - l1In) * 160;
    l2Group.position.x = px(921) + (1 - l2In) * 160;
    groupOpacity(l1Group, l1In);
    groupOpacity(l2Group, l2In);
    youToL1.draw(ramp(R, 10.7, 10.95, ease.inOut));
    l1ToL2.draw(ramp(R, 11.25, 11.5, ease.inOut));
    youToL1.mat.opacity = l1ToL2.mat.opacity = 1 - youOut;
    mat(joints[0]!).opacity = ramp(R, 10.9, 10.95) * (1 - youOut);
    mat(joints[1]!).opacity = ramp(R, 11.45, 11.5) * (1 - youOut);

    // ---- commission links + packets ----
    green.draw(ramp(R, 11.4, 11.65, ease.inOut));
    teal.draw(ramp(R, 12.15, 12.45, ease.inOut));
    green.mat.opacity = teal.mat.opacity = 1 - youOut;
    runPacket(pGreen, green, R, 11.6, 1.1, 1 - youOut);
    runPacket(pTeal, teal, R, 12.4, 1.6, 1 - youOut);
    const t1 = ramp(R, 11.55, 11.7);
    tag1.set(tag1.txt.count, false);
    tag1.opacity(t1 * (1 - youOut));
    tag2.set(tag2.txt.count, false);
    tag2.opacity(ramp(R, 12.35, 12.5) * (1 - youOut));

    // ---- explainer HUD ----
    const hudOut = ramp(R, 16.1, 16.35, ease.in);
    const a = typed(frame, (14.0 - 9.4) * 30, 34, earnA.txt.count);
    earnA.set(a.n, !a.done);
    earnA.opacity(ramp(R, 13.98, 14.02) * (1 - hudOut));
    const b = typed(frame, (14.3 - 9.4) * 30, 40, earnB.txt.count);
    earnB.set(b.n, false, Math.min(earnBFull, earnB.txt.widthAt(Math.floor(b.n)) + 72));
    earnB.opacity(ramp(R, 14.28, 14.32) * (1 - hudOut));
    earnA.group.position.x = px(1197) + hudOut * 140;
    earnB.group.position.x = px(1172) + hudOut * 140;
  };
}
