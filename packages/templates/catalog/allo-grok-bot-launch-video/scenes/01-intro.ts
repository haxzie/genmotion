/**
 * 0:00–0:09.7 (frames 0–291 of the film).
 * The bot drops in, catches its headset, then: "Give your [bot] a phone" →
 * "Its own [number] number" → a phone rises, a call comes in, the bot hops
 * into the Dynamic Island and forwards it → "Answers your calls".
 * Coordinates are reference pixels (1280x720, y down); see components/stage.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { setupStage, place } from "../components/stage";
import { makeBot, POSE } from "../components/bot";
import { C, FONT_TEXT } from "../components/brand";
import { keys, ease, prog, clamp01, smooth, spring, bump } from "../components/anim";
import { text, setOpacity, setDissolve } from "../components/text";
import { wordLine, lefts, animWord } from "../components/words";
import { RRect } from "../components/rrect";
import { canvasPlane, handset, sparkle, person, appIcon, statusIcons } from "../components/glyphs";

const L = ease.linear;
const HEAD = 62; // headline size (ref px)

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  setupStage(ctx, C.bg);

  // ── Bot ────────────────────────────────────────────────────────────────
  const bot = makeBot("bot");
  scene.add(bot.root);
  const headsetFlyer = new THREE.Group();
  headsetFlyer.name = "headset-flying";
  scene.add(headsetFlyer);

  // ── Headlines ──────────────────────────────────────────────────────────
  const hOpts = { size: HEAD, weight: 500, color: C.ink, tracking: -0.02 };
  const give = wordLine("headline-give-your", "Give your", hOpts);
  const phoneW = wordLine("headline-a-phone", "a phone", hOpts);
  const own = wordLine("headline-its-own-number", "Its own number", hOpts);
  const answers = wordLine("headline-answers-your-calls", "Answers your calls", hOpts);
  scene.add(give.group, phoneW.group, own.group, answers.group);
  const giveLefts = [512 - give.widths[0]! - give.space - give.widths[1]!, 512 - give.widths[1]!];
  const phoneLefts = [788, 788 + phoneW.widths[0]! + phoneW.space];
  const answersLefts = lefts(answers, 632);

  // Number pill: grows out of the gap between "own" and "number".
  const pill = new RRect(C.green, 0, 0, 0);
  pill.name = "number-pill";
  const pillIcon = canvasPlane(40, 40, 6, (g) => {
    handset(g, 17, 22, 20, "#ffffff");
    sparkle(g, 29, 11, 5.5, "#ffffff");
    sparkle(g, 34, 20, 3, "#ffffff");
  });
  pillIcon.name = "number-pill-icon";
  const pillDots: RRect[] = [];
  for (let i = 0; i < 10; i++) {
    const d = new RRect("#ffffff", 7, 7, 3.5);
    d.name = `number-pill-digit-${i + 1}`;
    pillDots.push(d);
  }
  scene.add(pill, pillIcon, ...pillDots);

  // ── Phone ──────────────────────────────────────────────────────────────
  // Local coords: origin at the phone's top-centre, x right, y DOWN (via P()).
  const phone = new THREE.Group();
  phone.name = "phone";
  scene.add(phone);
  const PW = 936;
  const P = (o: THREE.Object3D, rx: number, ry: number, z: number) => o.position.set(rx - PW / 2, -ry, z);
  const rim = new RRect(C.bezelRim, PW, 1500, 152);
  rim.name = "phone-frame";
  P(rim, PW / 2, 750, 0);
  const bezel = new RRect(C.bezel, PW - 10, 1500, 147);
  bezel.name = "phone-bezel";
  P(bezel, PW / 2, 755, 1);
  const screen = new RRect(C.greenScreen, PW - 80, 1500, 112);
  screen.name = "phone-screen";
  P(screen, PW / 2, 42 + 750, 2);
  const btnL = new RRect("#1c1c1e", 8, 62, 3);
  btnL.name = "phone-side-button";
  P(btnL, -3, 420, -1);
  const btnL2 = new RRect("#1c1c1e", 8, 42, 3);
  btnL2.name = "phone-side-button-2";
  P(btnL2, -3, 330, -1);
  phone.add(rim, bezel, screen, btnL, btnL2);

  const ICON = 138;
  const icons = canvasPlane(PW - 80, 600, 2, (g) => {
    const kinds = [
      ["facetime", "calendar", "photos", "camera"],
      ["mail", "notes", "reminders", "clock"],
      ["weather", "maps", "settings", "messages"],
    ];
    const xs = [168, 368, 568, 766];
    kinds.forEach((row, r) =>
      row.forEach((k, c) => appIcon(g, k, xs[c]! - 40 - ICON / 2, 302 + r * 175 - 230 - ICON / 2, ICON)),
    );
  });
  icons.name = "phone-app-icons";
  P(icons, PW / 2, 230 + 300, 3);
  phone.add(icons);

  const clock = text("9:41", { size: 30, weight: 600, color: "#ffffff", font: FONT_TEXT, tracking: 0 });
  clock.name = "phone-status-time";
  P(clock, 196, 110, 4);
  const status = canvasPlane(150, 40, 4, (g) => statusIcons(g, 6, 20, 22));
  status.name = "phone-status-icons";
  P(status, 742, 110, 4);
  phone.add(clock, status);

  const island = new RRect(C.black, 272, 86, 43);
  island.name = "dynamic-island";
  phone.add(island);

  // Call banner contents.
  const avatar = canvasPlane(96, 96, 4, (g) => person(g, 48, 48, 44));
  avatar.name = "caller-avatar";
  const lblMobile = text("mobile", { size: 23, weight: 400, color: C.greyName, font: FONT_TEXT, tracking: 0, align: "left", dissolve: true });
  lblMobile.name = "caller-label-mobile";
  const lblName = text("Gonzalo Rascon", { size: 31, weight: 400, color: "#ffffff", font: FONT_TEXT, tracking: -0.01, align: "left", dissolve: true });
  lblName.name = "caller-name";
  const lblBot = text("Grok Bot", { size: 23, weight: 400, color: C.greyName, font: FONT_TEXT, tracking: 0, align: "left", dissolve: true });
  lblBot.name = "caller-label-grok-bot";
  const lblFwd = text("Forwarding Call", { size: 31, weight: 400, color: "#ffffff", font: FONT_TEXT, tracking: -0.01, align: "left", dissolve: true });
  lblFwd.name = "caller-status-forwarding";
  const decline = new RRect(C.red, 98, 98, 49);
  decline.name = "call-decline-button";
  const declineGlyph = canvasPlane(60, 60, 5, (g) => handset(g, 30, 30, 50, "#ffffff", (135 * Math.PI) / 180));
  declineGlyph.name = "call-decline-icon";
  const accept = new RRect(C.accept, 98, 98, 49);
  accept.name = "call-accept-button";
  const acceptGlyph = canvasPlane(60, 60, 5, (g) => handset(g, 30, 30, 46, "#ffffff"));
  acceptGlyph.name = "call-accept-icon";
  const wave: RRect[] = [];
  for (let i = 0; i < 15; i++) {
    const b = new RRect(C.waveGreen, 5, 10, 2.5);
    b.name = `call-waveform-bar-${i + 1}`;
    wave.push(b);
  }
  phone.add(avatar, lblMobile, lblName, lblBot, lblFwd, decline, declineGlyph, accept, acceptGlyph, ...wave);

  // ── Motion ────────────────────────────────────────────────────────
  // One continuous path for the bot (monotone cubic: velocity never drops to
  // zero at a key unless the path genuinely turns or holds there).
  const PT = [2, 7, 12, 16, 20, 26, 31, 35, 40, 50, 56, 63, 67, 70, 79, 90, 108, 112, 117, 121, 125, 131, 145, 160, 180, 186, 190, 194, 198, 202, 208, 213, 216, 219, 222];
  const PX = [1320, 860, 480, 590, 640, 640, 640, 640, 640, 640, 632, 622, 634, 662, 656, 650, 650, 652, 686, 690, 666, 640, 630, 630, 630, 632, 690, 780, 805, 792, 752, 700, 620, 500, 422];
  const PY = [-120, 120, 470, 330, 280, 288, 374, 354, 360, 360, 334, 306, 322, 368, 352, 365, 365, 368, 440, 496, 514, 520, 510, 497, 492, 490, 452, 360, 252, 214, 198, 186, 150, 168, 236];
  const phoneTopAt = (f: number) => smooth(f, [186, 194, 202, 213, 222, 236, 250, 256, 268, 278, 291], [820, 520, 450, 410, 245, 130, 108, 110, 350, 355, 800]);
  const SLOT_X = 640 - PW / 2 + 155;
  const END = { x: 520, y: 566, r: 86 }; // = scene 2's opening pose

  const botAt = (f: number): [number, number, number] => {
    if (f <= 222) {
      return [smooth(f, PT, PX), smooth(f, PT, PY), smooth(f, [2, 12, 16, 66, 71, 79, 90, 108, 116, 124, 186, 200, 214, 222], [175, 62, 60, 60, 112, 112, 70, 70, 92, 92, 90, 80, 72, 65])];
    }
    const sy = phoneTopAt(f) + 146;
    if (f <= 278) {
      const t = prog(f, 222, 231, ease.inOut);
      return [
        THREE.MathUtils.lerp(422, SLOT_X, t),
        THREE.MathUtils.lerp(236, sy, t) - Math.sin(t * Math.PI) * 55,
        THREE.MathUtils.lerp(65, 41, t),
      ];
    }
    const t = clamp01((f - 278) / 13);
    return [
      THREE.MathUtils.lerp(SLOT_X, END.x, ease.inOut(t)),
      THREE.MathUtils.lerp(sy, END.y, ease.in(t)) - Math.sin(t * Math.PI) * 150,
      THREE.MathUtils.lerp(41, END.r, ease.inOut(t)),
    ];
  };

  // Look targets, chased by a spring so every glance eases and settles.
  const LT = [0, 11, 16, 23, 28, 56, 66, 69, 73, 78, 110, 124, 162, 187, 209, 218, 224, 279];
  const LP = [0.5, 0, -0.8, -0.4, 0, -0.45, -0.1, POSE.pitch, 0.05, POSE.pitch, 0.25, 0, -0.35, 0.5, 0.05, POSE.pitch, POSE.pitch, -0.25];
  const LY = [-0.9, 1.1, 0.45, 0.05, 0, -0.35, 0.1, POSE.yaw, 0.5, POSE.yaw, -0.5, 0.1, -0.3, -0.5, 0.8, POSE.yaw, 0.35, 0.35];
  const LR = [0, 0, 0, 0, 0, 0.1, 0, POSE.roll, -0.2, POSE.roll, 0.15, 0, 0.1, 0.1, -0.15, POSE.roll, -0.05, 0];

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
    const imp = 0.18 * bump(f, 12, 3) + 0.12 * bump(f, 32, 3) + 0.1 * bump(f, 69.5, 3) + 0.08 * bump(f, 126, 3) + 0.1 * bump(f, 222, 3) + 0.07 * bump(f, 230.5, 2.5);
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
    const sway = f > 232 && f < 278 ? Math.sin(time * 2) * 0.05 : 0;
    bot.setLook(spring(f, LT, LP, k, 0.7), yaw + sway, spring(f, LT, LR, k, 0.7));

    // blinks
    bot.setBlink(Math.min(
      keys(f, [49, 50, 52, 54, 55], [1, 0.25, 0, 0.25, 1], L),
      keys(f, [74, 76, 79, 81], [1, 0.15, 0.15, 1], L),
      keys(f, [152, 154, 157, 159], [1, 0, 0, 1], L),
      keys(f, [264, 266, 268, 270], [1, 0.1, 0.1, 1], L),
    ));
    // black → white as it drops into the call, back to black as it leaps out
    const inv = prog(f, 222, 228, ease.inOut) - prog(f, 280, 287, ease.inOut);
    bot.bodyMat.color.copy(black).lerp(white, inv);
    bot.eyeMat.color.copy(eyeLight).lerp(black, inv);

    // headset: flies in on its own arc and converges exactly onto the head
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
    headsetFlyer.visible = false;

    // ── "Give your [bot] a phone" ───────────────────────────────────────
    const gY = 358;
    animWord(give.words[0]!, giveLefts[0]!, gY, f, 82, 117);
    animWord(give.words[1]!, giveLefts[1]!, gY, f, 84, 119);
    animWord(phoneW.words[0]!, phoneLefts[0]!, gY, f, 89, 121);
    animWord(phoneW.words[1]!, phoneLefts[1]!, gY, f, 91, 123);

    // ── "Its own [pill] number" ─────────────────────────────────────────
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
    phone.visible = f >= 186;
    place(phone, 640, phoneTop, -50);

    const stA = 1 - prog(f, 195, 199, L);
    setOpacity(clock, stA);
    setOpacity(status, stA);
    const ex = prog(f, 195, 205, ease.outBack);
    island.pill(THREE.MathUtils.lerp(272, 802, ex), THREE.MathUtils.lerp(86, 180, ex));
    P(island, PW / 2, THREE.MathUtils.lerp(104, 142, ex), 5);

    const contentA = prog(f, 200, 206, ease.out);
    P(avatar, 155, 146, 6);
    avatar.scale.setScalar(1 - 0.4 * prog(f, 221, 226, ease.in));
    setOpacity(avatar, contentA * (1 - prog(f, 221, 226, ease.in)));
    P(lblMobile, 236, 126, 6);
    P(lblName, 236, 168, 6);
    P(lblBot, 236, 126, 6);
    P(lblFwd, 236, 168, 6);
    const outD = prog(f, 226, 238, L);
    const inD = 1 - prog(f, 230, 242, L);
    setDissolve(lblMobile, outD);
    setDissolve(lblName, outD);
    setOpacity(lblMobile, outD < 1 ? contentA : 0);
    setOpacity(lblName, outD < 1 ? contentA : 0);
    setDissolve(lblBot, inD);
    setDissolve(lblFwd, inD);
    setOpacity(lblBot, f >= 230 ? 1 : 0);
    setOpacity(lblFwd, f >= 230 ? 1 : 0);

    const decX = THREE.MathUtils.lerp(654, 780, prog(f, 227, 242, ease.inOut));
    P(decline, decX, 149, 6);
    P(declineGlyph, decX, 149, 7);
    decline.opacity = contentA;
    setOpacity(declineGlyph, contentA);
    const acc = 98 * (1 - prog(f, 226, 234, ease.inOut));
    accept.pill(acc, acc);
    P(accept, 780, 149, 8);
    accept.opacity = acc > 1 ? contentA : 0;
    P(acceptGlyph, 780, 149, 9);
    acceptGlyph.scale.setScalar(Math.max(0.001, acc / 98));
    setOpacity(acceptGlyph, acc > 1 ? contentA : 0);

    const wv = prog(f, 231, 241, ease.out);
    wave.forEach((b, i) => {
      const env = 0.35 + 0.65 * Math.sin(((i + 0.5) / 15) * Math.PI);
      const dip = i === 7 ? 0.25 : 1;
      const h = (8 + 48 * env * dip * (0.55 + 0.45 * Math.abs(Math.sin(time * 6 + i * 1.3)))) * wv;
      b.pill(5, Math.max(5, h));
      P(b, 563 + i * 9.3, 152, 7);
      b.opacity = wv > 0 ? 1 : 0;
    });

    // ── "Answers your calls" ────────────────────────────────────────────
    answers.words.forEach((w, i) => animWord(w, answersLefts[i]!, 205, f, 257 + i * 3, 277 + i * 2));
  };
}
