import { random } from "../random";

/** The sequence in which staggered units fire. */
export type StaggerOrder = "forward" | "reverse" | "center" | "edges" | "random";

/**
 * Stagger rank per animatable unit — the multiplier on `stagger` frames, not
 * necessarily an integer. Returned as a whole array because "random" needs a
 * stable permutation across all units, and ranking one at a time would be
 * quadratic.
 *
 * "center" and "edges" deliberately span half the range of "forward": a
 * centre-out reveal covers the same units in half the time, which is the point.
 */
export function orderRanks(
  order: StaggerOrder,
  count: number,
  seed: string,
): number[] {
  if (count <= 0) return [];
  const mid = (count - 1) / 2;

  switch (order) {
    case "reverse":
      return Array.from({ length: count }, (_, i) => count - 1 - i);
    case "center":
      return Array.from({ length: count }, (_, i) => Math.abs(i - mid));
    case "edges":
      return Array.from({ length: count }, (_, i) => mid - Math.abs(i - mid));
    case "random": {
      const keys = Array.from({ length: count }, (_, i) => ({
        i,
        k: random(`${seed}-order-${i}`),
      }));
      keys.sort((a, b) => a.k - b.k || a.i - b.i);
      const ranks = new Array<number>(count);
      keys.forEach((entry, rank) => {
        ranks[entry.i] = rank;
      });
      return ranks;
    }
    default:
      return Array.from({ length: count }, (_, i) => i);
  }
}

/** The largest rank in the list — how long a full staggered pass takes. */
export function maxRank(ranks: number[]): number {
  let max = 0;
  for (const r of ranks) if (r > max) max = r;
  return max;
}
