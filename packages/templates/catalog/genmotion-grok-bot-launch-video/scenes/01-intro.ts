/**
 * 0:00–0:09.7 (frames 0–291 of the film).
 * The bot drops in, catches its beret, then: "Give your [bot] a studio" →
 * "Its own [timeline] timeline" → an iPhone rises with Grok open, the bot
 * watches from beside it while "Make 10 sale ads" is typed into the chat box,
 * then hops over and lands in the send button (clapperboard snap = send). The
 * message posts, a GenMotion tool-call card renders ten videos, the phone
 * slides left → "Makes your videos" → the bot leaps into scene 2.
 * Coordinates are reference pixels (1280x720, y down); see components/stage.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { setupStage, place } from "../components/stage";
import { makeBot, POSE } from "../components/bot";
import { C, FONT_TEXT } from "../components/brand";
import { keys, ease, prog, clamp01, smooth, spring, bump } from "../components/anim";
import { text, setOpacity, setDissolve, revealFrac } from "../components/text";
import { wordLine, lefts, animWord } from "../components/words";
import { RRect } from "../components/rrect";
import { canvasPlane, play, sparkle, genmotionMark, statusIcons, type G } from "../components/glyphs";
import { drawSaleAd } from "../components/brandkit";

const L = ease.linear;
/** [frame, chars shown] from assets/typing-prompt.timing.json, relative to TYPE_AT. */
const TYPED: [number, number][] = [[4, 1], [5, 2], [7, 3], [8, 4], [10, 5], [13, 6], [14, 7], [18, 8], [21, 9], [24, 10], [26, 11], [27, 12], [29, 13], [31, 14], [32, 15], [34, 16]];
const HEAD = 62; // headline size (ref px)

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  setupStage(ctx, C.bg);

  // ── Bot ────────────────────────────────────────────────────────────────
  const bot = makeBot("bot");
  scene.add(bot.root);

  // ── Headlines ──────────────────────────────────────────────────────────
  const hOpts = { size: HEAD, weight: 500, color: C.ink, tracking: -0.02 };
  const give = wordLine("headline-give-your", "Give your", hOpts);
  const phoneW = wordLine("headline-a-studio", "a studio", hOpts);
  const own = wordLine("headline-its-own-timeline", "Its own timeline", hOpts);
  const answers = wordLine("headline-makes-your-videos", "Makes your videos", hOpts);
  scene.add(give.group, phoneW.group, own.group, answers.group);
  const giveLefts = [512 - give.widths[0]! - give.space - give.widths[1]!, 512 - give.widths[1]!];
  const phoneLefts = [788, 788 + phoneW.widths[0]! + phoneW.space];
  // left-aligned to the right of the phone once it has slid over
  const answersW = answers.widths.reduce((a2, w) => a2 + w, 0) + answers.space * (answers.widths.length - 1);
  const answersLefts = lefts(answers, 660 + answersW / 2);

  // Timeline pill: grows out of the gap between "own" and "timeline"; its
  // dots pop in like frames landing on a track.
  const pill = new RRect(C.green, 0, 0, 0);
  pill.name = "timeline-pill";
  const pillIcon = canvasPlane(40, 40, 6, (g) => {
    play(g, 17, 22, 17, "#ffffff");
    sparkle(g, 29, 11, 5.5, "#ffffff");
    sparkle(g, 34, 20, 3, "#ffffff");
  });
  pillIcon.name = "timeline-pill-play-icon";
  const pillDots: RRect[] = [];
  for (let i = 0; i < 10; i++) {
    const d = new RRect("#ffffff", 7, 7, 3.5);
    d.name = `timeline-pill-frame-${i + 1}`;
    pillDots.push(d);
  }
  scene.add(pill, pillIcon, ...pillDots);

  // ── iPhone with Grok open ──────────────────────────────────────────────
  // Local coords: origin at the phone's top-centre, x right, y DOWN (via P()).
  // The whole phone fits the frame; the chat box sits at the bottom of the
  // screen and its send button is the slot the bot hops into.
  const phone = new THREE.Group();
  phone.name = "phone";
  scene.add(phone);
  const PW = 310;
  const PH = 660;
  const P = (o: THREE.Object3D, rx: number, ry: number, z: number) => o.position.set(rx - PW / 2, -ry, z);
  const phoneShadow = new RRect("#000000", PW, PH, 52, { blur: 26, opacity: 0.12 });
  phoneShadow.name = "phone-shadow";
  phoneShadow.userData.pickable = false;
  P(phoneShadow, PW / 2, PH / 2 + 12, -1);
  const rim = new RRect(C.bezelRim, PW, PH, 52);
  rim.name = "phone-frame";
  P(rim, PW / 2, PH / 2, 0);
  const bezel = new RRect(C.bezel, PW - 4, PH - 4, 50);
  bezel.name = "phone-bezel";
  P(bezel, PW / 2, PH / 2, 1);
  const SCREEN_BG = "#ffffff";
  const screen = new RRect(SCREEN_BG, PW - 22, PH - 22, 42);
  screen.name = "phone-screen";
  P(screen, PW / 2, PH / 2, 2);
  const btnL = new RRect("#1c1c1e", 5, 44, 2);
  btnL.name = "phone-side-button";
  P(btnL, -1, 170, -0.5);
  const btnL2 = new RRect("#1c1c1e", 5, 30, 2);
  btnL2.name = "phone-side-button-2";
  P(btnL2, -1, 120, -0.5);
  const btnR = new RRect("#1c1c1e", 5, 64, 2);
  btnR.name = "phone-power-button";
  P(btnR, PW + 1, 180, -0.5);
  const island = new RRect(C.black, 92, 27, 13.5);
  island.name = "dynamic-island";
  P(island, PW / 2, 32, 4);
  const clock = text("9:41", { size: 19, weight: 600, color: C.ink, font: FONT_TEXT, tracking: 0 });
  clock.name = "phone-status-time";
  P(clock, 64, 33, 4);
  const status = canvasPlane(70, 20, 6, (g) => statusIcons(g, 2, 10, 11, C.ink));
  status.name = "phone-status-icons";
  P(status, PW - 62, 33, 4);
  const homeBar = new RRect("#111114", 108, 5, 2.5);
  homeBar.name = "phone-home-indicator";
  P(homeBar, PW / 2, PH - 20, 4);
  phone.add(phoneShadow, rim, bezel, screen, btnL, btnL2, btnR, island, clock, status, homeBar);

  // Grok's chat screen, light mode
  const grokTitle = text("Grok", { size: 24, weight: 500, color: C.ink, font: FONT_TEXT, tracking: -0.01 });
  grokTitle.name = "grok-title";
  P(grokTitle, PW / 2, 86, 4);
  phone.add(grokTitle);

  // user message bubble (appears when the prompt is sent)
  const PROMPT = "Make 10 sale ads";
  const userText = text(PROMPT, { size: 20, weight: 400, color: C.ink, font: FONT_TEXT, tracking: 0, align: "right" });
  userText.name = "chat-user-make-10-sale-ads";
  const utw = userText.userData.w - userText.userData.pad * 2;
  const userBubble = new RRect("#ededef", utw + 32, 44, [22, 22, 6, 22]);
  userBubble.name = "chat-user-bubble";
  phone.add(userBubble, userText);

  // GenMotion tool-call card in the conversation
  const TC = { x0: 18, x1: PW - 18, y0: 300, y1: 462 };
  const toolCard = new RRect("#f3f4f6", TC.x1 - TC.x0, TC.y1 - TC.y0, 20);
  toolCard.name = "tool-call-card";
  const toolMark = canvasPlane(24, 24, 10, (g) => genmotionMark(g, 0, 0, 24));
  toolMark.name = "tool-call-genmotion-mark";
  const lblBot = text("GenMotion", { size: 19, weight: 500, color: "#62626a", font: FONT_TEXT, tracking: 0, align: "left" });
  lblBot.name = "tool-call-label-genmotion";
  const lblFwd = text("Rendering 10 videos", { size: 21, weight: 400, color: C.ink, font: FONT_TEXT, tracking: -0.01, align: "left" });
  lblFwd.name = "tool-call-status-rendering";
  const lblDone = text("10 videos ready", { size: 21, weight: 400, color: C.ink, font: FONT_TEXT, tracking: -0.01, align: "left" });
  lblDone.name = "tool-call-status-ready";
  const thumbIdle = new THREE.Color("#dcdde1");
  const thumbA = new THREE.Color(C.gmLime);
  const thumbB = new THREE.Color(C.gmMint);
  // each slot: a grey placeholder, then the finished ad frame pops in over it
  const thumbs: RRect[] = [];
  const thumbArt: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const t = new RRect("#dcdde1", 40, 24, 6);
    t.name = `tool-call-video-${i + 1}-placeholder`;
    thumbs.push(t);
    const art = canvasPlane(40, 24, 10, (g) => drawSaleAd(g, 40, 24, i));
    art.name = `tool-call-video-${i + 1}`;
    thumbArt.push(art);
  }
  phone.add(toolCard, toolMark, lblBot, lblFwd, lblDone, ...thumbs, ...thumbArt);

  // connector chip above the chat box: GenMotion is switched on in Grok
  const chip = new RRect("#f1f2f4", 150, 38, 19);
  chip.name = "connector-chip-genmotion";
  const chipMark = canvasPlane(20, 20, 12, (g) => genmotionMark(g, 0, 0, 20));
  chipMark.name = "connector-chip-genmotion-mark";
  const chipText = text("GenMotion", { size: 19, weight: 500, color: C.ink, font: FONT_TEXT, tracking: 0, align: "left" });
  chipText.name = "connector-chip-genmotion-label";
  phone.add(chip, chipMark, chipText);

  // the chat box, at the bottom of the screen
  const BOX = { x0: 18, x1: PW - 18, cy: 584, h: 58 };
  const box = new RRect("#f1f2f4", BOX.x1 - BOX.x0, BOX.h, BOX.h / 2);
  box.name = "prompt-field";
  const placeholder = text("Ask Grok anything", { size: 19, weight: 400, color: "#66666e", font: FONT_TEXT, tracking: 0, align: "left" });
  placeholder.name = "prompt-placeholder";
  const prompt = text(PROMPT, { size: 20, weight: 400, color: C.ink, font: FONT_TEXT, tracking: 0, align: "left" });
  prompt.name = "prompt-make-10-sale-ads";
  // prefix widths, measured with the same font the texture was drawn with
  const meas = new OffscreenCanvas(8, 8).getContext("2d")!;
  meas.font = `400 ${20 * 4}px ${FONT_TEXT}`;
  const prefixW = (n: number) => meas.measureText(PROMPT.slice(0, n)).width / 4;
  const caret = new RRect(C.ink, 2, 24, 1);
  caret.name = "prompt-caret";
  const SEND_R = 21;
  const SEND_X = BOX.x1 - 8 - SEND_R; // local x of the send button = the bot's slot
  const send = new RRect("#c9cbd0", SEND_R * 2, SEND_R * 2, SEND_R);
  send.name = "prompt-send-button";
  const sendCol = send.material.uniforms.uColor!.value as THREE.Color;
  const sendCol2 = send.material.uniforms.uColor2!.value as THREE.Color;
  const sendIdle = new THREE.Color("#c9cbd0");
  const sendHot = new THREE.Color(C.black);
  const sendGlyph = canvasPlane(24, 24, 10, (g) => {
    g.strokeStyle = "#ffffff";
    g.lineWidth = 2.8;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(12, 19);
    g.lineTo(12, 5);
    g.moveTo(6.5, 10.5);
    g.lineTo(12, 5);
    g.lineTo(17.5, 10.5);
    g.stroke();
  });
  sendGlyph.name = "prompt-send-icon";
  phone.add(box, placeholder, prompt, caret, send, sendGlyph);

  // ── Clapperboard: pops up right of the phone and snaps shut as the bot
  // lands in the send button. The clapper stick hinges at its left end.
  const SW = 132;
  const stripes = (g: G, w: number, h: number) => {
    g.fillStyle = "#111114";
    g.beginPath();
    g.roundRect(0, 0, w, h, 4);
    g.fill();
    g.save();
    g.beginPath();
    g.roundRect(0, 0, w, h, 4);
    g.clip();
    g.fillStyle = "#ffffff";
    for (let x = -h; x < w + h; x += 30) {
      g.beginPath();
      g.moveTo(x, h);
      g.lineTo(x + 15, h);
      g.lineTo(x + 15 + h, 0);
      g.lineTo(x + h, 0);
      g.closePath();
      g.fill();
    }
    g.restore();
  };
  const clapper = new THREE.Group();
  clapper.name = "clapperboard";
  const slate = canvasPlane(SW, 104, 4, (g) => {
    stripes(g, SW, 22);
    g.fillStyle = "#111114";
    g.beginPath();
    g.roundRect(0, 24, SW, 80, 8);
    g.fill();
    genmotionMark(g, SW / 2 - 22, 42, 44);
  });
  slate.name = "clapperboard-slate";
  slate.position.set(0, -52, 0);
  const hinge = new THREE.Group();
  hinge.position.set(-SW / 2 + 2, 2, 1);
  const stick = canvasPlane(SW, 22, 4, (g) => stripes(g, SW, 22));
  stick.name = "clapperboard-stick";
  stick.position.set(SW / 2 - 2, 11, 0);
  hinge.add(stick);
  clapper.add(slate, hinge);
  scene.add(clapper);

  // ── Motion ────────────────────────────────────────────────────────
  // One continuous path for the bot (monotone cubic: velocity never drops to
  // zero at a key unless the path genuinely turns or holds there).
  const PT = [2, 7, 12, 16, 20, 26, 31, 35, 40, 50, 56, 63, 67, 70, 79, 90, 108, 112, 117, 121, 125, 131, 145, 160, 180, 186, 190, 194, 198, 202, 208];
  const PX = [1320, 860, 480, 590, 640, 640, 640, 640, 640, 640, 632, 622, 634, 662, 656, 650, 650, 652, 686, 690, 666, 640, 630, 630, 630, 632, 690, 780, 805, 792, 752];
  const PY = [-120, 120, 470, 330, 280, 288, 374, 354, 360, 360, 334, 306, 322, 368, 352, 365, 365, 368, 440, 496, 514, 520, 510, 497, 492, 490, 452, 360, 252, 214, 198];
  // phone: rises from below the frame, settles, slides left for the
  // headline, then drops away as the bot leaps into scene 2
  // phone: shown 1.6x and anchored to the bottom of the frame (its top is
  // cropped off) so the chat box reads big. Rises from below, settles, slides
  // left for the headline, then drops away as the bot leaps into scene 2.
  const PS = 1.6;
  phone.scale.setScalar(PS);
  const TOP_REST = 700 - PH * PS; // phone bottom 20px above the frame edge
  const phoneTopAt = (f: number) => smooth(f, [186, 200, 206, 212, 276, 291], [720, TOP_REST - 16, TOP_REST - 4, TOP_REST, TOP_REST, 760]);
  const phoneXAt = (f: number) => smooth(f, [256, 270], [640, 370]);
  const END = { x: 520, y: 566, r: 86 }; // = scene 2's opening pose
  const TYPE_AT = 200; // typing-prompt.wav starts here (project.json)
  const SWOOP = 208; // the opening path hands over to the swoop here
  const LAND = 249; // bot lands in the send button (= send, = clapper snap)
  const BOT_R_SLOT = 30;
  const slotAt = (f: number): [number, number] => [phoneXAt(f) + (SEND_X - PW / 2) * PS, phoneTopAt(f) + BOX.cy * PS];

  // After its leap the bot hangs top-right watching the prompt being typed,
  // crouches, then whips along the path drawn on the preview in ~17 frames
  // (the film's hop speed): left across the top, a loop down the left side
  // of the phone, a sweep right into the send button.
  const LAUNCH = 232;
  const hoverAt = (f: number): [number, number] => [
    smooth(f, [SWOOP, 213, LAUNCH], [752, 738, 726]),
    smooth(f, [SWOOP, 212, 216, LAUNCH], [198, 214, 206, 204]) + Math.sin((f - 216) * 0.3) * 3 * prog(f, 214, 220, L),
  ];
  const [hx0, hy0] = hoverAt(LAUNCH);
  const [slotX, slotY] = slotAt(LAND);
  const swoop = new THREE.CatmullRomCurve3(
    [
      [hx0, hy0], [620, 176], [480, 158], [370, 160], [295, 196], [258, 266],
      [270, 352], [332, 440], [452, 518], [600, 570], [720, slotY - 6], [slotX, slotY],
    ].map(([px, py]) => new THREE.Vector3(px, py, 0)),
    false,
    "centripetal",
  );
  const swoopP = new THREE.Vector3();
  // fast launch out of the crouch, a touch of ease into the landing
  const swoopU = (f: number) => {
    const t = prog(f, LAUNCH, LAND, L);
    return 0.5 * ease.inOut(t) + 0.5 * ease.out(t);
  };

  const botAt = (f: number): [number, number, number] => {
    if (f <= SWOOP) {
      return [smooth(f, PT, PX), smooth(f, PT, PY), smooth(f, [2, 12, 16, 66, 71, 79, 90, 108, 116, 124, 186, 200, SWOOP], [175, 62, 60, 60, 112, 112, 70, 70, 92, 92, 90, 80, 72])];
    }
    if (f <= 278) {
      if (f >= LAND) {
        const [sx, sy] = slotAt(f);
        return [sx, sy, BOT_R_SLOT];
      }
      if (f <= LAUNCH) {
        const [hx, hy] = hoverAt(f);
        return [hx, hy, 72];
      }
      swoop.getPointAt(swoopU(f), swoopP);
      const r = smooth(f, [LAUNCH, 240, LAND], [72, 64, BOT_R_SLOT]);
      return [swoopP.x, swoopP.y, r];
    }
    const t = clamp01((f - 278) / 13);
    const [sx, sy] = slotAt(278);
    return [
      THREE.MathUtils.lerp(sx, END.x, ease.inOut(t)),
      THREE.MathUtils.lerp(sy, END.y, ease.in(t)) - Math.sin(t * Math.PI) * 150,
      THREE.MathUtils.lerp(BOT_R_SLOT, END.r, ease.inOut(t)),
    ];
  };

  // Look targets, chased by a spring so every glance eases and settles.
  const LT = [0, 11, 16, 23, 28, 56, 66, 69, 73, 78, 110, 124, 162, 187, 209, 216, 230, 236, 244, 279];
  const LP = [0.5, 0, -0.8, -0.4, 0, -0.45, -0.1, POSE.pitch, 0.05, POSE.pitch, 0.25, 0, -0.35, 0.5, 0.05, 0.38, 0.32, -0.05, 0.25, -0.25];
  const LY = [-0.9, 1.1, 0.45, 0.05, 0, -0.35, 0.1, POSE.yaw, 0.5, POSE.yaw, -0.5, 0.1, -0.3, -0.5, 0.8, 0.25, 0.35, -0.9, 0.7, 0.35];
  const LR = [0, 0, 0, 0, 0, 0.1, 0, POSE.roll, -0.2, POSE.roll, 0.15, 0, 0.1, 0.1, -0.15, 0, 0.05, 0.1, -0.05, 0];

  const black = new THREE.Color(C.black);
  const white = new THREE.Color(C.white);
  const eyeLight = new THREE.Color(C.eye);
  const invQ = new THREE.Quaternion();
  const flightQ = new THREE.Quaternion();
  const flightE = new THREE.Euler();
  const off = new THREE.Vector3();

  return ({ frame: f, time }) => {
    const phoneTop = phoneTopAt(f);

    // ── Bot transform ───────────────────────────────────────────────────
    const [x, y, r0] = botAt(f);
    const [xa, ya] = botAt(f - 0.5);
    const [xb, yb] = botAt(f + 0.5);
    const r = r0 * (1 + 0.05 * bump(f, 73, 4));
    bot.root.visible = f >= 2;
    place(bot.root, x, y, 400);
    // impact squash on contacts (wide, short), world-axis aligned
    const imp = 0.18 * bump(f, 12, 3) + 0.12 * bump(f, 32, 3) + 0.1 * bump(f, 69.5, 3) + 0.08 * bump(f, 126, 3) + 0.06 * bump(f, 212, 3) + 0.14 * bump(f, LAUNCH - 2, 2.5) + 0.12 * bump(f, LAND - 0.5, 2.5);
    bot.root.scale.set(r * (1 + imp), r * (1 - imp), r);
    // stretch along the direction of travel, from the path's own velocity
    const vx = xb - xa;
    const vy = -(yb - ya);
    const speed = Math.hypot(vx, vy);
    const cap = f < 15 ? 0.6 : 0.25;
    bot.setSquash(1 + Math.min(cap, speed * 0.007), Math.atan2(vy, vx));

    // look
    const k = 0.14;
    let yaw = spring(f, LT, LY, k, 0.7);
    if (f > 280) yaw = THREE.MathUtils.lerp(yaw, 2 * Math.PI - 2.5, prog(f, 280, 291, ease.in));
    const sway = f > LAND + 2 && f < 278 ? Math.sin(time * 2) * 0.05 : 0;
    bot.setLook(spring(f, LT, LP, k, 0.7), yaw + sway, spring(f, LT, LR, k, 0.7));

    // blinks
    bot.setBlink(Math.min(
      keys(f, [49, 50, 52, 54, 55], [1, 0.25, 0, 0.25, 1], L),
      keys(f, [74, 76, 79, 81], [1, 0.15, 0.15, 1], L),
      keys(f, [152, 154, 157, 159], [1, 0, 0, 1], L),
      keys(f, [264, 266, 268, 270], [1, 0.1, 0.1, 1], L),
    ));
    // stays black: on the light screen it lands as the dark send button
    const inv = 0;
    bot.bodyMat.color.copy(black).lerp(white, inv);
    bot.eyeMat.color.copy(eyeLight).lerp(black, inv);

    // beret: flies in on its own arc and converges exactly onto the head
    // at 69, expressed in head-local space so there is no hand-over pop.
    const hs = bot.headset;
    if (f < 69) {
      hs.visible = f >= 46;
      const [bx69, by69] = botAt(69);
      const HT = [46, 50, 54, 58, 62, 65, 69];
      const hx = smooth(f, HT, [930, 790, 664, 602, 566, 548, bx69]);
      const hy = smooth(f, HT, [50, 118, 138, 116, 104, 120, by69 + 6]);
      const sc = smooth(f, [46, 53, 56], [0.03, 0.95, 1]);
      const rz = smooth(f, [46, 54, 62, 66, 69], [-2.6, 0.4, 0.3, 0.55, 0]);
      invQ.copy(bot.head.quaternion).invert();
      off.set((hx - x) / r, -(hy - y) / r, 0.3 * (1 - prog(f, 64, 69, ease.in))).applyQuaternion(invQ);
      hs.position.copy(off);
      flightE.set(0, 0.15 * (1 - prog(f, 62, 69, ease.inOut)), rz);
      flightQ.setFromEuler(flightE);
      hs.quaternion.copy(invQ).multiply(flightQ);
      hs.scale.setScalar(sc);
    } else {
      hs.visible = true;
      hs.position.set(0, 0, 0);
      hs.quaternion.identity();
      hs.scale.setScalar(1);
    }

    // ── "Give your [bot] a studio" ───────────────────────────────────────
    const gY = 358;
    animWord(give.words[0]!, giveLefts[0]!, gY, f, 82, 117);
    animWord(give.words[1]!, giveLefts[1]!, gY, f, 84, 119);
    animWord(phoneW.words[0]!, phoneLefts[0]!, gY, f, 89, 121);
    animWord(phoneW.words[1]!, phoneLefts[1]!, gY, f, 91, 123);

    // ── "Its own [pill] timeline" ─────────────────────────────────────────
    const pw = smooth(f, [148, 156, 162, 176], [0, 60, 167, 253]);
    const openGap = clamp01(pw / 30);
    const gap = pw > 0 ? openGap * (pw + 40 - own.space) : 0;
    const ol = lefts(own, 632, { 1: gap });
    const outAt = 184;
    const oY = 218 - prog(f, outAt, outAt + 8, ease.in) * 30;
    animWord(own.words[0]!, ol[0]!, oY, f, 128, outAt);
    animWord(own.words[1]!, ol[1]!, oY, f, 131, outAt + 1);
    animWord(own.words[2]!, ol[2]!, oY, f, 134, outAt + 2);
    const exitA = 1 - prog(f, outAt, outAt + 6, ease.inQuad);
    const pillLeft = ol[1]! + own.widths[1]! + 20 * openGap + own.space * (1 - openGap) * 0.5;
    const ph = Math.min(64, pw);
    pill.pill(pw, ph);
    place(pill, pillLeft + pw / 2, oY, 0);
    pill.opacity = pw > 0.5 ? exitA : 0;
    place(pillIcon, pillLeft + 34, oY, 1);
    setOpacity(pillIcon, clamp01((pw - 70) / 30) * exitA);
    pillDots.forEach((d, i) => {
      // each digit pops in as the pill widens past its slot
      const a = clamp01((pw - (105 + i * 14.3)) / 14.3);
      const s2 = ease.outBack(a);
      d.pill(7 * s2, 7 * s2);
      place(d, pillLeft + 66 + i * 14.3, oY + 1, 1);
      d.opacity = a > 0 ? exitA : 0;
    });

    // ── Phone ───────────────────────────────────────────────────────────
    phone.visible = f >= 186 && phoneTop < 760;
    place(phone, phoneXAt(f), phoneTop, -50);

    // typed prompt, driven by typing-prompt.timing.json (same plan as the sound)
    const tf = f - TYPE_AT;
    let n = 0;
    for (const [sf, len] of TYPED) if (tf >= sf) n = len;
    const FX = BOX.x0 + 20;
    P(box, (BOX.x0 + BOX.x1) / 2, BOX.cy, 4);
    P(placeholder, FX, BOX.cy, 5);
    setOpacity(placeholder, n === 0 ? 1 : f >= LAND + 2 ? prog(f, LAND + 4, LAND + 10, ease.out) : 0);
    P(prompt, FX, BOX.cy, 5);
    const pd = prompt.userData;
    revealFrac(prompt, n >= PROMPT.length ? 1 : (pd.pad + prefixW(n) - 0.5) / pd.w);
    setOpacity(prompt, n > 0 ? 1 - prog(f, LAND, LAND + 3, ease.inQuad) : 0);
    const lastKey = TYPED.reduce((acc2, [sf]) => (tf >= sf ? sf : acc2), -99);
    const caretOn = tf - lastKey < 6 || Math.floor(f / 8) % 2 === 0;
    P(caret, FX + prefixW(n) + 3, BOX.cy, 6);
    caret.opacity = f >= TYPE_AT - 4 && f < LAND && caretOn ? 1 : 0;

    // send button: lights up with the first key, then the bot takes its place
    const hot = prog(f, TYPE_AT + 4, TYPE_AT + 8, ease.out);
    sendCol.copy(sendIdle).lerp(sendHot, hot);
    sendCol2.copy(sendCol);
    const sendS = 1 - prog(f, LAND - 5, LAND - 1, ease.in);
    send.set(SEND_R * 2 * sendS, SEND_R * 2 * sendS, SEND_R * sendS);
    P(send, SEND_X, BOX.cy, 6);
    send.opacity = sendS > 0.01 ? 1 : 0;
    P(sendGlyph, SEND_X, BOX.cy, 7);
    sendGlyph.scale.setScalar(Math.max(sendS, 0.001));
    setOpacity(sendGlyph, sendS > 0.01 ? 1 : 0);

    // connector chip
    P(chip, BOX.x0 + 75, BOX.cy - 56, 4);
    P(chipMark, BOX.x0 + 24, BOX.cy - 56, 5);
    P(chipText, BOX.x0 + 40, BOX.cy - 56, 5);

    // sent: the user's bubble pops up into the conversation
    const ub = prog(f, LAND + 1, LAND + 9, ease.outBack);
    const ubY = 250 + (1 - ub) * 30;
    userBubble.set((utw + 32) * (0.85 + 0.15 * ub), 44 * (0.85 + 0.15 * ub), [22, 22, 6, 22]);
    P(userBubble, TC.x1 - (utw + 32) / 2, ubY, 4);
    userBubble.opacity = ub > 0.01 ? clamp01(ub * 1.5) : 0;
    P(userText, TC.x1 - 16, ubY, 5);
    setOpacity(userText, clamp01(ub * 1.5));

    // GenMotion picks it up: the tool-call card, then ten videos fill in
    const tc = prog(f, LAND + 5, LAND + 13, ease.outBack);
    const tcY = (1 - tc) * 24;
    toolCard.set((TC.x1 - TC.x0) * (0.92 + 0.08 * tc), (TC.y1 - TC.y0) * (0.92 + 0.08 * tc), 20);
    P(toolCard, (TC.x0 + TC.x1) / 2, (TC.y0 + TC.y1) / 2 + tcY, 4);
    toolCard.opacity = tc > 0.01 ? clamp01(tc * 1.5) : 0;
    P(toolMark, TC.x0 + 28, TC.y0 + 30 + tcY, 5);
    setOpacity(toolMark, clamp01(tc * 1.5));
    P(lblBot, TC.x0 + 48, TC.y0 + 30 + tcY, 5);
    setOpacity(lblBot, clamp01(tc * 1.5));
    P(lblFwd, TC.x0 + 16, TC.y0 + 66 + tcY, 5);
    P(lblDone, TC.x0 + 16, TC.y0 + 66 + tcY, 5);
    // status: a clean swap, the old line lifts out as the new one rises in
    const fIn = prog(f, LAND + 8, LAND + 14, ease.out);
    const fOut = prog(f, 268, 272, ease.in);
    const dIn = prog(f, 271, 277, ease.out);
    P(lblFwd, TC.x0 + 16, TC.y0 + 66 + tcY + (1 - fIn) * 8 - fOut * 8, 5);
    P(lblDone, TC.x0 + 16, TC.y0 + 66 + tcY + (1 - dIn) * 8, 5);
    setOpacity(lblFwd, fIn * (1 - fOut));
    setOpacity(lblDone, dIn);
    thumbs.forEach((t, i) => {
      const appear = prog(f, LAND + 9 + i * 0.6, LAND + 14 + i * 0.6, ease.outBack);
      const done = prog(f, 255 + i * 1.4, 259 + i * 1.4, ease.out);
      const pop = 1 + 0.12 * bump(f, 257 + i * 1.4, 2);
      t.set(40 * appear * pop, 24 * appear * pop, 6);
      const col = t.material.uniforms.uColor!.value as THREE.Color;
      const col2 = t.material.uniforms.uColor2!.value as THREE.Color;
      col.copy(thumbIdle);
      col2.copy(thumbIdle);
      const tx = TC.x0 + 37 + (i % 5) * 50;
      const ty = (i < 5 ? TC.y0 + 104 : TC.y0 + 134) + tcY;
      P(t, tx, ty, 6);
      t.opacity = appear > 0.01 ? 1 - done : 0;
      const art = thumbArt[i]!;
      P(art, tx, ty, 7);
      art.scale.setScalar(Math.max(0.001, (0.7 + 0.3 * ease.outBack(done)) * pop));
      setOpacity(art, done);
    });

    // ── Clapperboard: right of the phone, snaps shut on the bot's landing ─
    const cIn = prog(f, 226, 235, ease.outBack);
    const cOut = prog(f, 256, 263, ease.in);
    const cs = cIn * (1 - cOut) * (1 + 0.08 * bump(f, LAND - 0.5, 2.5));
    clapper.visible = cs > 0.01;
    clapper.scale.setScalar(Math.max(cs, 0.001));
    place(clapper, 1030, 430 - cOut * 30 + (1 - cIn) * 20, 300);
    clapper.rotation.z = 0.08 * (1 - cIn) - 0.05 * bump(f, LAND - 0.5, 3);
    // open with a little anticipation, then the snap (3 frames, accelerating)
    hinge.rotation.z = smooth(f, [226, 234, 242, 246], [0, 0.55, 0.62, 0.66]) * (1 - prog(f, LAND - 3, LAND, ease.in));
    setOpacity(slate, 1 - cOut);
    setOpacity(stick, 1 - cOut);

    // ── "Makes your videos": right of the phone once it slides over ──────
    answers.words.forEach((w, i) => animWord(w, answersLefts[i]!, 330, f, 262 + i * 3, 278 + i * 2));
  };
}
