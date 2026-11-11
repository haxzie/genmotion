import * as THREE from "three";
import { withFonts, Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/Inter.woff2";
import alexUrl from "../assets/call/alex.webm";
import mayaUrl from "../assets/call/maya.webm";
import kaiUrl from "../assets/call/kai.webm";
import alexStillUrl from "../assets/call/alex-portrait.png";
import mayaStillUrl from "../assets/call/maya-portrait.png";
import kaiStillUrl from "../assets/call/kai-portrait.png";
import { C } from "../components/brand";
import { botMesh, type EyeStyle } from "../components/bots";
import { footage } from "../components/footage";
import { mediaTile, rectTrack } from "../components/tile";
import { canvasMesh, fillRR, layer, place, setOpacity, setupStage, text } from "../components/stage";
import { drawMic, panel } from "../components/ui";

/**
 * 0:13.67–0:19.37 (reference frames 410–581). Local frame 0 = ref 410.
 * The call: three portrait tiles and the "Someone wants to join" prompt pull
 * back and re-flow into a 2×2 grid; the prompt becomes Research Bot's tile.
 * The bot then sits in the call, blinking and glancing around.
 * People are the reference's own footage, cropped per tile.
 */
const R = (ref: number) => ref - 410; // ref frame → local frame

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: "Inter", url: interUrl }], () => {
    const { scene } = setupStage(ctx, C.white);
    const loader = new THREE.TextureLoader(ctx.manager);
    const still = (url: string) => {
      const t = loader.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const clipFrom = 0; // clips start at ref frame 434
    const people = [
      { name: "alex", vid: footage(ctx, alexUrl, { from: clipFrom, size: [506, 260] }), still: still(alexStillUrl), sa: 344 / 599 },
      { name: "maya", vid: footage(ctx, mayaUrl, { from: clipFrom, size: [507, 260] }), still: still(mayaStillUrl), sa: 383 / 599 },
      { name: "kai", vid: footage(ctx, kaiUrl, { from: clipFrom, size: [506, 259] }), still: still(kaiStillUrl), sa: 383 / 599 },
    ];
    const tiles = people.map((p) => {
      const t = mediaTile(`video-tile-${p.name}`, p.still, p.sa, p.vid.texture, 506 / 260);
      scene.add(t.mesh);
      return t;
    });
    // Kai travels over the others during the re-flow
    layer(tiles[0].mesh, 10);
    layer(tiles[1].mesh, 11);
    layer(tiles[2].mesh, 13);

    const ease = Easing.easeInOut;
    const rects = [
      rectTrack([[0, -40, 3, 384, 600], [12, 102, 70, 340, 522], [18, 112, 70, 390, 448], [20, 115, 70, 423, 391], [22, 118, 70, 458, 340], [24, 118, 64, 480, 314], [28, 119, 66, 510, 264]], ease),
      rectTrack([[0, 760, 3, 384, 600], [12, 800, 70, 352, 490], [18, 768, 70, 378, 448], [20, 730, 70, 422, 362], [22, 698, 70, 454, 346], [24, 672, 64, 480, 314], [28, 650, 66, 511, 264]], ease),
      rectTrack([[0, 360, 3, 384, 600], [12, 448, 70, 339, 522], [18, 384, 192, 387, 454], [20, 326, 272, 416, 400], [22, 250, 330, 454, 358], [24, 192, 352, 480, 314], [28, 119, 348, 510, 263]], ease),
    ];
    const cardRect = rectTrack([[0, 778, 430, 435, 178], [12, 819, 448, 397, 176], [18, 806, 448, 404, 160], [20, 794, 432, 406, 176], [22, 768, 432, 422, 176], [24, 746, 384, 438, 224], [28, 650, 348, 511, 263]], ease);
    const barRect = rectTrack([[0, 292, 640, 520, 56], [12, 416, 640, 426, 46], [28, 400, 632, 457, 52]], ease);
    const botPos = rectTrack([[0, 824, 512, 52, 0], [12, 860, 525, 50, 0], [18, 864, 512, 60, 0], [20, 870, 502, 70, 0], [22, 874, 496, 96, 0], [24, 880, 490, 128, 0], [28, 898, 485, 170, 0]], ease);

    // ------------------------------------------------ prompt → bot tile
    const card = panel("research-bot-tile", { color: "#ffffff", radius: 16, shadow: 26, shadowY: 8, shadowA: 0.1, border: "#cfe0ee", borderA: 0 });
    layer(card.mesh, 20);
    scene.add(card.mesh);
    const cardText = canvasMesh("join-request", 435, 178, (g) => {
      // people glyph
      g.strokeStyle = "#333"; g.lineWidth = 1.6;
      g.beginPath(); g.arc(30, 27, 4.5, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(30, 41, 8, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      g.beginPath(); g.arc(39, 28, 3.5, -Math.PI * 0.6, Math.PI * 0.6); g.stroke();
      text(g, "Someone wants to join this call", 50, 31, { size: 17, color: "#1f1f1f" });
      text(g, "Research Bot", 92, 77, { size: 21, weight: 500, color: "#1f1f1f" });
      text(g, "Asking to join · Launch kickoff", 92, 99, { size: 13, color: "#5f6368" });
      text(g, "View all", 292, 147, { size: 16, weight: 500, color: "#1f6fd6" });
      fillRR(g, 344, 133, 70, 29, 14.5, "#e6eefb");
      text(g, "Admit", 379, 148, { size: 16, weight: 500, color: "#1f6fd6", align: "center" });
    });
    cardText.geometry.translate(217.5, -89, 0);
    layer(cardText, 21);
    scene.add(cardText);
    const tileLabel = canvasMesh("research-bot-label", 160, 30, (g) => text(g, "Research Bot", 0, 15, { size: 19, color: "#8a9099" }));
    tileLabel.geometry.translate(80, 0, 0);
    layer(tileLabel, 22);
    place(tileLabel, 673, 587);
    scene.add(tileLabel);

    // the bot, with its expressions
    const EXPR: Record<string, EyeStyle> = {
      normal: { rot: 0, dx: 0.0, dy: 0.06, w: 0.1, h: 0.24, gap: 0.24 },
      blink: { rot: 0, dx: 0.0, dy: 0.08, w: 0.07, h: 0.07, gap: 0.22 },
      look: { rot: -0.45, dx: 0.04, dy: 0.04, w: 0.1, h: 0.23, gap: 0.24 },
      lookL: { rot: 0.4, dx: -0.04, dy: 0.06, w: 0.1, h: 0.23, gap: 0.24 },
      lazy: { rot: -0.15, dx: 0.0, dy: 0.08, w: 0.2, h: 0.085, gap: 0.26 },
    };
    const faces = Object.fromEntries(
      Object.entries(EXPR).map(([k, e]) => {
        const m = botMesh("blue", 170, `research-bot-${k}`, { eyes: e });
        layer(m, 23);
        scene.add(m);
        return [k, m];
      }),
    ) as Record<keyof typeof EXPR, THREE.Mesh>;
    const exprAt = (ref: number): keyof typeof EXPR =>
      ref < 476 ? "normal" : ref < 481 ? "blink" : ref < 516 ? "normal" : ref < 528 ? "look" : ref < 536 ? "lookL" : "lazy";

    // ------------------------------------------------------- toolbar
    const BAR_W = 457, BAR_H = 52;
    const bar = canvasMesh("meeting-toolbar", BAR_W, BAR_H, (g) => {
      fillRR(g, 0, 0, BAR_W, BAR_H, 26, "#ffffff");
      g.strokeStyle = "#e3e3e3"; g.lineWidth = 1;
      g.beginPath(); g.roundRect(0.5, 0.5, BAR_W - 1, BAR_H - 1, 25.5); g.stroke();
      const cy = 26;
      const circ = (x: number) => { g.beginPath(); g.arc(x, cy, 19, 0, Math.PI * 2); g.fillStyle = "#f1f3f4"; g.fill(); };
      g.fillStyle = "#3c4043";
      for (const dx of [-6, 0, 6]) { g.beginPath(); g.arc(27 + dx, cy, 1.6, 0, Math.PI * 2); g.fill(); }
      circ(71); drawMic(g, 71, cy, 16, "#3c4043");
      g.strokeStyle = "#3c4043"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(105, cy + 2); g.lineTo(109, cy - 2); g.lineTo(113, cy + 2); g.stroke();
      circ(148); g.strokeRect(140, cy - 6, 11, 12); g.beginPath(); g.moveTo(151, cy - 2); g.lineTo(157, cy - 5); g.lineTo(157, cy + 5); g.lineTo(151, cy + 2); g.stroke();
      circ(192); g.strokeRect(184, cy - 6, 16, 12); g.beginPath(); g.moveTo(192, cy + 6); g.lineTo(192, cy + 9); g.stroke();
      circ(236); g.beginPath(); g.arc(236, cy, 8, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(236, cy + 1, 4, 0.2, Math.PI - 0.2); g.stroke();
      circ(281); g.strokeRect(273, cy - 6, 16, 12); g.beginPath(); g.moveTo(276, cy + 1); g.lineTo(285, cy + 1); g.stroke();
      circ(325); g.beginPath(); g.roundRect(319, cy - 8, 12, 16, 5); g.stroke();
      for (const dy of [-6, 0, 6]) { g.beginPath(); g.arc(369, cy + dy, 1.6, 0, Math.PI * 2); g.fillStyle = "#3c4043"; g.fill(); }
      fillRR(g, 397, 7, 52, 38, 19, "#d93025");
      g.strokeStyle = "#fff"; g.lineWidth = 2.4; g.lineCap = "round";
      g.beginPath(); g.arc(423, cy + 7, 10, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    });
    layer(bar, 30);
    scene.add(bar);

    return ({ frame: f, time }) => {
      const ref = f + 410;
      const mix = ref >= 430 ? 1 : 0;
      const zoomB = interpolate(ref, [430, 438], [1.45, 1], Easing.outCubic);
      people.forEach((p, i) => {
        p.vid.seek(Math.max(0, (ref - 434) / 30));
        const [x, y, w, h] = rects[i](f);
        tiles[i].rect(x, y, w, h);
        tiles[i].u.uMix.value = mix;
        tiles[i].u.uZoomB.value = zoomB;
      });

      const [cx, cy, cw, ch] = cardRect(f);
      card.rect(cx, cy, cw, ch);
      const toTile = interpolate(f, [R(424), R(434)], [0, 1]);
      card.u.uColor.value.set("#ffffff").lerp(new THREE.Color(C.blueBg), toTile);
      card.u.uShadow.value.z = 0.1 * (1 - toTile);
      card.u.uBorderA.value = toTile * 0.9;
      place(cardText, cx, cy);
      setOpacity(cardText, interpolate(f, [R(420), R(426)], [1, 0]));
      setOpacity(tileLabel, interpolate(f, [R(434), R(439)], [0, 1]));

      const [bx, by, bd] = botPos(f);
      const e = exprAt(ref);
      const bob = f > R(440) ? Math.sin(time * 2.4) * 2.5 : 0;
      for (const [k, m] of Object.entries(faces)) {
        m.visible = k === e;
        place(m, bx, by + bob);
        m.scale.setScalar(bd / 170);
        m.rotation.z = e === "look" ? -0.08 : e === "lookL" ? 0.06 : 0;
      }

      const [tx, ty, tw, th] = barRect(f);
      place(bar, tx + tw / 2, ty + th / 2);
      bar.scale.set(tw / BAR_W, th / BAR_H, 1);
    };
  });
}
