/**
 * Shot 3 — the scenes panel. GenMotion's generated scenes as a grid of
 * thumbnails, seen at a steep diagonal while the camera slides across it.
 */
import * as THREE from "three";
import { Easing, interpolate } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { UI } from "../components/brand";
import { aim, createFilm, handheld } from "../components/film";
import { FRAMES, portraitCrop, type FrameAsset } from "../components/frames";
import { addMacbook } from "../components/macbook";
import { addStudioLights, createRoom, createScreen, loadFrame } from "../components/screen";
import { box, text } from "../components/ui";

// Close to a MacBook's 16:10 display.
const W = 2400;
const H = 1560;
const COLS = 3;
const TW = 640;
const TH = 360;
const GX = 120;
const GY = 110;
const X0 = 200;
const Y0 = 130;
const DUR = ["0:03", "0:04", "0:02", "0:03", "0:05", "0:02", "0:04", "0:03", "0:02"];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera } = ctx;
  const film = createFilm(ctx, "#101012");
  addStudioLights(scene);
  createRoom(scene, [
    { x: 2.4, y: 1.2, z: -1.2, r: 1.0, b: 0.6 },
    { x: -1.8, y: -1.4, z: -2, r: 0.9, b: 0.3 },
  ]);

  const screen = createScreen(ctx, { name: "scenes-panel", W, H, surround: null });
  addMacbook(screen);
  scene.add(screen.group);

  const list: FrameAsset[] = [
    FRAMES.astra, FRAMES.whatsapp, FRAMES.prequel,
    FRAMES.stars, FRAMES.google, FRAMES.messenger,
    FRAMES.claude, FRAMES.polls, FRAMES.lovable,
  ];
  const cell = (i: number) => ({
    x: X0 + (i % COLS) * (TW + GX),
    y: Y0 + Math.floor(i / COLS) * (TH + GY),
  });

  screen.draw("static", (g) => {
    g.fillStyle = UI.bg;
    g.fillRect(0, 0, W, H);
    list.forEach((f, i) => {
      const { x, y } = cell(i);
      box(g, x - 8, y - 8, TW + 16, TH + 16, 26, UI.panel2, UI.line, 3);
      text(g, f.label, x + 4, y + TH + 62, { size: 46, color: UI.muted });
    });
  });

  list.forEach((f, i) => {
    const { x, y } = cell(i);
    const m = loadFrame(ctx, f.url, TW / 1000, 16 / 9, f.portrait ? portraitCrop(0.12 + (i % 2) * 0.1) : undefined);
    m.name = `thumb-${f.label.replace(".ts", "")}`;
    screen.local(x + TW / 2, y + TH / 2, 0.001, m.position);
    screen.group.add(m);
    // Duration badge in the corner, like the reference's clip timecodes.
    const c = new OffscreenCanvas(220, 110);
    const g = c.getContext("2d")!;
    box(g, 6, 6, 208, 98, 26, "rgba(10,10,12,0.82)");
    text(g, DUR[i]!, 110, 56, { size: 54, weight: 500, color: UI.text, align: "center" });
    const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, 0.075),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }),
    );
    badge.name = `duration-${i + 1}`;
    screen.local(x + 100, y + 60, 0.002, badge.position);
    screen.group.add(badge);
  });

  const target = new THREE.Vector3();
  const focus = new THREE.Vector3();
  return ({ frame, time }) => {
    // Slide diagonally down the grid, the way a hand-held camera tracks a desk.
    // Down the grid toward the bottom bezel, ending with the keyboard edge in shot.
    const px = interpolate(frame, [0, 29], [760, 1380], Easing.easeInOut);
    const py = interpolate(frame, [0, 29], [420, 1060], Easing.easeInOut);
    screen.world(px, py, 0, target);
    aim(camera, target, interpolate(frame, [0, 29], [1.05, 1.12], Easing.easeInOut), -30, 20, -16);
    handheld(camera, time, 1.2, 3);
    // Focus sits on the thumbnail nearest the frame centre.
    screen.world(px + 40, py, 0, focus);
    film.render(frame, focus, 60);
  };
}
