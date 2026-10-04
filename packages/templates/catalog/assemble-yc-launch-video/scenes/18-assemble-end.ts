import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, rx, ry } from "../components/stage";
import { glide, prog, outCubic, inCubic } from "../components/ease";
import { setLabel, withInter } from "../components/type";
import { bottomGlow } from "../components/glow";
import { assembleLogo, LOGO } from "../components/assemble-logo";

/**
 * Global f1479–f1590 (scene frame = global - 1479).
 * The glow swells, then the Assemble lockup builds exactly as in scene 11 (same clock, 602
 * frames later), holds while it slowly recedes, and shrinks away into the end line.
 */
const G0 = 1479;
const SHIFT = 602; // scene 11's reveal ran at f882..; here it runs at f1484..

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#fafbfc");
    fitCamera(camera, height, 50);
    const glow = bottomGlow();
    scene.add(glow.group);
    const logo = assembleLogo();
    scene.add(logo.group);
    const pivot = new THREE.Vector3(rx(980), ry(541), 0);

    const scale = glide([[882, 1.2], [885, 1.15], [889, 1.08], [895, 1.04], [905, 1.015], [920, 1.0]]);
    const tail = glide([[1500, 1], [1576, 0.94], [1580, 0.88], [1584, 0.72], [1588, 0.42], [1590, 0.3]]);
    const left = glide([[882, 980], [883, 930], [884, 880], [885, 850], [886, 820], [887, 800], [888, 790], [889, 780], [893, 766], [905, 772], [920, 785]]);
    const track = glide([[882, 0.32], [884, 0.22], [886, 0.13], [888, 0.07], [890, 0.03], [893, 0.0], [898, -0.01]]);
    const LETTER_T = [881.5, 882.5, 883.5, 884.5, 885.5, 886.5, 887.5, 888.5];
    const grey = new THREE.Color("#a3a3a3");
    const ink = new THREE.Color("#050505");
    const tint = new THREE.Color();

    return ({ frame: local }) => {
      const F = local + G0;
      const f = F - SHIFT;
      const s = scale(f) * tail(F);
      logo.group.scale.setScalar(s);
      logo.group.position.set(pivot.x * (1 - s), pivot.y * (1 - s), 0);
      const fade = 1 - prog(F, 1585, 5, inCubic);
      logo.word.track(track(f), "left");
      const dx = (left(f) - LOGO.wordLeft) / scale(f);
      logo.word.group.position.x = rx(LOGO.wordLeft) + dx * PX;
      logo.word.letters.forEach((l, i) => {
        const p = prog(f, LETTER_T[i]!, 2, outCubic);
        tint.copy(grey).lerp(ink, prog(f, LETTER_T[i]! + 1, 4, outCubic));
        setLabel(l, { opacity: p * fade, color: tint });
      });
      logo.grey.forEach((b, i) => {
        const p = prog(f, 881.5 + i * 0.6, 2.5, outCubic);
        (b.material as THREE.MeshBasicMaterial).opacity = 0.95 * p * fade;
        b.visible = p > 0.01;
      });
      logo.front.forEach((b, i) => {
        const p = prog(f, 882 + i * 0.8, 3, outCubic);
        (b.material as THREE.MeshBasicMaterial).opacity = p * fade;
        b.visible = p > 0.01;
        b.scale.y = 140 * PX * (0.55 + 0.45 * p);
      });
      logo.mark.position.x = dx * PX * 0.6;

      // the glow swells to fill the lower frame, then settles under the lockup
      const swell = glide([[1479, 160], [1482, 300], [1486, 120], [1495, 0]])(F);
      glow.set(1, swell, 0.1 + prog(F, 1479, 6) * 0.1);
    };
  });
}
