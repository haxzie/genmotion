/**
 * Shot 4 — the editor canvas. A raking angle along the preview frame's edge:
 * the "Scene 2 · Active" chip, the frame, and a layer being selected by name.
 */
import * as THREE from "three";
import { Easing, interpolate } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { UI } from "../components/brand";
import { aim, createFilm, handheld } from "../components/film";
import { FRAMES } from "../components/frames";
import { addStudioLights, createCursor, createRoom, createScreen, loadFrame } from "../components/screen";
import { box, folderIcon, plusIcon, text } from "../components/ui";

const W = 2400;
const H = 1500;
const FX = 660;
const FY = 300;
const FW = 1560;
const FH = (FW * 9) / 16;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera } = ctx;
  const film = createFilm(ctx, "#0e0e10");
  addStudioLights(scene);
  createRoom(scene, [
    { x: 2.2, y: 1.0, z: -1.4, r: 1.1, b: 0.7 },
    { x: -2.0, y: 0.2, z: -2.2, r: 0.8, b: 0.35 },
  ]);

  const screen = createScreen(ctx, { name: "editor", W, H });
  scene.add(screen.group);

  screen.draw("static", (g) => {
    g.fillStyle = UI.bg;
    g.fillRect(0, 0, W, H);
    // Sidebar
    g.fillStyle = UI.panel;
    g.fillRect(0, 0, 540, H);
    g.fillStyle = UI.line;
    g.fillRect(540, 0, 3, H);
    folderIcon(g, 60, 92, 40, UI.muted);
    text(g, "Astra launch film", 120, 112, { size: 40, color: UI.text });
    plusIcon(g, 480, 112, 30, UI.muted, 4);
    text(g, "Scenes", 60, 220, { size: 32, color: UI.muted });
    ["01-dock", "02-reveal", "03-stars", "04-ideas", "05-chat"].forEach((s, i) => {
      if (i === 1) box(g, 36, 262 + i * 92, 470, 76, 16, UI.field);
      text(g, s, 70, 300 + i * 92, { size: 38, color: i === 1 ? UI.text : UI.muted });
    });
    // Chip above the frame, like the reference's "Scene 1 · Active".
    g.strokeStyle = UI.muted;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(FX + 4, FY - 74);
    g.lineTo(FX + 4, FY - 46);
    g.moveTo(FX + 16, FY - 74);
    g.lineTo(FX + 16, FY - 46);
    g.stroke();
    text(g, "Scene 2", FX + 40, FY - 60, { size: 40, color: UI.text });
    box(g, FX + 210, FY - 86, 130, 54, 14, "#2e2e34");
    text(g, "Active", FX + 275, FY - 59, { size: 32, color: UI.text, align: "center" });
    // Frame border + corner handle
    g.strokeStyle = "#5a5a63";
    g.lineWidth = 3;
    g.strokeRect(FX, FY, FW, FH);
  });

  const preview = loadFrame(ctx, FRAMES.astra.url, FW / 1000, 16 / 9);
  preview.name = "preview-02-reveal";
  screen.local(FX + FW / 2, FY + FH / 2, 0.001, preview.position);
  screen.group.add(preview);

  // Selection outline around the headline, on its own layer so it can fade in.
  const sel = new OffscreenCanvas(680, 300);
  const sg = sel.getContext("2d")!;
  sg.strokeStyle = "#ededef";
  sg.lineWidth = 4;
  sg.strokeRect(20, 70, 640, 210);
  for (const [x, y] of [[20, 70], [660, 70], [20, 280], [660, 280]] as const) {
    sg.fillStyle = "#ffffff";
    sg.fillRect(x - 12, y - 12, 24, 24);
    sg.strokeStyle = "#111";
    sg.lineWidth = 3;
    sg.strokeRect(x - 12, y - 12, 24, 24);
  }
  box(sg, 20, 0, 250, 50, 10, "#ededef");
  text(sg, "#headline", 145, 26, { size: 32, weight: 500, color: "#0c0c0e", align: "center" });
  const selTex = new THREE.CanvasTexture(sel as unknown as HTMLCanvasElement);
  selTex.colorSpace = THREE.SRGBColorSpace;
  selTex.anisotropy = 8;
  const selMat = new THREE.MeshBasicMaterial({ map: selTex, transparent: true, depthWrite: false, toneMapped: false });
  const selection = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.3), selMat);
  selection.name = "selection-headline";
  const SX = FX + FW * 0.5;
  const SY = FY + FH * 0.5 - 12;
  screen.local(SX, SY - 8, 0.003, selection.position);
  screen.group.add(selection);

  const cursor = createCursor(ctx, 60, 1000);
  screen.group.add(cursor);

  const target = new THREE.Vector3();
  const focus = new THREE.Vector3();
  return ({ frame, time }) => {
    selMat.opacity = interpolate(frame, [5, 9], [0, 1], Easing.easeOut);
    const cx = interpolate(frame, [0, 6], [SX + 340, SX + 180], Easing.easeOut);
    const cy = interpolate(frame, [0, 6], [SY + 220, SY + 30], Easing.easeOut);
    screen.local(cx, cy, 0.006, cursor.position);

    // Rake along the top edge of the frame from the right, sliding left.
    const tx = interpolate(frame, [0, 19], [SX - 80, SX - 260], Easing.easeInOut);
    screen.world(tx, FY + 260, 0, target);
    aim(camera, target, interpolate(frame, [0, 19], [0.98, 0.9], Easing.easeInOut), 30, 14, 8);
    handheld(camera, time, 1.2, 4);
    // Rack from the scene chip to the selected layer as it is picked.
    const fx = interpolate(frame, [4, 12], [FX + 200, SX - 300], Easing.easeInOut);
    const fy = interpolate(frame, [4, 12], [FY - 60, SY - 120], Easing.easeInOut);
    screen.world(fx, fy, 0, focus);
    film.render(frame, focus, 55);
  };
}
