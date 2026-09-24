/** 12.4–16.0s · The boss asks for Saturday; Moonlight drafts the polite "no", cursor hits Send. */
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { Stage, E, iv, textLayer } from "../components/kit";
import { AVATARS } from "../components/people";
import {
  chatPhone, keyboardLayer, bubbleLayer, chipsLayer, cursorLayer, placeCursor, bump, blurUp, MSG, PH,
} from "../components/fx";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const st = new Stage(ctx);
  const phone = chatPhone(st, { name: "Boss", av: "boss" }, { boss: AVATARS.boss! });
  const kb = keyboardLayer(st);

  const m1 = bubbleLayer(st, { lines: ["Hey, quick one 👋"], side: "left", size: 19 });
  const m2 = bubbleLayer(st, { lines: ["Can you come in", "this Saturday? 🙏"], side: "left", size: 19 });
  const m3 = bubbleLayer(st, { lines: ["Sure, I can come in 🙃"], side: "right", size: 19 });
  const label = textLayer(st, "Moonlight suggestion", { size: 14, color: "#8a8a8f" });
  const sug = bubbleLayer(st, { lines: ["Sorry, I've already got", "plans this weekend 🙂"], side: "right", size: 19 }, true);
  const chips = chipsLayer(st, ["No", "Send?"], 19);
  const cur = cursorLayer(st);

  const L = (b: { w: number }) => MSG.left + b.w / 2;
  const R = (b: { w: number }) => MSG.right - b.w / 2;
  const sendX = MSG.right - chips.w + chips.centers[1]!;
  const sendY = 572 + chips.h / 2;

  return ({ frame: f }) => {
    const zoomP = iv(f, [26, 50], [0, 1], E.inOutCubic);
    const zoom = iv(zoomP, [0, 1], [0.97, 2.15]);
    st.look(iv(zoomP, [0, 1], [540, 562]), iv(zoomP, [0, 1], [540, 452]), zoom);

    const intro = iv(f, [0, 8], [0, 1], E.outCubic);
    const dis = iv(f, [97, 106], [0, 1], E.inQuad);
    phone.set({ x: PH.left + PH.w / 2, y: PH.top + PH.h / 2 + (1 - intro) * 40, op: intro, bx: 0, by: (1 - intro) * 20, dis });
    kb.layer.set({ x: kb.x, y: kb.y + (1 - intro) * 40 + iv(f, [40, 50], [0, 60], E.inCubic), op: intro * iv(f, [40, 50], [1, 0]), dis });

    blurUp(m1.layer, f, 2, L(m1), 240 + m1.h / 2, { dur: 8, dy: 20 });
    blurUp(m2.layer, f, 5, L(m2), 290 + m2.h / 2, { dur: 8, dy: 20 });
    blurUp(m3.layer, f, 12, R(m3), 376 + m3.h / 2, { dur: 8, dy: 20 });
    blurUp(label, f, 50, MSG.right - sug.w + 76, 446, { dur: 8, dy: 10 });
    blurUp(sug.layer, f, 52, R(sug), 460 + sug.h / 2, { dur: 10, dy: 24, fromS: 0.94 });
    blurUp(chips.layer, f, 58, MSG.right - chips.w / 2, sendY, { dur: 8, dy: 14 });

    // Send chip squish on click.
    const click = bump(f, 86, 4);
    chips.layer.set({ s: 1 - click * 0.05 });
    for (const l of [m1.layer, m2.layer, m3.layer, label, sug.layer, chips.layer]) l.set({ dis });

    // Cursor: glides in from lower right, clicks Send.
    const c = iv(f, [66, 82], [0, 1], E.inOutCubic);
    const cx = iv(c, [0, 1], [830, sendX + 4]);
    const cy = iv(c, [0, 1], [700, sendY + 4]) + Math.sin(c * Math.PI) * -30;
    placeCursor(cur, cx, cy, 1 / zoom, iv(f, [64, 68], [0, 1]) * (1 - dis), click);
  };
}
