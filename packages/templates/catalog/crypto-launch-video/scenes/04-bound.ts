import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { ACTIVE as T } from "../components/copy";
import { atmosphere, coinRain, rayBurst, sheen } from "../components/fx";
import { backdrop } from "../components/backdrop";
import {
  HudLabel, Txt, canvasMesh, clamp01, ease, mulberry32, pxCamera, px, py, ramp, rect, roundRect, typed,
} from "../components/kit";
import { DASH_ENTRY, applyPose, poseAt, sk } from "../components/rig";
import { L1_FILL, L2_FILL, lockIcon, mat, pill } from "../components/ui";

/**
 * 16.4–20.3s of the reference. L1 / L2 multiply into a scrolling wall, the
 * view pulls back to a small grid, every row slides right and compresses into
 * one gradient block against a yellow bar: "Bound to you / for life". The
 * dashboard's edge swings up out of the dark as the handoff.
 */

// ---- the wall, in "small" pixel space (its size at the 18.3s pull-back) ----
const PH = 85;
const PW = { L1: 285, L2: 224 } as const;
type Kind = keyof typeof PW;
const ROW_Y = [268, 377, 480, 595, 700, 808];
const CORE: [number, Kind][][] = [
  [[200, "L1"], [505, "L2"], [825, "L1"], [1138, "L1"]],
  [[410, "L2"], [663, "L1"], [963, "L2"], [1208, "L2"], [1460, "L2"]],
  [[254, "L1"], [556, "L2"], [800, "L2"], [1040, "L1"], [1393, "L1"]],
  [[157, "L2"], [395, "L1"], [696, "L2"], [929, "L2"], [1164, "L1"], [1465, "L2"]],
  [[311, "L2"], [548, "L1"], [848, "L2"], [1087, "L2"], [1331, "L1"]],
  [[82, "L1"], [390, "L1"], [696, "L2"], [939, "L1"], [1255, "L2"]],
];
/** The two pills scene 3 ends on, matched here at the cut. */
const SEED = { row: 1, x: 663, row2: 2, x2: 800 };
const F = { x: 663 + PW.L1 / 2, y: ROW_Y[1]! };

