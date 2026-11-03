/**
 * Shot 5 — comment on the preview. GenMotion's preview is playing this very
 * Sequel x Grok Bot film ("Give your [bot] a phone"). The crosshair finds the bot, the hover
 * outline lights, a click pins it and opens the comment bubble, and the
 * request is typed in. Rebuilt from preview-inspector.tsx at 3x CSS size.
 */
import * as THREE from "three";
import { Easing, interpolate } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import grokBotFrame from "../assets/preview/grok-bot-frame.jpg";
import { APP } from "../components/brand";
import { aim, createFilm, handheld } from "../components/film";
import {
  bleedEdges,
  BUBBLE_H, BUBBLE_PAD, BUBBLE_W, K, crosshair, layer, paintBubble, paintHighlight, paintPin, timecode,
} from "../components/preview-ui";
import { addStudioLights, createRoom, createScreen, loadFrame } from "../components/screen";
import { mulberry32 } from "../components/ui";

const W = 2400;
const H = 1500;
// The film frame inside the preview (the captured frame is 1024 x 576).
const FX = 150;
const FY = 160;
const FW = 2100;
const FH = (FW * 9) / 16;
const fu = (u: number) => FX + (u / 1024) * FW;
const fv = (v: number) => FY + (v / 576) * FH;
/** The Grok Bot mascot's projected box in that frame, as the editor draws it. */
const BOX = { x0: fu(448), y0: fv(212), x1: fu(592), y1: fv(352) };
const CLICK_AT = { x: fu(508), y: fv(286) };
const CLICK = 8;
const TYPE_FROM = 14;
const NOTE = "Make it bigger";
/** The Grok Bot film's frame the preview is parked on (3.3 s in). */
const FILM_FRAME = 99;

