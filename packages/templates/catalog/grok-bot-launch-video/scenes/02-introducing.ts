import * as THREE from "three";
import { withFonts, Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/Inter.woff2";
import { C } from "../components/brand";
import { botMesh, type BotKind } from "../components/bots";
import { canvasMesh, fillRR, layer, measure, place, setOpacity, setupStage, text, textMesh } from "../components/stage";

/**
 * 0:04.0–0:07.4 (reference frames 120–222).
 * "Introducing" → "Grok" → "Bot" land word by word, the line re-centring;
 * a grey "beta" tag flips to a black "1.0" pill that bursts five bots; the
 * words back out and the blue bot slides off toward the call that follows.
 */
const TYPE = { size: 59, weight: 400, color: "#0a0a0a", tracking: -1.2 };
const LINE_Y = 357;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: "Inter", url: interUrl }], () => {
    const { scene } = setupStage(ctx, C.white);

    const words = ["Introducing", "Grok", "Bot"].map((w) => {
      const m = textMesh(w, TYPE, { anchor: "left", name: `word-${w.toLowerCase()}` });
      layer(m, 10);
      scene.add(m);
      return m;
    });
    const widths = words.map((m) => m.userData.width as number);
    const SPACE = measure(" ", TYPE) + 1;
    const PILL_GAP = 22;

    // "beta" (grey) and "1.0" (black) tags
    const beta = canvasMesh("tag-beta", 122, 52, (g) => {
      fillRR(g, 0, 0, 122, 52, 26, "#efefef");
      text(g, "beta", 61, 27, { size: 40, weight: 400, color: "#0a0a0a", align: "center", tracking: -0.5 });
    });
    const v10 = canvasMesh("tag-1-0", 86, 54, (g) => {
      fillRR(g, 0, 0, 86, 54, 27, "#0a0a0a");
      text(g, "1.0", 43, 28, { size: 40, weight: 400, color: "#ffffff", align: "center", tracking: -1 });
    });
    layer(beta, 11);
    layer(v10, 12);
    scene.add(beta, v10);

    // bots: final positions read off reference frame 195
    const BOTS: { kind: BotKind; x: number; y: number; d: number; delay: number }[] = [
      { kind: "black", x: 766, y: 251, d: 80, delay: 0 },
      { kind: "teal", x: 896, y: 243, d: 82, delay: 1 },
      { kind: "blue", x: 1052, y: 273, d: 102, delay: 2 },
      { kind: "red", x: 856, y: 446, d: 60, delay: 4 },
      { kind: "orange", x: 973, y: 463, d: 78, delay: 5 },
    ];
    const bots = BOTS.map((b) => {
      const m = botMesh(b.kind, b.d, `${b.kind}-bot`);
      layer(m, 20);
      scene.add(m);
      return m;
    });

    const ease = Easing.outCubic;
    return ({ frame: f, time }) => {
      // which words are on the line, as eased presence 0→1
      const pG = interpolate(f, [18, 26], [0, 1], ease);
      const pB = interpolate(f, [24, 32], [0, 1], ease) * (1 - interpolate(f, [89, 95], [0, 1], ease));
      const pTag = interpolate(f, [28, 36], [0, 1], ease);
      const tagW = interpolate(f, [54, 58], [122, 86], ease);
      const lineOut = interpolate(f, [95, 99], [0, 1], Easing.easeIn);

      const total =
        widths[0] + (SPACE + widths[1]) * pG + (SPACE + widths[2]) * pB + (PILL_GAP + tagW) * pTag;
      let x = 640 - total / 2 + 8;
      // keep the line where it was once the words start leaving
      if (f >= 89) x = 305 + interpolate(f, [89, 95], [0, 18], ease);

      place(words[0], x, LINE_Y);
      x += widths[0] + SPACE * pG;
      place(words[1], x, LINE_Y);
      x += widths[1] * pG + SPACE * pB;
      place(words[2], x, LINE_Y);
      x += widths[2] * pB + PILL_GAP * pTag;

      setOpacity(words[0], 1 - lineOut);
      setOpacity(words[1], interpolate(f, [19, 22], [0, 1]) * (1 - lineOut));
      setOpacity(words[2], interpolate(f, [25, 28], [0, 1]) * interpolate(f, [89, 92], [1, 0]));

      // tag: beta slides out, 1.0 slides in
      const flip = interpolate(f, [53, 58], [0, 1], Easing.easeInOut);
      place(beta, x + 61, LINE_Y + 1);
      place(v10, x + 43, LINE_Y + 1);
      beta.scale.setScalar(interpolate(f, [28, 34], [0.8, 1], ease));
      setOpacity(beta, interpolate(f, [29, 32], [0, 1]) * (1 - flip));
      setOpacity(v10, flip * (1 - lineOut));
      v10.scale.set(interpolate(f, [54, 58, 61], [0.7, 1.08, 1]), interpolate(f, [54, 58, 61], [0.7, 1.08, 1]), 1);
      const pillX = x + 43;

      // bots burst out of the pill, then breathe
      BOTS.forEach((b, i) => {
        const m = bots[i];
        const s = 56 + b.delay;
        const p = interpolate(f, [s, s + 9], [0, 1], ease);
        const pop = interpolate(f, [s, s + 7, s + 11], [0, 1.12, 1], Easing.easeOut);
        const bob = Math.sin(time * 2.2 + i * 1.7) * 3;
        let bx = THREE.MathUtils.lerp(pillX, b.x, p);
        let by = THREE.MathUtils.lerp(LINE_Y, b.y, p) + bob * p;
        if (b.kind === "blue") {
          // the handoff: slides toward the call pill of the next shot
          const go = interpolate(f, [92, 102], [0, 1], Easing.easeInOut);
          bx = THREE.MathUtils.lerp(bx, 520, go);
          by = THREE.MathUtils.lerp(by, 352, go);
        }
        place(m, bx, by);
        m.scale.setScalar(Math.max(pop, 0.001));
        m.rotation.z = Math.sin(time * 1.8 + i) * 0.06 + (b.kind === "teal" ? Math.sin(time * 5) * 0.2 * interpolate(f, [75, 85, 95], [0, 1, 0]) : 0);
        const gone = b.kind === "red" ? interpolate(f, [94, 98], [1, 0]) : 1;
        setOpacity(m, (p > 0 ? 1 : 0) * gone);
      });
    };
  });
}
