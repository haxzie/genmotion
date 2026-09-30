import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, FONT_TECH } from "../components/brand";
import { ACTIVE as T } from "../components/copy";
import { atmosphere, coinRain, rayBurst, sheen } from "../components/fx";
import { backdrop } from "../components/backdrop";
import {
  Counter, HudLabel, PixelField, Polyline, canvasMesh, disc, ease, glow, gridCells, groupOpacity, kf, pxCamera, px, py, ramp, typed,
} from "../components/kit";
import { badge, orb, wireGlobe } from "../components/network";
import { mat, orbGradient } from "../components/ui";
import telegramUrl from "../assets/icon-telegram.svg";
import xUrl from "../assets/icon-x.svg";
import discordUrl from "../assets/icon-discord.svg";

/**
 * 4.5–9.4s of the reference. The Copy-link capsule collapses into the orb,
 * the link fans out to Telegram / X / Discord, packets flow back, the camera
 * tilts into 3D while earnings count up, then everything falls into the dark.
 */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  pxCamera(ctx);
  const bg = backdrop(scene, { seed: 22, haze: 0.45 });
  const loader = new THREE.TextureLoader(ctx.manager);
  const icon = (u: string) => {
    const t = loader.load(u);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  // outer (screen-plane spin) → tilt (3D) → spin-in (network rotation) → content
  const CX = 962, CY = 605;
  const outer = new THREE.Group();
  outer.name = "share-network";
  outer.position.set(px(CX), py(CY), 0);
  const tilt = new THREE.Group();
  const spin = new THREE.Group();
  outer.add(tilt);
  tilt.add(spin);
  scene.add(outer);
  const L = (x: number, y: number): [number, number] => [x - CX, CY - y];

  const o = orb(70);
  const halosBase = o.halos.map((h) => mat(h).opacity);
  spin.add(o.group);

  const spokes = [
    { name: "telegram", globe: L(955, 225), end: L(958, 355), badge: L(1054, 310), tex: telegramUrl, rot: [0.5, 0.2, 0.15] },
    { name: "x", globe: L(645, 840), end: L(760, 743), badge: L(755, 776), tex: xUrl, rot: [0.3, -0.4, -0.5] },
    { name: "discord", globe: L(1285, 840), end: L(1183, 755), badge: L(1190, 924), tex: discordUrl, rot: [0.35, 0.3, 0.4] },
  ].map((s, i) => {
    const g = wireGlobe(130, `globe-${s.name}`);
    g.group.position.set(s.globe[0], s.globe[1], -10);
    g.group.rotation.set(s.rot[0]!, s.rot[1]!, s.rot[2]!);
    spin.add(g.group);
    const dir = new THREE.Vector2(...s.end).normalize();
    const line = new Polyline([[dir.x * 88, dir.y * 88], s.end], 2, "#c9ccca", 0.85, `spoke-${s.name}`);
    spin.add(line.group);
    const d = disc(6, "#f2f2f2", 1, `spoke-${s.name}-end`);
    d.position.set(s.end[0], s.end[1], 1);
    spin.add(d);
    const b = badge(icon(s.tex), `badge-${s.name}`);
    b.position.set(s.badge[0], s.badge[1], 2);
    spin.add(b);
    // two packets per spoke, travelling in toward the orb
    const packets = [0, 1].map((k) => {
      const p = new THREE.Group();
      p.name = `packet-${s.name}-${k + 1}`;
      const core = disc(9, C.yellow, 1, `packet-${s.name}-${k + 1}-core`);
      core.scale.set(1.25, 1, 1);
      const halo = glow(70, C.yellow, 0.55);
      p.add(halo, core);
      p.position.z = 3;
      spin.add(p);
      return { p, core, halo, phase: k * 0.5 + i * 0.17 };
    });
    return { ...s, g, line, d, b, packets, from: new THREE.Vector2(...s.end), to: new THREE.Vector2(dir.x * 95, dir.y * 95), baseRot: new THREE.Euler(...(s.rot as [number, number, number])) };
  });

  // capsule from scene 1 (handoff), shrinking into the orb
  const capsule = canvasMesh(420, 200, (g) => {
    g.beginPath();
    g.roundRect(0, 0, 420, 200, 100);
    g.fillStyle = orbGradient(g, 420, 200);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = `500 44px ${FONT_TECH}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(T.copyBtn, 210, 100);
  }, { res: 2, name: "copy-link-capsule" });
  capsule.position.z = 20;
  scene.add(capsule);
  const blob = canvasMesh(220, 220, (g) => {
    g.beginPath();
    g.arc(110, 110, 110, 0, Math.PI * 2);
    g.fillStyle = orbGradient(g, 220, 220);
    g.fill();
  }, { res: 2, name: "orb-blob" });
  blob.position.z = 19;
  scene.add(blob);
  const pixels = new PixelField(gridCells(0, 0, 200, 200, 50), 48, { seed: 21, color: "#230607", hot: "#601114" });
  pixels.mesh.position.set(px(962), py(590), -5);
  scene.add(pixels.mesh);

  // HUD
  const hud = new HudLabel(
    [{ text: T.shareA, color: "#e4e4e6" }, { text: T.shareB, color: C.yellow }],
    { size: 58, weight: 300, fill: null, bracket: C.hudBracketGrey, padX: 42, padY: 26 },
  );
  hud.group.position.set(px(1190), py(203), 5);
  scene.add(hud.group);
  const hudFullW = hud.set(hud.txt.count, false);

  // earnings box (appears with the tilt)
  const earn = new THREE.Group();
  earn.name = "earnings-box";
  earn.position.set(px(218), py(325), 8);
  scene.add(earn);
  const earnBox = new HudLabel("$ -0000.00 ↓", { size: 88, color: C.loss, fill: "#30080a", bracket: C.hudBracketYellow, padX: 36, padY: 14 });
  earnBox.txt.mesh.visible = false;
  earnBox.set(0, false, 580);
  // only the TL + BR brackets, like the reference
  earnBox.corners[1]!.visible = false;
  earnBox.corners[3]!.visible = false;
  earn.add(earnBox.group);
  const amount = new Counter("$ -0123456789.", { size: 88, color: C.loss, maxLen: 10, name: "earnings-amount", res: 2 });
  amount.group.position.set(36, 0, 0.3);
  earn.add(amount.group);
  // a down arrow: the number only goes one way
  const arrow = canvasMesh(50, 70, (g) => {
    g.translate(0, 70);
    g.scale(1, -1);
    g.strokeStyle = C.loss;
    g.lineWidth = 5;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(25, 66);
    g.lineTo(25, 6);
    g.moveTo(8, 24);
    g.lineTo(25, 6);
    g.lineTo(42, 24);
    g.stroke();
  }, { res: 2, name: "earnings-arrow" });
  arrow.position.set(457, 2, 0.3);
  earn.add(arrow);
  const dash = new THREE.Group();
  dash.userData.pickable = false;
  for (let x = 585; x < 845; x += 26) {
    const seg = new Polyline([[x, -12], [x + 14, -12]], 2, "#6d706f", 0.8);
    dash.add(seg.group);
  }
  for (let y = -12; y > -190; y -= 26) {
    const seg = new Polyline([[845, y], [845, y - 14]], 2, "#6d706f", 0.8);
    dash.add(seg.group);
  }
  earn.add(dash);

  const v2 = new THREE.Vector2();

  const fx = atmosphere(ctx, { seed: 22, start: 4.5, hits: [4.8, 7.02] });
  // money pours out of the bottom of the losses box
  const leak = coinRain(scene, {
    seed: 23, count: 46, from: 7.1, to: 9.0, radius: 22, name: "leaking-coins",
    emit: (_, r) => [px(250 + r() * 460), py(425), 30 + r() * 160],
    kick: (_, r) => [(r() - 0.4) * 220, -40 - r() * 120, 60 + r() * 240],
  });

  return ({ frame, time }) => {
    const R = time + 4.5; // reference clock
    bg.update(R);
    fx.update(R, frame);
    leak.update(R, 1 - ramp(R, 9.1, 9.3));

    // ---- capsule → blob → orb ----
    const shrink = ramp(R, 4.5, 4.78, ease.inOut);
    capsule.visible = R < 4.8;
    capsule.rotation.z = -0.42 * (1 - shrink);
    capsule.position.set(8 * (1 - shrink) + 2 * shrink, py(560) * shrink, 20);
    capsule.scale.set(THREE.MathUtils.lerp(1, 0.5, shrink), THREE.MathUtils.lerp(1, 0.95, shrink), 1);
    mat(capsule).opacity = 1 - ramp(R, 4.65, 4.8);
    const blobT = ramp(R, 4.62, 5.0, ease.inOut);
    blob.visible = R >= 4.62 && R < 5.02;
    blob.position.set(px(962), py(kf(R, [[4.62, 560], [5.0, 605]])), 19);
    blob.scale.setScalar(THREE.MathUtils.lerp(0.95, 140 / 220, blobT));
    blob.rotation.z = -0.4 * (1 - blobT);
    mat(blob).opacity = ramp(R, 4.62, 4.7);
    pixels.set(ramp(R, 4.55, 5.25, ease.linear) * 1.25, 0.45);

    // ---- network entrance: spin in from +100°, grow out ----
    const grow = ramp(R, 4.95, 5.7, ease.out);
    spin.rotation.z = THREE.MathUtils.degToRad(100) * (1 - ramp(R, 4.95, 5.85, ease.out));
    o.group.visible = R >= 4.98;
    for (const s of spokes) {
      s.g.group.position.set(s.globe[0] * (0.3 + 0.7 * grow), s.globe[1] * (0.3 + 0.7 * grow), -10);
      s.g.group.scale.setScalar(Math.max(0.001, 0.2 + 0.8 * grow));
      s.g.group.rotation.set(s.baseRot.x, s.baseRot.y + R * 0.35, s.baseRot.z);
      s.line.draw(ramp(R, 4.98, 5.4));
      s.d.visible = R > 5.3;
      s.b.scale.setScalar(Math.max(0.001, ramp(R, 5.2, 5.45, ease.outBack) * (1 - ramp(R, 6.8, 7.1, ease.in))));
      s.b.position.set(s.badge[0] * (0.3 + 0.7 * grow), s.badge[1] * (0.3 + 0.7 * grow), 2);
      groupOpacity(s.g.group, ramp(R, 4.98, 5.2));
      // packets
      s.packets.forEach((pk) => {
        const cyc = (R - 5.3) / 1.0 + pk.phase;
        const k = cyc - Math.floor(cyc);
        const on = R > 5.3 && R < 9.1;
        pk.p.visible = on;
        s.line.pointAt(k, v2); // money leaves the orb, never arrives
        pk.p.position.set(v2.x, v2.y, 3);
        const bright = Math.sin(k * Math.PI);
        mat(pk.core).opacity = bright;
        mat(pk.halo).opacity = 0.55 * bright;
        pk.core.rotation.z = Math.atan2(v2.y, v2.x);
      });
    }
    o.group.scale.setScalar(ramp(R, 4.98, 5.25, ease.outBack) * 0.999 + 0.001);

    // ---- heartbeat: the halos thump lub-dub (~75 bpm), rippling outward ----
    const beat = (t: number) => {
      const ph = (((t - 5.3) / 0.8) % 1 + 1) % 1; // one beat per 0.8s
      const bump = (c: number, w: number) => Math.exp(-Math.pow((ph - c) / w, 2));
      return bump(0.06, 0.05) + 0.6 * bump(0.26, 0.05); // lub … dub
    };
    const beatOn = ramp(R, 5.25, 5.5);
    o.halos.forEach((h, i) => {
      const j = o.halos.length - 1 - i; // halos are stored outermost-first; j = 0 is the inner ring
      const b = beat(R - j * 0.05) * beatOn; // outer rings answer a beat later
      h.scale.setScalar(1 + b * (0.07 + j * 0.05));
      mat(h).opacity = halosBase[i]! * (1 + b * 0.35);
    });
    o.edge.scale.setScalar(1 + beat(R - 0.12) * beatOn * 0.1);

    // ---- the 3D tilt (6.8 → 7.7) and push-in ----
    const tt = ramp(R, 6.75, 7.75, ease.inOut);
    spin.rotation.z += THREE.MathUtils.degToRad(45) * tt;
    tilt.rotation.x = -0.78 * tt;
    outer.rotation.z = -0.2 * tt;
    const push = kf(R, [[6.75, 1], [7.75, 2.45], [9.0, 2.6], [9.4, 3.3]]);
    outer.scale.setScalar(push);
    outer.position.set(px(kf(R, [[6.75, CX], [7.75, 1050], [9.0, 1060], [9.4, 1500]])), py(kf(R, [[6.75, CY], [7.75, 512], [9.0, 500], [9.4, 160]])), 0);
    // fall away into the dark
    const out = ramp(R, 9.02, 9.3, ease.in);
    if (out > 0) groupOpacity(outer, 1 - out);

    // ---- HUD ----
    const hudT = typed(frame, 0.1 * 30, 19, hud.txt.count);
    hud.set(hudT.n, false, Math.min(hudFullW, hud.txt.widthAt(Math.floor(hudT.n)) + 84));
    hud.opacity(ramp(R, 4.58, 4.65) * (1 - ramp(R, 9.0, 9.12, ease.in)));

    // ---- earnings ----
    const eIn = ramp(R, 6.95, 7.2, ease.out);
    const eOut = ramp(R, 9.1, 9.25, ease.in);
    earn.visible = eIn > 0 && eOut < 1;
    earnBox.opacity(eIn * (1 - eOut));
    const v = 1284 * ramp(R, 7.05, 8.75, (x) => 1 - Math.pow(1 - x, 1.6));
    amount.set(`$ -${v.toFixed(2)}`);
    amount.opacity(eIn * (1 - eOut));
    mat(arrow).opacity = eIn * (1 - eOut);
    arrow.position.x = 36 + amount.width + 50;
    groupOpacity(dash, ramp(R, 7.3, 7.6) * (1 - eOut));
    earn.position.y = py(325) + (1 - eIn) * -30;
  };
}
