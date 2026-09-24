/** 16.0–19.2s · The day job and the night gig clash; the cursor drags the gig into its own slot. */
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { Stage, E, iv, drawText } from "../components/kit";
import { C, rr, circle } from "../components/ui";
import { cursorLayer, placeCursor, bump } from "../components/fx";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DATES = [16, 17, 18, 19, 20, 21, 22];
const DX = [236, 350, 464, 578, 692, 806, 920];
const HOURS = ["5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM", "12 AM"];
const H0 = 318;
const HS = 100;
const EX = 212;
const EW = 752;

function eventLayer(st: Stage, text: string, fill: string, bar: string, fg: string, h: number) {
  return st.layer(EW, h, (g) => {
    rr(g, 0, 0, EW, h, 8);
    g.fillStyle = fill;
    g.fill();
    rr(g, 0, 0, 6, h, 3);
    g.fillStyle = bar;
    g.fill();
    drawText(g, text, 20, 26, { size: 28, weight: 600, color: fg });
  }, { pad: 30 });
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const st = new Stage(ctx);

  const grid = st.layer(1080, 1080, (g) => {
    DAYS.forEach((d, i) => {
      drawText(g, d, DX[i]!, 196, { size: 28, weight: 500, color: i === 0 || i === 6 ? "#8a8a8f" : C.ink, align: "center" });
      if (DATES[i] === 21) {
        g.fillStyle = C.red;
        circle(g, DX[i]!, 254, 34);
        g.fill();
      }
      drawText(g, String(DATES[i]), DX[i]!, 256, {
        size: 36,
        weight: DATES[i] === 21 ? 600 : 400,
        color: DATES[i] === 21 ? "#ffffff" : i === 0 || i === 6 ? "#8a8a8f" : C.ink,
        align: "center",
      });
    });
    HOURS.forEach((h, i) => {
      const y = H0 + i * HS;
      drawText(g, h, 196, y, { size: 28, color: "#6c6c70", align: "right" });
      g.fillStyle = "#e5e5ea";
      g.fillRect(EX, y, EW, 2);
    });
  }, { pad: 0, res: 1.5 });

  const dayJob = eventLayer(st, "Day job · standup 🏢", "#cdeefd", "#2d9fe6", "#0b5f97", 92);
  const gig = eventLayer(st, "DJ set with Marco 🎧", "rgba(186,160,250,0.78)", "#8a3fe8", "#4e1296", 96);
  const cur = cursorLayer(st);

  const dayY = H0 + HS + 4; // 6 PM
  const gigFrom = H0 + HS + 50; // 6:30, clashing
  const gigTo = H0 + 2 * HS + 2; // 7 PM

  return ({ frame: f }) => {
    const dis = iv(f, [0, 9], [1, 0], E.outCubic) + iv(f, [86, 95], [0, 1], E.inQuad);
    grid.set({ x: 540, y: 540, dis, cell: 44 });
    dayJob.set({ x: EX + EW / 2, y: dayY + 46, dis, cell: 44 });

    // Grab at 12, drag 16→40, drop at 42.
    const drag = iv(f, [16, 40], [0, 1], E.inOutCubic);
    const lift = iv(f, [12, 16, 40, 44], [0, 1, 1, 0], E.inOutSine);
    const gy = iv(drag, [0, 1], [gigFrom, gigTo]);
    gig.set({ x: EX + EW / 2, y: gy + 48, s: 1 + lift * 0.015, dis, cell: 44 });

    const grabX = 700;
    const enter = iv(f, [4, 12], [0, 1], E.outCubic);
    const cx = iv(enter, [0, 1], [860, grabX]) + Math.sin(f * 0.05) * 3 * iv(f, [44, 60], [0, 1]);
    const cy = iv(enter, [0, 1], [gigFrom + 180, gigFrom + 60]) + (gy - gigFrom);
    placeCursor(cur, cx, cy, 1.1, enter * (1 - iv(f, [84, 90], [0, 1])), Math.max(lift, bump(f, 12, 3)));

    st.look(540, 540, iv(f, [0, 96], [1, 1.03], E.inOutSine));
  };
}
