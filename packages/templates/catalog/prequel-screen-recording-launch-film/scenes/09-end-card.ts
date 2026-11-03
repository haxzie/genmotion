/**
 * Scene 9 — End card. Black. "Prequel" fades up in the site's own
 * wordmark face (Playwrite VN 400, with the hairline stroke the site adds to
 * it), then a small white line rises under it: "Made for Mac" with the Apple
 * mark beside the word, as the site sets it.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { FONT, PX, fitCamera, withFonts, prog, outCubic, inOutSine } from "../components/core";
import { withFont } from "../components/fonts";
import { makeFilm } from "../components/film";
import playwriteUrl from "../assets/fonts/PlaywriteVN-400.woff2";

/** The Apple mark, verbatim from the site's AppleIcon (apps/web/src/components/icons.tsx), 24 × 24 viewBox. */
const APPLE_D =
  "M17.05 12.536c-.03-3.02 2.47-4.47 2.58-4.54-1.41-2.06-3.6-2.34-4.37-2.37-1.86-.19-3.63 1.09-4.57 1.09-.94 0-2.4-1.07-3.94-1.04-2.03.03-3.9 1.18-4.94 3-2.1 3.65-.54 9.06 1.51 12.03 1 1.45 2.2 3.08 3.77 3.02 1.51-.06 2.08-.98 3.91-.98 1.83 0 2.34.98 3.94.95 1.63-.03 2.66-1.48 3.65-2.93 1.15-1.68 1.62-3.31 1.65-3.39-.04-.02-3.17-1.22-3.2-4.84M14.32 3.72c.83-1.01 1.4-2.42 1.24-3.82-1.2.05-2.65.8-3.51 1.81-.77.89-1.45 2.32-1.27 3.69 1.34.1 2.71-.68 3.54-1.68";

const T = {
  word: [6, 22],       // the wordmark fades up
  button: [18, 32],    // "Made for Mac" rises in under it, overlapping
};

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () =>
    withFont(ctx, "Playwrite VN", playwriteUrl, { weight: "400" }, () => {
      const { scene, camera, width, height, durationInFrames: N } = ctx;
      const D = fitCamera(camera, height);
      const cam = camera as THREE.PerspectiveCamera;
      scene.background = new THREE.Color("#000000");
      const S = height / 1080; // sizes are for a 1080 px tall frame

      // ------------------------------------------------------ the wordmark
      const RES = 2;
      const size = 110 * S;
      const font = `400 ${size * RES}px "Playwrite VN"`;
      const m = new OffscreenCanvas(8, 8).getContext("2d")!;
      m.font = font;
      const met = m.measureText("Prequel");
      const padX = size * 0.4 * RES;
      const asc = met.actualBoundingBoxAscent;
      const desc = met.actualBoundingBoxDescent;
      const padY = size * 0.2 * RES;
      const left = met.actualBoundingBoxLeft;
      const inkW = left + met.actualBoundingBoxRight;
      const W = Math.ceil(inkW + padX * 2);
      const H = Math.ceil(asc + desc + padY * 2);
      const wc = new OffscreenCanvas(W, H);
      const wg = wc.getContext("2d")!;
      wg.font = font;
      wg.fillStyle = "#f5f5f7";
      wg.strokeStyle = "#f5f5f7";
      wg.lineJoin = "round";
      wg.lineWidth = size * RES * 0.022; // the site's 0.4 px at 16 px, scaled
      wg.textBaseline = "alphabetic";
      wg.fillText("Prequel", padX + left, padY + asc);
      wg.strokeText("Prequel", padX + left, padY + asc);
      const wtex = new THREE.CanvasTexture(wc as unknown as HTMLCanvasElement);
      wtex.colorSpace = THREE.SRGBColorSpace;
      wtex.anisotropy = 8;
      const wordMat = new THREE.MeshBasicMaterial({ map: wtex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
      const word = new THREE.Mesh(new THREE.PlaneGeometry((W / RES) * PX, (H / RES) * PX), wordMat);
      word.name = "prequel-wordmark";
      // the canvas is padded evenly round the ink box, so its centre is the word's
      const WORD_Y = 78 * S;
      word.position.set(0, WORD_Y * PX, 0);

      // ------------------------------------------- the line under it
      // small, quiet white type with the Apple mark beside the word "Mac" (as the site sets it)
      const BR = 2;
      const tSize = 32 * S;
      const label = "Made for Mac";
      m.font = `400 ${tSize * BR}px ${FONT}`;
      const tw = m.measureText(label).width / BR;
      const icon = tSize * 1.0;
      const gap = tSize * 0.3;
      const lh = tSize * 1.6;
      const lw = tw + gap + icon + 8;
      const lc = new OffscreenCanvas(Math.ceil(lw * BR), Math.ceil(lh * BR));
      const lg = lc.getContext("2d")!;
      lg.scale(BR, BR);
      lg.font = `400 ${tSize}px ${FONT}`;
      lg.fillStyle = "#ededef";
      lg.textBaseline = "middle";
      lg.fillText(label, 4, lh / 2 + tSize * 0.04);
      // the Apple mark, a hair high for the leaf
      lg.save();
      lg.translate(4 + tw + gap, lh / 2 - icon / 2 - icon * 0.08);
      lg.scale(icon / 24, icon / 24);
      lg.fill(new Path2D(APPLE_D));
      lg.restore();
      const ltex = new THREE.CanvasTexture(lc as unknown as HTMLCanvasElement);
      ltex.colorSpace = THREE.SRGBColorSpace;
      ltex.anisotropy = 8;
      const lineMat = new THREE.MeshBasicMaterial({ map: ltex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
      const line = new THREE.Mesh(new THREE.PlaneGeometry(lw * PX, lh * PX), lineMat);
      line.name = "made-for-mac";
      const LINE_Y = -104 * S; // clear of the q's descender
      line.position.set(0, LINE_Y * PX, 0);

      const card = new THREE.Group();
      card.name = "end-card";
      card.add(word, line);
      scene.add(card);
      const film = makeFilm(scene, camera, width, height, D);

      return ({ frame: f }) => {
        // a plain fade up
        const w = prog(f, T.word[0]!, T.word[1]! - T.word[0]!, outCubic);
        wordMat.opacity = w;
        word.position.y = (WORD_Y - (1 - w) * 12 * S) * PX;

        // the line rises in under the word, quietly
        const b = prog(f, T.button[0]!, T.button[1]! - T.button[0]!, outCubic);
        lineMat.opacity = b;
        line.position.y = (LINE_Y - (1 - b) * 20 * S) * PX;

        // the whole card breathes in, very slowly
        const push = prog(f, 0, N, inOutSine);
        cam.position.set(0, 0, D / (1 + 0.035 * push));
        film.set(f, { vig: 0.6, grain: 0.05 });
      };
    }),
  );
}
