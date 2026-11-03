/**
 * Shot 2 — the prompt. A steep, rolled close-up on GenMotion's composer as the
 * request is typed; focus rides the caret.
 */
import * as THREE from "three";
import { Easing, interpolate } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import timing from "../assets/typing-prompt.timing.json";
import { UI } from "../components/brand";
import { aim, createFilm, handheld } from "../components/film";
import { addStudioLights, createRoom, createScreen } from "../components/screen";
import { box, folderIcon, logo, measure, plusIcon, text } from "../components/ui";

const W = 2400;
const H = 1100;
/** Which frame of the typing take this shot opens on. */
export const TYPE_OFFSET = 50;
const TX = 290;
const TY = 520;
const SIZE = 76;

function typed(f: number): string {
  let shown = "";
  for (const step of timing.steps) {
    if (step.frame > f) break;
    shown = step.text;
  }
  return shown;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera } = ctx;
  const film = createFilm(ctx, "#0b0b0c");
  addStudioLights(scene);
  createRoom(scene, [
    { x: 1.9, y: 0.5, z: -1.6, r: 0.8, b: 0.45 },
    { x: -2.4, y: -0.6, z: -2.4, r: 1.1, b: 0.25 },
  ]);

  const screen = createScreen(ctx, { name: "composer", W, H });
  scene.add(screen.group);

  const paint = (s: string, caretOn: boolean) =>
    screen.draw(`${s}|${caretOn}`, (g) => {
      g.fillStyle = UI.bg;
      g.fillRect(0, 0, W, H);
      // Header: the project this chat belongs to.
      logo(g, 200, 128, 54);
      text(g, "GenMotion", 272, 156, { size: 44, weight: 500, color: UI.text });
      folderIcon(g, 200, 290, 46, UI.muted);
      text(g, "Astra launch film", 266, 314, { size: 44, color: UI.muted });
      // Composer card.
      box(g, 180, 390, 2040, 520, 44, UI.panel, UI.line, 3);
      text(g, s, TX, TY, { size: SIZE, color: UI.text, tracking: -0.01 });
      if (caretOn) {
        const w = measure(g, s, SIZE) - (s.length > 0 ? SIZE * 0.01 * s.length : 0);
        g.fillStyle = UI.text;
        g.fillRect(TX + w + 8, TY - 44, 5, 88);
      }
      plusIcon(g, 300, 820, 44, UI.muted, 5);
      box(g, 2060, 772, 96, 96, 48, "#3a3a40");
      g.strokeStyle = UI.text;
      g.lineWidth = 7;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(2108, 848);
      g.lineTo(2108, 792);
      g.moveTo(2084, 814);
      g.lineTo(2108, 790);
      g.lineTo(2132, 814);
      g.stroke();
    });

  const target = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const measureCtx = new OffscreenCanvas(8, 8).getContext("2d")!;

  return ({ frame, time }) => {
    const s = typed(frame + TYPE_OFFSET);
    // The caret holds solid while keys are landing, blinks only in pauses.
    paint(s, true);

    const caretX = TX + measure(measureCtx as never, s, SIZE);
    // Camera tracks the caret from a steep left angle, slowly drifting in.
    screen.world(Math.min(caretX, W - 300) - 120, TY + 40, 0, target);
    const dist = interpolate(frame, [0, 39], [0.82, 0.7], Easing.easeInOut);
    const yaw = interpolate(frame, [0, 39], [-34, -29], Easing.easeInOut);
    aim(camera, target, dist, yaw, 14, -11);
    handheld(camera, time, 1.3, 2);

    screen.world(caretX - 60, TY, 0, focus);
    film.render(frame, focus, 55);
  };
}
