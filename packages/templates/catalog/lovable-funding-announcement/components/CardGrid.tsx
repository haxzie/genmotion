import { random } from "@genmotion/motion";
import { AppCard } from "./AppCard";

const COLS = 6;
const ROWS = 4;
const CELL_W = 340;
const CELL_H = 300;
export const CARD_W = 280;
export const CARD_H = 230;

type Cell = { i: number; x: number; y: number; rank: number };

const CELLS: Cell[] = [];
for (let r = 0; r < ROWS; r++) {
  for (let col = 0; col < COLS; col++) {
    const i = r * COLS + col;
    CELLS.push({
      i,
      x: -60 + col * CELL_W + (random("jx" + i) - 0.5) * 26,
      y: -70 + r * CELL_H + (random("jy" + i) - 0.5) * 26,
      rank: 0,
    });
  }
}
// Reveal order: centre of frame outwards.
[...CELLS]
  .sort((a, b) => {
    const da = Math.hypot(a.x + CARD_W / 2 - 960, a.y + CARD_H / 2 - 540);
    const db = Math.hypot(b.x + CARD_W / 2 - 960, b.y + CARD_H / 2 - 540);
    return da - db;
  })
  .forEach((cell, rank) => {
    cell.rank = rank;
  });

type Props = {
  /** Continuous frame clock — pass frame + offset so drift survives a cut. */
  frame: number;
  /** Frame the centre card starts revealing. Pass a big negative for "already there". */
  revealStart?: number;
  each?: number;
};

/**
 * The wall of sites built with Lovable. Shared between the reveal scene and
 * the stats scene so the cut between them is invisible.
 */
export function CardGrid({ frame, revealStart = 0, each = 2.5 }: Props) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {CELLS.map((cell) => {
        const start = revealStart + cell.rank * each;
        const t = (frame - start) / 13;
        const p = Math.max(0, Math.min(1, t));
        const eased = 1 - Math.pow(1 - p, 3);
        // Each card lands empty, then fills in: skeleton lines first, button
        // last — the site building itself, well after the surface arrives.
        const build = Math.max(0, Math.min(1, (frame - start - 9) / 36));
        const bob = Math.sin(frame * 0.02 + cell.i) * 5 - frame * 0.05;
        return (
          <div
            key={cell.i}
            style={{
              position: "absolute",
              left: cell.x,
              top: cell.y,
              opacity: eased,
              transform: `translateY(${(1 - eased) * 46 + bob}px) scale(${0.9 + eased * 0.1})`,
            }}
          >
            <AppCard
              seed={"cell" + cell.i}
              width={CARD_W}
              height={CARD_H}
              radius={18}
              build={build}
            />
          </div>
        );
      })}
    </div>
  );
}
