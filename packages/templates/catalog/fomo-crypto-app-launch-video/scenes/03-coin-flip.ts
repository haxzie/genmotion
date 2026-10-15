/**
 * 180–208 · the coin flip
 *
 * The fomo coin, lying face-up at the bottom of the frame, tips back past
 * edge-on, falls forward onto its face and swells to fill the frame while it
 * turns, over the concentric "sonar" discs (which shrink as the camera closes in).
 *
 * Per-frame ellipse fits of the coin face (centre, long-axis angle, diameter,
 * minor/major ratio → tilt) and of the eye line drive an orthographic coin.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { orthoStage, X, Y } from "../components/stage";
import { sonar } from "../components/background";
import { coin, pose, tint, orient } from "../components/logo";
import { curve, type Key } from "../components/keys";

const G = 180;
const col = (rows: number[][], i: number) => curve(rows.map((r) => [r[0] - G, r[i]] as Key));

// [frame, cx, cy, diameter, tilt θ, major axis°, eye line°]
const C3 = [
  [180, 600, 702, 285, 80, -4, 4], [181, 597, 694, 290, 84, -4, 4], [182, 618, 668, 300, 93, 5, 8],
  [183, 593.3, 637.5, 333, 135, 19.6, 18], [184, 598.4, 581.3, 410, 169, 16, 22], [185, 602.5, 539.5, 469, 138, 11.8, 26],
  [186, 611.3, 496.4, 516, 110, 21.7, 29], [187, 596, 500, 560, 90, 30, 31], [188, 583.9, 503.0, 595, 73, 36.9, 31.5],
  [189, 590.8, 471.6, 627, 60, 45.5, 30.8], [190, 597.9, 446.2, 654, 49, 55.7, 29.6], [191, 604.3, 426.1, 677, 42, 67.7, 26],
  [192, 609.4, 410.2, 695, 37, 80.9, 22], [193, 613.4, 397.4, 712, 35, 94.5, 17.5], [194, 616.4, 386.6, 726, 34.4, 106.9, 13],
  [195, 619.6, 377.6, 738, 35.2, 117.4, 9.5], [196, 624.1, 370.0, 748, 36.5, 125.8, 6.7], [197, 630.3, 364.0, 757, 37.7, 132.4, 5],
  [198, 638.6, 359.4, 766, 38.7, 137.7, 3.5], [199, 649.2, 356.4, 773, 39.4, 142, 3], [200, 662.6, 354.9, 779, 39.5, 145.5, 2.5],
  [201, 679.1, 355.1, 785, 39.1, 148.6, 2.6], [202, 699.2, 356.9, 791, 38, 151.4, 2.9], [203, 723.5, 360.6, 796, 36.2, 154.1, 3.5],
  [204, 752.4, 365.9, 802, 33.8, 157.2, 4.1], [205, 787.0, 373.0, 808, 30.6, 161.1, 4.8], [206, 828.5, 381.6, 815, 26.9, 166.9, 5.4],
  [207, 878.6, 391.5, 825, 23.2, 176.1, 5.5], [208, 939.8, 403.1, 837, 20.1, 190.4, 5.5],
];
const cx = col(C3, 1);
const cy = col(C3, 2);
const dia = col(C3, 3);
const tilt = col(C3, 4);
const major = col(C3, 5);
const eyes = col(C3, 6);

// inner sonar disc: [frame, cx, cy, r]
const RINGS = [
  [180, 658, 101, 630], [182, 658, 112, 600], [184, 658, 115, 588], [186, 657, 120, 579], [188, 656, 112, 575],
  [190, 655, 113, 570], [192, 655, 112, 566], [194, 655, 115, 560], [196, 655, 115, 556], [198, 654, 118, 551],
  [200, 654, 118, 548], [202, 655, 115, 547], [208, 655, 117, 543],
];
const rx = col(RINGS, 1);
const ry = col(RINGS, 2);
const rr = col(RINGS, 3);

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  orthoStage(ctx);
  const bg = sonar();
  scene.add(bg);

  const axis = new THREE.Group();
  axis.name = "fomo-coin-axis";
  const c = coin(0.28, "fomo-coin");
  tint(c, { eyes: "#ebecfe", wall: "#e6e8fc" });
  axis.add(c);
  scene.add(axis);

  return ({ frame: f }) => {
    const u = bg.material.uniforms;
    const r = rr(f);
    (u.uCenter.value as THREE.Vector2).set(rx(f), ry(f));
    (u.uRadius.value as THREE.Vector4).set(r, r * 1.314, r * 1.62, 4000);
    (u.uAlpha.value as THREE.Vector4).set(1, 0.42, 0.17, 0);

    axis.position.set(X(cx(f)), Y(cy(f)), 0);
    c.scale.setScalar(dia(f) / 2);
    orient(axis, c, major(f), tilt(f), eyes(f), 1);
    pose(c, { blink: 0, lookX: -0.36, lookY: 0.0, skew: -0.42, handle: 0 });
  };
}
