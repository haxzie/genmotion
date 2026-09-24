/** 6.3–8.5s · "For a very active double life", ringed by little pink moons. */
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { Stage, E, iv, wordLayers } from "../components/kit";
import { C, pinkWash, circle } from "../components/ui";
import { blurUp } from "../components/fx";

const MOONS = [
  { x: 236, y: 452, r: 20, at: 20 },
  { x: 262, y: 590, r: 26, at: 23 },
  { x: 850, y: 440, r: 16, at: 25 },
  { x: 880, y: 540, r: 24, at: 22 },
  { x: 792, y: 600, r: 18, at: 27 },
  { x: 470, y: 560, r: 14, at: 29 },
];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const st = new Stage(ctx);
  const wash = st.layer(1080, 1080, (g) => pinkWash(g, 1080, 1080), { pad: 0, res: 1 });

  const small = wordLayers(st, "For a very active", { size: 62, weight: 600, color: C.ink, tracking: -1.5 }, 552);
  const big = wordLayers(st, "double life", { size: 120, weight: 800, color: C.ink, tracking: -4 }, 540);

  const moons = MOONS.map((m) => {
    const layer = st.layer(m.r * 2, m.r * 2, (g) => {
      const r = m.r;
      g.save();
      g.shadowColor = "rgba(240,120,220,0.6)";
      g.shadowBlur = r * 0.8;
      circle(g, r, r, r);
      g.fillStyle = "#f6a3e6";
      g.fill();
      g.restore();
      g.globalCompositeOperation = "destination-out";
      circle(g, r * 1.45, r * 0.7, r * 0.8);
      g.fill();
      g.globalCompositeOperation = "source-over";
    }, { pad: 20 });
    return { layer, ...m };
  });

  return ({ frame: f }) => {
    wash.set({ x: 540, y: 540, op: 1 });
    small.forEach((w, i) => blurUp(w.layer, f, 2 + i * 3, w.x, 470, { dur: 9, dy: 14, blur: 16, outAt: 54, outDur: 7, outDy: -18 }));
    big.forEach((w, i) =>
      blurUp(w.layer, f, 16 + i * 3, w.x, 562, { dur: 12, dy: 10, blur: 34, fromS: 1.12, outAt: 55, outDur: 7, outDy: -18 }),
    );
    for (const m of moons) {
      const p = iv(f, [m.at, m.at + 10], [0, 1], E.outBack);
      const q = iv(f, [53, 60], [0, 1], E.inCubic);
      const bob = Math.sin((f + m.at * 3) * 0.12) * 6;
      m.layer.set({
        x: m.x,
        y: m.y + bob - q * 20,
        s: 0.2 + 0.8 * p,
        rot: (1 - p) * -40,
        op: Math.min(1, p * 2) * (1 - q),
        bx: q * 10,
        by: q * 10,
      });
    }
    st.look(540, 540, iv(f, [0, 65], [1.015, 1.04], E.inOutSine));
  };
}
