import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { createBoard } from "../components/sketch";
import type { TextId } from "../components/texts";
import { MARGIN, RED, GREY } from "../components/brand";

type Pt = [number, number];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const b = createBoard(ctx);
  b.header(6, "v_h", "v_sub");

  // an embedding space: things that mean similar things sit close together
  const words: { id: TextId; p: Pt }[] = [
    { id: "v_w_cat", p: [300, 450] },
    { id: "v_w_kitten", p: [250, 600] },
    { id: "v_w_lion", p: [520, 400] },
    { id: "v_w_dog", p: [470, 560] },
    { id: "v_w_car", p: [900, 430] },
    { id: "v_w_truck", p: [1060, 530] },
    { id: "v_w_bus", p: [880, 640] },
  ];
  b.rect(MARGIN, 350, 1080, 390, { at: 20, dur: 20 }, { seed: "space", width: 2, color: GREY });
  words.forEach(({ id, p }, i) => {
    const at = 30 + i * 4;
    b.dot(p[0], p[1], 8, { at, dur: 8 });
    b.text(id, p[0] + 18, p[1] - b.size(id).h / 2, { at: at + 3, dur: 8 });
  });

  // the query lands, then reaches for its nearest neighbours
  const q: Pt = [420, 700];
  b.dot(q[0], q[1], 10, { at: 74, dur: 8 }, RED);
  b.text("v_q", q[0] + 20, q[1] - b.size("v_q").h / 2 + 4, { at: 78, dur: 10 });
  (["v_w_dog", "v_w_kitten", "v_w_cat"] as TextId[]).forEach((id, i) => {
    const p = words.find((w) => w.id === id)!.p;
    const dx = p[0] - q[0];
    const dy = p[1] - q[1];
    const l = Math.hypot(dx, dy);
    b.arrow([q[0] + (dx / l) * 18, q[1] + (dy / l) * 18], [p[0] - (dx / l) * 16, p[1] - (dy / l) * 16], { at: 92 + i * 6, dur: 10 }, {
      color: RED,
      bend: 8,
      head: 16,
      seed: "nn" + i,
    });
  });
  b.ellipse(390, 520, 230, 130, { at: 112, dur: 16 }, { color: RED, width: 2.6, seed: "cluster" });

  b.text("v_r1", 1300, 470, { at: 118 });
  b.text("v_r2", 1300, 540, { at: 124 });

  b.goodFor("v_good", MARGIN, 800, 134);
  b.examples(["ex_pgvector", "ex_pinecone", "ex_qdrant"], MARGIN, 880, 148);

  return (f) => b.update(f);
}
