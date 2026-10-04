import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, rx, ry } from "../components/stage";
import { glide, prog, outCubic, inCubic } from "../components/ease";
import { letters, line, measure, setLabel, withInter, GREY_FROM } from "../components/type";
import { bottomGlow } from "../components/glow";

/**
 * Global f1591–f1695 (scene frame = global - 1591). The end line.
 * "Learn more at" assembles word by word, "assemble.ai" types on after it; the lead-in
 * blurs away left, the URL glides to centre and "/today" types on. Holds to the end.
 */
const G0 = 1591;
const INK = new THREE.Color("#2e2e2e");
const BLACK = new THREE.Color("#0a0a0a");

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#fafbfc");
    fitCamera(camera, height, 50);
    const glow = bottomGlow();
    scene.add(glow.group);

    const URL_ST = { weight: 600, tracking: 0.005 };
    const size = 100 * (447 / measure("assemble.ai", { ...URL_ST, size: 100 }));
    const lead = line("Learn more at", { weight: 400, tracking: 0.01, size }, "left");
    lead.group.name = "learn-more-at";
    scene.add(lead.group);
    const leadW = measure("Learn more at", { weight: 400, tracking: 0.01, size });
    const sp = measure(" ", { weight: 400, size });
    const url = letters("assemble.ai/today", { ...URL_ST, size, color: "#0a0a0a" });
    url.group.name = "assemble-ai-today";
    url.track(0.005, "left");
    scene.add(url.group);

    const LEAD_IN = [1591, 1594, 1598];
    const URL_T = [1602, 1603, 1604, 1605, 1606.5, 1608, 1609, 1610, 1611, 1614, 1616, /* /today */ 1639, 1640.5, 1642, 1643, 1644.5, 1645.5];
    const L = glide([[1591, 727], [1600, 741], [1606, 692], [1612, 460], [1618, 438], [1622, 430]]);
    const AL = glide([[1619, 438 + leadW + sp], [1622, 438 + leadW + sp + 20], [1628, 760], [1634, 860], [1641, 860], [1645, 800], [1650, 700], [1656, 640], [1660, 634], [1696, 634]]);
    const tint = new THREE.Color();

    return ({ frame: local }) => {
      const f = local + G0;
      const out = prog(f, 1619, 7, inCubic);
      const left = L(f) - out * 120;
      lead.group.position.set(rx(left), ry(540), 0);
      lead.group.visible = out < 1;
      lead.words.forEach((w, i) => {
        const p = prog(f, LEAD_IN[i]!, 6, outCubic);
        w.position.x = w.userData.restX + (1 - p) * 30 * PX;
        tint.copy(GREY_FROM).lerp(INK, prog(f, LEAD_IN[i]! + 1, 5, outCubic));
        setLabel(w, { opacity: Math.min(1, p * 1.6) * (1 - out), blur: (1 - p) * 10 + out * 12, color: tint });
      });
      const ax = f < 1619 ? L(f) + leadW + sp : AL(f);
      url.group.position.set(rx(ax), ry(540), 0);
      url.letters.forEach((l, i) => {
        const p = prog(f, URL_T[i]!, 2, outCubic);
        tint.copy(GREY_FROM).lerp(BLACK, prog(f, URL_T[i]! + 1, 3, outCubic));
        setLabel(l, { opacity: p, blur: (1 - p) * 4, color: tint });
      });
      glow.set(1, 0, 0.08);
    };
  });
}
