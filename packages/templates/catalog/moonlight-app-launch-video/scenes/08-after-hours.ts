/** 24.8–27.7s · Boss logs off, Moonlight offers to ship Dev's build. Cursor taps Yes, icon hands off. */
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { Stage, E, iv, textLayer } from "../components/kit";
import { appIcon } from "../components/ui";
import {
  chatPhone, keyboardLayer, bubbleLayer, chipsLayer, cursorLayer, placeCursor, bump, blurUp, MSG, PH,
} from "../components/fx";

/** Must match END_ICON in 09-end-card.ts — the icon is the handoff across the cut. */
const END_ICON = { x: 540, y: 470, size: 130 };

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const st = new Stage(ctx);
  const phone = chatPhone(st, { name: "Moonlight", app: true }, {});
  const kb = keyboardLayer(st);

  const m1 = bubbleLayer(st, { lines: ["Can you fit Priya's", "logo job in this week?"], side: "right", size: 19 });
  const m2 = bubbleLayer(st, { lines: ["Done! She's free at 9pm,", "after work. Does that work?"], side: "left", size: 19 });
  const today = textLayer(st, "Today", { size: 15, weight: 500, color: "#8a8a8f" });
  const m3 = bubbleLayer(st, { lines: ["Boss just logged off 🌙", "Want me to send Dev", "the final build?"], side: "left", size: 19 });
  const chips = chipsLayer(st, ["No 😭", "Yes 😜"], 19);
  const cur = cursorLayer(st);
  const icon = st.layer(END_ICON.size, END_ICON.size, (g) => appIcon(g, 0, 0, END_ICON.size), { pad: 30 });

  const L = (b: { w: number }) => MSG.left + b.w / 2;
  const R = (b: { w: number }) => MSG.right - b.w / 2;
  const chipsY = 496 + chips.h / 2;
  const yesX = MSG.left + chips.centers[1]!;

  return ({ frame: f }) => {
    const zp = iv(f, [14, 38], [0, 1], E.inOutCubic);
    const zoom = iv(zp, [0, 1], [0.97, 1.75]);
    st.look(540, iv(zp, [0, 1], [540, 560]), zoom);

    const intro = iv(f, [0, 8], [0, 1], E.outCubic);
    const out = iv(f, [68, 76], [0, 1], E.inCubic);
    const common = { bx: out * 24, by: out * 24 };
    phone.set({ x: PH.left + PH.w / 2, y: PH.top + PH.h / 2 + (1 - intro) * 40, op: intro * (1 - out), ...common });
    kb.layer.set({ x: kb.x, y: kb.y + (1 - intro) * 40, op: intro * (1 - out), ...common });

    blurUp(m1.layer, f, 2, R(m1), 196 + m1.h / 2, { dur: 8, dy: 20 });
    blurUp(m2.layer, f, 5, L(m2), 276 + m2.h / 2, { dur: 8, dy: 20 });
    blurUp(today, f, 8, 540, 372, { dur: 8, dy: 10 });
    blurUp(m3.layer, f, 36, L(m3), 398 + m3.h / 2, { dur: 10, dy: 24, fromS: 0.94 });
    blurUp(chips.layer, f, 42, MSG.left + chips.w / 2, chipsY, { dur: 8, dy: 14 });

    const click = bump(f, 62, 4);
    chips.layer.set({ s: 1 - click * 0.05 });
    for (const l of [m1.layer, m2.layer, today, m3.layer, chips.layer]) {
      const op = l.op * (1 - out);
      l.set({ op, bx: l.bx + out * 24, by: l.by + out * 24 });
    }

    const c = iv(f, [46, 60], [0, 1], E.inOutCubic);
    const cx = iv(c, [0, 1], [780, yesX + 6]);
    const cy = iv(c, [0, 1], [720, chipsY + 6]) + Math.sin(c * Math.PI) * -24;
    placeCursor(cur, cx, cy, 1 / zoom, iv(f, [44, 48], [0, 1]) * (1 - out), click);

    // The app icon settles centre-frame for the end card (drawn in world space, so undo zoom).
    const ip = iv(f, [76, 86], [0, 1], E.outBack);
    const io = iv(f, [76, 81], [0, 1]);
    const camY = iv(zp, [0, 1], [540, 560]);
    icon.set({
      x: 540 + (END_ICON.x - 540) / zoom,
      y: camY + (END_ICON.y - 540) / zoom,
      s: (0.5 + 0.5 * ip) / zoom,
      op: io,
      bx: (1 - io) * 16,
      by: (1 - io) * 16,
    });
  };
}
