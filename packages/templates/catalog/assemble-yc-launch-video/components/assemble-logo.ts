import * as THREE from "three";
import { PX, rx, ry } from "./stage";
import { letters } from "./type";

/**
 * The Assemble lockup, measured off the film at its resting size (frame px, 1920x1080):
 * six translucent grey bars, six mint -> teal -> navy bars stepped down-right over them, and
 * the "Assemble" wordmark. Built at true size around the frame; scale / move the group.
 */
export const LOGO = {
  greyX: 515, greyTop: 447.5, frontX: 565, frontTop: 495, barW: 15, pitch: 25, barH: 140,
  frontXs: [565, 590, 615, 640, 662.5, 686.5],
  wordLeft: 785, capTop: 490, baseline: 590,
};

function frontBarTexture() {
  const c = new OffscreenCanvas(8, 256);
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0.0, "#d4d9d8");
  gr.addColorStop(0.12, "#c6e4dc");
  gr.addColorStop(0.22, "#a6dccf");
  gr.addColorStop(0.5, "#3b8b9d");
  gr.addColorStop(0.78, "#1b2a3d");
  gr.addColorStop(1.0, "#10131f");
  g.fillStyle = gr;
  g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function assembleLogo() {
  const group = new THREE.Group();
  group.name = "assemble-logo";
  const quad = new THREE.PlaneGeometry(1, 1);
  quad.translate(0, -0.5, 0); // origin at the bar's top edge
  const greyMat = new THREE.MeshBasicMaterial({ color: "#d8d8d8", transparent: true, opacity: 0.95, depthWrite: false });
  const frontTex = frontBarTexture();
  const grey: THREE.Mesh[] = [];
  const front: THREE.Mesh[] = [];
  const mark = new THREE.Group();
  mark.name = "assemble-mark";
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Mesh(quad, greyMat.clone());
    g.name = `mark-bar-back-${i + 1}`;
    g.position.set(rx(LOGO.greyX + i * LOGO.pitch + LOGO.barW / 2), ry(LOGO.greyTop), 0);
    g.scale.set(LOGO.barW * PX, LOGO.barH * PX, 1);
    const fm = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: frontTex, transparent: true, depthWrite: false }));
    fm.name = `mark-bar-${i + 1}`;
    fm.position.set(rx(LOGO.frontXs[i]! + LOGO.barW / 2), ry(LOGO.frontTop), 0.001);
    fm.scale.set(LOGO.barW * PX, LOGO.barH * PX, 1);
    mark.add(g, fm);
    grey.push(g);
    front.push(fm);
  }
  group.add(mark);

  const capH = LOGO.baseline - LOGO.capTop;
  const size = capH / 0.727;
  const word = letters("Assemble", { size, weight: 650, tracking: -0.01, color: "#050505" });
  word.group.name = "assemble-wordmark";
  // letters() centres each glyph plane on the em box middle; put the baseline where it was measured
  word.group.position.set(rx(LOGO.wordLeft), ry(LOGO.baseline - capH / 2 - size * 0.04), 0.002);
  group.add(word.group);
  word.track(-0.01, "left");
  return { group, mark, grey, front, word };
}
