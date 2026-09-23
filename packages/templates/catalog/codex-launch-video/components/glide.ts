/**
 * glide — smooth multi-keyframe motion.
 *
 * `interpolate(f, [a, b, c], [...], { easing })` eases EACH segment on its own,
 * so the value decelerates to a standstill at every interior key and then
 * restarts: visible stop-start stutter. `glide` passes through exactly the same
 * keys at exactly the same frames, but with a monotone cubic (PCHIP /
 * Fritsch–Butland) spline, so velocity is continuous through every key and the
 * curve never overshoots a key value.
 *
 * - Flat spans (two equal values) stay perfectly flat — holds still hold.
 * - A key where the direction reverses gets zero slope (a natural turnaround).
 * - `easeIn` / `easeOut`: start/end at rest (true, default) or already moving
 *   at the first/last segment's speed (false) — use false when the motion is
 *   continuing from, or into, a cut.
 * - Clamped outside the key range.
 */
export function glide(
  t: number,
  ts: number[],
  vs: number[],
  { easeIn = true, easeOut = true }: { easeIn?: boolean; easeOut?: boolean } = {},
): number {
  const n = ts.length;
  if (t <= ts[0]) return vs[0];
  if (t >= ts[n - 1]) return vs[n - 1];

  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(ts[i + 1] - ts[i]);
    d.push((vs[i + 1] - vs[i]) / h[i]);
  }

  const m: number[] = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] > 0) {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); // weighted harmonic mean
    }
  }
  m[0] = easeIn ? 0 : d[0];
  m[n - 1] = easeOut ? 0 : d[n - 2];

  let i = 0;
  while (t > ts[i + 1]) i++;
  const s = (t - ts[i]) / h[i];
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * vs[i] +
    (s3 - 2 * s2 + s) * h[i] * m[i] +
    (-2 * s3 + 3 * s2) * vs[i + 1] +
    (s3 - s2) * h[i] * m[i + 1]
  );
}
