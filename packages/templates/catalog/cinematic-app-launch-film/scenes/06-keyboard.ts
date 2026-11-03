/**
 * Shot 6 — the keyboard. A laptop deck at a grazing angle with a razor-thin
 * plane of focus; keys go down in a typing rhythm, the screen glows behind.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { Easing, interpolate } from "@genmotion/three-engine";
import { aim, createFilm, handheld } from "../components/film";
import { createRoom } from "../components/screen";
import { text } from "../components/ui";

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const NUM = "1234567890";
const P = 0.19; // key pitch
const K = 0.168; // key cap size
/** Frame each key goes down on — "launch" typed in a real rhythm. */
const PRESSES: [string, number][] = [["L", 1], ["A", 4], ["U", 6], ["N", 9], ["C", 11], ["H", 14]];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera } = ctx;
  const film = createFilm(ctx, "#121214");
  scene.fog = new THREE.Fog("#121214", 3, 9);

  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(-3, 4, -2);
  const fill = new THREE.DirectionalLight(0xffffff, 0.9);
  fill.position.set(3, 2, 3);
  scene.add(key, fill, new THREE.AmbientLight(0xffffff, 0.35));
  createRoom(scene, [
    { x: -3, y: 2, z: -4, r: 1.8, b: 0.8 },
    { x: 2, y: 1.6, z: -5, r: 1.4, b: 0.5 },
  ]);

  const laptop = new THREE.Group();
  laptop.name = "laptop";
  scene.add(laptop);

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.06, 2.2),
    new THREE.MeshStandardMaterial({ color: "#77777c", roughness: 0.42, metalness: 0.85 }),
  );
  deck.name = "laptop-deck";
  deck.position.set(0, -0.03, 0.2);
  laptop.add(deck);

  // Lid with a glowing (out of focus) screen behind the keys.
  const lid = new THREE.Group();
  lid.name = "laptop-screen";
  lid.position.set(0, 0, -0.9);
  lid.rotation.x = -0.25;
  const lidBack = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 2.0, 0.04),
    new THREE.MeshStandardMaterial({ color: "#2a2a2e", roughness: 0.4, metalness: 0.8 }),
  );
  lidBack.position.y = 1.0;
  lidBack.name = "laptop-lid";
  const glowC = new OffscreenCanvas(512, 320);
  const gg = glowC.getContext("2d")!;
  gg.fillStyle = "#2c2c31";
  gg.fillRect(0, 0, 512, 320);
  gg.fillStyle = "#4a4a50";
  gg.fillRect(20, 40, 150, 260);
  gg.fillStyle = "#d9d9de";
  gg.fillRect(200, 60, 280, 160);
  text(gg, "Astra.", 340, 140, { size: 56, weight: 500, color: "#0c0c0e", align: "center" });
  const glowT = new THREE.CanvasTexture(glowC as unknown as HTMLCanvasElement);
  glowT.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.85), new THREE.MeshBasicMaterial({ map: glowT, toneMapped: false }));
  glow.position.set(0, 1.0, 0.021);
  glow.name = "laptop-display";
  lid.add(lidBack, glow);
  laptop.add(lid);

  // Legends atlas: one canvas, each key's legend plane gets its own UV cell.
  const chars = (NUM + ROWS.join("")).split("");
  const CELL = 128;
  const cols = 8;
  const atlas = new OffscreenCanvas(CELL * cols, CELL * Math.ceil(chars.length / cols));
  const ag = atlas.getContext("2d")!;
  chars.forEach((c, i) => {
    text(ag, c, (i % cols) * CELL + CELL / 2, Math.floor(i / cols) * CELL + CELL / 2 + 4, {
      size: 54,
      weight: 400,
      color: "#d4d4d8",
      align: "center",
    });
  });
  const atlasT = new THREE.CanvasTexture(atlas as unknown as HTMLCanvasElement);
  atlasT.colorSpace = THREE.SRGBColorSpace;
  atlasT.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();
  const legendMat = new THREE.MeshBasicMaterial({ map: atlasT, transparent: true, depthWrite: false, toneMapped: false });
  const capMat = new THREE.MeshStandardMaterial({ color: "#151517", roughness: 0.55, metalness: 0.1 });
  const capGeo = new THREE.BoxGeometry(K, 0.035, K);
  const rowsY = atlas.height / CELL;

  const keys = new Map<string, THREE.Object3D>();
  const allRows = [NUM, ...ROWS];
  const offsets = [0, 0.5, 0.75, 1.25];
  allRows.forEach((row, r) => {
    row.split("").forEach((c, i) => {
      const k = new THREE.Group();
      k.name = `key-${c.toLowerCase()}`;
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.name = `key-${c.toLowerCase()}-cap`;
      cap.position.y = 0.018;
      const idx = chars.indexOf(c);
      const geo = new THREE.PlaneGeometry(K * 0.8, K * 0.8);
      const uv = geo.attributes.uv!;
      const u0 = (idx % cols) / cols;
      const v0 = 1 - (Math.floor(idx / cols) + 1) / rowsY;
      for (let j = 0; j < uv.count; j++) {
        uv.setXY(j, u0 + uv.getX(j) / cols, v0 + uv.getY(j) / rowsY);
      }
      const legend = new THREE.Mesh(geo, legendMat);
      legend.name = `key-${c.toLowerCase()}-legend`;
      legend.rotation.x = -Math.PI / 2;
      legend.position.y = 0.0365;
      k.add(cap, legend);
      k.position.set((i + offsets[r]! - 5) * P, 0, (r - 1.5) * P);
      laptop.add(k);
      keys.set(c, k);
    });
  });
  // Space bar
  const space = new THREE.Mesh(new THREE.BoxGeometry(P * 5.2, 0.035, K), capMat);
  space.name = "key-space";
  space.position.set(0.2, 0.018, 2.5 * P);
  laptop.add(space);

  const target = new THREE.Vector3();
  const focus = new THREE.Vector3();
  return ({ frame, time }) => {
    for (const [c, f] of PRESSES) {
      const k = keys.get(c);
      if (k) k.position.y = interpolate(frame, [f, f + 1, f + 3], [0, -0.014, 0], Easing.easeOut);
    }
    // Grazing angle across the home row, slow slide to the right.
    const tx = interpolate(frame, [0, 17], [-0.25, 0.15], Easing.easeInOut);
    target.set(tx, 0.02, -0.05);
    aim(camera, target, 1.05, 32, 17, -5);
    handheld(camera, time, 1.4, 6);
    focus.set(tx + 0.1, 0.03, 0.0);
    film.render(frame, focus, 60);
  };
}
