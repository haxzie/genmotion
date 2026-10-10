import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { COPY, FONT_FAMILY } from "../components/brand";
import { screenLayer, fy, track } from "../components/stage";
import { label, setLabel, withFonts } from "../components/type";
import { backdrop } from "../components/fx";
import { curve, E_OFFSET } from "../components/ref-curves";

/*
 * A three-line list rolls upward like a picker: each line takes its turn at
 * full white while the others sit back, soft and translucent.
 */
/** Global frame of this scene's first frame (the measured curves use global frames). */
const F0 = 327;
/** Line pitch, measured at the handoffs (fraction of frame height). */
const PITCH = 0.203;
/** Our label centre sits below the reference's lit-ink centre by this much (measured). */
const INK_OFFSET = -0.016;
/** A line is lit while it crosses this band, like the window of a picker wheel. */
const lit = (y: number) => THREE.MathUtils.smoothstep(y, 0.405, 0.44) * (1 - THREE.MathUtils.smoothstep(y, 0.55, 0.585));

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera } = ctx;
    const layer = screenLayer(scene, camera);

    const bg = backdrop();
    bg.grad("#3a80f2", "#a79ef0", [0.55, 0.85]);
    scene.add(bg);

    const lines = COPY.list.map((t) => {
      const l = label(t, { size: 160, weight: 450, pad: 30 });
      layer.add(l);
      return l;
    });

    return ({ frame: f, time }) => {
      bg.glow(0, { x: 0.15 + Math.sin(time * 0.4) * 0.03, y: 0.1, rx: 0.5, ry: 0.4, color: "#2f6fe8", amount: 0.25 });
      // one continuous measured scroll: slow drift while a line is lit, a quick
      // ease through each handoff; brightness follows position, not a schedule
      const top = curve(E_OFFSET, f + F0) + INK_OFFSET;
      lines.forEach((l, i) => {
        const y = top + PITCH * i;
        l.position.y = fy(y);
        const act = lit(y);
        const arrive = interpolate(f, [i * 3, i * 3 + 6], [0, 1]);
        const leave = i === 2 ? interpolate(f, [77, 81], [1, 0.6]) : interpolate(f, [70, 79], [1, 0]);
        setLabel(l, { color: "#ffffff", opacity: (0.28 + act * 0.72) * arrive * leave, blur: (1 - act) * 4.5 });
      });
    };
  });
}
