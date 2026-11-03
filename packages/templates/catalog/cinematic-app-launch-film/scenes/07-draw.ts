/**
 * Shot 7 — draw on the preview. On the Grok Bot frame from this film's
 * montage, a pink freehand mark loops around the "Forwarding Call" banner,
 * badge 1 pops at its start, and the Draw card opens: "1 mark · time · keep
 * drawing, or send". Styled from the GenMotion app's Draw tool.
 */
import * as THREE from "three";
import { Easing, interpolate } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import grokFrame from "../assets/preview/grok-frame.jpg";
import { APP } from "../components/brand";
import { aim, createFilm, handheld } from "../components/film";
import { bleedEdges, BUBBLE_H, BUBBLE_PAD, BUBBLE_W, K, MARK, crosshair, layer, paintBadge, paintBubble, timecode } from "../components/preview-ui";
import { addStudioLights, createRoom, createScreen, loadFrame } from "../components/screen";

const W = 2400;
const H = 1500;
const FX = 150;
const FY = 160;
const FW = 2100;
const FH = (FW * 9) / 16;
const fu = (u: number) => FX + (u / 1024) * FW;
const fv = (v: number) => FY + (v / 576) * FH;
/** The mark loops the caller label (avatar + "Forwarding Call", x 175-440, y 200-300 of the 1024 x 576 frame). */
const CX = fu(320);
const CY = fv(252);
const RX = fu(475) - CX;
const RY = fv(318) - CY;
const DRAW_END = 14;
const CARD_AT = 15;
/** The montage frame the preview is parked on: global frame 246. */
const FILM_FRAME = 246;

