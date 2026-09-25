import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { createBoard } from "../components/sketch";
import type { TextId } from "../components/texts";
import { MARGIN, RED } from "../components/brand";

type Pt = [number, number];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const b = createBoard(ctx);
  b.header(4, "g_h", "g_sub");

  const nodes: Record<string, { id: TextId; c: Pt; at: number }> = {
    ada: { id: "g_n_ada", c: [270, 530], at: 26 },
    bob: { id: "g_n_bob", c: [560, 410], at: 32 },
    cara: { id: "g_n_cara", c: [560, 660], at: 36 },
    dan: { id: "g_n_dan", c: [860, 530], at: 42 },
    eve: { id: "g_n_eve", c: [1150, 420], at: 48 },
  };
  const RY = 42;
  const rx = (k: string) => b.size(nodes[k]!.id).w / 2 + 34;

  for (const [k, n] of Object.entries(nodes)) {
    const s = b.size(n.id);
    b.ellipse(n.c[0], n.c[1], rx(k), RY, { at: n.at, dur: 12 }, { seed: "node-" + k, width: 3 });
    b.text(n.id, n.c[0] - s.w / 2, n.c[1] - s.h / 2, { at: n.at + 5, dur: 8 }, { float: false });
  }

  /** Point on node k's ellipse facing toward p, pushed out a little. */
  const edge = (k: string, p: Pt, pad = 12): Pt => {
    const { c } = nodes[k]!;
    const a = Math.atan2((p[1] - c[1]) / RY, (p[0] - c[0]) / rx(k));
    return [c[0] + Math.cos(a) * (rx(k) + pad), c[1] + Math.sin(a) * (RY + pad)];
  };
  const link = (from: string, to: string, at: number, red = false) => {
    const a = nodes[from]!.c;
    const z = nodes[to]!.c;
    b.arrow(edge(from, z), edge(to, a), { at, dur: 12 }, {
      bend: -8,
      color: red ? RED : undefined,
      width: red ? 3.4 : 2.6,
      head: 18,
      seed: `e-${from}-${to}-${red}`,
    });
  };

  link("ada", "bob", 54);
  link("ada", "cara", 58);
  link("bob", "dan", 62);
  link("cara", "dan", 66);
  link("dan", "eve", 70);
  const mid: Pt = [(nodes.ada!.c[0] + nodes.bob!.c[0]) / 2, (nodes.ada!.c[1] + nodes.bob!.c[1]) / 2];
  b.text("g_follows", mid[0] - 150, mid[1] - 58, { at: 64 });

  // the query walks the path in red
  link("ada", "bob", 88, true);
  link("bob", "dan", 98, true);
  link("dan", "eve", 108, true);
  b.text("g_hops", 1030, 560, { at: 118 });

  b.goodFor("g_good", MARGIN, 800, 132);
  b.examples(["ex_neo4j", "ex_neptune", "ex_memgraph"], MARGIN, 880, 146);
  void MARGIN;

  return (f) => b.update(f);
}
