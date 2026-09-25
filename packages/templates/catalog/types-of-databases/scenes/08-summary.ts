import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { createBoard } from "../components/sketch";
import type { TextId } from "../components/texts";
import { MARGIN, W } from "../components/brand";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const b = createBoard(ctx);

  // the chapter tag carried over from the previous scenes; it leaves with everything else here
  const tag = b.size("tag");
  b.text("tag", W - MARGIN - tag.w, 64, { at: -100, dur: 1 }, { float: false });

  b.text("s_h", MARGIN, 90, { at: 4 });

  const boxX = 1260;
  const boxW = W - MARGIN - boxX;
  const boxH = 84;
  for (let i = 0; i < 6; i++) {
    const need = `s_need${i}` as TextId;
    const kind = `s_kind${i}` as TextId;
    const y = 250 + i * 126;
    const at = 20 + i * 16;
    const s = b.size(need);
    b.text(need, MARGIN, y + (boxH - s.h) / 2, { at });
    b.arrow([MARGIN + s.w + 40, y + boxH / 2 + 2], [boxX - 30, y + boxH / 2], { at: at + 6, dur: 12 }, { bend: -6, seed: "sa" + i });
    b.labelBox(kind, boxX, y, boxW, boxH, { at: at + 12, dur: 12 }, { seed: "sb" + i, width: 3 });
  }

  return (f) => b.update(f);
}
