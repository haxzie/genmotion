import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, rx, ry } from "../components/stage";
import { glide, prog, outCubic, inCubic, clamp01 } from "../components/ease";
import { label, letters, line, measure, setLabel, withInter, GREY_FROM } from "../components/type";
import { bottomGlow } from "../components/glow";

/**
 * Global f1336–f1478 (scene frame = global - 1336).
 * "instead of spending" -> a slate "weeks" that inks and shrinks -> "coordinating" types on
 * after it -> a vertical word slot cycles consultants / solution architects / internal teams,
 * all while the line slowly recedes over the teal glow. Clears into the glow.
 */
const G0 = 1336;
const INK = new THREE.Color("#333333");
const SLATE = new THREE.Color("#4a7d93");
const PALE = new THREE.Color("#b9cbd3");

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#f2f6f9");
    fitCamera(camera, height, 50);
    const glow = bottomGlow();
    scene.add(glow.group);

    const ST = { weight: 400, tracking: 0.01 };
    /* instead of spending */
    const s1 = 100 * (1141 / measure("instead of spending", { ...ST, size: 100 }));
    const l1 = line("instead of spending", { ...ST, size: s1 }, "center");
    l1.group.position.y = ry(536);
    scene.add(l1.group);
    const IN1 = [1335, 1338, 1341];
    const sc1 = glide([[1335, 1.0], [1343, 1.0], [1349, 0.944], [1352, 0.92]]);

    /* weeks coordinating [slot] */
    const size = 100 * (911 / measure("weeks coordinating", { ...ST, size: 100 }));
    const st = { ...ST, size };
    const weeks = label("weeks", st, "left", 20);
    weeks.name = "weeks";
    const coord = letters("coordinating", st);
    coord.group.name = "coordinating";
    coord.track(0.01, "left");
    const weeksW = measure("weeks", st);
    const sp = measure(" ", st);
    const coordW = measure("coordinating", st);
    const SLOT = ["consultants", "solution architects", "internal teams"];
    const slot = SLOT.map((w) => {
      const m = label(w, { ...st, color: "#4a7d93" }, "left", 20);
      m.name = w.replace(/ /g, "-");
      return m;
    });
    const slotW = SLOT.map((w) => measure(w, st));
    const grp = new THREE.Group();
    grp.name = "weeks-coordinating";
    grp.add(weeks, coord.group, ...slot);
    scene.add(grp);

    const scaleK = glide([[1352, 487 / weeksW * 1.06], [1355, 487 / weeksW], [1361, 0.46 * 911 / weeksW * 0.95], [1367, 364 / weeksW], [1385, 1.0], [1403, 0.89], [1421, 0.86], [1445, 0.8], [1462, 0.755], [1474, 0.6], [1478, 0.52]]);
    const LET_T = Array.from({ length: 12 }, (_, i) => 1371 + i * 1.1);
    const slotIdx = glide([[1389, -0.9], [1394, 0], [1412, 0], [1419, 1], [1450, 1], [1458, 2], [1478, 2]]);
    const slotOn = prog; // alias for readability
    const tint = new THREE.Color();

    return ({ frame: local }) => {
      const f = local + G0;

      /* line 1 */
      l1.group.visible = f < 1353;
      l1.group.scale.setScalar(sc1(f));
      l1.group.position.x = rx(1011);
      l1.words.forEach((w, i) => {
        const p = prog(f, IN1[i]!, 6, outCubic);
        w.position.y = 0;
        tint.copy(GREY_FROM).lerp(INK, prog(f, IN1[i]! + 1, 5, outCubic));
        setLabel(w, { opacity: Math.min(1, p * 1.6), blur: (1 - p) * 10, color: tint });
      });

      /* weeks line */
      grp.visible = f >= 1353;
      if (!grp.visible) return;
      const s = scaleK(f);
      // typed width of coordinating so far
      let typed = 0;
      coord.letters.forEach((l, i) => {
        const p = prog(f, LET_T[i]!, 2, outCubic);
        setLabel(l, { opacity: p, blur: (1 - p) * 4, color: INK });
        if (p > 0) typed = i + 1;
      });
      const typedW = typed > 0 ? measure("coordinating".slice(0, typed), st) : 0;
      const si = slotIdx(f);
      const k = clamp01(si);
      const curSlotW = slotW[0]!; // the line stays centred on its first slot word
      void k;
      const lineW = weeksW + (typed ? sp + typedW : 0) + (f >= 1389 ? sp + curSlotW : 0);
      const left = -lineW / 2;
      grp.scale.setScalar(s);
      grp.position.set(rx(912), ry(553), 0);
      weeks.position.set(left * PX, 0, 0);
      const pw = prog(f, 1353, 4, outCubic);
      tint.copy(SLATE).lerp(INK, prog(f, 1357, 6, outCubic));
      const out = prog(f, 1472, 6, inCubic);
      setLabel(weeks, { opacity: pw * (1 - out), blur: (1 - pw) * 8 + out * 10, color: tint });
      coord.group.position.set((left + weeksW + sp) * PX, 0, 0);
      coord.letters.forEach((l) => setLabel(l, { opacity: (l.material.uniforms.uOpacity!.value as number) * (1 - out) }));
      const slotX = left + weeksW + sp + coordW + sp;
      slot.forEach((m, i) => {
        const d = i - si;
        const near = Math.max(0, 1 - Math.abs(d));
        m.visible = f >= 1389 && Math.abs(d) < 1.6;
        m.position.set(slotX * PX, -d * size * 1.12 * PX, 0);
        tint.copy(PALE).lerp(SLATE, near);
        const o = slotOn(f, 1389, 5, outCubic) * ((d < 0 ? 0.08 : 0.3) + (d < 0 ? 0.92 : 0.7) * near) * (1 - out);
        setLabel(m, { opacity: o, blur: (1 - near) * 2.5 + out * 10, color: tint });
      });

      glow.set(0.85 + prog(f, 1466, 12) * 0.15, prog(f, 1468, 10, outCubic) * 160, 0);
    };
  });
}
