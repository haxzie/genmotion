import * as THREE from "three";
import { withFonts, track, Easing, interpolate, hash1, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/Inter.woff2";
import { C } from "../components/brand";
import { botMesh } from "../components/bots";
import { canvasMesh, fillRR, keys, layer, measure, place, setOpacity, setupStage, text, textMesh } from "../components/stage";
import { callButton, clipPlanes, clipTo, handCursor, panel, setClip, speechBubble, waveDot } from "../components/ui";

/**
 * 0:07.4–0:13.67 (reference frames 222–410).
 *  0–47    the call pill builds: buttons pop in, the bot's voice waveform.
 *  48–79   hard cut: "Hey, can you join the call at 10?" in giant blue type,
 *          sliding right-to-left across a pale-blue frame.
 *  80–159  the call card: the request bubble rises in, the bot talks,
 *          "Of course." arrives and the card grows to hold it.
 *  160–188 tight on the meeting prompt: the hand cursor clicks "Admit".
 */
const SHOT_B = 48, SHOT_C = 80, SHOT_D = 160;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: "Inter", url: interUrl }], () => {
    const { scene, view } = setupStage(ctx, C.white);
    ctx.renderer.localClippingEnabled = true;
    const bgColor = scene.background as THREE.Color;

    // ======================================================= call controls
    const card = panel("call-card", { color: "#fcfcfc", radius: 79, shadow: 34, shadowY: 14, shadowA: 0.09, border: "#e6e6e6", borderA: 0.6 });
    scene.add(card.mesh);

    const controls = new THREE.Group();
    controls.name = "call-controls";
    layer(controls, 10);
    scene.add(controls);

    const bot = botMesh("blue", 80, "research-bot");
    controls.add(bot);
    const DOTS = 14;
    const dots = Array.from({ length: DOTS }, (_, i) => {
      const d = waveDot(C.blue, `voice-dot-${i + 1}`, 6.5);
      controls.add(d);
      return d;
    });
    const btnKinds = ["gear", "chat", "mic", "end"] as const;
    const buttons = btnKinds.map((k) => {
      const b = callButton(k, 96, `button-${k}`);
      controls.add(b);
      return b;
    });
    layer(controls, 10);

    // bubbles (clipped to the card)
    const clip = clipPlanes();
    const hey = speechBubble("Hey, can you join the call at 10?", { size: 34, fg: "#ffffff", bg: C.blue, padX: 30, h: 85, name: "bubble-hey-can-you-join-the-call-at-10" });
    const ofc = speechBubble("Of course.", { size: 34, fg: "#0a0a0a", bg: "#f2f2f2", padX: 30, h: 84, name: "bubble-of-course" });
    clipTo(hey, clip);
    clipTo(ofc, clip);
    layer(hey, 11);
    layer(ofc, 11);
    scene.add(hey, ofc);

    // ========================================================== giant type
    const BIG = { size: 366, weight: 400, color: C.blue, tracking: -7 };
    const big = textMesh("Hey, can you join the call at 10?", BIG, { anchor: "left", name: "hey-can-you-join-the-call-at-10", res: 1.6 });
    layer(big, 30);
    scene.add(big);
    const left1 = 104 - measure("Hey, can ", BIG);
    const left2 = -40 - measure("Hey, can you join ", BIG);
    const bigX = (f: number) => left1 + ((left2 - left1) * (f - 49)) / (74 - 49);

    // ======================================================= admit close-up
    const admit = new THREE.Group();
    admit.name = "meeting-prompt";
    const prompt = panel("meeting-prompt-card", { color: "#fcfcfc", radius: 60, shadow: 60, shadowY: 24, shadowA: 0.1 });
    prompt.rect(-400, -200, 1340, 740);
    const promptContent = canvasMesh("meeting-prompt-actions", 940, 560, (g) => {
      text(g, "Standup", 152, 115, { size: 64, weight: 400, color: "#5f5f63", tracking: -0.5, align: "right" });
      text(g, "View all", 36, 368, { size: 84, weight: 500, color: "#2174e0", tracking: -1.5 });
      fillRR(g, 448, 275, 390, 182, 91, "#e6eefb");
      text(g, "Admit", 643, 368, { size: 84, weight: 500, color: "#2174e0", tracking: -1.5, align: "center" });
    }, { res: 2.4 });
    promptContent.geometry.translate(470, -280, 0);
    place(promptContent, 0, 0);
    const hand = handCursor(ctx.manager, "hand-cursor", 172);
    admit.add(prompt.mesh, promptContent, hand);
    layer(prompt.mesh, 40);
    layer(promptContent, 41);
    layer(hand, 42);
    scene.add(admit);

    const cardTop = track([[80, 179], [90, 168], [104, 160], [116, 150], [128, 127]]);
    const cardBot = track([[80, 499], [90, 520], [104, 526], [116, 540], [128, 584]]);
    const heyTop = track([[80, 453], [90, 400], [104, 378], [116, 368], [128, 353]]);

    return ({ frame: f, time }) => {
      const shotA = f < SHOT_B, shotB = f >= SHOT_B && f < SHOT_C, shotC = f >= SHOT_C && f < SHOT_D, shotD = f >= SHOT_D;
      bgColor.set(shotB || shotC ? C.blueBg : C.white);
      view(640, 360, 1);

      // ---------------------------------------------------- pill / card
      card.mesh.visible = controls.visible = shotA || shotC;
      hey.visible = ofc.visible = shotC;
      let rowY = 359;
      let left = 172, right = 1107;
      if (shotA) {
        const grow = interpolate(f, [0, 14], [0, 1], Easing.outCubic);
        left = THREE.MathUtils.lerp(256, 172, grow);
        right = THREE.MathUtils.lerp(1043, 1107, grow);
        card.rect(left, 280, right - left, 158);
      } else if (shotC) {
        const top = cardTop(f), bottom = cardBot(f);
        card.rect(99, top, 1082, bottom - top);
        setClip(clip, 99, top, 1082, bottom - top);
        rowY = top + 89;
        place(hey, 1145 - hey.userData.width / 2, heyTop(f) + 42);
        const oc = interpolate(f, [116, 128], [0, 1], Easing.outCubic);
        place(ofc, 135 + ofc.userData.width / 2, 504 + (1 - oc) * 50);
        setOpacity(ofc, oc > 0 ? 1 : 0);
      }

      if (shotA || shotC) {
        const botX = shotA ? left + 82 : 184;
        place(bot, botX, rowY);
        bot.scale.setScalar(shotA ? 1 : 1.03);
        // waveform dots
        const dotsX0 = botX + 76;
        const talkA = shotA ? interpolate(f, [0, 3, 7, 9], [1, 1, 0.3, 0]) : 0;
        const talkC = shotC ? interpolate(f, [98, 101, 112, 116], [0, 1, 1, 0]) : 0;
        const talk = Math.max(talkA, talkC);
        dots.forEach((d, i) => {
          const shown = shotA ? interpolate(f, [i * 0.7, i * 0.7 + 2], [0, 1]) : 1;
          place(d, dotsX0 + i * 17.6, rowY);
          const wob = 0.5 + 0.5 * Math.sin(time * 18 + hash1(i) * 6.28);
          const env = Math.exp(-Math.pow((i - 5.5) / 3.2, 2));
          const h = 1 + talk * env * (1.2 + 3.5 * wob * hash1(i + 9));
          d.scale.set(1, h / 6, 1);
          setOpacity(d, shown);
        });
        // buttons
        const finalX = shotA ? [674, 791, 907, 1023] : [659, 801, 943, 1085];
        const startX = [611, 781, 899, 1023];
        buttons.forEach((b, i) => {
          const at = [0, 5, 8, 14][i];
          const pop = shotA ? interpolate(f, [at - 3, at + 3, at + 7], [0, 1.08, 1], Easing.easeOut) : 1;
          const slide = shotA ? interpolate(f, [0, 14], [0, 1], Easing.outCubic) : 1;
          const x = shotA ? THREE.MathUtils.lerp(startX[i], finalX[i], slide) : finalX[i];
          place(b, x, rowY);
          b.scale.setScalar(Math.max(0.001, pop) * (shotC ? 1.25 : 1));
          setOpacity(b, pop > 0.01 ? 1 : 0);
        });
      }

      // ---------------------------------------------------- giant type
      big.visible = shotB;
      if (shotB) place(big, bigX(f), 334);

      // ---------------------------------------------------- admit
      admit.visible = shotD;
      if (shotD) {
        const z = interpolate(f, [SHOT_D, 188], [1.035, 1.0], Easing.easeOut);
        view(640 - interpolate(f, [SHOT_D, 188], [10, 0]), 360, z);
        const press = interpolate(f, [168, 171, 175], [0, 1, 0]);
        place(hand, 628 + interpolate(f, [SHOT_D, 167], [14, 0], Easing.outCubic), 362 + interpolate(f, [SHOT_D, 167], [10, 0], Easing.outCubic));
        hand.scale.setScalar(1 - press * 0.08);
        prompt.mesh.position.set(0, 0, 0);
      }
    };
  });
}
