import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { ACTIVE as T } from "../components/copy";
import { atmosphere, coinRain, rayBurst, sheen } from "../components/fx";
import { backdrop } from "../components/backdrop";
import { BAR, buildDashboard } from "../components/dashboard";
import { commas, ease, pxCamera, ramp } from "../components/kit";
import { DASH_FLAT, DASH_TILT, applyPose, poseAt } from "../components/rig";
import { mat } from "../components/ui";

/**
 * 20.3–28.9s of the reference. The dashboard swings up out of the dark, the
 * view glides down it tilted in 3D while every number counts, then cuts to
 * flat close-ups: header, rewards, and the table stamping its type badges.
 */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  pxCamera(ctx);
  const bg = backdrop(scene, { seed: 55, haze: 0.2 });

  const pivot = new THREE.Group();
  pivot.name = "dashboard-rig";
  scene.add(pivot);
  const dash = buildDashboard(T);
  pivot.add(dash.group);

  // dark veil: the card swings in blank (matching scene 4's handoff) and its content surfaces
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(2396, 2868), new THREE.MeshBasicMaterial({ color: "#030303", transparent: true, depthWrite: false }));
  veil.name = "dashboard-veil";
  veil.userData.pickable = false;
  veil.position.set(2408 / 2, -2880 / 2, 0.2);
  veil.renderOrder = -1;
  dash.group.add(veil);

  const fx = atmosphere(ctx, { seed: 55, start: 20.3, hits: [21.27, 24.9, 26.62], drift: 0.5, embers: 200 });
  // glass highlight that sweeps the card on the swing-in and after the cut
  const glint = sheen(2408, 2880, "dashboard-glint");
  glint.mesh.position.set(2408 / 2, -2880 / 2, 0.6);
  glint.mesh.renderOrder = 5;
  dash.group.add(glint.mesh);

  const statics = [dash.group.children[0], dash.group.children[1]].map((m) => mat(m as THREE.Mesh));
  statics.push(dash.barMat);
  const CUT = 24.9;
  const rate = { u: 350, v: 19612347, r: 175 };
  const RW: [number, number][] = [[21.52, 1472], [21.63, 1071], [21.73, 287], [21.84, 114]]; // start, per-second

  return ({ time }) => {
    const R = time + 20.3;
    bg.update(R);
    fx.update(R, time * 30);
    const sweep = R < 24.9 ? ramp(R, 20.45, 21.5, ease.inOut) : ramp(R, 24.95, 25.9, ease.inOut);
    glint.set(-0.15 + sweep * 1.3, R < 24.9 ? 1 : 0.8);

    applyPose(pivot, dash.group, poseAt(R, R < CUT ? DASH_TILT : DASH_FLAT));

    // exit: the whole card fades out into the dark
    const vis = 1 - ramp(R, 28.6, 28.85, ease.in);
    for (const m of statics) m.opacity = vis;

    mat(veil).opacity = 1 - ramp(R, 20.32, 20.75, ease.inOut);
    veil.visible = R < 20.75;

    // live numbers
    const on = ramp(R, 20.62, 20.75);
    dash.unclaimed.set(`-${commas(Math.max(0, R - 20.73) * rate.u)}${T.dash.unit}`);
    dash.volume.set(`-$${commas(Math.max(0, R - 20.72) * rate.v)}`);
    dash.refs.set(String(Math.max(0, Math.round(1284 - Math.max(0, R - 20.8) * rate.r)))); // referrals leaving
    dash.unclaimed.opacity(on * vis);
    dash.volume.opacity(ramp(R, 20.68, 20.8) * vis);
    dash.refs.opacity(ramp(R, 20.75, 20.88) * vis);
    dash.rewards.forEach((c, i) => {
      const [t0, k] = RW[i]!;
      c.set(`-${commas(Math.max(0, R - t0) * k)}${T.dash.unit}`);
      c.opacity(ramp(R, t0 - 0.1, t0) * vis);
    });

    // stat cards flash red as the camera passes
    ([[21.25, 21.5], [21.3, 21.55], [21.48, 21.72]] as const).forEach(([a, b], i) => {
      mat(dash.statFlash[i]!).opacity = 0.92 * ramp(R, a, a + 0.04) * (1 - ramp(R, b - 0.08, b));
    });

    // the loss chart grows left→right (tallest first, all downhill); they regrow when the flat rewards shot arrives
    const grow = R < 25.8 ? ramp(R, 21.55, 22.6, ease.linear) : ramp(R, 25.8, 26.6, ease.linear);
    dash.bars.forEach((b, i) => {
      const k = ease.out(Math.min(1, Math.max(0, grow * (BAR.n + 4) - i) / 4));
      b.scale.y = Math.max(0.001, dash.barH(i) * k);
      b.visible = k > 0.01;
    });

    // type badges stamp in row by row: yellow flash, then settle to the red chip
    dash.badges.forEach((b, i) => {
      const t0 = 26.62 + i * 0.15;
      const shown = ramp(R, t0 + 0.1, t0 + 0.16);
      mat(b).opacity = shown * vis;
      b.visible = shown > 0.01;
      mat(dash.flashes[i]!).opacity = ramp(R, t0, t0 + 0.03) * (1 - ramp(R, t0 + 0.12, t0 + 0.17));
    });
    dash.group.position.x -= (1 - vis) * 60;
  };
}
