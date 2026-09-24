/** 19.2–24.8s · Works with every gig app: tiles hop around an orbit in depth. */
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { Stage, E, iv, drawText } from "../components/kit";
import { tile } from "../components/ui";
import upwork from "../assets/logo-upwork.svg";
import fiverr from "../assets/logo-fiverr.svg";
import uber from "../assets/logo-uber.svg";

const T = 200;

type TileSpec = { key: string; fill: (g: OffscreenCanvasRenderingContext2D) => string | CanvasGradient; logo?: string };

const TILES: TileSpec[] = [
  {
    key: "cal",
    fill: (g) => {
      const gr = g.createLinearGradient(0, 0, 0, T);
      gr.addColorStop(0, "#5aa8ff");
      gr.addColorStop(1, "#2f74f0");
      return gr;
    },
  },
  { key: "upwork", fill: () => "#ffffff", logo: upwork },
  { key: "fiverr", fill: () => "#1dbf73", logo: fiverr },
  { key: "uber", fill: () => "#000000", logo: uber },
];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const st = new Stage(ctx);

  const glow = st.layer(1080, 1080, (g) => {
    const a = g.createRadialGradient(430, 520, 0, 430, 520, 420);
    a.addColorStop(0, "rgba(236,150,236,0.75)");
    a.addColorStop(1, "rgba(236,150,236,0)");
    g.fillStyle = a;
    g.fillRect(0, 0, 1080, 1080);
    const b = g.createRadialGradient(650, 560, 0, 650, 560, 400);
    b.addColorStop(0, "rgba(150,170,255,0.55)");
    b.addColorStop(1, "rgba(150,170,255,0)");
    g.fillStyle = b;
    g.fillRect(0, 0, 1080, 1080);
  }, { pad: 0, res: 0.75 });

  const tiles = TILES.map((t) =>
    st.layer(T, T, (g, img) => {
      tile(g, 0, 0, T, t.fill(g));
      if (t.key === "cal") {
        drawText(g, "31", T / 2, T / 2 + 6, { size: 112, weight: 500, color: "#ffffff", align: "center", tracking: -4 });
      } else if (img[t.key]) {
        const s = T * 0.58;
        g.drawImage(img[t.key]!, (T - s) / 2, (T - s) / 2, s, s);
      }
    }, { images: t.logo ? { [t.key]: t.logo } : {}, pad: 50 }),
  );

  const STEPS = [18, 54, 90, 126];

  return ({ frame: f }) => {
    const out = iv(f, [152, 162], [0, 1], E.inCubic);
    glow.set({ x: 540, y: 540, op: iv(f, [0, 12], [0, 1]) * (1 - iv(f, [150, 166], [0, 1])), s: 1 + Math.sin(f * 0.05) * 0.03 });

    let base = 0.35 + f * 0.004;
    for (const s of STEPS) base += iv(f, [s, s + 18], [0, Math.PI / 2], E.inOutCubic);

    const depth = tiles.map((_, i) => Math.sin(base + (i * Math.PI) / 2));
    const order = depth.map((d, i) => ({ d, i })).sort((a, b) => a.d - b.d);
    order.forEach(({ i }, k) => tiles[i]!.z(10 + k));

    tiles.forEach((l, i) => {
      const a = base + (i * Math.PI) / 2;
      const d = Math.sin(a);
      const inP = iv(f, [i * 2, i * 2 + 12], [0, 1], E.outBack);
      const inO = iv(f, [i * 2, i * 2 + 7], [0, 1]);
      const scale = (0.78 + 0.28 * d) * (0.5 + 0.5 * inP) * (1 - out * 0.2);
      const back = Math.max(0, -d);
      l.set({
        x: 540 + Math.cos(a) * 200,
        y: 540 + d * 80 + Math.sin(f * 0.07 + i) * 6,
        s: scale,
        op: inO * (1 - out),
        bx: back * 8 + (1 - inO) * 20 + out * 20,
        by: back * 8 + (1 - inO) * 20 + out * 20,
      });
    });

    st.look(540, 540, iv(f, [0, 168], [1, 1.06], E.inOutSine));
  };
}
