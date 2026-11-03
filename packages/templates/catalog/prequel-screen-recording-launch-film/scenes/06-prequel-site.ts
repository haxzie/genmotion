/**
 * Scene 6 — prequel.sh. A hard cut from the dark Slack window into a bright
 * page: the film's first daylight. The camera drifts down from "The cinematic
 * screen recorder for Mac" to "Download for Mac"; the cursor clicks it.
 * Chrome's download bubble drops in, Prequel.dmg fills, done — and the cursor
 * opens it.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, withFonts, prog, inOutCubic, outCubic, keyed, framing } from "../components/core";
import { placeOn, makeCursor, mousePath, pressShade, type Rect } from "../components/page";
import { put, at } from "../components/mac";
import { makeBrowser, downloadBubble, paintBubbleIcon, DOWNLOAD_BTN, HEADLINE, BUBBLE } from "../components/chrome";
import { BG, makeFilm } from "../components/film";
import { SITE_T as T } from "../components/timeline";

const STEPS = [0, 12, 27, 41, 58, 73, 88, 100];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, camera, width, height } = ctx;
    const D = fitCamera(camera, height);
    const FR = framing(width, height);
    const fit = Math.max(0.9, FR.fit);
    const cam = camera as THREE.PerspectiveCamera;
    scene.background = new THREE.Color(BG);

    const web = makeBrowser("prequel-site", ctx.manager);
    scene.add(web.mesh);
    const shade = pressShade("download-for-mac-pressed", DOWNLOAD_BTN, DOWNLOAD_BTN.h / 2, web);

    const bubbles = STEPS.map((p) => downloadBubble(p, false));
    const doneB = downloadBubble(100, true);
    for (const b of [...bubbles, doneB]) paintBubbleIcon(b, ctx.manager);
    const open = at(doneB, "open", BUBBLE.x, BUBBLE.y);
    const bubbleRect: Rect = { x: BUBBLE.x, y: BUBBLE.y, w: doneB.w, h: doneB.h };

    const cursor = makeCursor("cursor", 30);
    const film = makeFilm(scene, camera, width, height, D);

    const btnC = { x: DOWNLOAD_BTN.x + DOWNLOAD_BTN.w / 2, y: DOWNLOAD_BTN.y + DOWNLOAD_BTN.h / 2 };
    const [p0, p1] = T.push as [number, number];
    const [b0, b1] = T.toBubble as [number, number];
    const zoomK: [number, number][] = [[0, 1.3], [p0, 1.3], [p1, 2.2], [b0, 2.2], [b1, 2.35], [T.length, 2.45]];
    const fxK: [number, number][] = [[0, HEADLINE.x + HEADLINE.w / 2], [p0, HEADLINE.x + HEADLINE.w / 2], [p1, btnC.x], [b0, btnC.x], [b1, BUBBLE.x + 105], [T.length, BUBBLE.x + 110]];
    const fyK: [number, number][] = [[0, HEADLINE.y + 150], [p0, HEADLINE.y + 150], [p1, btnC.y - 10], [b0, btnC.y - 10], [b1, BUBBLE.y + 70], [T.length, BUBBLE.y + 70]];
    const rxK: [number, number][] = [[0, 0.07], [p1, 0.03], [b0, 0.03], [b1, -0.03]];
    const ryK: [number, number][] = [[0, -0.12], [p1, -0.05], [b0, -0.05], [b1, 0.07]];
    const rot = new THREE.Euler();
    const tmp = new THREE.Vector3();
    const all = [...bubbles, doneB];

    return ({ frame: f }) => {
      for (const b of all) b.mesh.visible = false;
      const hx = Math.sin(f * 0.19) * 0.02 + Math.sin(f * 0.47) * 0.008;
      const hy = Math.cos(f * 0.15) * 0.016 + Math.sin(f * 0.63) * 0.006;

      const zoom = keyed(f, zoomK) * fit;
      rot.set(keyed(f, rxK), keyed(f, ryK), 0);
      web.mesh.rotation.copy(rot);
      web.mesh.position.copy(placeOn(web, keyed(f, fxK), keyed(f, fyK), rot, tmp));
      cam.position.set(hx, hy, D / zoom);
      web.u.exposure.value = 0.96;

      // the lens: headline, then the button, then the download
      const toBtn = prog(f, p0 + 20, p1 - p0 - 20, inOutCubic);
      const focus: Rect = f < b0 + 10
        ? {
            x: HEADLINE.x + (DOWNLOAD_BTN.x - HEADLINE.x) * toBtn, y: HEADLINE.y + (DOWNLOAD_BTN.y - HEADLINE.y) * toBtn,
            w: HEADLINE.w + (DOWNLOAD_BTN.w - HEADLINE.w) * toBtn, h: HEADLINE.h + (DOWNLOAD_BTN.h - HEADLINE.h) * toBtn,
          }
        : bubbleRect;
      web.lens(focus, 16, zoom, 0.85);

      // the download
      if (f >= T.bubble) {
        const bin = prog(f, T.bubble, 8, outCubic);
        const pr = prog(f, T.progress[0]!, T.progress[1]! - T.progress[0]!, (t) => t);
        const b = f >= T.done ? doneB : bubbles[Math.min(bubbles.length - 1, Math.floor(pr * (bubbles.length - 1) + 0.0001))]!;
        put(web, b, BUBBLE.x, BUBBLE.y - (1 - bin) * 10, { opacity: bin });
      }

      // the cursor: Download for Mac, then the finished file
      let mx: number, my: number;
      if (f < T.click + 8) {
        const pt = mousePath(prog(f, 6, T.click - 5 - 6, inOutCubic), btnC.x + 260, btnC.y + 190, btnC.x + 6, btnC.y + 4, 0.1);
        mx = pt.x; my = pt.y;
      } else {
        const pt = mousePath(prog(f, T.done + 4, T.open - 5 - T.done - 4, inOutCubic), btnC.x + 6, btnC.y + 4, open.x - 40, open.y + 6, 0.14);
        mx = pt.x; my = pt.y;
      }
      const c = f < T.open ? T.click : T.open;
      const press = f >= c && f < c + 3 ? 1 : 0;
      cursor.set(web, mx, my, { press, ring: f >= c ? (f - c) / 12 : 0 });
      (shade.material as THREE.MeshBasicMaterial).opacity = f >= T.click && f < T.click + 3 ? 0.22 : 0;

      // the cut in from the dark is the film's first daylight
      const flash = 0.35 * (1 - prog(f, 0, 10, outCubic)) + (f === T.click || f === T.open ? 0.04 : 0);
      film.set(f, { flash, flashColor: "#ffffff", vig: 0.8 });
    };
  });
}
