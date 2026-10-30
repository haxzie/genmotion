/**
 * 0:09.7–0:15.9 (film frames 292–475). Keys below are written in FILM frames
 * (g = scene frame + 292) so they line up 1:1 with the reference.
 * "Text your customers" → the bot types a quote → the customer replies →
 * "Prepares your call-back list" on a desktop app → push in on the thread.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { setupStage, place, X, Y } from "../components/stage";
import { makeBot, POSE } from "../components/bot";
import { C, FONT_TEXT } from "../components/brand";
import { keys, ease, prog, smooth, bump } from "../components/anim";
import { makeDarkBg } from "../components/darkbg";
import { text, setOpacity, revealWords, revealFrac, type TextMesh } from "../components/text";
import { wordLine, lefts, animWord } from "../components/words";
import { RRect } from "../components/rrect";
import { canvasPlane } from "../components/glyphs";
import { drawQuoteCard, drawSidebar, drawHeaderPill } from "../components/ui";

const START = 292;
const HEAD = 62;
const ZOOM = 1.68;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  const { hw, hh } = setupStage(ctx, C.bg);
  const bgA = new THREE.Color(C.bg);
  const bgB = new THREE.Color("#fdfdfd");
  const bg = scene.background as THREE.Color;

  // ── Texting beat ──────────────────────────────────────────────────────
  const bot = makeBot("bot");
  scene.add(bot.root);
  const hOpts = { size: HEAD, weight: 500, color: C.ink, tracking: -0.02 };
  const title1 = wordLine("headline-text-your-customers", "Text your customers", hOpts);
  scene.add(title1.group);
  const t1Lefts = lefts(title1, 640);

  const bubble = new RRect(C.green, 212, 122, [60, 60, 60, 6]);
  bubble.name = "message-bubble-quote";
  const dots = [0, 1, 2].map((i) => {
    const d = new RRect("#ffffff", 18, 18, 9);
    d.name = `typing-dot-${i + 1}`;
    return d;
  });
  const msgHolder = new THREE.Group();
  msgHolder.name = "message-quote-text";
  const msg = text("Hi Gonzalo! Here's your quote:", { size: 29, weight: 400, color: "#ffffff", font: FONT_TEXT, tracking: -0.005, align: "left" });
  msg.name = "message-quote-line";
  msgHolder.add(msg);
  const card = canvasPlane(492, 287, 3, (g) => drawQuoteCard(g, 492, 287));
  card.name = "quote-card";
  const reply = new RRect(C.black, 116, 68, [34, 34, 6, 34]);
  reply.name = "reply-bubble";
  const replyDots = [0, 1, 2].map((i) => {
    const d = new RRect("#ffffff", 12, 12, 6);
    d.name = `reply-typing-dot-${i + 1}`;
    return d;
  });
  const replyText = text("Thanks, that was fast!", { size: 25, weight: 400, color: "#ffffff", font: FONT_TEXT, tracking: -0.005, align: "right" });
  replyText.name = "reply-thanks";
  scene.add(bubble, ...dots, msgHolder, card, reply, ...replyDots, replyText);

  // ── Desktop beat ──────────────────────────────────────────────────────
  const title2 = wordLine("headline-prepares-your-call-back-list", "Prepares your call-back list", hOpts);
  const t2Lefts = lefts(title2, 632);
  const t2Holder = new THREE.Group();
  t2Holder.add(title2.group);
  scene.add(t2Holder);

  // Desk group children live in window-relative px, y down: (rx, -ry).
  const desk = new THREE.Group();
  desk.name = "desktop-app";
  scene.add(desk);
  const R = (o: THREE.Object3D, rx: number, ry: number, z: number) => o.position.set(rx, -ry, z);
  const WW = 1080;
  const WH = 640;
  const shadow = new RRect("#000000", WW, WH, 22, { blur: 28, opacity: 0.1 });
  shadow.name = "desktop-window-shadow";
  R(shadow, WW / 2, WH / 2 + 10, 0);
  const win = new RRect(C.pane, WW, WH, 22);
  win.name = "desktop-window";
  R(win, WW / 2, WH / 2, 1);
  const sidebar = canvasPlane(402, WH, 3, (g) => drawSidebar(g, 402, WH));
  sidebar.name = "desktop-sidebar";
  R(sidebar, 201, WH / 2, 2);
  const header = canvasPlane(190, 70, 4, drawHeaderPill);
  header.name = "chat-header-front-desk";
  R(header, 742, 43, 2);
  const stamp = text("9:41 AM", { size: 16, weight: 400, color: "#8a8a8e", font: FONT_TEXT, tracking: 0 });
  stamp.name = "chat-timestamp";
  R(stamp, 742, 98, 2);
  desk.add(shadow, win, sidebar, header, stamp);

  interface Msg { bg: RRect; label: TextMesh; x0: number; x1: number; y0: number; y1: number; }
  const chat = (name: string, str: string, x0: number, x1: number, y0: number, y1: number, mine = false): Msg => {
    const bg2 = new RRect(mine ? C.black : C.bubbleGrey, x1 - x0, y1 - y0, 18);
    bg2.name = `${name}-bubble`;
    const label = text(str, { size: 18.5, weight: 400, color: mine ? "#ffffff" : "#16171a", font: FONT_TEXT, tracking: 0, align: "left", lineHeight: 1.5 });
    label.name = name;
    R(bg2, (x0 + x1) / 2, (y0 + y1) / 2, 3);
    const lines = str.split("\n").length;
    const lh = 18.5 * 1.5;
    // multi-line text planes are centred on their block; shift to first line
    R(label, x0 + 18, (y0 + y1) / 2 + ((lines - 1) * lh) / 2 - ((lines - 1) * lh) / 2, 4);
    desk.add(bg2, label);
    return { bg: bg2, label, x0, x1, y0, y1 };
  };
  const m1 = chat("chat-missed-calls", "14 missed calls today. Your callback list is\nready.", 418, 854, 133, 209);
  const m2 = chat("chat-start-calling", "Want to start calling them back?", 418, 854, 221, 270);
  const m3 = chat("chat-power-dialer", "Your Power Dialer session is ready. Want\nto start calling?", 418, 841, 281, 359);
  const m4 = chat("chat-reply-lets-go", "Let's go, I'll call them now.", 751, 1008, 373, 419, true);
  const m5 = chat("chat-open-allo", "Open Allo and hit Start. I'll text the ones\nyou miss.", 416, 817, 447, 519);
  const m4TextW = m4.label.userData.w - m4.label.userData.pad * 2;

  // Iris into the closing film: the same dark field scene 3 opens on, growing
  // out of the black reply bubble.
  const iris = makeDarkBg(hw, hh);
  iris.mesh.position.z = 900;
  (iris.mesh.material as THREE.ShaderMaterial).uniforms.uCenter!.value.set(X(920) + hw, Y(461) + hh);
  scene.add(iris.mesh);

  /** Width that eases to each new word's width over `dur` frames as it is typed. */
  const typed = (g: number, times: number[], widths: number[], dur = 4) => {
    let k = 0;
    while (k < times.length && g >= times[k]!) k++;
    if (k === 0) return widths[0]!;
    return THREE.MathUtils.lerp(widths[k - 1]!, widths[k]!, prog(g, times[k - 1]!, times[k - 1]! + dur, ease.out));
  };
  const count = (g: number, times: number[]) => times.filter((t) => g >= t).length;

  const MSG_T = [319, 326, 331, 334, 337];
  const msgEnds = msg.userData.ends.map((e) => e - msg.userData.pad);
  const msgBig = [212, ...msgEnds.map((e) => Math.max(212, e * 1.2 + 64))];
  const msgSmall = [300, ...msgEnds.map((e) => Math.max(300, e + 68))];
  const M4_T = [425, 428, 430, 432, 434, 435];
  const m4Ends = m4.label.userData.ends.map((e) => e - m4.label.userData.pad);
  const m4W = [0.01, ...m4Ends.map((e) => Math.min(e + 36, m4.x1 - m4.x0))];
  void m4TextW;

  return ({ frame, time }) => {
    const g = frame + START;

    // ── Texting beat (292–388) ─────────────────────────────────────────
    const u = prog(g, 318, 334, ease.inOut); // big layout → chat layout
    const cy = smooth(g, [318, 334, 342, 354, 366, 384], [300, 252, 212, 183, 156, 128]);
    const exitT = prog(g, 378, 388, ease.in);
    const exitY = -70 * exitT;
    const exitA = 1 - prog(g, 378, 386, ease.inQuad);

    // bot: lands from scene 1's leap, bounces up, then settles into the chat
    const bigY = smooth(g, [292, 299, 304, 310], [566, 506, 512, 510]);
    const r = THREE.MathUtils.lerp(86, 46, u) * (1 - exitT);
    const bx = THREE.MathUtils.lerp(520, 240, u);
    const by = THREE.MathUtils.lerp(bigY, cy + 14, u) - Math.sin(u * Math.PI) * 30 + exitY;
    bot.root.visible = r > 0.5;
    place(bot.root, bx, by, 400);
    const imp = 0.13 * bump(g, 292, 3.5) + 0.04 * bump(g, 304, 3);
    bot.root.scale.set(r * (1 + imp), r * (1 - imp), r);
    const yaw = keys(g, [292, 303], [-2.5, POSE.yaw], ease.out);
    bot.setLook(POSE.pitch + keys(g, [292, 303], [-0.25, 0], ease.out), yaw + Math.sin(time * 1.6) * 0.04, POSE.roll);
    bot.setBlink(Math.min(keys(g, [309, 311, 313, 315], [1, 0.1, 0.1, 1], ease.linear), keys(g, [362, 364, 366, 368], [1, 0.1, 0.1, 1], ease.linear)));
    bot.setSquash(1 + 0.08 * bump(g, 297, 4), Math.PI / 2);

    // title 1
    title1.words.forEach((w, i) => animWord(w, t1Lefts[i]!, 210, g, 293 + i * 3, 313 + i));

    // message bubble: big (bottom-left anchored at 676, 597) → chat layout
    const grow = prog(g, 296, 304, ease.outBack);
    const bigH = THREE.MathUtils.lerp(12, 122, grow) - 10 * prog(g, 319, 324, ease.out);
    const bigW = g < 319 ? THREE.MathUtils.lerp(20, 212, grow) : typed(g, MSG_T, msgBig);
    const bw = THREE.MathUtils.lerp(bigW, typed(g, MSG_T, msgSmall), u);
    const bh = THREE.MathUtils.lerp(bigH, 70, u);
    const bl = THREE.MathUtils.lerp(676, 323, u);
    const bcy = THREE.MathUtils.lerp(597 - bigH / 2, cy, u) + exitY;
    bubble.set(bw, bh, [bh / 2, bh / 2, bh / 2, 6]);
    place(bubble, bl + bw / 2, bcy, 0);
    bubble.opacity = g >= 296 ? exitA : 0;

    // typing dots in the big bubble
    dots.forEach((d, i) => {
      const bounce = Math.max(0, Math.sin((g - 300) * 0.5 - i * 0.9)) * 6;
      const gone = prog(g, 310 + (2 - i) * 2, 314 + (2 - i) * 2, ease.inOut);
      const sc = grow * (1 - gone);
      d.set(18 * sc, 18 * sc, 9 * sc);
      place(d, bl + 76 + i * 31.5, bcy + 2 - i * 3 - bounce, 1);
      d.opacity = sc > 0.01 ? 1 : 0;
    });

    // message text (typed word by word)
    const nWords = count(g, MSG_T);
    revealWords(msg, nWords);
    msgHolder.scale.setScalar(THREE.MathUtils.lerp(1.2, 1, u));
    place(msgHolder, bl + THREE.MathUtils.lerp(32, 34, u), bcy, 2);
    setOpacity(msg, nWords > 0 ? exitA * prog(g, 319, 321, ease.out) : 0);

    // quote card rises in under the message
    const cardA = prog(g, 337, 346, ease.out);
    place(card, 325 + 246, cy + 47 + 143.5 + (1 - cardA) * 16 + exitY, 0);
    card.scale.setScalar(0.94 + 0.06 * cardA);
    setOpacity(card, cardA * exitA);

    // reply: typing bubble grows from its bottom-right corner, then widens left
    const rIn = prog(g, 349, 356, ease.outBack);
    const one = prog(g, 359, 363, ease.inOut);
    const wide = prog(g, 362, 375, ease.out);
    // final width hugs the text: equal 24px padding either side
    const tw = replyText.userData.w - replyText.userData.pad * 2;
    const rw = THREE.MathUtils.lerp(THREE.MathUtils.lerp(116, 76, one), tw + 48, wide) * rIn;
    const rh = THREE.MathUtils.lerp(68, 60, wide) * rIn;
    const rRight = 1099;
    const rBottom = cy + 418 + 34 + exitY;
    reply.set(Math.max(rw, 0.01), Math.max(rh, 0.01), [rh / 2, rh / 2, 6, rh / 2]);
    place(reply, rRight - rw / 2, rBottom - rh / 2, 0);
    reply.opacity = g >= 349 ? exitA : 0;
    replyDots.forEach((d, i) => {
      const bounce = Math.max(0, Math.sin((g - 351) * 0.55 - i * 0.9)) * 4;
      const keep = i === 1 ? 1 - wide : 1 - one;
      const sc = rIn * keep;
      d.set(12 * sc, 12 * sc, 6 * sc);
      place(d, rRight - rw / 2 + (i - 1) * 21 * (1 - one), rBottom - rh / 2 - bounce * (1 - one), 1);
      d.opacity = sc > 0.01 ? exitA : 0;
    });
    revealFrac(replyText, Math.max(0, (rw - 48) / tw));
    place(replyText, rRight - 24, rBottom - rh / 2, 2);
    setOpacity(replyText, wide > 0.05 ? exitA * prog(g, 362, 366, ease.out) : 0);

    // ── Desktop beat (rises in under the outgoing chat from 380) ───────
    const deskOn = g >= 380;
    desk.visible = deskOn;
    t2Holder.visible = deskOn;
    const top = smooth(g, [380, 394, 402, 414], [780, 380, 342, 328]);
    const tY = smooth(g, [384, 396, 414], [250, 200, 187]);

    // push-in: T(p) = A + s * (p - B), anchored on the first bubble's corner
    const z = prog(g, 414, 434, ease.inOut);
    const s = THREE.MathUtils.lerp(1, ZOOM, z);
    const Bx = 100 + 418;
    const By = top + 133;
    const ty = smooth(g, [430, 441, 446, 459, 475], [186, 124, 118, 24, 18]);
    const Ax = THREE.MathUtils.lerp(Bx, 145, z);
    const Ay = THREE.MathUtils.lerp(By, ty, z);
    desk.scale.set(s, s, 1);
    desk.position.set(X(Ax + s * (100 - Bx)), Y(Ay + s * (top - By)), -100);
    t2Holder.scale.set(s, s, 1);
    t2Holder.position.set(X(Ax) - s * X(Bx), Y(Ay) - s * Y(By), 0);
    title2.words.forEach((w, i) => animWord(w, t2Lefts[i]!, tY, g, [384, 386, 388, 390][i]!));

    bg.copy(bgA).lerp(bgB, z);
    setOpacity(sidebar, 1 - prog(g, 418, 430, ease.inOut));
    shadow.opacity = 0.1 * (1 - z);

    const fadeMsg = (m: Msg, a: number) => {
      m.bg.opacity = a;
      setOpacity(m.label, a);
      const lift = (1 - a) * 10;
      R(m.bg, (m.x0 + m.x1) / 2, (m.y0 + m.y1) / 2 + lift, 3);
      R(m.label, m.x0 + 18, (m.y0 + m.y1) / 2 + lift, 4);
    };
    fadeMsg(m1, prog(g, 388, 395, ease.out));
    fadeMsg(m2, prog(g, 397, 404, ease.out));
    fadeMsg(m3, prog(g, 408, 415, ease.out));
    fadeMsg(m5, prog(g, 446, 455, ease.out));

    // user reply typed word by word; bubble eases wider to the left
    const n4 = count(g, M4_T);
    revealWords(m4.label, n4);
    const w4 = typed(g, M4_T, m4W, 3);
    m4.bg.set(Math.max(w4, 0.01), m4.y1 - m4.y0, 18);
    R(m4.bg, m4.x1 - w4 / 2, (m4.y0 + m4.y1) / 2, 3);
    m4.bg.opacity = prog(g, 424, 426, ease.out);
    R(m4.label, m4.x1 - w4 + 18, (m4.y0 + m4.y1) / 2, 4);
    setOpacity(m4.label, n4 > 0 ? 1 : 0);

    // iris out into scene 3's field
    iris.set((g - 476) / 30, prog(g, 463, 476, ease.in) * 1500);
  };
}
