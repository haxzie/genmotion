/**
 * Shot 1 — the dock. A low, rolled angle on a bright desktop; the pointer
 * drifts onto GenMotion, its name pops up, click.
 */
import * as THREE from "three";
import { Easing, interpolate } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { aim, createFilm, handheld } from "../components/film";
import { addMacbook } from "../components/macbook";
import { addStudioLights, createCursor, createRoom, createScreen } from "../components/screen";
import { box, logo, rr, text } from "../components/ui";

// A 16:10 MacBook display; the dock sits just above its bottom edge, as on macOS.
const W = 2880;
const H = 1800;
const ICON = 150;
const GAP = 26;
const DOCK_Y = 1688;

type Glyph = "terminal" | "code" | "notes" | "photos" | "genmotion" | "music" | "trash";
const APPS: { glyph: Glyph; name: string }[] = [
  { glyph: "terminal", name: "dock-terminal" },
  { glyph: "code", name: "dock-code-editor" },
  { glyph: "notes", name: "dock-notes" },
  { glyph: "photos", name: "dock-photos" },
  { glyph: "genmotion", name: "dock-genmotion" },
  { glyph: "music", name: "dock-music" },
  { glyph: "trash", name: "dock-trash" },
];
const GM = 4;

function iconCanvas(glyph: Glyph): OffscreenCanvas {
  const S = 320;
  const c = new OffscreenCanvas(S, S);
  const g = c.getContext("2d")!;
  const p = 14;
  const fills: Record<Glyph, [string, string]> = {
    terminal: ["#3a3a3f", "#141416"],
    code: ["#f4f4f6", "#c9c9cf"],
    notes: ["#e9e9ec", "#bdbdc4"],
    photos: ["#ffffff", "#dedee3"],
    genmotion: ["#26262b", "#0c0c0e"],
    music: ["#6a6a72", "#3a3a40"],
    trash: ["rgba(255,255,255,0.75)", "rgba(220,220,226,0.55)"],
  };
  const [a, b] = fills[glyph];
  const grad = g.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, a);
  grad.addColorStop(1, b);
  rr(g, p, p, S - p * 2, S - p * 2, 70);
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = "rgba(255,255,255,0.18)";
  g.stroke();
  const cx = S / 2;
  const cy = S / 2;
  if (glyph === "terminal") {
    text(g, ">_", 70, cy, { size: 120, weight: 500, color: "#ededef", mono: true });
  } else if (glyph === "code") {
    text(g, "</>", cx, cy + 4, { size: 110, weight: 500, color: "#2a2a30", align: "center", mono: true });
  } else if (glyph === "notes") {
    g.fillStyle = "#8a8a93";
    for (let i = 0; i < 4; i++) g.fillRect(70, 100 + i * 40, i === 3 ? 110 : 180, 12);
  } else if (glyph === "photos") {
    for (let i = 0; i < 6; i++) {
      const a2 = (i / 6) * Math.PI * 2;
      g.beginPath();
      g.ellipse(cx + Math.cos(a2) * 52, cy + Math.sin(a2) * 52, 44, 44, 0, 0, Math.PI * 2);
      g.fillStyle = `rgba(${60 + i * 25},${60 + i * 25},${70 + i * 25},0.75)`;
      g.fill();
    }
  } else if (glyph === "genmotion") {
    logo(g, cx - 95, cy - 95, 190);
  } else if (glyph === "music") {
    text(g, "♪", cx, cy + 8, { size: 170, weight: 400, color: "#f4f4f6", align: "center" });
  } else {
    g.strokeStyle = "rgba(60,60,66,0.7)";
    g.lineWidth = 8;
    rr(g, 95, 90, 130, 160, 18);
    g.stroke();
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(130 + i * 30, 115);
      g.lineTo(130 + i * 30, 225);
      g.stroke();
    }
  }
  return c;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera } = ctx;
  const film = createFilm(ctx, "#2a2a2c");
  addStudioLights(scene);

  const screen = createScreen(ctx, { name: "desktop", W, H, ppu: 1000, brightness: 1.05, surround: null });
  addMacbook(screen);
  scene.add(screen.group);
  createRoom(scene, [
    { x: -2.2, y: 0.6, z: -2.5, r: 1.6, b: 0.9 },
    { x: 2.6, y: -0.4, z: -3, r: 1.2, b: 0.5 },
  ]);

  // Wallpaper, drawn once. The dock itself is live geometry so it can
  // reflow as icons magnify, the way the real one does.
  const count = APPS.length;
  const PAD = 20;
  const dockW = count * ICON + (count + 1) * GAP + PAD * 2;
  const dockX = W / 2 - dockW / 2;
  const SHELF_H = ICON + 44;
  screen.draw("static", (g) => {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#d7d7da");
    bg.addColorStop(1, "#8e8e94");
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    g.beginPath();
    g.ellipse(W * 0.62, -120, 900, 900, 0, 0, Math.PI * 2);
    g.fillStyle = "rgba(255,255,255,0.45)";
    g.fill();
  });

  // Shelf: one texture split into left cap, stretchable middle and right cap.
  const CAP = 60;
  const shelfC = new OffscreenCanvas(400, SHELF_H + 8);
  const sgc = shelfC.getContext("2d")!;
  box(sgc, 4, 4, 392, SHELF_H, 46, "rgba(250,250,252,0.42)", "rgba(255,255,255,0.6)", 3);
  const shelfT = new THREE.CanvasTexture(shelfC as unknown as HTMLCanvasElement);
  shelfT.colorSpace = THREE.SRGBColorSpace;
  const shelfMat = new THREE.MeshBasicMaterial({ map: shelfT, transparent: true, depthWrite: false, toneMapped: false });
  const slice = (u0: number, u1: number, wPx: number) => {
    const geo = new THREE.PlaneGeometry(wPx / 1000, (SHELF_H + 8) / 1000);
    const uv = geo.attributes.uv!;
    for (let j = 0; j < uv.count; j++) uv.setX(j, u0 + uv.getX(j) * (u1 - u0));
    const m = new THREE.Mesh(geo, shelfMat);
    m.renderOrder = 1;
    return m;
  };
  const shelf = new THREE.Group();
  shelf.name = "dock-shelf";
  const capL = slice(0, CAP / 400, CAP);
  const mid = slice(CAP / 400, 1 - CAP / 400, 1000); // 1 unit wide, scaled per frame
  const capR = slice(1 - CAP / 400, 1, CAP);
  capL.name = "dock-shelf-left";
  mid.name = "dock-shelf-middle";
  capR.name = "dock-shelf-right";
  shelf.add(capL, mid, capR);
  screen.group.add(shelf);

  const darkMat = new THREE.MeshBasicMaterial({ color: "#3c3c42", transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false });
  const separator = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.124), darkMat);
  separator.name = "dock-separator";
  separator.renderOrder = 2;
  screen.group.add(separator);
  const RUNNING = [0, 1, 3, GM];
  const dotMat = new THREE.MeshBasicMaterial({ color: "#2a2a2e", transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false });
  const gmDotMat = dotMat.clone();
  const dots = RUNNING.map((i) => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.006, 16), i === GM ? gmDotMat : dotMat);
    d.name = `${APPS[i]!.name}-running`;
    d.renderOrder = 2;
    screen.group.add(d);
    return { d, i };
  });

  const iconX = (i: number) => dockX + PAD + GAP + i * (ICON + GAP) + ICON / 2;
  const icons = APPS.map((app) => {
    const tex = new THREE.CanvasTexture(iconCanvas(app.glyph) as unknown as HTMLCanvasElement);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const s = ICON / 1000;
    const geo = new THREE.PlaneGeometry(s, s);
    geo.translate(0, s / 2, 0); // grow upward from the shelf, like the real dock
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
    m.name = app.name;
    m.renderOrder = 3;
    screen.group.add(m);
    return m;
  });
  const scales = new Array<number>(count).fill(1);
  const xs = new Array<number>(count).fill(0);

  // Tooltip, drawn once and faded.
  const tipC = new OffscreenCanvas(560, 190);
  const tg = tipC.getContext("2d")!;
  box(tg, 10, 10, 540, 130, 30, "rgba(28,28,32,0.92)", "rgba(255,255,255,0.12)", 2);
  tg.beginPath();
  tg.moveTo(255, 140);
  tg.lineTo(280, 172);
  tg.lineTo(305, 140);
  tg.fillStyle = "rgba(28,28,32,0.92)";
  tg.fill();
  text(tg, "GenMotion", 280, 76, { size: 64, weight: 500, color: "#ededef", align: "center", tracking: -0.01 });
  const tipTex = new THREE.CanvasTexture(tipC as unknown as HTMLCanvasElement);
  tipTex.colorSpace = THREE.SRGBColorSpace;
  tipTex.anisotropy = 8;
  const tipMat = new THREE.MeshBasicMaterial({ map: tipTex, transparent: true, depthWrite: false, toneMapped: false });
  const tip = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.19), tipMat);
  tip.name = "tooltip-genmotion";
  tip.renderOrder = 4;
  screen.group.add(tip);

  const cursor = createCursor(ctx, 64, 1000);
  screen.group.add(cursor);

  const target = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const gmX = iconX(GM);
  const BASE = DOCK_Y + ICON / 2; // icon bottoms sit on this line
  const MAG = 0.32;
  const REACH = 2.4; // icons either side that feel the pointer

  return ({ frame, time }) => {
    // Pointer glides in from the right and settles on the GenMotion icon.
    const cx = interpolate(frame, [0, 12], [gmX + 420, gmX + 18], Easing.easeOut);
    const cy = interpolate(frame, [0, 12], [DOCK_Y + 160, DOCK_Y - 10], Easing.easeOut);
    screen.local(cx, cy, 0.006, cursor.position);

    // Magnification from the pointer's distance to each icon's resting
    // position, with a smooth cosine falloff.
    const hover = interpolate(frame, [2, 12], [0, 1], Easing.easeOut);
    for (let i = 0; i < count; i++) {
      const d = Math.abs(iconX(i) - cx) / (ICON + GAP);
      const f = d < REACH ? (Math.cos((Math.PI * d) / REACH) + 1) / 2 : 0;
      scales[i] = 1 + MAG * hover * f;
    }
    // Reflow: magnified icons push their neighbours apart, never overlap.
    let x = 0;
    for (let i = 0; i < count; i++) {
      const w = ICON * scales[i]!;
      x += (i === 0 ? PAD + GAP : GAP) + w / 2;
      xs[i] = x;
      x += w / 2;
    }
    const total = x + GAP + PAD;
    // Anchor the reflow on the hovered icon so it stays under the pointer.
    const shift = gmX - xs[GM]!;
    const left = shift;
    const right = shift + total;

    const press = interpolate(frame, [15, 17, 20], [1, 0.9, 1], Easing.easeOut);
    const hop = interpolate(frame, [17, 21, 23], [0, 28, 10], Easing.easeOut);
    icons.forEach((m, i) => {
      const sc = scales[i]! * (i === GM ? press : 1);
      m.scale.setScalar(sc);
      screen.local(xs[i]! + shift, BASE - (i === GM ? hop : 0), 0.002, m.position);
    });

    // Shelf stretches to the new width.
    const sy = DOCK_Y;
    screen.local(left + CAP / 2, sy, 0.001, capL.position);
    screen.local(right - CAP / 2, sy, 0.001, capR.position);
    mid.scale.x = Math.max(0.001, (right - left - CAP * 2) / 1000);
    screen.local((left + right) / 2, sy, 0.001, mid.position);
    const sepX = xs[count - 2]! + shift + (ICON * scales[count - 2]!) / 2 + GAP / 2;
    screen.local(sepX, DOCK_Y, 0.0015, separator.position);
    for (const { d, i } of dots) screen.local(xs[i]! + shift, BASE + 12, 0.0015, d.position);
    gmDotMat.opacity = interpolate(frame, [18, 21], [0, 0.75], Easing.easeOut);

    // Tooltip: arrow tip sits 14px above the (magnified, hopping) icon.
    const gmTop = BASE - ICON * scales[GM]! * press - hop;
    tipMat.opacity = interpolate(frame, [6, 10], [0, 1], Easing.easeOut);
    screen.local(gmX, gmTop - 14 - 77, 0.004, tip.position);

    // Camera: low and rolled, pushing slowly toward the icon.
    screen.world(gmX, DOCK_Y - 60, 0, target);
    const dist = interpolate(frame, [0, 23], [1.02, 0.88], Easing.easeInOut);
    // A touch above the deck, so the bottom bezel and the keyboard edge come into shot.
    aim(camera, target, dist, -24, 9, 5);
    handheld(camera, time, 1.2, 1);

    screen.world(gmX, DOCK_Y - 80, 0, focus);
    film.render(frame, focus, 45);
  };
}
