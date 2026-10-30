/**
 * 0:15.9–0:20.2 (film frames 476–606). Keys are in FILM frames (g = frame + 476).
 * Opens on the dark field scene 2 irised into: the Allo icon pops, the
 * wordmark builds letter by letter, then the lockup shrinks and the bold
 * "allo" dissolves in place into "Allo" inside "Connect Allo to [bot] Grok Bot".
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { setupStage, place } from "../components/stage";
import { makeBot, POSE } from "../components/bot";
import { C } from "../components/brand";
import { keys, ease, prog, smooth } from "../components/anim";
import { text, setOpacity } from "../components/text";
import { wordLine, animWord } from "../components/words";
import { makeDarkBg } from "../components/darkbg";
import iconUrl from "../assets/allo-icon.png";

const START = 476;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  const { hw, hh } = setupStage(ctx, C.darkBg);
  const bg = makeDarkBg(hw, hh);
  bg.mesh.position.z = -2000;
  scene.add(bg.mesh);

  // Lockup: icon + "allo" wordmark, laid out around (625, 360) in local px.
  const lockup = new THREE.Group();
  lockup.name = "allo-lockup";
  scene.add(lockup);
  const iconTex = new THREE.TextureLoader(ctx.manager).load(iconUrl);
  iconTex.colorSpace = THREE.SRGBColorSpace;
  iconTex.anisotropy = 8;
  const maskCanvas = new OffscreenCanvas(256, 256);
  const mg = maskCanvas.getContext("2d")!;
  mg.fillStyle = "#000";
  mg.fillRect(0, 0, 256, 256);
  mg.fillStyle = "#fff";
  mg.beginPath();
  mg.roundRect(3, 3, 250, 250, 66);
  mg.fill();
  const mask = new THREE.CanvasTexture(maskCanvas as unknown as HTMLCanvasElement);
  const icon = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: iconTex, alphaMap: mask, transparent: true, depthWrite: false }),
  );
  icon.name = "allo-icon";
  lockup.add(icon);

  const letters = ["a", "l", "l", "o"].map((ch, i) => {
    const m = text(ch, { size: 150, weight: 700, color: "#ffffff", tracking: 0, align: "left" });
    m.name = `allo-wordmark-${i + 1}`;
    lockup.add(m);
    return m;
  });
  const lw = letters.map((m) => m.userData.w - m.userData.pad * 2);
  const letterX: number[] = [];
  let acc = 585;
  lw.forEach((w) => {
    letterX.push(acc);
    acc += w - 2;
  });

  // Closing line.
  const line = wordLine("headline-connect-allo-to-grok-bot", "Connect Allo to Grok Bot", { size: 60, weight: 500, color: "#f7f7f5", tracking: -0.02 });
  scene.add(line.group);

  // Where the bold wordmark sits when it hands over to the line's "Allo".
  const S_END = 0.42;
  const LINE_Y0 = 361;
  const boldLeft = 625 + S_END * (585 - 625);
  const L0 = boldLeft - (line.widths[0]! + line.space);
  const GAP = 186;
  const total = line.widths.reduce((acc2, w) => acc2 + w, 0) + line.space * 4 + GAP;
  const finalLeft = 632 - total / 2;

  const bot = makeBot("grok-bot");
  bot.setInverted(true);
  scene.add(bot.root);

  return ({ frame, time }) => {
    const g = frame + START;
    bg.set(time);

    // ── Lockup ─────────────────────────────────────────────────────────
    const sL = smooth(g, [512, 528, 534], [1, 0.55, S_END]);
    const swap = prog(g, 529, 533, ease.inOut);
    lockup.visible = swap < 1;
    lockup.scale.set(sL, sL, 1);
    place(lockup, 625, 360, 0);
    const pop = 172 * ease.outBack(prog(g, 476, 485, ease.linear));
    const iconSize = THREE.MathUtils.lerp(pop, 143, prog(g, 490, 504, ease.inOut));
    const iconX = THREE.MathUtils.lerp(640, 486, prog(g, 490, 504, ease.inOut));
    const iconGone = 1 - prog(g, 514, 527, ease.inOut);
    icon.scale.set(iconSize * iconGone, iconSize * iconGone, 1);
    icon.position.set(iconX - 625 + (1 - iconGone) * 30, 0, 1);
    icon.rotation.z = (1 - iconGone) * 0.25;
    icon.visible = iconSize * iconGone > 0.5;

    letters.forEach((m, i) => {
      const at = [493, 496, 498, 500][i]!;
      const a = prog(g, at, at + 9, ease.outQuart);
      m.position.set(letterX[i]! - 625 + (iconX - 486) + (1 - a) * 40, 4, 2);
      setOpacity(m, a * (1 - swap));
    });

    // ── "Connect Allo to [bot] Grok Bot" ─────────────────────────────
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
