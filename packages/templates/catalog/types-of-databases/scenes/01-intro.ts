import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { createBoard } from "../components/sketch";
import { MARGIN, RED } from "../components/brand";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const b = createBoard(ctx);
  const x = MARGIN;

  b.text("i_l1", x, 250, { at: 4 });
  b.text("i_l2", x, 392, { at: 16 });

  const subA = b.size("i_subA");
  const subB = b.size("i_subB");
  b.text("i_subA", x + 4, 590, { at: 36 });
  b.text("i_subB", x + 4 + subA.w, 590, { at: 44 });
  // red pen underline under the phrase that matters
  b.strokes(
    [[[x + 8 + subA.w, 590 + subB.h + 4], [x + subA.w + subB.w - 6, 590 + subB.h - 2]]],
    { at: 58, dur: 12 },
    { color: RED, width: 4, seed: "u1" },
  );

  // a sketched database cylinder on the right
  const cx = 1480;
  const rx = 170;
  const ry = 46;
  const top = 300;
  const bot = 690;
  b.ellipse(cx, top, rx, ry, { at: 22, dur: 14 }, { seed: "cyl-top", width: 3.2 });
  b.line([cx - rx, top], [cx - rx, bot], { at: 30, dur: 10 }, { seed: "cyl-l" });
  b.line([cx + rx, top], [cx + rx, bot], { at: 32, dur: 10 }, { seed: "cyl-r" });
  b.arc(cx, bot, rx, ry, 0, Math.PI, { at: 38, dur: 10 }, { seed: "cyl-b", width: 3.2 });
  b.arc(cx, top + 130, rx, ry, 0, Math.PI, { at: 44, dur: 10 }, { seed: "cyl-m1", width: 3 });
  b.arc(cx, top + 260, rx, ry, 0, Math.PI, { at: 48, dur: 10 }, { seed: "cyl-m2", width: 3 });

  return (f) => b.update(f);
}
