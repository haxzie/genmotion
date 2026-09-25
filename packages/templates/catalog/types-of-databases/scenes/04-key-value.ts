import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { createBoard } from "../components/sketch";
import type { TextId } from "../components/texts";
import { MARGIN, RED } from "../components/brand";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const b = createBoard(ctx);
  b.header(3, "k_h", "k_sub");

  const keys: TextId[] = ["k_k0", "k_k1", "k_k2"];
  const vals: TextId[] = ["k_v0", "k_v1", "k_v2"];
  const kw = 300;
  const kh = 76;
  keys.forEach((k, i) => {
    const y = 370 + i * 112;
    const at = 26 + i * 14;
    const s = b.size(k);
    b.rect(MARGIN, y, kw, kh, { at, dur: 12 }, { seed: "kv-box" + i });
    b.text(k, MARGIN + (kw - s.w) / 2, y + (kh - s.h) / 2, { at: at + 4, dur: 10 }, { float: false });
    b.arrow([MARGIN + kw + 24, y + kh / 2], [MARGIN + kw + 190, y + kh / 2], { at: at + 10, dur: 10 }, { bend: -6, seed: "kv-a" + i });
    const v = b.size(vals[i]!);
    b.text(vals[i]!, MARGIN + kw + 214, y + (kh - v.h) / 2, { at: at + 16, dur: 10 });
  });

  // the payoff: it is fast
  const ms = b.size("k_ms");
  const mx = 1330;
  const my = 420;
  b.text("k_ms", mx, my, { at: 84, dur: 12 });
  b.ellipse(mx + ms.w / 2, my + ms.h / 2, ms.w / 2 + 60, ms.h / 2 + 22, { at: 94, dur: 16 }, { color: RED, width: 3, seed: "ms-ring" });
  b.text("k_per", mx + ms.w / 2 - b.size("k_per").w / 2, my + ms.h + 36, { at: 104 });

  b.goodFor("k_good", MARGIN, 800, 124);
  b.examples(["ex_redis", "ex_valkey", "ex_dynamodb"], MARGIN, 880, 140);

  return (f) => b.update(f);
}
