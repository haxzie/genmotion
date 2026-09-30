import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { ACTIVE as T } from "../components/copy";
import { atmosphere, coinRain, rayBurst, sheen } from "../components/fx";
import { backdrop } from "../components/backdrop";
import {
  HudLabel, PixelField, Polyline, Txt, canvasMesh, disc, ease, flicker, glow, kf, pxCamera, px, py, ramp, rect, ringCells, typed,
} from "../components/kit";
import { copyButton, handCursor, lockIcon, mat, orbGradient, pill } from "../components/ui";

/**
 * 0.0–4.5s of the reference. URL bar + lock, REFERRALS HUD, the lock unlocks
 * and collapses into the caret, the code types, "Copy link" is clicked and
 * flies off as a capsule (handoff to scene 2).
 */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  pxCamera(ctx);
  const bg = backdrop(scene, { seed: 11, haze: 0.5 });

  // ---- world (zoomable) -------------------------------------------------
  const stage = new THREE.Group();
  stage.name = "stage";
  scene.add(stage);

  const lineCol = "#262b29";
  const grid = new THREE.Group();
  grid.name = "grid-lines";
  grid.userData.pickable = false;
  const hTop = new Polyline([[-2400, 0], [2400, 0]], 1.5, lineCol, 1);
  const hBot = new Polyline([[-2400, 0], [2400, 0]], 1.5, lineCol, 1);
  const vA = new Polyline([[0, -1400], [0, 1400]], 1.5, lineCol, 1);
  const vB = new Polyline([[0, -1400], [0, 1400]], 1.5, lineCol, 1);
  grid.add(hTop.group, hBot.group, vA.group, vB.group);
  const dots = [0, 1, 2, 3].map(() => {
    const d = disc(6, "#d6d8d7");
    d.userData.pickable = false;
    grid.add(d);
    return d;
  });
  stage.add(grid);

  // focus frame around the Copy link button (3.5s+)
  const focus = new THREE.Group();
  focus.userData.pickable = false;
  const BTN_X = 1014;
  const fl = [
    new Polyline([[px(-600), py(540 - 185)], [px(2600), py(540 - 185)]], 1.5, lineCol, 1),
    new Polyline([[px(-600), py(540 + 185)], [px(2600), py(540 + 185)]], 1.5, lineCol, 1),
    new Polyline([[px(BTN_X - 237), py(-600)], [px(BTN_X - 237), py(1700)]], 1.5, lineCol, 1),
    new Polyline([[px(BTN_X + 237), py(-600)], [px(BTN_X + 237), py(1700)]], 1.5, lineCol, 1),
  ];
  fl.forEach((l) => focus.add(l.group));
  const fdots = [[-237, -185], [237, -185], [-237, 185], [237, 185]].map(([dx, dy]) => {
    const d = disc(5, "#d6d8d7");
    d.position.set(px(BTN_X + dx!), py(540 + dy!), 0.2);
    focus.add(d);
    return d;
  });
  stage.add(focus);

  // URL bar
  const bar = pill(1500, 158, { r: 58, fill: "#050706", stroke: "#4a4d4c", strokeW: 2, name: "url-bar", anchor: "right" });
  bar.position.set(px(850) + 4, py(540), 0);
  stage.add(bar);

  const url = new Txt(T.urlBase, { size: 46, weight: 300, color: "#8e918f", tracking: -0.5, res: 3, name: "url-text" });
  url.at(px(24), py(540), 0.5);
  stage.add(url.mesh);
  const urlEnd = px(24) + url.inkW;

  const code = new Txt(T.urlCode, { size: 50, weight: 500, color: C.yellow, res: 3, name: "url-code" });
  // gradient code: redraw colour via a second pass is overkill — tint with a teal overlay mesh instead
  code.at(urlEnd + 10, py(540) + 1, 0.6);
  stage.add(code.mesh);
  const codeTeal = new Txt(T.urlCode, { size: 50, weight: 500, color: C.red, res: 3, name: "url-code-tint" });
  codeTeal.at(urlEnd + 10, py(540) + 1, 0.7);
  codeTeal.mat.opacity = 0.0;
  stage.add(codeTeal.mesh);

  const caret = canvasMesh(12, 76, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 76);
    gr.addColorStop(0, "#f2d05f");
    gr.addColorStop(1, "#d62228");
    g.fillStyle = gr;
    g.beginPath();
    g.roundRect(0, 0, 12, 76, 6);
    g.fill();
  }, { res: 3, name: "text-caret" });
  caret.position.z = 0.8;
  stage.add(caret);

  // lock button
  const LOCK_X = 944;
  const lockGroup = new THREE.Group();
  lockGroup.name = "lock-button";
  stage.add(lockGroup);
  const frames = ([[250, "#1c2521"], [212, "#222c27"]] as const).map(([s, c]) => {
    const f = pill(s, s, { r: s * 0.22, stroke: c, strokeW: 2, name: `lock-frame-${s}` });
    f.userData.pickable = false;
    lockGroup.add(f);
    return f;
  });
  const faceDark = pill(157, 157, { r: 34, fill: "#070908", stroke: "#3f4442", strokeW: 2, name: "lock-face-dark" });
  const faceGreen = pill(157, 157, { r: 34, fill: [[0, "#591012"], [1, "#daab12"]], fillDir: "y", stroke: "#a9850e", strokeW: 1.5, name: "lock-face-green" });
  const faceTeal = canvasMesh(165, 165, (g) => {
    g.translate(4, 4);
    g.beginPath();
    g.roundRect(0, 0, 157, 157, 34);
    g.fillStyle = orbGradient(g, 157, 157);
    g.fill();
  }, { res: 2, name: "lock-face-teal" });
  const lockClosed = lockIcon(90, "#8b8f8d", false, "lock-icon-closed", 4);
  const lockOpen = lockIcon(90, C.yellow, true, "lock-icon-open", 4);
  const lockOpenTeal = lockIcon(90, "#ffd752", true, "lock-icon-open-light", 4);
  for (const m of [faceDark, faceGreen, faceTeal]) lockGroup.add(m);
  for (const m of [lockClosed, lockOpen, lockOpenTeal]) {
    m.position.z = 0.3;
    lockGroup.add(m);
  }
  const lockPixels = new PixelField(ringCells(0, 0, 105, 105, 52, 2), 50, { seed: 5, color: "#34090b", hot: "#9c7b0d" });
  lockPixels.mesh.position.z = -0.5;
  lockGroup.add(lockPixels.mesh);

  // Copy link button (world), then capsule (screen) for the fly-off
  const btnGroup = new THREE.Group();
  btnGroup.name = "copy-link";
  btnGroup.position.set(px(BTN_X), py(540), 1);
  stage.add(btnGroup);
  const btnGlow = glow(400, "#eec231", 0);
  btnGroup.add(btnGlow);
  const btn = copyButton(250, 155, T.copyBtn);
  btn.position.z = 0.5;
  btnGroup.add(btn);
  const btnPixels = new PixelField(ringCells(0, 0, 150, 110, 40, 2), 38, { seed: 9, color: "#2c0809", hot: "#8f710c" });
  btnPixels.mesh.position.z = -0.5;
  btnGroup.add(btnPixels.mesh);

  const capsule = canvasMesh(420, 200, (g) => {
    g.beginPath();
    g.roundRect(0, 0, 420, 200, 100);
    g.fillStyle = orbGradient(g, 420, 200);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = `500 44px ${'"Bai Jamjuree", "SF Pro Display", system-ui, sans-serif'}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(T.copyBtn, 210, 100);
  }, { res: 2, name: "copy-link-capsule" });
  capsule.position.z = 20;
  scene.add(capsule);

  const hand = handCursor(64);
  hand.position.z = 30;
  scene.add(hand);

  // ---- HUD (screen-locked) ----------------------------------------------
  const hud = new HudLabel(T.hudTitle, { size: 93, weight: 300, color: C.yellow, fill: C.hudFill, bracket: C.hudBracketYellow, padX: 12, padY: 8, res: 2 });
  hud.group.position.set(px(1240), py(762), 5);
  scene.add(hud.group);
  const sub = new HudLabel(T.hudSub, { size: 44, weight: 400, color: "#e4e4e6", fill: null, bracket: C.hudBracketGrey, padX: 30, padY: 12, res: 2 });
  sub.group.position.set(px(1295), py(898), 5);
  scene.add(sub.group);
  const subFullW = sub.set(sub.txt.count, false);

  const flash = rect(1920, 1080, "#490d0f", 0, "unlock-flash");
  flash.position.z = -20;
  flash.userData.pickable = false;
  scene.add(flash);
  const fade = rect(1920, 1080, "#000000", 1, "fade-from-black");
  fade.position.z = 200;
  fade.userData.pickable = false;
  scene.add(fade);

  const show = (m: THREE.Mesh, o: number) => {
    mat(m).opacity = o;
    m.visible = o > 0.001;
  };

  // cinematic layer + the click that detonates the wallet
  const fx = atmosphere(ctx, { seed: 11, start: 0, hits: [1.38, 3.96] });
  const burst = coinRain(scene, {
    seed: 12, count: 28, from: 3.97, to: 4.12, radius: 24, name: "panic-coins",
    emit: (i, r) => { const a = (i / 28) * Math.PI * 2 + r() * 0.7; return [px(965) + Math.cos(a) * 250, py(538) + Math.sin(a) * 150, -30 + r() * 60]; },
    kick: (i, r) => { const a = (i / 28) * Math.PI * 2 + r() * 0.7; const v = 380 + r() * 760; return [Math.cos(a) * v, Math.sin(a) * v * 0.8 + 380, 200 + r() * 350]; },
  });

  return ({ frame, time: t }) => {
    bg.update(t);
    fx.update(t, frame);
    burst.update(t);
    mat(fade).opacity = 1 - ramp(t, 0.04, 0.22, ease.inOut);

    // ---- camera: world scale + pan (measured off the reference) ----
    const s = kf(t, [[0, 0.96], [0.8, 1.0], [1.6, 1.0], [2.0, 1.06], [2.5, 1.5], [3.0, 1.56], [3.4, 1.55], [4.0, 1.77], [4.5, 1.86]]);
    const tx = kf(t, [[0, 436], [0.3, 436], [0.8, 0], [1.6, 0], [2.0, 64], [2.5, 444], [3.0, 500], [3.35, -78], [4.0, -90], [4.5, -92]]);
    stage.scale.set(s, s, 1);
    stage.position.set(tx, 0, 0);

    // ---- grid ----
    const gridOn = ramp(t, 0.08, 0.3) * (1 - ramp(t, 3.3, 3.45));
    const hh = kf(t, [[0.2, 163], [0.8, 225], [1.6, 200], [3.0, 300]]);
    hTop.group.position.set(0, py(540) + hh, 0);
    hBot.group.position.set(0, py(540) - hh, 0);
    const xA = kf(t, [[0.2, px(74)], [0.55, px(-120)]], ease.linear);
    const xB = kf(t, [[0.55, px(1164)], [1.2, px(1130)], [1.6, px(1148)]]);
    vA.group.position.x = xA;
    vB.group.position.x = xB;
    hTop.mat.opacity = hBot.mat.opacity = gridOn;
    vA.mat.opacity = gridOn * (1 - ramp(t, 0.45, 0.55));
    vB.mat.opacity = gridOn * ramp(t, 0.55, 0.65);
    [[xA, hh], [xA, -hh], [xB, hh], [xB, -hh]].forEach(([x, y], i) => {
      dots[i]!.position.set(x!, py(540) + y!, 0.2);
      mat(dots[i]!).opacity = i < 2 ? vA.mat.opacity : vB.mat.opacity;
    });
    const focusOn = ramp(t, 3.45, 3.7) * (1 - ramp(t, 4.35, 4.5));
    fl.forEach((l) => (l.mat.opacity = focusOn));
    fdots.forEach((d) => (mat(d).opacity = focusOn));

    // ---- URL bar + typing ----
    const barOn = ramp(t, 0.1, 0.3) * (1 - ramp(t, 4.3, 4.5));
    show(bar, barOn);
    url.mat.opacity = barOn;
    const ty = typed(frame, 2.4 * 30, 9, code.count);
    code.reveal(ty.n);
    codeTeal.reveal(ty.n);
    code.mat.opacity = barOn;
    codeTeal.mat.opacity = barOn * 0.45;
    const caretOn = t >= 2.28 && t < 3.3 && (!ty.done || Math.floor(frame / 7) % 2 === 0);
    caret.visible = caretOn && barOn > 0;
    caret.position.set(urlEnd + 10 + code.widthAt(Math.floor(ty.n)) + 12, py(540), 0.8);

    // ---- lock ----
    const lockIn = ramp(t, 0.28, 0.5);
    const squash = ramp(t, 2.08, 2.3, ease.inOut);
    lockGroup.position.set(
      THREE.MathUtils.lerp(px(LOCK_X), urlEnd + 16, squash),
      py(540),
      1,
    );
    lockGroup.scale.set(1 - squash * 0.93, 1 - squash * 0.52, 1);
    lockGroup.visible = t < 2.3;
    const opened = t >= 1.17;
    const green = ramp(t, 1.33, 1.45);
    const tealOn = ramp(t, 1.9, 2.05);
    show(faceDark, lockIn * (1 - green));
    show(faceGreen, green * (1 - tealOn));
    show(faceTeal, tealOn);
    show(lockClosed, lockIn * (opened ? 0 : 1));
    show(lockOpen, opened ? (1 - tealOn) * (1 - squash) : 0);
    show(lockOpenTeal, opened ? tealOn * (1 - squash * 2) : 0);
    // the shackle swings open with a small kick
    lockOpen.rotation.z = opened ? kf(t, [[1.17, 0.35], [1.3, -0.05], [1.4, 0]], ease.out) : 0;
    frames.forEach((f, i) => show(f, ramp(t, 1.28 + i * 0.05, 1.4 + i * 0.05) * (1 - ramp(t, 1.95, 2.1))));
    lockPixels.set(ramp(t, 1.35, 2.05, ease.linear) * 1.2, 1.1);

    mat(flash).opacity = kf(t, [[1.33, 0], [1.4, 0.75], [1.6, 0]], ease.out);

    // ---- HUD ----
    const hudT = typed(frame, 0.1 * 30, 9.5, hud.txt.count);
    const glitch = t >= 3.3 && t < 3.5 ? flicker(frame, 3) : 1;
    const hudGone = t >= 3.5;
    hud.set(hudT.n, t < 1.22);
    hud.opacity(hudGone ? 0 : glitch * ramp(t, 0.08, 0.12));
    hud.group.position.x = px(1240) + (t >= 3.3 && t < 3.5 ? (flicker(frame, 7) ? 14 : -10) : 0);
    const subT = typed(frame, 1.5 * 30, 16, sub.txt.count);
    sub.set(subT.n, false, Math.max(60, Math.min(subFullW, sub.txt.widthAt(Math.floor(subT.n)) + 60)));
    sub.opacity(hudGone ? 0 : glitch * ramp(t, 1.45, 1.5));
    sub.group.position.x = px(1295) + (t >= 3.3 && t < 3.5 ? (flicker(frame, 5) ? -18 : 8) : 0);

    // ---- Copy link button ----
    const pop = ramp(t, 3.33, 3.55, ease.outBack);
    const press = kf(t, [[3.88, 1], [3.96, 0.93], [4.08, 1]], ease.inOut);
    const btnVisible = t >= 3.33 && t < 4.42;
    btnGroup.visible = btnVisible;
    btnGroup.scale.setScalar(Math.max(0.001, (0.82 + 0.18 * pop) * press));
    show(btn, ramp(t, 3.33, 3.42));
    mat(btnGlow).opacity = kf(t, [[3.9, 0], [4.0, 0.35], [4.4, 0.22]], ease.out);
    btnPixels.set(ramp(t, 3.33, 3.95, ease.linear) * 1.2, 1);

    // capsule: detaches at 4.42 and swings to centre, tilted (handoff)
    const fly = ramp(t, 4.4, 4.5, ease.out);
    capsule.visible = t >= 4.4;
    const btnScreenX = BTN_X - 960 + 0; // world → centred
    const sx = btnScreenX * s + tx;
    capsule.position.set(THREE.MathUtils.lerp(sx, 8, fly), THREE.MathUtils.lerp(0, 0, fly), 20);
    capsule.rotation.z = -0.42 * fly;
    capsule.scale.set(THREE.MathUtils.lerp((250 * s) / 420, 1, fly), THREE.MathUtils.lerp((155 * s) / 200, 1, fly), 1);

    // ---- hand cursor ----
    const handOn = t >= 3.55 && t < 4.5;
    hand.visible = handOn;
    const hx = kf(t, [[3.55, 1310], [3.85, 1122], [4.2, 1112], [4.45, 1190]], ease.out);
    const hy = kf(t, [[3.55, 800], [3.85, 690], [4.2, 692], [4.45, 648]], ease.out);
    hand.position.set(px(hx), py(hy), 30);
    hand.scale.setScalar(press < 1 ? 0.9 : 1);
  };
}
