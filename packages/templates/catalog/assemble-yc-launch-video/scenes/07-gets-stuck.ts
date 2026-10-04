import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, rx, ry } from "../components/stage";
import { glide, prog, outCubic } from "../components/ease";
import { line, letters, measure, setLabel, withInter, GREY_FROM } from "../components/type";

/**
 * Global f631–f689 (scene frame = global - 631).
 * "That is where enterprise IT" assembles word by word and slowly recedes; it cuts to a huge
 * slate "gets stuck" that lands from oversize, keeps shrinking, and blurs away.
 */
const G0 = 631;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#fdfdfd");
    fitCamera(camera, height, 50);

    const ST = { weight: 400, tracking: 0.015 };
    const s1 = 100 * (1260 / measure("That is where enterprise IT", { ...ST, size: 100 }));
    const l1 = line("That is where enterprise IT", { ...ST, size: s1 }, "center");
    l1.group.position.y = ry(532);
    scene.add(l1.group);
    const IN = [629.5, 631.5, 633.5, 638.5, 640.5];
    const ink = new THREE.Color("#363636");
    const mid = [ink, ink, new THREE.Color("#3e3e3e"), new THREE.Color("#6e6e6e"), new THREE.Color("#6e6e6e")];
    const scale1 = glide([[630, 1.04], [642, 1.02], [648, 1.0], [654, 0.952], [660, 0.85], [661, 0.84]]);
    const cx1 = glide([[630, 1150], [634, 1080], [638, 1035], [642, 1012], [648, 969], [654, 960], [661, 959]]);
    // gaps between words close as the sentence completes (px per word index, from the left)
    const spread = glide([[630, 40], [636, 30], [642, 14], [646, 4], [650, 0]]);

    const ST2 = { weight: 450, tracking: 0 };
    const s2 = 100 * (1470 / measure("gets stuck", { ...ST2, size: 100 }));
    // per-letter planes so the blur can sit on the outer letters (a shallow depth of field)
    const l2 = letters("gets stuck", { ...ST2, size: s2, color: "#457f97" });
    const l2Half = (l2.width / 2);
    l2.group.name = "gets-stuck";
    l2.group.position.set(rx(962), ry(512), 0);
    scene.add(l2.group);
    const scale2 = glide([[661, 1.25], [662, 1.22], [666, 1.09], [672, 1.0], [678, 0.96], [684, 0.82], [688, 0.5], [690, 0.38]]);
    const blur2 = glide([[661, 16], [664, 12], [668, 9], [672, 6], [678, 6], [682, 10], [686, 18], [689, 26]]);
    const op2 = glide([[661, 0.85], [663, 1], [681, 1], [684, 0.78], [688, 0.4], [690, 0.1]]);

    const tint = new THREE.Color();

    return ({ frame: local }) => {
      const f = local + G0;
      const first = f < 661;
      l1.group.visible = first;
      l2.group.visible = !first;
      if (first) {
        l1.group.scale.setScalar(scale1(f));
        l1.group.position.x = rx(cx1(f));
        const n = l1.words.length;
        l1.words.forEach((w, i) => {
          const p = prog(f, IN[i]!, 7, outCubic);
          w.position.x = w.userData.restX + (i - (n - 1) / 2) * spread(f) * PX + (1 - p) * 30 * PX;
          const target = mid[i]!;
          tint.copy(GREY_FROM).lerp(target, prog(f, IN[i]! + 1, 8, outCubic));
          setLabel(w, { opacity: Math.min(1, p * 1.5), blur: (1 - p) * 10, color: tint });
        });
      } else {
        l2.group.scale.setScalar(scale2(f));
        for (const w of l2.letters) {
          const cx = w.position.x + (w.userData.wPx * PX) / 2 - 0;
          const edge = Math.min(1, Math.abs(cx) / l2Half) ** 3;
          setLabel(w, { opacity: op2(f), blur: blur2(f) * (0.15 + 2.3 * edge) });
        }
      }
    };
  });
}
