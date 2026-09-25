import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { createBoard } from "../components/sketch";
import type { TextId } from "../components/texts";
import { MARGIN, RED, CODE_BG } from "../components/brand";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const b = createBoard(ctx);
  b.header(2, "d_h", "d_sub");

  // code box, like the reference's "find yours:" block
  const bx = MARGIN;
  const by = 360;
  const bw = 820;
  const lineH = 50;
  const lines: TextId[] = ["d_code0", "d_code1", "d_code2", "d_code3", "d_code4", "d_code5"];
  const bh = lines.length * lineH + 56;
  b.fill(bx, by, bw, bh, CODE_BG, { at: 24, dur: 12 });
  b.rect(bx, by, bw, bh, { at: 26, dur: 18 }, { seed: "code-box", width: 3 });
  lines.forEach((id, i) => b.text(id, bx + 40, by + 28 + i * lineH, { at: 34 + i * 5, dur: 10 }, { float: false }));

  const lineEnd = (i: number) => [bx + 40 + b.size(lines[i]!).w + 14, by + 28 + i * lineH + 22] as [number, number];

  // annotations to the right, pointing back at the lines they describe
  const ax = 1090;
  const a1 = b.size("d_a1");
  b.text("d_a1", ax, 440, { at: 84 });
  b.arrow([ax - 16, 440 + a1.h / 2], lineEnd(3), { at: 78, dur: 16 }, { color: RED, bend: 14, seed: "a1" });

  const a2 = b.size("d_a2");
  b.text("d_a2", ax, 590, { at: 104 });
  b.arrow([ax - 16, 590 + a2.h / 2], lineEnd(4), { at: 98, dur: 14 }, { bend: -10, seed: "a2" });

  b.goodFor("d_good", MARGIN, 800, 126);
  b.examples(["ex_mongodb", "ex_firestore", "ex_couchdb"], MARGIN, 880, 142);

  return (f) => b.update(f);
}
