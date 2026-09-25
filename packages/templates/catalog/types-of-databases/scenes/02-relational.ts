import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { createBoard, type Board } from "../components/sketch";
import type { TextId } from "../components/texts";
import { MARGIN, RED, HATCH } from "../components/brand";

const ROW_H = 70;

/** A sketched table: grey name above, header row, then data rows. */
function table(b: Board, name: TextId, x: number, y: number, cols: number[], cells: TextId[][], at: number, seed: string) {
  const w = cols.reduce((a, c) => a + c, 0);
  const h = ROW_H * cells.length;
  b.text(name, x, y - 58, { at });
  b.rect(x, y, w, h, { at: at + 2, dur: 16 }, { seed: seed + "-box" });
  // header divider slightly heavier, like a pen pressed harder
  b.line([x, y + ROW_H], [x + w, y + ROW_H], { at: at + 10, dur: 8 }, { seed: seed + "-hd", width: 3 });
  for (let r = 2; r < cells.length; r++) {
    b.line([x, y + ROW_H * r], [x + w, y + ROW_H * r], { at: at + 12 + r, dur: 8 }, { seed: seed + "-r" + r, width: 2 });
  }
  let cx = x;
  cols.slice(0, -1).forEach((c, i) => {
    cx += c;
    b.line([cx, y], [cx, y + h], { at: at + 12 + i * 2, dur: 8 }, { seed: seed + "-c" + i, width: 2 });
  });
  cells.forEach((row, r) => {
    let px = x;
    row.forEach((id, c) => {
      const s = b.size(id);
      b.text(id, px + 22, y + r * ROW_H + (ROW_H - s.h) / 2, { at: at + 16 + r * 5 + c * 2, dur: 8 }, { float: false });
      px += cols[c]!;
    });
  });
  return { w, h };
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const b = createBoard(ctx);
  b.header(1, "r_h", "r_sub", { tagIn: true });

  const ty = 420;
  const users = { x: MARGIN, cols: [110, 170, 150] };
  const orders = { x: 760, cols: [110, 190, 150] };

  table(b, "r_users", users.x, ty, users.cols, [
    ["r_c_id", "r_c_name", "r_c_plan"],
    ["r_c_1", "r_c_ada", "r_c_pro"],
    ["r_c_2", "r_c_bob", "r_c_free"],
  ], 28, "users");

  table(b, "r_orders", orders.x, ty, orders.cols, [
    ["r_c_id", "r_c_user_id", "r_c_total"],
    ["r_c_91", "r_c_1", "r_c_40"],
    ["r_c_92", "r_c_2", "r_c_12"],
  ], 40, "orders");

  // highlight the foreign-key column, then draw the link back to users.id
  const fkX = orders.x + orders.cols[0]!;
  b.hatch(fkX + 6, ty + ROW_H + 6, orders.cols[1]! - 12, ROW_H * 2 - 12, { at: 76, dur: 14 }, { seed: "fk", color: HATCH, gap: 14 });
  const bottom = ty + ROW_H * 3;
  b.arrow([fkX + orders.cols[1]! / 2, bottom + 12], [users.x + users.cols[0]! / 2, bottom + 12], { at: 88, dur: 20 }, {
    color: RED,
    bend: -70,
    width: 3.2,
    seed: "fk-arrow",
  });
  const fk = b.size("r_fk");
  b.text("r_fk", (users.x + users.cols[0]! / 2 + fkX + orders.cols[1]! / 2) / 2 - fk.w / 2, bottom + 70, { at: 100 });

  b.goodFor("r_good", MARGIN, 800, 122);
  b.examples(["ex_postgres", "ex_mysql", "ex_sqlite"], MARGIN, 880, 138);

  return (f) => b.update(f);
}
