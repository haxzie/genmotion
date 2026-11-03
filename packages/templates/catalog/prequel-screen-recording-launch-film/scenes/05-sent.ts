/**
 * Scene 5 — Sent. 11:52 PM, Slack. The export is attached in the composer;
 * "here it is. sorry it took a while" is typed and sent. The video lands in
 * the thread. "Maya Chen is typing…". Then her reply: "You should try
 * Prequel!", and the prequel.sh link preview unfurls under it — the first
 * bright thing in the film. The cursor finds the link and clicks.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, withFonts, prog, inOutCubic, outCubic, lerp, keyed, framing } from "../components/core";
import { placeOn, makeCursor, mousePath, type Rect } from "../components/page";
import { put, at, sprite } from "../components/mac";
import {
  SL, FEED_X, COMPOSER, COMPOSER_BOTTOM, COMPOSER_H, COMPOSER_CHIP_H, ROW, SENT_Y, REPLY_Y, TYPING_Y, UNFURL,
  makeSlack, fileChip, composerText, composerBox, sentMessage, typingIndicator, replyMessage,
} from "../components/slack";
import { BG, makeFilm } from "../components/film";
import { SENT_T as T } from "../components/timeline";
import typingTiming from "../assets/typing-slack-reply.timing.json";

type Steps = { frame: number; text: string }[];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, camera, width, height } = ctx;
    const D = fitCamera(camera, height);
    const FR = framing(width, height);
    const fit = Math.max(0.9, FR.fit);
    const cam = camera as THREE.PerspectiveCamera;
    scene.background = new THREE.Color(BG);

    const slack = makeSlack("slack", undefined, ctx.manager);
    slack.u.exposure.value = 0.86;
    scene.add(slack.mesh);

    // ----------------------------------------------------------- overlays
    const chip = fileChip();
    const steps = typingTiming.steps as Steps;
    const texts = new Map<string, ReturnType<typeof composerText>>();
    for (const s of steps) if (!texts.has(s.text)) texts.set(s.text, composerText(s.text));
    texts.set("", composerText(""));
    const placeholder = composerText("", true);
    const sent = sentMessage(ctx.manager);
    const typing = typingIndicator();
    const reply = replyMessage(ctx.manager);
    // the preview "unfurls": a cover in the feed's colour lifts off the card
    const cover = sprite("unfurl-cover", UNFURL.w + 4, UNFURL.h + 4, (k) => k.rect(0, 0, UNFURL.w + 4, UNFURL.h + 4, SL.main), 2, 5);

    const boxFull = composerBox(true);
    const boxEmpty = composerBox(false);
    boxFull.mesh.renderOrder = boxEmpty.mesh.renderOrder = 3; // under the chip and the text
    const FULL_Y = COMPOSER_BOTTOM - COMPOSER_H - COMPOSER_CHIP_H;
    const CHIP = { x: COMPOSER.x + 14, y: FULL_Y + ROW.chip };
    const LINE = { x: COMPOSER.x + 16, y: FULL_Y + ROW.text - 13 };
    const LINE_EMPTY = { x: COMPOSER.x + 16, y: COMPOSER.y + ROW.text - 13 };
    const link = at(reply, "link", FEED_X, REPLY_Y);
    const card: Rect = { x: FEED_X + UNFURL.x, y: REPLY_Y + UNFURL.y, w: UNFURL.w, h: UNFURL.h };
    const all = [boxFull, boxEmpty, chip, placeholder, sent, typing, reply, cover, ...texts.values()];

    const cursor = makeCursor("cursor", 30);
    const film = makeFilm(scene, camera, width, height, D);

    // camera keys: composer → the sent video → the reply and its preview
    const [l0, l1] = T.liftCam as [number, number];
    const [c0, c1] = T.toCard as [number, number];
    const zoomK: [number, number][] = [[0, 2.0], [l0, 2.05], [l1, 1.75], [c0, 1.75], [c1, 1.72], [T.length, 1.8]];
    const fxK: [number, number][] = [[0, 640], [l0, 625], [l1, 640], [c0, 640], [c1, card.x + card.w / 2 - 10], [T.length, card.x + card.w / 2 - 20]];
    const fyK: [number, number][] = [[0, 735], [l0, 745], [l1, 370], [c0, 370], [c1, REPLY_Y + 90], [T.length, REPLY_Y + 92]];
    const rxK: [number, number][] = [[0, 0.06], [l0, 0.06], [l1, 0.04], [c0, 0.04], [c1, 0.02]];
    const ryK: [number, number][] = [[0, -0.1], [l0, -0.1], [l1, 0.07], [c0, 0.07], [c1, -0.04]];
    const rot = new THREE.Euler();
    const tmp = new THREE.Vector3();

    return ({ frame: f }) => {
      for (const s of all) s.mesh.visible = false;
      const hx = Math.sin(f * 0.19) * 0.02 + Math.sin(f * 0.47) * 0.008;
      const hy = Math.cos(f * 0.15) * 0.016 + Math.sin(f * 0.63) * 0.006;

      const zoom = keyed(f, zoomK) * fit;
      rot.set(keyed(f, rxK), keyed(f, ryK), 0);
      slack.mesh.rotation.copy(rot);
      slack.mesh.position.copy(placeOn(slack, keyed(f, fxK), keyed(f, fyK), rot, tmp));
      cam.position.set(hx, hy, D / zoom);
      slack.u.exposure.value = 0.86 * (0.3 + 0.7 * prog(f, 0, 6, outCubic));

      // the composer: attachment + the line being typed, then empty again
      if (f < T.enter) {
        put(slack, boxFull, COMPOSER.x, FULL_Y);
        put(slack, chip, CHIP.x, CHIP.y);
        let shown = "";
        for (const s of steps) if (s.frame + T.typeAt <= f) shown = s.text;
        put(slack, texts.get(shown)!, LINE.x, LINE.y);
      } else {
        put(slack, boxEmpty, COMPOSER.x, COMPOSER.y);
        put(slack, placeholder, LINE_EMPTY.x, LINE_EMPTY.y);
      }

      // the feed
      const sIn = prog(f, T.enter, T.rise, outCubic);
      if (f >= T.enter) put(slack, sent, FEED_X, SENT_Y + (1 - sIn) * 18, { opacity: sIn });
      if (f >= T.typing[0]! && f < T.typing[1]!) {
        put(slack, typing, COMPOSER.x + 4, TYPING_Y - 11, { opacity: 0.75 + 0.25 * Math.sin((f - T.typing[0]!) * 0.5) });
      }
      const rIn = prog(f, T.reply, T.rise, outCubic);
      if (f >= T.reply) {
        put(slack, reply, FEED_X, REPLY_Y + (1 - rIn) * 18, { opacity: rIn });
        const unf = prog(f, T.unfurl, 10, outCubic);
        put(slack, cover, card.x - 2, card.y - 2 + (1 - rIn) * 18, { opacity: 1 - unf });
      }

      // the lens follows the story down the window
      const focus: Rect = f < l0 + 10 ? { x: COMPOSER.x, y: FULL_Y, w: 700, h: COMPOSER.h + COMPOSER_CHIP_H }
        : f < T.reply ? { x: FEED_X, y: SENT_Y, w: 400, h: 250 }
        : { x: FEED_X, y: REPLY_Y, w: card.x + card.w - FEED_X, h: 190 };
      slack.lens(focus, 14, zoom, 1);

      // the cursor arrives for the link
      if (f >= T.cursorIn) {
        const t = prog(f, T.cursorIn, T.click - 5 - T.cursorIn, inOutCubic);
        const pt = mousePath(t, card.x + card.w + 120, card.y + card.h + 120, link.x + 4, link.y + 3, 0.12);
        const press = f >= T.click && f < T.click + 3 ? 1 : 0;
        cursor.group.visible = true;
        cursor.set(slack, pt.x, pt.y, { press, ring: f >= T.click ? (f - T.click) / 12 : 0, opacity: prog(f, T.cursorIn, 6, outCubic) });
      } else cursor.group.visible = false;

      film.set(f, { flash: f === T.click ? 0.05 : 0, flashColor: "#ffffff" });
    };
  });
}
