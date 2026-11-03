/**
 * Shot 11 — export. The export panel (4K, 30 fps) seen from the left, then a
 * hard cut to the dialog's Save, which the pointer clicks.
 */
import * as THREE from "three";
import { Easing, interpolate } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { UI } from "../components/brand";
import { aim, createFilm, handheld } from "../components/film";
import { FRAMES } from "../components/frames";
import { addStudioLights, createCursor, createRoom, createScreen, loadFrame } from "../components/screen";
import { box, chevron, plusIcon, text } from "../components/ui";

const W = 2400;
const H = 1800;
const PX = 1150;
const CUT = 13;
const SAVE = { x: 1830, y: 1560, w: 300, h: 110 };
const CANCEL = { x: 1480, y: 1560, w: 300, h: 110 };

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera } = ctx;
  const film = createFilm(ctx, "#0e0e10");
  addStudioLights(scene);
  createRoom(scene, [
    { x: 2.4, y: 0.6, z: -1.4, r: 1.2, b: 0.75 },
    { x: -2.0, y: -0.8, z: -2.2, r: 0.9, b: 0.3 },
  ]);
  const screen = createScreen(ctx, { name: "export-panel", W, H });
  scene.add(screen.group);

  const paint = (pressed: boolean) =>
    screen.draw(String(pressed), (g) => {
      g.fillStyle = UI.bg;
      g.fillRect(0, 0, W, H);
      // Left: the preview with its timecode.
      g.fillStyle = UI.panel2;
      g.fillRect(80, 200, 980, 560);
      text(g, "00:12", 120, 150, { size: 38, color: UI.muted, mono: true });
      // Right: export settings.
      box(g, PX, 80, 1160, 1340, 30, UI.panel, UI.line, 3);
      text(g, "Editor", PX + 60, 160, { size: 44, color: UI.muted });
      text(g, "Export", PX + 60, 290, { size: 56, weight: 500, color: UI.text });
      box(g, PX + 60, 360, 1040, 120, 20, UI.field);
      box(g, PX + 100, 392, 56, 56, 10, "#3a3a41");
      text(g, "4K", PX + 128, 421, { size: 26, weight: 500, color: UI.text, align: "center" });
      text(g, "4K Ultra HD · 3840 × 2160", PX + 190, 421, { size: 46, color: UI.text });
      chevron(g, PX + 1040, 421, 24, UI.muted);
      box(g, PX + 60, 520, 1040, 120, 20, "#3a3a41");
      text(g, "Export", PX + 580, 581, { size: 48, weight: 500, color: UI.text, align: "center" });
      text(g, "Duration 00:12", PX + 60, 720, { size: 40, color: UI.muted });
      text(g, "File size ~148 MB", PX + 1100, 720, { size: 40, color: UI.muted, align: "right" });
      g.fillStyle = UI.line;
      g.fillRect(PX + 60, 790, 1040, 3);
      text(g, "Time", PX + 60, 880, { size: 44, weight: 500, color: UI.text });
      plusIcon(g, PX + 1080, 880, 32, UI.muted, 4);
      text(g, "Length", PX + 60, 990, { size: 40, color: UI.muted });
      text(g, "12.6s", PX + 360, 990, { size: 40, color: UI.text });
      text(g, "Frame rate", PX + 60, 1100, { size: 40, color: UI.muted });
      text(g, "30 fps", PX + 360, 1100, { size: 40, color: UI.text });
      // Dialog buttons.
      box(g, 1400, 1460, 840, 280, 30, UI.panel, UI.line, 3);
      box(g, CANCEL.x, CANCEL.y, CANCEL.w, CANCEL.h, 22, UI.panel2);
      text(g, "Cancel", CANCEL.x + CANCEL.w / 2, CANCEL.y + CANCEL.h / 2, { size: 48, weight: 500, color: UI.text, align: "center" });
      box(g, SAVE.x, SAVE.y, SAVE.w, SAVE.h, 22, pressed ? "#9a9aa1" : "#d4d4d9");
      text(g, "Save", SAVE.x + SAVE.w / 2, SAVE.y + SAVE.h / 2, { size: 48, weight: 500, color: "#0c0c0e", align: "center" });
    });

  const preview = loadFrame(ctx, FRAMES.astra.url, 0.98, 16 / 9);
  preview.name = "export-preview";
  screen.local(570, 480, 0.001, preview.position);
  preview.scale.y = 0.56 / (0.98 / (16 / 9));
  screen.group.add(preview);

  const cursor = createCursor(ctx, 70, 1000);
  screen.group.add(cursor);

  const target = new THREE.Vector3();
  const focus = new THREE.Vector3();
  return ({ frame, time }) => {
    if (frame < CUT) {
      paint(false);
      screen.local(PX + 520, 600, 0.006, cursor.position);
      const ty = interpolate(frame, [0, CUT], [380, 560], Easing.easeInOut);
      screen.world(PX + 520, ty, 0, target);
      aim(camera, target, 0.95, -30, 10, -7);
      handheld(camera, time, 1.2, 11);
      screen.world(PX + 400, 421, 0, focus);
      film.render(frame, focus, 55);
    } else {
      const f = frame - CUT;
      paint(f >= 7 && f <= 9);
      const cx = interpolate(f, [0, 6], [SAVE.x + 380, SAVE.x + SAVE.w / 2 + 10], Easing.easeOut);
      const cy = interpolate(f, [0, 6], [SAVE.y + 260, SAVE.y + SAVE.h / 2 + 8], Easing.easeOut);
      screen.local(cx, cy, 0.006, cursor.position);
      screen.world(1720, SAVE.y + 60, 0, target);
      aim(camera, target, interpolate(f, [0, 13], [0.62, 0.56], Easing.easeInOut), 12, 8, -2);
      handheld(camera, time, 1.1, 12);
      screen.world(SAVE.x + 60, SAVE.y + 55, 0, focus);
      film.render(frame, focus, 45);
    }
  };
}
