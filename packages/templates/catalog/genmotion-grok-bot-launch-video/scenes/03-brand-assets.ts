/**
 * "Drop in your brand": the chat from scene 2 carries on. A hand cursor grabs
 * a stack of brand files (logo, photos, videos) from beside the chat, drags
 * them into the composer and drops them; "Here are our brand assets" is typed
 * and sent; the bot answers with ten ads drawn from the same palette and
 * marks → "Every video on brand" → iris into the closing film's dark field.
 *
 * Opens on scene 2's light chat background (scene 2 scrolls its thread up and
 * away), ends with the same iris scene 2 used to end on, so scene 4 is
 * untouched. Coordinates are stage px (1280 x 720, y down).
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { setupStage, place, X, Y } from "../components/stage";
import { makeBot, POSE } from "../components/bot";
import { C, FONT_TEXT } from "../components/brand";
import { keys, ease, prog, smooth, bump } from "../components/anim";
import { text, setOpacity, revealFrac } from "../components/text";
import { wordLine, lefts, animWord } from "../components/words";
import { RRect } from "../components/rrect";
import { canvasPlane } from "../components/glyphs";
import { drawHalo, svgIconPlane, type HaloKind } from "../components/brandkit";
import handUrl from "../assets/hand-duotone.svg";
import handGrabUrl from "../assets/hand-grabbing-duotone.svg";
import { makeDarkBg } from "../components/darkbg";

const HEAD = 62;
const TYPE_AT = 56; // typing-brand-assets.wav starts here (project.json)
/** [frame, chars shown] from assets/typing-brand-assets.timing.json, relative to TYPE_AT. */
const TYPED: [number, number][] = [[2, 1], [4, 2], [5, 3], [7, 4], [9, 5], [11, 6], [13, 7], [15, 8], [16, 9], [18, 10], [20, 11], [21, 12], [23, 13], [25, 14], [29, 15], [33, 16], [35, 17], [37, 18], [39, 19], [43, 20], [46, 21], [47, 22], [50, 23], [54, 24], [57, 25]];
const GRAB = 24; // hand closes on the stack (click)
const DROP = 46; // hand opens over the composer (click)
const SEND = 126; // send pressed (click)

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, durationInFrames: DUR } = ctx;
  const { hw, hh } = setupStage(ctx, "#fdfdfd");

  // ── Headlines ──────────────────────────────────────────────────────────
  const hOpts = { size: HEAD, weight: 500, color: C.ink, tracking: -0.02 };
  const head1 = wordLine("headline-drop-in-your-brand", "Drop in your brand", hOpts);
  const head2 = wordLine("headline-every-video-on-brand", "Every video on brand", hOpts);
  scene.add(head1.group, head2.group);
  const h1L = lefts(head1, 640);
  const h2L = lefts(head2, 640);

  // ── Composer ───────────────────────────────────────────────────────────
  const CX0 = 260;
  const CX1 = 1020;
  const CW = CX1 - CX0;
  const BOTTOM = 690;
  const glow = new RRect(C.green, CW + 8, 88, 44);
  glow.name = "composer-drop-highlight";
  const composer = new RRect("#f1f2f4", CW, 80, 40);
  composer.name = "composer";
  const placeholder = text("Ask Grok anything", { size: 28, weight: 400, color: "#66666e", font: FONT_TEXT, tracking: 0, align: "left" });
  placeholder.name = "composer-placeholder";
  const PROMPT = "Here are our brand assets";
  const prompt = text(PROMPT, { size: 28, weight: 400, color: C.ink, font: FONT_TEXT, tracking: 0, align: "left" });
  prompt.name = "composer-here-are-our-brand-assets";
  const meas = new OffscreenCanvas(8, 8).getContext("2d")!;
  meas.font = `400 ${28 * 4}px ${FONT_TEXT}`;
  const prefixW = (n: number) => meas.measureText(PROMPT.slice(0, n)).width / 4;
  const caret = new RRect(C.ink, 3, 34, 1.5);
  caret.name = "composer-caret";
  const send = new RRect(C.black, 52, 52, 26);
  send.name = "composer-send-button";
  const sendGlyph = canvasPlane(30, 30, 8, (g) => {
    g.strokeStyle = "#ffffff";
    g.lineWidth = 3.4;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(15, 24);
    g.lineTo(15, 7);
    g.moveTo(8, 14);
    g.lineTo(15, 7);
    g.lineTo(22, 14);
    g.stroke();
  });
  sendGlyph.name = "composer-send-icon";
  scene.add(glow, composer, placeholder, prompt, caret, send, sendGlyph);

  // ── The user's message (attachments land here on send) ────────────────
  const userText = text(PROMPT, { size: 28, weight: 400, color: "#ffffff", font: FONT_TEXT, tracking: -0.005, align: "right" });
  userText.name = "chat-here-are-our-brand-assets";
  const utw = userText.userData.w - userText.userData.pad * 2;
  const UBW = utw + 48;
  const UB_Y = 312;
  const userBubble = new RRect(C.black, UBW, 60, [30, 30, 6, 30]);
  userBubble.name = "chat-user-bubble";
  scene.add(userBubble, userText);

  // ── Brand files ────────────────────────────────────────────────────────
  const TW = 112;
  const TH = 84;
  const files: { kind: HaloKind; video: boolean; name: string; dx: number; dy: number; rot: number }[] = [
    { kind: "logo", video: false, name: "brand-file-logo", dx: -24, dy: -16, rot: -0.17 },
    { kind: "product", video: true, name: "brand-file-product-video", dx: -11, dy: -7, rot: -0.07 },
    { kind: "sun", video: false, name: "brand-file-campaign-photo", dx: 0, dy: 0, rot: 0.04 },
    { kind: "swatch", video: false, name: "brand-file-palette", dx: 12, dy: 8, rot: 0.13 },
    { kind: "product-cream", video: true, name: "brand-file-launch-video", dx: 23, dy: 16, rot: 0.21 },
  ];
  const tiles = files.map((fd, i) => {
    const grp = new THREE.Group();
    grp.name = fd.name;
    const shadow = new RRect("#000000", TW, TH, 12, { blur: 10, opacity: 0.18 });
    shadow.name = `${fd.name}-shadow`;
    shadow.userData.pickable = false;
    shadow.position.set(0, -5, -1);
    const art = canvasPlane(TW, TH, 4, (g) => drawHalo(g, TW, TH, fd.kind, fd.video));
    art.name = `${fd.name}-image`;
    grp.add(shadow, art);
    grp.position.z = 300 + i * 2;
    scene.add(grp);
    return { grp, shadow, art, ...fd };
  });
  const CLUSTER = { x: 1146, y: 460 }; // = the hand at GRAB + 20, so the pickup is seamless

  // ── The hand ───────────────────────────────────────────────────────────
  // Phosphor's hand / hand-grabbing duotone icons (MIT), from assets/
  const handOpen = svgIconPlane(ctx.manager, handUrl, 78);
  handOpen.name = "cursor-hand-open";
  const handGrab = svgIconPlane(ctx.manager, handGrabUrl, 78);
  handGrab.name = "cursor-hand-grab";
  scene.add(handOpen, handGrab);
  // A cartoon path with the bot's physics: swoop in and overshoot, hover
  // excitedly, wind up and slam down on the grab, yank the stack up, swing
  // it over in a big arc, dive onto the composer, bounce up and zip off.
  const HK = [10, 15, 18, 21, 23, GRAB, 28, 33, 39, 44, DROP, 50, 53, 62];
  const HX = [1400, 1210, 1118, 1160, 1150, 1146, 1122, 960, 790, 712, 708, 736, 762, 1010];
  const HY = [740, 376, 402, 420, 390, 440, 350, 318, 430, 586, 604, 516, 528, 820];
  const handAt = (f: number): [number, number] => [smooth(f, HK, HX), smooth(f, HK, HY)];

  // ── Bot reply ──────────────────────────────────────────────────────────
  const bot = makeBot("bot");
  scene.add(bot.root);
  const BOT = { x: 288, y: 398, r: 24 };
  const replyText = text("10 ads in your brand, ready.", { size: 28, weight: 400, color: "#16171a", font: FONT_TEXT, tracking: -0.005, align: "left" });
  replyText.name = "chat-ten-ads-in-your-brand";
  const rtw = replyText.userData.w - replyText.userData.pad * 2;
  const reply = new RRect(C.bubbleGrey, rtw + 48, 60, [30, 30, 30, 6]);
  reply.name = "chat-reply-bubble";
  scene.add(reply, replyText);

  // the ads it made: the same palette and marks as the files
  const ads: HaloKind[] = ["product", "sun", "product-cream", "logo", "product"];
  const adCards = ads.map((k, i) => {
    const m = canvasPlane(128, 80, 4, (g) => drawHalo(g, 128, 80, k, true, 12));
    m.name = `generated-ad-${i + 1}`;
    scene.add(m);
    return m;
  });

  // ── Iris into the closing film's dark field ────────────────────────────
  const iris = makeDarkBg(hw, hh);
  iris.mesh.position.z = 900;
  const irisCx = CX1 - UBW / 2;
  (iris.mesh.material as THREE.ShaderMaterial).uniforms.uCenter!.value.set(X(irisCx) + hw, Y(UB_Y) + hh);
  scene.add(iris.mesh);

  const v = new THREE.Vector2();
  const tilePos = (i: number, f: number, out: THREE.Vector2) => {
    const t = tiles[i]!;
    if (f < GRAB) {
      const a = prog(f, 4 + i, 16 + i, ease.outQuart);
      return out.set(CLUSTER.x + t.dx + (1 - a) * 320, CLUSTER.y + t.dy);
    }
    // carried: each file trails the hand, so the stack swings like a tail
    const lag = i * 1.7 * prog(f, GRAB, GRAB + 6, ease.out);
    const [hx, hy] = handAt(Math.min(f, DROP) - lag);
    return out.set(hx + t.dx * 0.9, hy + 20 + t.dy * 0.9);
  };

  return ({ frame: f, time }) => {
    // ── headlines ──────────────────────────────────────────────────────
    head1.words.forEach((w, i) => animWord(w, h1L[i]!, 110, f, 2 + i * 3, 120 + i));
    head2.words.forEach((w, i) => animWord(w, h2L[i]!, 110, f, 130 + i * 3, 168 + i));

    // ── composer: scrolls in, opens up for the drop, shrinks on send ───
    const rise = prog(f, 0, 10, ease.out);
    const ch = THREE.MathUtils.lerp(80, 176, prog(f, DROP - 2, DROP + 8, ease.outBack)) -
      96 * prog(f, SEND, SEND + 8, ease.inOut);
    const bottom = BOTTOM + (1 - rise) * 120;
    const ccy = bottom - ch / 2;
    composer.set(CW, ch, 40);
    place(composer, 640, ccy, 10);
    const hover = prog(f, 38, 43, ease.out) * (1 - prog(f, DROP, DROP + 6, ease.out));
    glow.set(CW + 8, ch + 8, 44);
    place(glow, 640, ccy, 9);
    glow.opacity = hover;
    composer.opacity = rise;
    const lineY = bottom - 40;

    const tf = f - TYPE_AT;
    let n = 0;
    for (const [sf, len] of TYPED) if (tf >= sf) n = len;
    place(placeholder, 296, lineY, 11);
    setOpacity(placeholder, (n === 0 || f >= SEND + 4) ? rise * (f >= SEND + 4 ? prog(f, SEND + 6, SEND + 12, ease.out) : 1) : 0);
    place(prompt, 296, lineY, 11);
    const pd = prompt.userData;
    revealFrac(prompt, n >= PROMPT.length ? 1 : (pd.pad + prefixW(n) - 0.5) / pd.w);
    setOpacity(prompt, n > 0 ? 1 - prog(f, SEND, SEND + 4, ease.inQuad) : 0);
    const lastKey = TYPED.reduce((acc, [sf]) => (tf >= sf ? sf : acc), -99);
    place(caret, 296 + prefixW(n) + 4, lineY, 12);
    caret.opacity = f >= TYPE_AT - 6 && f < SEND && (tf - lastKey < 6 || Math.floor(f / 8) % 2 === 0) ? 1 : 0;

    const sendS = 1 - 0.14 * bump(f, SEND + 1, 2);
    send.set(52 * sendS, 52 * sendS, 26 * sendS);
    place(send, CX1 - 40, lineY, 11);
    send.opacity = rise;
    place(sendGlyph, CX1 - 40, lineY, 12);
    sendGlyph.scale.setScalar(sendS);
    setOpacity(sendGlyph, rise);

    // ── brand files: rest → grabbed → dropped into the composer → sent ─
    const slotY = bottom - 176 + 56;
    tiles.forEach((t, i) => {
      const slotX = 296 + 42 + i * 96;
      const msgX = CX1 - 42 - (4 - i) * 96;
      const msgY = 236;
      let x: number, y: number, rot: number, sc: number;
      if (f < DROP) {
        tilePos(i, f, v);
        x = v.x;
        y = v.y;
        const carry = prog(f, GRAB, GRAB + 6, ease.out);
        // swing with the carry: lean against the direction of travel
        const [ax] = handAt(f - i * 1.7 - 0.5);
        const [bx] = handAt(f - i * 1.7 + 0.5);
        rot = t.rot * (1 + 0.6 * carry) + THREE.MathUtils.clamp((bx - ax) * 0.012, -0.35, 0.35) * carry;
        sc = 1 - 0.1 * carry + 0.08 * bump(f, GRAB + 2, 2.5);
      } else if (f < SEND) {
        tilePos(i, DROP, v);
        const a = prog(f, DROP + i * 1.5, DROP + 10 + i * 1.5, ease.outBack);
        const ap = prog(f, DROP + i * 1.5, DROP + 10 + i * 1.5, ease.out);
        // each file hops into its slot, one after another
        x = THREE.MathUtils.lerp(v.x, slotX, ap);
        y = THREE.MathUtils.lerp(v.y, slotY, a) - Math.sin(ap * Math.PI) * 70;
        rot = THREE.MathUtils.lerp(t.rot * 1.6, 0, ap);
        sc = THREE.MathUtils.lerp(0.9, 0.75, ap);
      } else {
        const a = prog(f, SEND + i, SEND + 11 + i, ease.inOut);
        x = THREE.MathUtils.lerp(slotX, msgX, a);
        y = THREE.MathUtils.lerp(bottom - 176 + 56 + 96 * 0, msgY, a);
        rot = 0;
        sc = 0.75;
      }
      place(t.grp, x, y);
      t.grp.rotation.z = -rot;
      t.grp.scale.setScalar(sc);
      t.shadow.opacity = f < DROP ? 0.18 : 0.08;
      setOpacity(t.art, 1);
      t.grp.visible = f >= 4;
    });

    // ── hand ───────────────────────────────────────────────────────────
    const [hx, hy] = handAt(f);
    const [pax, pay] = handAt(f - 0.5);
    const [pbx, pby] = handAt(f + 0.5);
    const hvx = pbx - pax;
    const hvy = pby - pay;
    const speed = Math.hypot(hvx, hvy);
    const grabbing = f >= GRAB && f < DROP;
    const handA = prog(f, 10, 12, ease.out) * (1 - prog(f, 57, 62, ease.in));
    // stretch along the direction of travel, squash on the grab and the drop
    const st = Math.min(0.32, speed * 0.006);
    const ax = speed > 0.01 ? Math.abs(hvx) / speed : 0;
    const ay = speed > 0.01 ? Math.abs(hvy) / speed : 0;
    const imp = 0.22 * bump(f, GRAB, 2.5) + 0.2 * bump(f, DROP, 2.5);
    const hsx = (1 + st * (ax - 0.5 * ay)) * (1 + imp);
    const hsy = (1 + st * (ay - 0.5 * ax)) * (1 - imp);
    // lean into the move, an excited wiggle over the stack, a wave after the drop
    const lean = THREE.MathUtils.clamp(-hvx * 0.01, -0.45, 0.45);
    const wiggle = Math.sin((f - 16) * 1.3) * 0.16 * bump(f, 19.5, 4);
    const wave = Math.sin((f - DROP) * 1.4) * 0.22 * bump(f, DROP + 5, 5);
    for (const [m, on] of [[handOpen, !grabbing], [handGrab, grabbing]] as const) {
      place(m, hx + 4, hy + 4, 500);
      m.scale.set(hsx, hsy, 1);
      m.rotation.z = lean + wiggle + wave;
      setOpacity(m, on ? handA : 0);
    }

    // ── sent message ───────────────────────────────────────────────────
    const ub = prog(f, SEND + 4, SEND + 12, ease.outBack);
    const ubA = prog(f, SEND + 4, SEND + 8, ease.out);
    const ubY = UB_Y + (1 - ubA) * 40;
    userBubble.set(UBW * (0.9 + 0.1 * ub), 60 * (0.9 + 0.1 * ub), [30, 30, 6, 30]);
    place(userBubble, CX1 - UBW / 2, ubY, 5);
    userBubble.opacity = ubA;
    place(userText, CX1 - 24, ubY, 6);
    setOpacity(userText, ubA);

    // ── bot reply + the ads it made ────────────────────────────────────
    const br = BOT.r * ease.outBack(prog(f, 134, 142, ease.linear));
    bot.root.visible = br > 0.5;
    bot.root.scale.setScalar(Math.max(br, 0.001));
    place(bot.root, BOT.x, BOT.y + Math.sin(time * 2) * 1.5, 400);
    bot.setLook(POSE.pitch, POSE.yaw + Math.sin(time * 1.4) * 0.05, POSE.roll);
    bot.setBlink(keys(f, [156, 158, 160, 162], [1, 0.1, 0.1, 1], ease.linear));
    bot.setSquash(1, 0);

    const rp = prog(f, 137, 145, ease.outBack);
    const rpA = prog(f, 137, 141, ease.out);
    const rpw = (rtw + 48) * (0.9 + 0.1 * rp);
    reply.set(rpw, 60 * (0.9 + 0.1 * rp), [30, 30, 30, 6]);
    place(reply, 324 + rpw / 2, BOT.y, 5);
    reply.opacity = rpA;
    place(replyText, 348, BOT.y, 6);
    setOpacity(replyText, rpA);

    adCards.forEach((m, i) => {
      const a = prog(f, 145 + i * 3, 155 + i * 3, ease.outBack);
      const aa = prog(f, 145 + i * 3, 150 + i * 3, ease.out);
      place(m, 324 + 64 + i * 142, 486 + (1 - aa) * 24, 5);
      m.scale.setScalar(0.9 + 0.1 * a);
      setOpacity(m, aa);
    });

    // ── iris out into scene 4's field ──────────────────────────────────
    iris.set((f - DUR) / 30, prog(f, DUR - 13, DUR, ease.in) * 1500);
  };
}
