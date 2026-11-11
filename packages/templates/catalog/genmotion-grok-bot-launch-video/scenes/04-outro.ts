/**
 * 0:15.9–0:20.2 (film frames 476–606). Keys are in FILM frames (g = frame + 476).
 * Opens on the dark field scene 2 irised into: the GenMotion mark pops, the
 * wordmark builds letter by letter, then the lockup shrinks and the wordmark
 * dissolves in place into "GenMotion" inside "Connect GenMotion to [bot] Grok Bot".
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { setupStage, place } from "../components/stage";
import { makeBot, POSE } from "../components/bot";
import { C } from "../components/brand";
import { canvasPlane, genmotionMark } from "../components/glyphs";
import { keys, ease, prog, smooth } from "../components/anim";
import { text, setOpacity } from "../components/text";
import { wordLine, animWord } from "../components/words";
import { makeDarkBg } from "../components/darkbg";

const START = 476;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  const { hw, hh } = setupStage(ctx, C.darkBg);
  const bg = makeDarkBg(hw, hh);
  bg.mesh.position.z = -2000;
  scene.add(bg.mesh);

  // Lockup: the GenMotion mark + wordmark, centred on x = 640 (the pivot).
  const PIVOT = 640;
  const lockup = new THREE.Group();
  lockup.name = "genmotion-lockup";
  scene.add(lockup);
  // The real mark, drawn from the path data in genmotion.dev/logo.svg.
  const icon = canvasPlane(1, 1, 512, (g) => genmotionMark(g, 0, 0, 1));
  icon.name = "genmotion-mark";
  lockup.add(icon);

  const WORD = "GenMotion";
  const BOLD = 120; // wordmark size; the line's 60 = BOLD * S_END
  const letters = WORD.split("").map((ch, i) => {
    const m = text(ch, { size: BOLD, weight: 600, color: C.gmText, tracking: 0, align: "left" });
    m.name = `genmotion-wordmark-${i + 1}`;
    lockup.add(m);
    return m;
  });
  const lw = letters.map((m) => m.userData.w - m.userData.pad * 2);
  const wordW = lw.reduce((a2, w) => a2 + w, 0) - 3 * (lw.length - 1);
  const ICON_END = 118;
  const ICON_GAP = 28;
  const lockLeft = PIVOT - (ICON_END + ICON_GAP + wordW) / 2;
  const ICON_X = lockLeft + ICON_END / 2;
  const WORD_X = lockLeft + ICON_END + ICON_GAP;
  const letterX: number[] = [];
  let acc = WORD_X;
  lw.forEach((w) => {
    letterX.push(acc);
    acc += w - 3;
  });

  // Closing line.
  const line = wordLine("headline-connect-genmotion-to-grok-bot", "Connect GenMotion to Grok Bot", { size: 60, weight: 500, color: "#f7f7f5", tracking: -0.02 });
  scene.add(line.group);

  // Where the bold wordmark sits when it hands over to the line's "GenMotion".
  const S_END = line.widths[1]! / wordW; // land at exactly the line word's width
  const LINE_Y0 = 361;
  const boldLeft = PIVOT + S_END * (WORD_X - PIVOT);
  const L0 = boldLeft - (line.widths[0]! + line.space);
  const GAP = 150;
  const total = line.widths.reduce((acc2, w) => acc2 + w, 0) + line.space * 4 + GAP;
  const finalLeft = 640 - total / 2;

  const bot = makeBot("grok-bot");
  bot.setInverted(true);
  scene.add(bot.root);

  return ({ frame, time }) => {
    const g = frame + START;
    bg.set(time);

    // ── Lockup ─────────────────────────────────────────────────────────
    const sL = smooth(g, [512, 524, 529], [1, 0.62, S_END]);
    const swap = prog(g, 529, 533, ease.inOut);
    lockup.visible = swap < 1;
    lockup.scale.set(sL, sL, 1);
    place(lockup, PIVOT, 360, 0);
    const pop = 172 * ease.outBack(prog(g, 476, 485, ease.linear));
    const iconSize = THREE.MathUtils.lerp(pop, ICON_END, prog(g, 490, 504, ease.inOut));
    const iconX = THREE.MathUtils.lerp(640, ICON_X, prog(g, 490, 504, ease.inOut));
    const iconGone = 1 - prog(g, 514, 527, ease.inOut);
    icon.scale.set(iconSize * iconGone, iconSize * iconGone, 1);
    icon.position.set(iconX - PIVOT + (1 - iconGone) * 30, 0, 1);
    icon.rotation.z = (1 - iconGone) * 0.25;
    icon.visible = iconSize * iconGone > 0.5;

    letters.forEach((m, i) => {
      const at = 493 + i * 1.4;
      const a = prog(g, at, at + 9, ease.outQuart);
      m.position.set(letterX[i]! - PIVOT + (iconX - ICON_X) + (1 - a) * 40, 4, 2);
      setOpacity(m, a * (1 - swap));
    });

    // ── "Connect GenMotion to [bot] Grok Bot" ─────────────────────────────
    const gap = smooth(g, [540, 553], [0, GAP]);
    const left = smooth(g, [528, 538, 553], [L0, L0, finalLeft]);
    const lineY = smooth(g, [528, 553], [LINE_Y0, 372]);
    const xs: number[] = [];
    let x = left;
    line.widths.forEach((w, i) => {
      xs.push(x);
      x += w + line.space + (i === 2 ? gap : 0);
    });
    const ins = [522, 528, 533, 536, 539];
    line.words.forEach((w, i) => {
      animWord(w, xs[i]!, lineY, g, ins[i]!);
      if (i === 1) {
        place(w, xs[i]!, lineY, 0);
        setOpacity(w, swap);
      }
    });

    // the bot grows out of the gap after "to", turning to face us
    const toRight = xs[2]! + line.widths[2]!;
    const br = smooth(g, [541, 547, 551, 556], [0, 40, 56, 50]);
    bot.root.visible = br > 0.5;
    bot.root.scale.setScalar(Math.max(br, 0.001));
    place(bot.root, toRight + line.space / 2 + gap / 2, lineY - 10, 400);
    const yaw = keys(g, [542, 557], [-2.7, POSE.yaw], ease.out);
    const lookDown = smooth(g, [572, 578, 590, 596], [0, 1, 1, 0]);
    bot.setLook(POSE.pitch + lookDown * 0.3, yaw - lookDown * 0.25 + Math.sin(time * 1.4) * 0.03, POSE.roll);
    bot.setBlink(keys(g, [566, 568, 570, 572], [1, 0.12, 0.12, 1], ease.linear));
  };
}
