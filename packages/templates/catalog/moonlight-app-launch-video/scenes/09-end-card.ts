/** 27.7–32.0s · End card: icon, "The most personal moonlighting assistant yet", fade to black. */
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { Stage, E, iv, wordLayers } from "../components/kit";
import { C, appIcon, pinkWash } from "../components/ui";
import { blurUp } from "../components/fx";

/** Must match END_ICON in 08-after-hours.ts. */
const END_ICON = { x: 540, y: 470, size: 130 };

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const st = new Stage(ctx);
  const wash = st.layer(1080, 1080, (g) => pinkWash(g, 1080, 1080, 1.05), { pad: 0, res: 1 });
  const icon = st.layer(END_ICON.size, END_ICON.size, (g) => appIcon(g, 0, 0, END_ICON.size), { pad: 30 });
  const style = { size: 60, weight: 600, color: C.ink, tracking: -1.5 };
  const l1 = wordLayers(st, "The most personal", style, 540);
  const l2 = wordLayers(st, "moonlighting assistant yet", style, 540);
  const black = st.layer(1080, 1080, (g) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 1080, 1080);
  }, { pad: 0, res: 0.25 });

  return ({ frame: f }) => {
    const rise = iv(f, [6, 34], [0, 1], E.outCubic);
    wash.set({ x: 540, y: 540 + (1 - rise) * 420, op: rise });

    icon.set({ x: END_ICON.x, y: END_ICON.y + Math.sin(f * 0.06) * 3, s: 1, op: 1 });

    l1.forEach((w, i) => blurUp(w.layer, f, 20 + i * 4, w.x, 610, { dur: 10, dy: 20, blur: 20 }));
    l2.forEach((w, i) => blurUp(w.layer, f, 36 + i * 5, w.x, 686, { dur: 10, dy: 20, blur: 20 }));

    black.set({ x: 540, y: 540, op: iv(f, [108, 116, 122], [0, 0.45, 1], E.inOutSine) });
    st.look(540, 540, iv(f, [0, 129], [1, 1.04], E.inOutSine));
  };
}
