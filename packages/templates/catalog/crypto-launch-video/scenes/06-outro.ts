import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, FONT_TECH } from "../components/brand";
import { ACTIVE as T } from "../components/copy";
import { atmosphere, coinRain, rayBurst, sheen } from "../components/fx";
import { backdrop } from "../components/backdrop";
import { PixelField, Txt, canvasMesh, ease, pxCamera, px, py, ramp, rect } from "../components/kit";
import { sk } from "../components/rig";
import { mat } from "../components/ui";
import markUrl from "../assets/gains-mark-loss.png";

/**
 * 28.9–35.0s of the reference. A dark mark surfaces, ignites inside a
 * flickering pixel frame and green bloom, slides left while the word types
 * on with a block caret, and the URL types beneath. Final lockup holds.
 */

// the pixel frame: a stepped ring of 83px cells around the mark
const CELL = 83;
const GX = 626, GY = 158, NX = 8, NY = 9;
function frameCells() {
  const out: [number, number][] = [];
  for (let i = 0; i < NX; i++)
    for (let j = 0; j < NY; j++) {
      const edgeX = i <= 1 || i >= NX - 2;
      const edgeY = j <= 1 || j >= NY - 2;
      const outer = i === 0 || i === NX - 1 || j === 0 || j === NY - 1;
      const cornerOuter = (i === 0 || i === NX - 1) && (j <= 1 || j >= NY - 2);
      const cornerTop = (j === 0 || j === NY - 1) && (i <= 2 || i >= NX - 3);
      if (!(edgeX || edgeY)) continue;
      if (cornerOuter || cornerTop) continue;
      if (!outer && !(i === 1 || i === NX - 2 || j === 1 || j === NY - 2)) continue;
      out.push([i, j]);
    }
  return out;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  pxCamera(ctx);
  const bg = backdrop(scene, { seed: 66, haze: 0 });
  const loader = new THREE.TextureLoader(ctx.manager);
  const markTex = loader.load(markUrl);
  markTex.colorSpace = THREE.SRGBColorSpace;
  markTex.anisotropy = 8;

  const bloom = canvasMesh(1920, 1080, (g) => {
    const r = g.createRadialGradient(960, 560, 0, 960, 560, 860);
    r.addColorStop(0, "rgba(90,16,18,0.95)");
    r.addColorStop(0.35, "rgba(56,10,11,0.75)");
    r.addColorStop(0.7, "rgba(25,5,5,0.35)");
    r.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 1920, 1080);
  }, { res: 0.5, name: "outro-bloom" });
  bloom.userData.pickable = false;
  bloom.position.z = -5;
  scene.add(bloom);

  // pixel frame: hairline cell outlines + flickering fills
  const cells = frameCells();
  const outline = canvasMesh(NX * CELL + 4, NY * CELL + 4, (g) => {
    g.strokeStyle = "rgba(242,208,95,0.45)";
    g.lineWidth = 1.2;
    for (const [i, j] of cells) g.strokeRect(2 + i * CELL, 2 + j * CELL, CELL, CELL);
  }, { res: 1.5, name: "pixel-frame", anchor: "left" });
  outline.geometry.translate(0, -(NY * CELL + 4) / 2, 0);
  outline.position.set(px(GX - 2), py(GY - 2), -1);
  outline.userData.pickable = false;
  scene.add(outline);
  const fills = new PixelField(
    cells.map(([i, j]) => [px(GX + (i + 0.5) * CELL), py(GY + (j + 0.5) * CELL)] as [number, number]),
    CELL - 2,
    { seed: 606, color: "#3b0a0c", hot: "#c99e10", name: "pixel-frame-fill" },
  );
  fills.mesh.position.z = -1.5;
  scene.add(fills.mesh);

  // the mark
  const markMat = new THREE.MeshBasicMaterial({ map: markTex, transparent: true, depthWrite: false, color: new THREE.Color("#2a2d2c") });
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(170, 170), markMat);
  mark.name = "gains-mark";
  scene.add(mark);
  const lit = new THREE.Color("#ffffff");
  const dark = new THREE.Color("#4a4c4b");

  // the word, typed with a yellow block caret
  const word = new Txt(T.outroWord, { size: 172, weight: 500, color: "#f4f4f4", font: FONT_TECH, tracking: -3, res: 2, name: "outro-word" });
  word.at(px(870), py(546), 1);
  scene.add(word.mesh);
  const wordCaret = rect(52, 132, C.yellow, 1, "outro-word-caret");
  scene.add(wordCaret);

  const url = new Txt(T.outroUrl, { size: 31, weight: 400, color: "#ececee", res: 3, name: "outro-url" });
  url.at(px(873), py(692), 1);
  scene.add(url.mesh);
  const urlCaret = rect(2.5, 36, "#ececee", 1, "outro-url-caret");
  scene.add(urlCaret);

  const fx = atmosphere(ctx, { seed: 66, start: 28.9, hits: [29.5] });
  const burst = rayBurst(scene, "ignite");
  burst.rays.position.set(px(950), py(566), -3);
  burst.ring.position.set(px(950), py(566), 1);
  // the losses keep coming: a slow coin rain deep behind the lockup
  const rain = coinRain(scene, {
    seed: 67, count: 60, from: 29.55, to: 34.6, radius: 26, gravity: 700, name: "coin-rain",
    emit: (_, r) => [(r() - 0.5) * 2600, py(-120), -700 + r() * 450],
    kick: (_, r) => [(r() - 0.5) * 80, -60 - r() * 120, 0],
  });

  return ({ frame, time }) => {
    const R = time + 28.9;
    bg.update(R);
    fx.update(R, frame);
    burst.update(R - 29.5, R);
    rain.update(R);

    // Beats after the ignite run on the reference clock pulled 0.8s earlier
    // (S), landing the ignite on the 29.5s pulse instead of after ~1.4s of black.
    const S = R + 0.8;

    // mark: already surfacing at the cut, drifting in while it waits to ignite
    const surface = ramp(R, 28.9, 29.1);
    const ignite = ramp(S, 30.28, 30.4);
    markMat.color.copy(dark).lerp(lit, ignite);
    markMat.opacity = Math.max(surface * 0.85, ignite);
    const slide = ramp(S, 30.85, 31.2, ease.inOut);
    const drift = 0.78 + 0.07 * ramp(R, 28.9, 29.5, ease.out);
    const ms = drift + (1 - drift) * slide;
    mark.scale.set(ms, ms, 1);
    mark.position.set(px(950 + (740 - 950) * slide), py(566 + (547 - 566) * slide), 2);

    // bloom + pixel frame
    const bloomO = sk(S, [[30.25, 0], [30.45, 1], [31.2, 0.85], [35, 0.9]]);
    mat(bloom).opacity = bloomO;
    const frameIn = ramp(S, 30.28, 30.34, ease.linear);
    const frameOut = ramp(S, 30.6, 30.9, ease.linear);
    const flick = S > 30.6 && Math.floor(frame / 2) % 3 === 0 ? 0.4 : 1;
    mat(outline).opacity = frameIn * (1 - frameOut) * flick;
    outline.visible = frameIn * (1 - frameOut) > 0.01;
    fills.set(ramp(S, 30.3, 31.0, ease.linear) * 1.3, 0.3);

    // word types on at ~12 chars/s, caret blinks then leaves
    const n = Math.max(0, Math.min(word.count, (S - 31.0) * 12 + 1));
    word.reveal(S >= 31.0 ? n : 0);
    const caretOn = S >= 30.95 && S < 31.75 && (n < word.count || Math.floor(frame / 5) % 2 === 0);
    wordCaret.visible = caretOn;
    wordCaret.position.set(px(870) + word.widthAt(Math.floor(n)) + 46, py(560), 2);

    // url types beneath with a thin caret that keeps blinking
    const u = Math.max(0, Math.min(url.count, (S - 31.6) * 15));
    url.reveal(u);
    urlCaret.visible = S >= 31.5 && (u < url.count || Math.floor(frame / 8) % 2 === 0);
    urlCaret.position.set(px(873) + url.widthAt(Math.floor(u)) + 4, py(692), 2);
  };
}