// ---- the compressed block (final pose, 19.6s) ----
const BX = 300, BY = 377, BW = 915, BH = 356, RH = BH / 6;
const BLOCK_ROWS: { x0: number; green: boolean }[] = [
  { x0: 374, green: true }, { x0: 490, green: false }, { x0: 404, green: true },
  { x0: 351, green: false }, { x0: 435, green: true }, { x0: 310, green: false },
];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  pxCamera(ctx);
  const bg = backdrop(scene, { seed: 44, haze: 0.4 });

  // ------------------------------------------------------------ pill wall --
  const wall = new THREE.Group();
  wall.name = "referral-wall";
  scene.add(wall);

  const proto = {
    L1: pill(PW.L1, PH, { fill: L1_FILL, stroke: "#3b403d", strokeW: 1.2, res: 5 }),
    L2: pill(PW.L2, PH, { fill: L2_FILL, stroke: "#2f3a3c", strokeW: 1.2, res: 5 }),
  };
  const labelProto = {
    L1: new Txt(T.l1, { size: 36, weight: 400, color: C.yellow, res: 6 }),
    L2: new Txt(T.l2, { size: 36, weight: 400, color: C.red, res: 6 }),
  };

  interface P { row: number; x: number; kind: Kind; fill: THREE.Mesh; label: THREE.Mesh; appear: number; extra: boolean; g: THREE.Group }
  const pills: P[] = [];
  const rnd = mulberry32(404);
  const add = (row: number, x: number, kind: Kind, extra: boolean) => {
    const g = new THREE.Group();
    g.name = `wall-${kind.toLowerCase()}-${row + 1}-${pills.length + 1}`;
    const fill = new THREE.Mesh(proto[kind].geometry, mat(proto[kind]).clone());
    fill.name = `${g.name}-pill`;
    const label = new THREE.Mesh(labelProto[kind].mesh.geometry, labelProto[kind].mat.clone());
    label.name = `${g.name}-label`;
    label.position.set(-PW[kind] / 2 + 38, 0, 0.1);
    g.add(fill, label);
    wall.add(g);
    const isSeed = (row === SEED.row && x === SEED.x) || (row === SEED.row2 && x === SEED.x2);
    const cx = x + PW[kind] / 2;
    const dist = Math.hypot(cx - F.x, (ROW_Y[row]! - F.y) * 1.6);
    const appear = isSeed ? -1 : 16.42 + Math.min(0.85, dist / 1500) + rnd() * 0.2;
    pills.push({ row, x, kind, fill, label, appear, extra, g });
  };
  CORE.forEach((items, row) => {
    for (const [x, k] of items) add(row, x, k, false);
    // extend each row far past the frame for the close, scrolling wall
    let right = items[items.length - 1]![0] + PW[items[items.length - 1]![1]];
    while (right < 2900) {
      const k: Kind = rnd() > 0.5 ? "L1" : "L2";
      const x = right + 22 + Math.round(rnd() * 14);
      add(row, x, k, true);
      right = x + PW[k];
    }
    let left = items[0]![0];
    while (left > -1100) {
      const k: Kind = rnd() > 0.5 ? "L1" : "L2";
      const x = left - 22 - Math.round(rnd() * 14) - PW[k];
      add(row, x, k, true);
      left = x;
    }
  });

  // ------------------------------------------------------- compressed block --
  const block = new THREE.Group(); // origin = right edge of the block (the bar)
  block.name = "referral-block";
  scene.add(block);
  const brnd = mulberry32(4);
  const slices = BLOCK_ROWS.map((r, i) => {
    const m = canvasMesh(BW, RH, (g) => {
      const band = g.createLinearGradient(r.x0 - BX, 0, BW, 0);
      const c = r.green ? "214,168,40" : "176,32,38";
      band.addColorStop(0, `rgba(${c},0)`);
      band.addColorStop(0.55, `rgba(${c},0.45)`);
      band.addColorStop(1, `rgba(${c},0.95)`);
      g.fillStyle = band;
      g.fillRect(r.x0 - BX + 40, 0, BW - (r.x0 - BX) - 40, RH);
      let x = r.x0 - BX;
      while (x < BW - 30) {
        const w = 125 + Math.round(brnd() * 35);
        roundRect(g, x, 5, Math.min(w, BW - x - 8), RH - 10, (RH - 10) / 2);
        const a = 0.25 + ((x + 200) / BW) * 0.55;
        const rgb = r.green ? "236,194,64" : "214,58,62";
        const pg = g.createLinearGradient(x, 0, x + w, 0);
        pg.addColorStop(0, `rgba(${rgb},${a})`);
        pg.addColorStop(1, `rgba(${rgb},${a * 0.8})`);
        g.fillStyle = pg;
        g.fill();
        g.strokeStyle = "rgba(255,255,255,0.08)";
        g.lineWidth = 1;
        g.stroke();
        x += w + 10 + Math.round(brnd() * 8);
      }
    }, { res: 2, name: `block-row-${i + 1}`, anchor: "right" });
    m.position.set(0, py(BY + (i + 0.5) * RH), 0);
    block.add(m);
    return m;
  });

  const bar = rect(6, 1, C.yellow, 1, "block-edge");
  scene.add(bar);

  const lockBadge = new THREE.Group();
  lockBadge.name = "lock-badge";
  lockBadge.add(pill(60, 60, { r: 12, fill: "#020202", stroke: "#1a1a1a", strokeW: 1, name: "lock-badge-tile" }));
  const lk = lockIcon(40, "#ffffff", false, "lock-badge-icon", 2.2);
  lk.position.z = 0.1;
  lockBadge.add(lk);
  scene.add(lockBadge);

  // ------------------------------------------------------------------ HUD --
  const hudA = new HudLabel(T.boundA, { size: 66, weight: 400, color: C.yellow, fill: C.hudFill, bracket: C.hudBracketYellow, padX: 32, padY: 26 });
  const hudB = new HudLabel(T.boundB, { size: 66, weight: 400, color: "#ececee", fill: null, bracket: C.hudBracketGrey, padX: 24, padY: 18 });
  scene.add(hudA.group, hudB.group);
  const hudBFull = hudB.set(hudB.txt.count, false);

  // ----------------------------------------- handoff: the dashboard's edge --
  const edgePivot = new THREE.Group();
  edgePivot.name = "dashboard-edge";
  const edgeCard = canvasMesh(1240, 1480, (g) => {
    roundRect(g, 20, 20, 1200, 1440, 30);
    g.fillStyle = "#030303";
    g.shadowColor = "rgba(242,208,95,0.55)";
    g.shadowBlur = 20;
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = "rgba(244,209,92,0.9)";
    g.lineWidth = 1.5;
    g.stroke();
  }, { res: 1, name: "dashboard-edge-card" });
  edgeCard.scale.setScalar(2); // 2408 × 2880 D-space, like the real dashboard
  edgeCard.geometry.translate(600, -720, 0); // top-left corner of the card at the origin
  const edgeInner = new THREE.Group();
  edgeInner.add(edgeCard);
  edgePivot.add(edgeInner);
  edgeCard.renderOrder = 20;
  scene.add(edgePivot);

  const fx = atmosphere(ctx, { seed: 44, start: 16.4, hits: [18.2, 18.95] });

  return ({ frame, time }) => {
    const R = time + 16.4;
    bg.update(R);
    fx.update(R, frame);

    // --- wall framing: screen = S·(p − F) + O ---
    const S = sk(R, [[16.4, 2.4], [17.55, 1.85], [17.85, 1.0]]);
    const Ox = sk(R, [[16.4, 890], [17.55, 900], [17.85, F.x]]);
    const Oy = sk(R, [[16.4, 468], [17.55, 495], [17.85, F.y]]);
    wall.scale.set(S, S, 1);
    wall.position.set(px(Ox) - S * px(F.x), py(Oy) - S * py(F.y), 0);

    const drift = Math.sin(Math.PI * clamp01((R - 16.4) / 1.45));
    const extraO = 1 - ramp(R, 17.55, 17.8);

    // --- compression timing ---
    const barX = sk(R, [[18.1, 1725], [18.45, 1660], [18.9, 1215]]);
    const blockW = sk(R, [[18.3, 1440], [18.9, BW]]);
    block.position.set(px(barX), 0, 1);
    const barH = BH * ramp(R, 18.1, 18.35);
    bar.scale.y = Math.max(0.001, barH);
    bar.position.set(px(barX), py(BY) - barH / 2, 3);
    bar.visible = barH > 1;

    for (const p of pills) {
      const j = p.row;
      const k = ramp(R, 18.15 + j * 0.05, 18.45 + j * 0.05, ease.inOut);
      const off = (j % 2 ? -1 : 1) * 90 * drift;
      const cx = p.x + PW[p.kind] / 2 + off;
      const rowY = ROW_Y[j]!;
      const targetY = BY + (j + 0.5) * RH;
      // pills slide into the bar and flatten into their block row
      const x = cx + (barX - 60 - cx) * k * 0.85;
      const y = rowY + (targetY - rowY) * k;
      p.g.position.set(px(x), py(y), 0);
      p.g.scale.set(1 - 0.45 * k, 1 - 0.35 * k, 1);
      const shownLabel = p.appear < 0 ? 1 : ramp(R, p.appear, p.appear + 0.06);
      const shownFill = p.appear < 0 ? 1 : ramp(R, p.appear + 0.08, p.appear + 0.16);
      const o = (p.extra ? extraO : 1) * (1 - k);
      mat(p.fill).opacity = shownFill * o;
      mat(p.label).opacity = shownLabel * o;
      p.g.visible = o * shownLabel > 0.005;
    }

    slices.forEach((m, j) => {
      const k = ramp(R, 18.2 + j * 0.05, 18.5 + j * 0.05, ease.out);
      m.scale.x = Math.max(0.001, k * (blockW / BW));
      mat(m).opacity = k;
      m.visible = k > 0.005;
    });

    // the padlock slams down from the camera onto the block
    const slam = ramp(R, 18.8, 18.95, ease.in);
    lockBadge.position.set(px(barX - 73), py(675), 4 + (1 - slam) * 600);
    lockBadge.rotation.z = (1 - slam) * -0.5;
    lockBadge.scale.setScalar(1 + (1 - slam) * 0.6 + ramp(R, 18.95, 19.0) * (1 - ramp(R, 19.0, 19.15)) * 0.12);
    lockBadge.visible = R >= 18.8;

    // --- HUD: slides in with the block, types on ---
    const hx = sk(R, [[18.2, 1830], [18.75, 1273]]);
    const a = typed(frame, (18.3 - 16.4) * 30, 30, hudA.txt.count);
    hudA.set(a.n, !a.done);
    hudA.opacity(ramp(R, 18.25, 18.3));
    hudA.group.position.set(px(hx), py(484), 5);
    const b = typed(frame, (18.85 - 16.4) * 30, 30, hudB.txt.count);
    hudB.set(b.n, false, Math.min(hudBFull, hudB.txt.widthAt(Math.floor(b.n)) + 48));
    hudB.opacity(ramp(R, 18.83, 18.87));
    hudB.group.position.set(px(hx), py(620), 5);

    // --- handoff: the dashboard swings up over everything ---
    const edgeOn = R >= 19.9;
    edgePivot.visible = edgeOn;
    if (edgeOn) applyPose(edgePivot, edgeInner, poseAt(R, DASH_ENTRY));
  };
}
