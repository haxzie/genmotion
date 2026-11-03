/**
 * Shot 12 — rendering. "Exporting video…" climbing to done, nearly frontal
 * with a slow push; focus racks from the title to the bar. Ends on black.
 */
import * as THREE from "three";
import { Easing, interpolate } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { UI } from "../components/brand";
import { aim, createFilm, handheld } from "../components/film";
import { addStudioLights, createRoom, createScreen } from "../components/screen";
import { box, logo, text } from "../components/ui";

const W = 2000;
const H = 1200;
const BX = 300;
const BW = 1400;
const BY = 560;
const DONE = 44;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, durationInFrames } = ctx;
  const film = createFilm(ctx, "#0c0c0e");
  addStudioLights(scene);
  createRoom(scene, [
    { x: 1.8, y: 0.5, z: -1.3, r: 1.0, b: 0.55 },
    { x: -2.2, y: -0.5, z: -2.2, r: 1.1, b: 0.3 },
  ]);
  const screen = createScreen(ctx, { name: "export-progress", W, H, surround: UI.panel });
  scene.add(screen.group);

  const paint = (pct: number) =>
    screen.draw(String(pct), (g) => {
      g.fillStyle = UI.panel;
      g.fillRect(0, 0, W, H);
      const done = pct >= 100;
      if (done) logo(g, W / 2 - 360, 268, 74);
      text(g, done ? "Export complete" : "Exporting video…", done ? W / 2 + 60 : W / 2, 305, {
        size: 76,
        weight: 500,
        color: UI.text,
        align: "center",
        tracking: -0.015,
      });
      box(g, BX, BY - 14, BW, 28, 14, UI.field);
      box(g, BX, BY - 14, Math.max(28, (BW * pct) / 100), 28, 14, "#d4d4d9");
      const secs = Math.max(0, Math.ceil(((100 - pct) / 100) * 5));
      text(g, done ? "12.6s · 3840 × 2160 · MP4" : `~${Math.max(1, secs)}s remaining`, BX, BY + 90, { size: 44, color: UI.muted });
      text(g, `${pct}%`, BX + BW, BY + 90, { size: 44, weight: 500, color: UI.text, align: "right" });
      if (!done) text(g, "Cancel export", W / 2, 900, { size: 44, color: UI.text, align: "center" });
    });

  const target = new THREE.Vector3();
  const focus = new THREE.Vector3();
  return ({ frame, time }) => {
    const pct = Math.round(interpolate(frame, [0, DONE], [61, 100], Easing.easeIn));
    paint(pct);
    screen.world(W / 2, 450, 0, target);
    aim(camera, target, interpolate(frame, [0, durationInFrames], [1.08, 0.97], Easing.easeInOut), 9, 6, -2);
    handheld(camera, time, 1.0, 13);
    // Rack focus: bar first, title once it reads "complete".
    const fy = interpolate(frame, [DONE - 6, DONE + 4], [BY + 60, 305], Easing.easeInOut);
    screen.world(W / 2 - 200, fy, 0, focus);
    film.setFade(interpolate(frame, [durationInFrames - 8, durationInFrames - 1], [0, 1], Easing.easeIn));
    film.render(frame, focus, 40);
  };
}