/** A hand-drawn loop: a short lead-in stroke, then an uneven ellipse that overshoots. */
function markPath(): [number, number][] {
  const pts: [number, number][] = [];
  // Lead-in: a quick stroke along the top, right to left, with a small hook.
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push([CX + RX * 0.25 - t * RX * 0.55, CY - RY * 1.02 - Math.sin(t * Math.PI) * 6]);
  }
  // Loop: counter-clockwise from the top, going left first.
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = -Math.PI / 2 - 0.35 - t * Math.PI * 2.12;
    const wob = 1 + Math.sin(t * 9.1 + 0.6) * 0.035 + Math.sin(t * 3.3) * 0.05;
    const r = 1 + t * 0.06;
    pts.push([CX + Math.cos(a) * RX * wob * r, CY + Math.sin(a) * RY * wob * (1.02 - t * 0.08)]);
  }
  return pts;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera } = ctx;
  const film = createFilm(ctx, "#0b0b0d");
  addStudioLights(scene);
  createRoom(scene, [
    { x: -2.0, y: 0.8, z: -1.4, r: 1.1, b: 0.6 },
    { x: 2.4, y: -0.7, z: -2.4, r: 1.0, b: 0.3 },
  ]);

  const screen = createScreen(ctx, { name: "preview", W, H, surround: APP.background });
  scene.add(screen.group);
  screen.draw("static", (g) => {
    g.fillStyle = APP.background;
    g.fillRect(0, 0, W, H);
  });
  const frame = loadFrame(ctx, grokFrame, FW / 1000, 16 / 9);
  frame.name = "preview-film-frame";
  bleedEdges(frame, FW / 1000, FH / 1000);
  screen.local(FX + FW / 2, FY + FH / 2, 0.0005, frame.position);
  screen.group.add(frame);

  // The mark, drawn progressively onto a layer over the whole preview.
  const pts = markPath();
  const mark = layer(ctx, W, H, "draw-mark-1");
  mark.mesh.renderOrder = 5;
  screen.local(W / 2, H / 2, 0.002, mark.mesh.position);
  screen.group.add(mark.mesh);

  const badge = layer(ctx, 40 * K, 40 * K, "draw-badge-1");
  badge.draw("1", (g) => paintBadge(g, 40 * K, 1));
  badge.mesh.renderOrder = 6;
  screen.local(CX - RX * 0.98, CY - RY * 1.18, 0.003, badge.mesh.position);
  screen.group.add(badge.mesh);

  const card = layer(ctx, BUBBLE_W + BUBBLE_PAD * 2, BUBBLE_H + BUBBLE_PAD * 2, "draw-card");
  card.mesh.renderOrder = 7;
  card.mesh.geometry.translate(card.w / 2000, -card.h / 2000, 0);
  const cardLeft = CX + RX * 0.35 - BUBBLE_PAD;
  const cardTop = CY - RY * 0.45 - BUBBLE_PAD * 0.6;
  screen.local(cardLeft, cardTop, 0.004, card.mesh.position);
  screen.group.add(card.mesh);

  const cursor = crosshair(ctx);
  screen.group.add(cursor);

  const header = [{ text: `1 mark · ${timecode(FILM_FRAME, ctx.fps)} · keep drawing, or send`, color: MARK }];

  const target = new THREE.Vector3();
  const focus = new THREE.Vector3();
  return ({ frame: f, time }) => {
    const p = interpolate(f, [0, DRAW_END], [0, 1], Easing.easeInOut);
    const count = Math.max(2, Math.round(p * (pts.length - 1)) + 1);
    mark.draw(String(count), (g) => {
      g.strokeStyle = MARK;
      g.lineWidth = 3 * K;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.beginPath();
      g.moveTo(pts[0]![0], pts[0]![1]);
      for (let i = 1; i < count; i++) g.lineTo(pts[i]![0], pts[i]![1]);
      g.stroke();
    });
    const tip = pts[count - 1]!;
    // The pen follows the stroke, then eases off toward the card.
    const rest = interpolate(f, [DRAW_END, DRAW_END + 8], [0, 1], Easing.easeOut);
    screen.local(tip[0] + rest * 260, tip[1] + rest * 180, 0.006, cursor.position);

    const pop = interpolate(f, [1, 4, 6], [0, 1.1, 1], Easing.easeOut);
    badge.mat.opacity = Math.min(1, pop);
    badge.mesh.scale.setScalar(Math.max(0.001, pop));

    const open = interpolate(f, [CARD_AT, CARD_AT + 6], [0, 1], Easing.easeOut);
    card.mat.opacity = open;
    card.mesh.scale.setScalar(0.96 + 0.04 * open);
    const caret = Math.floor(f / 8) % 2 === 0;
    card.draw(String(caret), (g) =>
      paintBubble(g, {
        header,
        border: "rgba(229,67,115,0.5)",
        typed: "",
        placeholder: "What should change here?",
        caret,
      }),
    );

    // Camera rides along with the pen, then settles on the card.
    const tx = interpolate(f, [0, DRAW_END, 26], [CX - RX * 0.2, CX, cardLeft + BUBBLE_PAD + BUBBLE_W / 2 - 40], Easing.easeInOut);
    const ty = interpolate(f, [0, DRAW_END, 26], [CY - RY * 0.3, CY, cardTop + BUBBLE_PAD * 0.6 + BUBBLE_H / 2 + 20], Easing.easeInOut);
    screen.world(tx, ty, 0, target);
    aim(camera, target, interpolate(f, [0, 26], [0.96, 1.02], Easing.easeInOut), 20, 9, 5);
    handheld(camera, time, 1.2, 7);
    const fx = f < CARD_AT ? tip[0] : interpolate(f, [CARD_AT, CARD_AT + 6], [tip[0], cardLeft + BUBBLE_PAD + 300], Easing.easeInOut);
    const fy = f < CARD_AT ? tip[1] : interpolate(f, [CARD_AT, CARD_AT + 6], [tip[1], cardTop + BUBBLE_PAD * 0.6 + 80], Easing.easeInOut);
    screen.world(fx, fy, 0, focus);
    film.render(f, focus, 45);
  };
}
