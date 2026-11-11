import * as THREE from "three";
import { withFonts, track, Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/Inter.woff2";
import { C } from "../components/brand";
import { botMesh, drawBot, type BotKind } from "../components/bots";
import { canvasMesh, keys, layer, measure, place, setOpacity, setupStage, text, textMesh } from "../components/stage";

/**
 * 1:08.13–1:19.1 (reference frames 2044–2373). Local 0 = ref 2044.
 *  2044–2083 the heart bot, close, turning on pink
 *  2084–2178 "Say hi to" lands big and settles; "your new teammates" follows
 *  2179–2233 the five bots pop in a row and fidget
 *  2234–2263 they collapse into the black Grok mark, which shrinks…
 *  2264–2373 …into the "Grok Bot" lockup, held to the end
 */
const REF0 = 2044;
const LINE = { size: 62, weight: 400, color: "#0a0a0a", tracking: -1.2 };

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: "Inter", url: interUrl }], () => {
    const { scene } = setupStage(ctx, C.white);
    const bg = scene.background as THREE.Color;

    // ------------------------------------------------ heart
    const heart = canvasMesh("heart-bot", 460, 460, (g) => drawBot(g, "red", 230, 230, 450, { eyes: false }));
    const eyes = canvasMesh("heart-bot-eyes", 200, 200, (g) => {
      g.fillStyle = "#fff";
      for (const [x, y] of [[70, 110], [130, 90]]) {
        g.save(); g.translate(x, y); g.rotate(-0.42);
        g.beginPath(); g.roundRect(-22, -50, 44, 100, 22); g.fill(); g.restore();
      }
    });
    const heartG = new THREE.Group();
    heartG.name = "heart-bot-group";
    heartG.add(heart, eyes);
    layer(heartG, 10);
    eyes.renderOrder = 11;
    scene.add(heartG);

    // ------------------------------------------------ line
    const words = ["Say hi to", "your", "new", "teammates"].map((w) => {
      const m = textMesh(w, LINE, { anchor: "left", name: `say-hi-${w.replace(/\s+/g, "-")}`, res: 4 });
      layer(m, 20);
      scene.add(m);
      return m;
    });
    const ww = words.map((m) => m.userData.width as number);
    const SP = measure(" ", LINE) + 1;

    // ------------------------------------------------ bots
    const ROW: { kind: BotKind; x: number; at: number }[] = [
      { kind: "blue", x: 394, at: 2179 },
      { kind: "orange", x: 518, at: 2183 },
      { kind: "black", x: 642, at: 2184 },
      { kind: "teal", x: 768, at: 2189 },
      { kind: "red", x: 894, at: 2193 },
    ];
    const bots = ROW.map((b) => {
      const m = botMesh(b.kind, 100, `${b.kind}-bot`, { eyes: { rot: b.kind === "orange" ? 0 : -0.25 } });
      layer(m, 30);
      scene.add(m);
      return m;
    });

    // ------------------------------------------------ Grok mark + wordmark
    const mark = canvasMesh("grok-mark", 160, 160, (g) => {
      g.beginPath(); g.arc(80, 80, 78, 0, Math.PI * 2); g.fillStyle = "#000"; g.fill();
      g.fillStyle = "#fff";
      for (const [x, y, l] of [[60, 42, 26], [86, 34, 22]]) {
        g.save(); g.translate(x, y); g.rotate(-0.75);
        g.beginPath(); g.roundRect(-5.5, -l / 2, 11, l, 5.5); g.fill(); g.restore();
      }
    }, { res: 4 });
    layer(mark, 40);
    scene.add(mark);
    const WORD = { size: 64, weight: 500, color: "#000", tracking: -0.8 };
    const grok = textMesh("Grok", WORD, { anchor: "left", name: "wordmark-grok", res: 4 });
    const botW = textMesh("Bot", WORD, { anchor: "left", name: "wordmark-bot", res: 4 });
    layer(grok, 40);
    layer(botW, 40);
    scene.add(grok, botW);

    // ------------------------------------------------ timing
    const hRot = track([[2044, 0.28], [2049, -0.05], [2058, -0.14], [2066, -0.1], [2069, 0.35], [2074, -0.12], [2079, 0.2], [2084, 0.22]]);
    const hSX = track([[2044, 1], [2062, 1], [2066, 0.85], [2069, 0.68], [2072, 0.85], [2074, 0.96], [2079, 1]]);
    const hS = track([[2044, 1], [2070, 0.98], [2079, 0.8], [2084, 0.78]]);
    const eDX = track([[2044, -40], [2049, 25], [2062, 38], [2066, 120], [2075, -140], [2079, -50], [2084, -40]]);
    const eDY = track([[2044, 30], [2049, -25], [2062, -30], [2079, 30]]);
    const eA = keys([[2062, 1], [2066, 0], [2075, 0], [2078, 1]]);
    const markD = track([[2229, 100], [2234, 143], [2248, 134], [2256, 90], [2262, 80]]);
    const markX = track([[2256, 640], [2264, 520], [2269, 475]]);

    return ({ frame: f, time }) => {
      const ref = f + REF0;
      const sHeart = ref < 2084, sLine = ref >= 2084 && ref < 2179, sBots = ref >= 2179 && ref < 2234;
      const sMark = ref >= 2229;
      bg.set(sHeart ? C.pinkBg : C.white);

      heartG.visible = sHeart;
      if (sHeart) {
        place(heartG, 621, 336);
        heartG.rotation.z = hRot(ref);
        heartG.scale.set(hS(ref) * hSX(ref), hS(ref), 1);
        eyes.position.set(eDX(ref), -eDY(ref), 0);
        setOpacity(eyes, eA(ref));
      }

      // the line: "Say hi to" lands at 1.43× and settles, then words join
      const pY = interpolate(ref, [2122, 2128], [0, 1], Easing.outCubic);
      const pN = interpolate(ref, [2127, 2133], [0, 1], Easing.outCubic);
      const pT = interpolate(ref, [2132, 2138], [0, 1], Easing.outCubic);
      const total = ww[0] + (SP + ww[1]) * pY + (SP + ww[2]) * pN + (SP + ww[3]) * pT;
      const s = interpolate(ref, [2084, 2090], [1.43, 1], Easing.outCubic);
      let x = 640 - (total * s) / 2;
      words.forEach((m, i) => {
        const p = [1, pY, pN, pT][i];
        place(m, x, 357);
        m.scale.setScalar(s);
        setOpacity(m, sLine ? Math.min(1, p * 3) : 0);
        x += (ww[i] + SP) * s;
      });

      // bots
      bots.forEach((m, i) => {
        const b = ROW[i];
        const pop = interpolate(ref, [b.at, b.at + 4, b.at + 7], [0, 1.12, 1], Easing.easeOut);
        const merge = interpolate(ref, [2229, 2234], [0, 1], Easing.easeIn);
        m.visible = (sBots || (ref >= 2229 && ref < 2234)) && pop > 0;
        const wig = Math.sin(time * 9 + i * 1.7) * 0.12 * interpolate(ref, [2195, 2205, 2225, 2229], [0, 1, 1, 0]);
        place(m, THREE.MathUtils.lerp(b.x, 642, merge), 354 + Math.sin(time * 6 + i) * 2);
        m.rotation.z = wig;
        m.scale.setScalar(Math.max(0.001, pop * (1 - merge * (b.kind === "black" ? 0 : 0.6))));
      });

      // mark and wordmark
      mark.visible = sMark;
      const d = markD(ref);
      place(mark, markX(ref), 354);
      mark.scale.setScalar(d / 160);
      const gIn = ref >= 2264, bIn = ref >= 2269;
      grok.visible = gIn;
      botW.visible = bIn;
      const markR = markX(ref) + d / 2;
      place(grok, markR + 20, 356);
      place(botW, markR + 20 + (grok.userData.width as number) + measure(" ", WORD) + 1, 356);
    };
  });
}