/** A typing rhythm with doubled-letter speedups and word-gap pauses, seeded. */
function typingSteps(text: string, from: number): number[] {
  const rand = mulberry32(7);
  const out: number[] = [];
  let f = from;
  for (let i = 0; i < text.length; i++) {
    out.push(Math.round(f));
    const c = text[i]!;
    const next = text[i + 1];
    f += c === " " ? 1.8 : next === c ? 0.7 : 1 + rand() * 0.8;
  }
  return out;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera } = ctx;
  const film = createFilm(ctx, "#0b0b0d");
  addStudioLights(scene);
  createRoom(scene, [
    { x: 2.0, y: 0.9, z: -1.4, r: 1.1, b: 0.6 },
    { x: -2.3, y: -0.6, z: -2.4, r: 1.0, b: 0.3 },
  ]);

  const screen = createScreen(ctx, { name: "preview", W, H, surround: APP.background });
  scene.add(screen.group);
  screen.draw("static", (g) => {
    g.fillStyle = APP.background;
    g.fillRect(0, 0, W, H);
  });

  const frame = loadFrame(ctx, grokBotFrame, FW / 1000, 16 / 9);
  frame.name = "preview-film-frame";
  bleedEdges(frame, FW / 1000, FH / 1000);
  screen.local(FX + FW / 2, FY + FH / 2, 0.0005, frame.position);
  screen.group.add(frame);

  const bw = BOX.x1 - BOX.x0 + 16;
  const bh = BOX.y1 - BOX.y0 + 16;
  const hi = layer(ctx, Math.round(bw), Math.round(bh), "highlight-grok-bot");
  hi.mesh.renderOrder = 5;
  screen.local((BOX.x0 + BOX.x1) / 2, (BOX.y0 + BOX.y1) / 2, 0.002, hi.mesh.position);
  screen.group.add(hi.mesh);

  const pin = layer(ctx, 48 * K, 48 * K, "comment-pin");
  pin.draw("pin", (g) => paintPin(g, 48 * K));
  pin.mesh.renderOrder = 6;
  screen.local(CLICK_AT.x, CLICK_AT.y, 0.003, pin.mesh.position);
  screen.group.add(pin.mesh);

  // Bubble, offset from the click like the real one (10px right, 14px down).
  const bub = layer(ctx, BUBBLE_W + BUBBLE_PAD * 2, BUBBLE_H + BUBBLE_PAD * 2, "comment-bubble");
  bub.mesh.renderOrder = 7;
  const bubLeft = CLICK_AT.x + 10 * K - BUBBLE_PAD;
  const bubTop = CLICK_AT.y + 14 * K - BUBBLE_PAD * 0.6;
  // Scale from the bubble's own top-left corner.
  bub.mesh.geometry.translate(bub.w / 2000, -bub.h / 2000, 0);
  screen.local(bubLeft, bubTop, 0.004, bub.mesh.position);
  screen.group.add(bub.mesh);

  const cursor = crosshair(ctx);
  screen.group.add(cursor);

  const steps = typingSteps(NOTE, TYPE_FROM);
  const label = [
    { text: "#grok-bot", color: "#cba3f5" },
    { text: ` · ${timecode(FILM_FRAME, ctx.fps)}`, color: "rgba(168,85,247,0.7)" },
  ];

  const target = new THREE.Vector3();
  const focus = new THREE.Vector3();
  return ({ frame: f, time }) => {
    // Crosshair glides in and settles on the icon.
    const cx = interpolate(f, [0, CLICK - 1], [CLICK_AT.x + 620, CLICK_AT.x], Easing.easeOut);
    const cy = interpolate(f, [0, CLICK - 1], [CLICK_AT.y + 460, CLICK_AT.y], Easing.easeOut);
    screen.local(cx, cy, 0.006, cursor.position);

    const over = cx >= BOX.x0 && cx <= BOX.x1 && cy >= BOX.y0 && cy <= BOX.y1;
    const selected = f >= CLICK;
    hi.mat.opacity = over || selected ? 1 : 0;
    hi.draw(String(selected), (g) => paintHighlight(g, hi.w, hi.h, selected));

    const open = interpolate(f, [CLICK, CLICK + 6], [0, 1], Easing.easeOut);
    pin.mat.opacity = selected ? 1 : 0;
    bub.mat.opacity = open;
    bub.mesh.scale.setScalar(0.96 + 0.04 * open);

    let n = 0;
    while (n < steps.length && steps[n]! <= f) n++;
    const typed = NOTE.slice(0, n);
    const caret = n > 0 && n < NOTE.length ? true : Math.floor(f / 8) % 2 === 0;
    bub.draw(`${typed}|${caret}`, (g) =>
      paintBubble(g, {
        header: label,
        border: "rgba(168,85,247,0.5)",
        typed,
        placeholder: "Ask for a change…",
        caret,
      }),
    );

    // Camera: on the icon as it is picked, then drifting onto the bubble.
    const tx = interpolate(f, [0, CLICK, 30], [CLICK_AT.x + 60, CLICK_AT.x + 140, CLICK_AT.x + 380], Easing.easeInOut);
    const ty = interpolate(f, [0, CLICK, 30], [CLICK_AT.y + 30, CLICK_AT.y + 60, CLICK_AT.y + 120], Easing.easeInOut);
    screen.world(tx, ty, 0, target);
    aim(camera, target, interpolate(f, [0, 38], [1.02, 0.86], Easing.easeInOut), -22, 12, -6);
    handheld(camera, time, 1.2, 5);
    // Focus racks from the pinned icon to the note being typed.
    const fx = interpolate(f, [CLICK, CLICK + 8], [CLICK_AT.x, bubLeft + BUBBLE_PAD + 220], Easing.easeInOut);
    const fy = interpolate(f, [CLICK, CLICK + 8], [CLICK_AT.y, bubTop + BUBBLE_PAD * 0.6 + 120], Easing.easeInOut);
    screen.world(fx, fy, 0, focus);
    film.render(f, focus, 50);
  };
}

