/**
 * A small, fixed random number generator.
 *
 * Every sound this package makes is drawn from here, and the draws have to come
 * out the same on every machine and every release: a project rendered today and
 * again after an upgrade must sound identical, or a re-export is a silent
 * regression nobody can point at. `Math.random` cannot promise that and neither
 * can a dependency's changelog, so the generator is a page of code with a
 * published reference output.
 *
 * SplitMix64 (Steele, Lea & Flood, 2014), in `BigInt` because the algorithm is
 * defined on 64-bit wrapping arithmetic and doubles cannot hold it. It is drawn
 * from a few thousand times per render, which is nothing.
 */

const MASK = (1n << 64n) - 1n;
const GAMMA = 0x9e37_79b9_7f4a_7c15n;
const MIX_A = 0xbf58_476d_1ce4_e5b9n;
const MIX_B = 0x94d0_49bb_1331_11ebn;

const FNV_OFFSET = 0xcbf2_9ce4_8422_2325n;
const FNV_PRIME = 0x0000_0100_0000_01b3n;

/**
 * Seeds from text — a project id, a profile name, a phrase — by FNV-1a over the
 * UTF-8 bytes.
 *
 * The bytes are derived by hand rather than with `TextEncoder`, which is neither
 * in the ES2022 lib nor the same object in a browser, Node and Electron's
 * renderer. Any stable hash would do; what this may not be is version-dependent,
 * since a seed that moved would re-time every project that had one.
 */
export function seedFrom(text: string): bigint {
  let hash = FNV_OFFSET;
  const eat = (byte: number) => {
    hash = (hash ^ BigInt(byte)) & MASK;
    hash = (hash * FNV_PRIME) & MASK;
  };
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) {
      eat(code);
    } else if (code < 0x800) {
      eat(0xc0 | (code >> 6));
      eat(0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      eat(0xe0 | (code >> 12));
      eat(0x80 | ((code >> 6) & 0x3f));
      eat(0x80 | (code & 0x3f));
    } else {
      eat(0xf0 | (code >> 18));
      eat(0x80 | ((code >> 12) & 0x3f));
      eat(0x80 | ((code >> 6) & 0x3f));
      eat(0x80 | (code & 0x3f));
    }
  }
  return hash;
}

export class Rng {
  private state: bigint;

  constructor(seed: bigint | string) {
    this.state = typeof seed === "string" ? seedFrom(seed) : seed & MASK;
  }

  nextU64(): bigint {
    this.state = (this.state + GAMMA) & MASK;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * MIX_A) & MASK;
    z = ((z ^ (z >> 27n)) * MIX_B) & MASK;
    return z ^ (z >> 31n);
  }

  /** Uniform in `[0, 1)`. The top 24 bits, so the value is exact in an f32. */
  next(): number {
    return Number(this.nextU64() >> 40n) / 2 ** 24;
  }

  /** Uniform in `[low, high)`. */
  range(low: number, high: number): number {
    return low + (high - low) * this.next();
  }

  /** `1 ± spread`, for scaling a nominal value. */
  around(spread: number): number {
    return this.range(1 - spread, 1 + spread);
  }

  /** Uniform in `0..n`. */
  below(n: number): number {
    return Number(this.nextU64() % BigInt(n));
  }

  /**
   * Standard normal, by Box-Muller.
   *
   * The typing model needs it: an interkey interval is log-normal, not uniform,
   * and a uniform draw gives a rhythm that sounds shuffled rather than human
   * (see `typing.ts`). Both of a pair's values are kept — throwing one away
   * would double the draws and make the sequence depend on how many normals a
   * caller happened to want.
   */
  normal(): number {
    if (this.spare !== null) {
      const value = this.spare;
      this.spare = null;
      return value;
    }
    // `next()` can return 0, and log(0) is -Infinity.
    const u = Math.max(this.next(), 1e-9);
    const v = this.next();
    const radius = Math.sqrt(-2 * Math.log(u));
    const angle = 2 * Math.PI * v;
    this.spare = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  }

  private spare: number | null = null;
}
