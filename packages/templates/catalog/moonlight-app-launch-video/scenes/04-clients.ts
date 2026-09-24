/** 8.5–12.4s · Every client remembered: a bubble cluster, then three profiles, pushing in on the boss. */
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { Stage, E, iv, drawText, measure, textLayer } from "../components/kit";
import { avatar, circle, rr } from "../components/ui";
import { popIn } from "../components/fx";
import { AVATARS, AV_BG } from "../components/people";

type Dot = { x: number; y: number; r: number; av?: string; fill?: string };

const DOTS: Dot[] = [
  { x: 329, y: 328, r: 126, av: "dev" },
  { x: 779, y: 410, r: 94, av: "marco" },
  { x: 468, y: 518, r: 92, av: "karen" },
  { x: 729, y: 675, r: 126, av: "sam" },
  { x: 270, y: 756, r: 104, av: "boss" },
  { x: 563, y: 328, r: 64, fill: "#d8cdf6" },
  { x: 153, y: 423, r: 46, fill: "#f8dcae" },
  { x: 270, y: 540, r: 70, fill: "#d8cdf6" },
  { x: 623, y: 455, r: 46, fill: "#f4a9b8" },
  { x: 684, y: 243, r: 46, fill: "#c8ecf8" },
  { x: 905, y: 549, r: 46, fill: "#c8ecf8" },
  { x: 500, y: 734, r: 70, fill: "#c3f0c8" },
  { x: 612, y: 855, r: 46, fill: "#f8c3d7" },
];
const CX = 530;
const CY = 540;

const PEOPLE = [
  { av: "boss", name: "Boss", label: "💼  likes overtime", bg: "#dcecfb", fg: "#1c5f99", x: 268 },
  { av: "priya", name: "Priya", label: "🎨  likes pastels", bg: "#ddf5e1", fg: "#1f7a3a", x: 540 },
  { av: "dev", name: "Dev", label: "🌙  likes dark mode", bg: "#fbe2ec", fg: "#a3265b", x: 812 },
];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const st = new Stage(ctx);

  // Soft lavender blob that holds the cluster.
  const blob = st.layer(1000, 1000, (g) => {
    const off = (d: Dot) => ({ x: d.x - CX + 500, y: d.y - CY + 500 });
    g.save();
    g.shadowColor = "rgba(170,150,235,0.55)";
    g.shadowBlur = 30;
    g.fillStyle = "#ebe5fb";
    for (const d of DOTS) {
      const o = off(d);
      circle(g, o.x, o.y, d.r + 44);
      g.fill();
    }
    g.restore();
    g.fillStyle = "#f7f5fe";
    for (const d of DOTS) {
      const o = off(d);
      circle(g, o.x, o.y, d.r + 32);
      g.fill();
    }
  }, { pad: 60, res: 1 });

  const dots = DOTS.map((d) => ({
    d,
    layer: st.layer(d.r * 2, d.r * 2, (g, img) => {
      if (d.av) avatar(g, img[d.av], d.r, d.r, d.r, AV_BG[d.av]!, 1.12);
      else {
        circle(g, d.r, d.r, d.r);
        g.fillStyle = d.fill!;
        g.fill();
      }
    }, { images: d.av ? { [d.av]: AVATARS[d.av]! } : {}, pad: 20 }),
  }));

  const people = PEOPLE.map((p) => {
    const av = st.layer(220, 220, (g, img) => avatar(g, img[p.av], 110, 110, 110, AV_BG[p.av]!, 1.1), {
      images: { [p.av]: AVATARS[p.av]! },
      pad: 30,
    });
    const nm = textLayer(st, p.name, { size: 46, weight: 500, color: "#111" });
    const lw = measure(p.label, { size: 28 }) + 40;
    const lb = st.layer(lw, 52, (g) => {
      rr(g, 0, 0, lw, 52, 26);
      g.fillStyle = p.bg;
      g.fill();
      drawText(g, p.label, lw / 2, 27, { size: 28, color: p.fg, align: "center" });
    }, { pad: 20 });
    return { p, av, nm, lb };
  });

  return ({ frame: f }) => {
    // ── cluster ──
    const dis = iv(f, [46, 56], [0, 1], E.inQuad);
    const bp = iv(f, [0, 14], [0, 1], E.outBack);
    blob.set({ x: CX, y: CY, s: 0.3 + 0.7 * bp, op: iv(f, [0, 6], [0, 1]), dis, cell: 40 });
    dots.forEach(({ d, layer }, i) => {
      const at = 2 + ((i * 5) % 13);
      const drift = Math.sin(f * 0.09 + i * 1.7) * 5;
      const sx = CX + (d.x - CX) * iv(f, [at, at + 12], [0.4, 1], E.outCubic);
      const sy = CY + (d.y - CY) * iv(f, [at, at + 12], [0.4, 1], E.outCubic) + drift;
      popIn(layer, f, at, sx, sy, 12, 0.2);
      layer.set({ dis, cell: 28 });
    });

    // ── three profiles ──
    people.forEach(({ p, av, nm, lb }, i) => {
      const at = 54 + i * 3;
      const inP = iv(f, [at, at + 12], [0, 1], E.outQuart);
      const slide = (1 - inP) * 260;
      const focus = iv(f, [84, 100], [0, 1], E.inOutCubic);
      const soft = i === 0 ? 0 : focus;
      const out = iv(f, [106, 114], [0, 1], E.inCubic);
      const op = inP * (1 - soft * 0.55) * (1 - out);
      const blur = (1 - inP) * 24 + soft * 22 + out * 40;
      av.set({ x: p.x + slide, y: 470, op, bx: blur, by: out * 30, s: 0.85 + 0.15 * inP });
      nm.set({ x: p.x + slide * 1.1, y: 628, op, bx: blur, by: out * 30 });
      lb.set({ x: p.x + slide * 1.2, y: 692, op, bx: blur, by: out * 30 });
    });

    // Camera holds on the cluster, then pushes into the boss.
    const push = iv(f, [84, 108], [0, 1], E.inOutCubic);
    st.look(iv(push, [0, 1], [540, 400]), iv(push, [0, 1], [540, 530]), 1 + 0.55 * push + iv(f, [0, 50], [0, 0.03], E.inOutSine));
  };
}
