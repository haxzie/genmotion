import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { createBoard } from "../components/sketch";
import { MARGIN, RED, HATCH } from "../components/brand";

type Pt = [number, number];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const b = createBoard(ctx);
  b.header(5, "ts_h", "ts_sub");

  const x0 = MARGIN;
  const x1 = 1180;
  const axisY = 710;
  b.arrow([x0, axisY], [x1 + 40, axisY], { at: 24, dur: 16 }, { bend: 3, seed: "axis" });
  b.text("ts_time", x1 - 30, axisY + 14, { at: 34 });

  // points appended one after another, left to right
  const N = 22;
  const step = (x1 - x0 - 40) / (N - 1);
  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const y = 560 - Math.sin(i * 0.55) * 60 - Math.sin(i * 1.7 + 1) * 26 - i * 3.5;
    pts.push([x0 + 20 + i * step, y]);
  }
  // "last hour" window first, so it sits behind the points
  const w0 = pts[N - 6]![0] - step / 2;
  const w1 = pts[N - 1]![0] + step / 2;
  b.hatch(w0, 400, w1 - w0, axisY - 410, { at: 92, dur: 14 }, { color: HATCH, gap: 16, seed: "last" });
  b.rect(w0, 400, w1 - w0, axisY - 410, { at: 92, dur: 14 }, { color: RED, width: 2.4, seed: "last-box" });
  b.text("ts_last", w0, 340, { at: 102 });

  b.strokes([pts], { at: 40, dur: 42 }, { width: 2.6, seed: "series", double: false });
  pts.forEach((p, i) => b.dot(p[0], p[1], 7, { at: 40 + Math.round((i / (N - 1)) * 40), dur: 6 }));

  b.text("ts_r1", 1300, 470, { at: 112 });
  b.text("ts_r2", 1300, 540, { at: 118 });

  b.goodFor("ts_good", MARGIN, 800, 132);
  b.examples(["ex_timescaledb", "ex_influxdb", "ex_clickhouse"], MARGIN, 880, 146);

  return (f) => b.update(f);
}
