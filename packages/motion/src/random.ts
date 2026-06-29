/**
 * Deterministic pseudo-random in [0, 1) from a seed. Use instead of
 * Math.random() so every frame renders identically in preview and export.
 * Vary the seed (e.g. `random("star-" + i)`) for multiple values.
 */
export function random(seed: string | number): number {
  const str = String(seed);
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
