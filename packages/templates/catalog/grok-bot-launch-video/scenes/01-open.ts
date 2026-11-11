import * as THREE from "three";
import { withFonts, track, Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/Inter.woff2";
import { C } from "../components/brand";
import { drawBot } from "../components/bots";
import { botSphere } from "../components/sphere";
import {
  canvasMesh, colorTrack, fillRR, gradientBackdrop, keys, layer, measure, place, setupStage, text,
} from "../components/stage";

/**
 * 0:00–0:04 (frames 0–120 of the reference).
 *  0–15   the "Introducing Grok Bot 1.0" title card, held.
 *  16–57  extreme close-up of the purple bot: eyes rotate up into view, then
 *         the sphere turns away and shrinks.
 *  58–120 hard cut to lavender: the sphere collapses into the Launch Bot
 *         notification's avatar and new eyes rotate in.
 */
const deg = THREE.MathUtils.degToRad;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: "Inter", url: interUrl }], () => {
    const { scene, view } = setupStage(ctx, C.white);
    view(640, 360, 1);

    // ---------------------------------------------------------- title card
    const title = new THREE.Group();
    title.name = "title-card";
    const titleStyle = { size: 82, weight: 400, color: "#0a0a0a", tracking: -1.5 };
    const tw = measure("Introducing Grok Bot", titleStyle);
    const fit = 768 / tw;
    const tStyle = { ...titleStyle, size: titleStyle.size * fit };
    const card = canvasMesh("introducing-grok-bot-1-0", 1280, 720, (g) => {
      g.fillStyle = C.white;
      g.fillRect(0, 0, 1280, 720);
      text(g, "Introducing Grok Bot", 172, 362, tStyle);
      fillRR(g, 975, 318, 135, 84, 42, "#0a0a0a");
      text(g, "1.0", 1043, 361, { size: 50, weight: 400, color: "#fff", align: "center", tracking: -1.5 });
      drawBot(g, "blue", 866, 208, 132, { eyes: { rot: -0.45, dx: 0.12, dy: 0.08, w: 0.1, h: 0.24 } });
      drawBot(g, "purple", 1041, 228, 76, { eyes: { rot: -0.1, dy: 0.12 } });
      drawBot(g, "teal", 1180, 258, 122, { eyes: { happy: true, dy: 0.12 } });
      drawBot(g, "red", 928, 503, 116, { eyes: { rot: -0.25, dx: 0.06, dy: 0.04 } });
      drawBot(g, "orange", 1158, 462, 104, { eyes: { rot: -0.4, dx: -0.08, dy: -0.02, h: 0.2 } });
      // the black bot looming in from bottom-left
      g.save();
      g.translate(168, 668);
      g.fillStyle = "#000";
      g.beginPath();
      g.arc(0, 0, 245, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#fff";
      for (const [x, y, l, w] of [[25, -14, 125, 74], [138, -64, 112, 60]]) {
        g.save();
        g.translate(x, y);
        g.rotate(-0.68);
        g.beginPath();
        g.roundRect(-w / 2, -l / 2, w, l, w / 2);
        g.fill();
        g.restore();
      }
      g.restore();
    }, { res: 2 });
    title.add(card);
    place(title, 640, 360);
    layer(title, 50);
    scene.add(title);

    // ------------------------------------------------------- backdrop + bot
    const bg = gradientBackdrop("purple-sky", "#040016", "#3a1a80");
    scene.add(bg.mesh);

    // notification card (behind the sphere)
    const NOTE_W = 936, NOTE_H = 208;
    const note = canvasMesh("launch-bot-notification", NOTE_W, NOTE_H, (g) => {
      fillRR(g, 0, 0, NOTE_W, NOTE_H, 62, "#a09abf");
      text(g, "Launch Bot", 156, 56, { size: 33, weight: 500, color: "#ffffff", tracking: -0.3 });
      text(g, "7:00 AM", 902, 58, { size: 30, weight: 400, color: "#cfcae4", align: "right" });
      text(g, "New headphones launching in 2 weeks.", 156, 108, { size: 33, weight: 400, color: "#ffffff", tracking: -0.3 });
      text(g, "I created a channel to keep us on track.", 156, 155, { size: 33, weight: 400, color: "#ffffff", tracking: -0.3 });
    });
    layer(note, 10);
    scene.add(note);

    const sphere = botSphere("launch-bot-avatar");
    layer(sphere.mesh, 20);
    scene.add(sphere.mesh);

    // close-up sphere geometry (ref px), frames 16–57
    const cx = track([[16, 660], [45, 660], [51, 650], [54, 590], [57, 512]]);
    const cy = track([[16, 965], [40, 905], [45, 900], [51, 860], [54, 740], [57, 643]]);
    const cr = track([[16, 770], [45, 770], [51, 720], [54, 590], [57, 451]]);
    // collapse into the avatar, frames 58–66 (absolute), then card-relative
    const ax = track([[58, 442], [59, 353], [60, 292], [61, 269], [62, 261], [66, 249]]);
    const ay = track([[58, 588], [59, 472], [60, 407], [61, 396], [62, 392]]);
    const ar = track([[58, 345], [59, 184], [60, 88], [61, 73], [62, 62], [64, 52], [68, 45], [80, 44]]);
    const noteY = (f: number) => interpolate(f, [58, 80], [424, 360], Easing.outCubic); // settles, then holds still

    const bgTop = colorTrack([[16, "#040016"], [22, "#080017"], [28, "#120632"], [34, "#1e0c46"], [45, "#3b1e84"], [52, "#4925a2"], [56, "#4d28ab"], [57, "#5f33cf"]]);
    const bgBot = colorTrack([[16, "#3a1a80"], [34, "#5a2cb4"], [45, "#5d2eb6"], [52, "#7b59da"], [56, "#8a6fe1"], [57, "#9e8ae9"]]);
    const sDark = colorTrack([[16, "#220e4c"], [26, "#3c1c7b"], [34, "#492393"], [57, "#4a2496"]]);
    const sLight = colorTrack([[16, "#4a2392"], [26, "#5b2db5"], [34, "#5e2db9"], [57, "#5e2db9"]]);

    return ({ frame: f }) => {
      title.visible = f < 16;

      if (f < 58) {
        // ---- close-up
        bg.set(bgTop(f), bgBot(f));
        note.visible = false;
        sphere.set(cx(f), cy(f), cr(f));
        sphere.u.uLight.value.copy(sLight(f));
        sphere.u.uDark.value.copy(sDark(f));
        sphere.u.uGloss.value = 0;
        // eyes rotate up into view (lat), then the sphere turns away (lon)
        const rise = interpolate(f, [16, 40], [-40, 0], Easing.outCubic);
        const turn = interpolate(f, [16, 50], [0, 4]) + interpolate(f, [50, 58], [0, 80], Easing.easeIn);
        sphere.eyes(
          { lat: deg(27 + rise), lon: deg(4 + turn), len: 0.45, wid: 0.2, tilt: deg(40) },
          { lat: deg(38 + rise), lon: deg(34 + turn), len: 0.43, wid: 0.17, tilt: deg(38) },
        );
      } else {
        // ---- lavender: notification, sphere becomes its avatar
        bg.set("#b4aaf0", "#e0dcf3");
        note.visible = true;
        const ny = noteY(f);
        place(note, 640, ny);
        const x = f <= 66 ? ax(f) : 248;
        const y = f <= 62 ? ay(f) : ny - 2 + interpolate(f, [62, 70], [32, 0], Easing.outCubic);
        sphere.set(x, y, ar(f));
        sphere.u.uLight.value.set("#7350e2");
        sphere.u.uDark.value.set("#5a34d2");
        sphere.u.uGloss.value = interpolate(f, [60, 68], [0, 1]);
        const spin = interpolate(f, [63, 72], [-100, 0], Easing.outCubic);
        // the wink: right eye snaps shut into a happy arc, holds, reopens;
        // the head tips into it with a small bounce
        const wink = interpolate(f, [86, 90, 101, 105], [0, 1, 1, 0], Easing.easeInOut);
        const tip = interpolate(f, [84, 90, 101, 108], [0, 1, 1, 0], Easing.easeInOut);
        const bounce = interpolate(f, [86, 89, 93, 102, 107], [0, 1, 0.35, 0.35, 0], Easing.easeInOut);
        sphere.u.uWink.value = wink;
        sphere.eyes(
          { lat: deg(-17 + 6 * tip), lon: deg(-1 + spin - 12 * tip), len: 0.6 * (1 - 0.12 * wink), wid: 0.26, tilt: deg(30 + 10 * tip) },
          { lat: deg(0 + 6 * tip), lon: deg(36 + spin - 12 * tip), len: 0.58, wid: 0.24, tilt: deg(28 + 10 * tip) },
        );
        // a little pop as the wink lands
        sphere.set(x, y - 3 * bounce, ar(f) * (1 + 0.06 * bounce));
      }
    };
  });
}
