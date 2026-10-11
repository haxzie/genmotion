/**
 * Where the keys are, and which finger is on each.
 *
 * The typing model needs geometry because the time between two keystrokes is
 * mostly a property of the *pair*: a hand alternation is fast, a same-finger
 * reach across two rows is slow, and a doubled letter is faster than either.
 * None of that can be read off the characters themselves, so this is a US
 * QWERTY board as coordinates and fingers.
 *
 * `x` is in key widths with the real row stagger, so "q→a" is a shorter move
 * than "q→z". Finger numbers run 0 (index) to 3 (pinky) within a hand, which is
 * the order a reach gets harder in.
 */

export type Hand = "left" | "right";

export interface Key {
  /** The unshifted character — the physical key's identity. */
  code: string;
  row: number;
  x: number;
  hand: Hand;
  /** 0 index … 3 pinky, 4 thumb. */
  finger: number;
  /** True when the character needs Shift held. */
  shifted: boolean;
}

/** Row 0 is the number row, 3 the bottom row. The stagger is the real one. */
const ROWS: readonly { keys: string; shifted: string; offset: number }[] = [
  { keys: "`1234567890-=", shifted: '~!@#$%^&*()_+', offset: 0 },
  { keys: "qwertyuiop[]\\", shifted: "QWERTYUIOP{}|", offset: 0.5 },
  { keys: "asdfghjkl;'", shifted: 'ASDFGHJKL:"', offset: 0.75 },
  { keys: "zxcvbnm,./", shifted: "ZXCVBNM<>?", offset: 1.25 },
];

/**
 * Touch-typing finger assignment, by physical key. The index fingers carry two
 * columns each, which is why they are the fastest and also why a same-finger
 * digraph on them is so common.
 */
const FINGERS: readonly { keys: string; hand: Hand; finger: number }[] = [
  { keys: "`1qaz", hand: "left", finger: 3 },
  { keys: "2wsx", hand: "left", finger: 2 },
  { keys: "3edc", hand: "left", finger: 1 },
  { keys: "45rtfgvb", hand: "left", finger: 0 },
  { keys: "67yuhjnm", hand: "right", finger: 0 },
  { keys: "8ik,", hand: "right", finger: 1 },
  { keys: "9ol.", hand: "right", finger: 2 },
  { keys: "0-=p[]\;'/", hand: "right", finger: 3 },
];

function buildLayout(): Map<string, Key> {
  const byCode = new Map<string, { row: number; x: number }>();
  const shiftOf = new Map<string, string>();
  for (const [row, spec] of ROWS.entries()) {
    for (let i = 0; i < spec.keys.length; i++) {
      const code = spec.keys[i];
      if (!code) continue;
      byCode.set(code, { row, x: spec.offset + i });
      const upper = spec.shifted[i];
      if (upper) shiftOf.set(upper, code);
    }
  }

  const layout = new Map<string, Key>();
  for (const group of FINGERS) {
    for (const code of group.keys) {
      const where = byCode.get(code);
      if (!where) continue;
      const key: Key = { code, row: where.row, x: where.x, hand: group.hand, finger: group.finger, shifted: false };
      layout.set(code, key);
    }
  }
  // The shifted face of every key points at the same physical key.
  for (const [upper, code] of shiftOf) {
    const key = layout.get(code);
    if (key) layout.set(upper, { ...key, shifted: true });
  }

  // The space bar: both thumbs, dead centre, its own row below the rest.
  layout.set(" ", { code: " ", row: 4, x: 4.5, hand: "right", finger: 4, shifted: false });
  return layout;
}

const LAYOUT = buildLayout();

export function keyFor(char: string): Key | undefined {
  return LAYOUT.get(char) ?? LAYOUT.get(char.toLowerCase());
}

/**
 * The keys a finger could hit instead — what a typo substitutes.
 *
 * Neighbours within a key width and a row of each other, which is the slip that
 * actually happens: the finger lands long, short or sideways, not on a key
 * across the board.
 */
export function neighbours(char: string): string[] {
  const key = keyFor(char);
  if (!key || key.finger === 4) return [];
  const out: string[] = [];
  for (const [face, other] of LAYOUT) {
    if (other.finger === 4 || other.code === key.code) continue;
    // Only the same case: a slip does not press Shift it did not mean to.
    if (other.shifted !== key.shifted) continue;
    if (Math.abs(other.row - key.row) > 1) continue;
    if (Math.abs(other.x - key.x) > 1.1) continue;
    if (/[a-z0-9]/i.test(face) || key.shifted) out.push(face);
  }
  return out.sort();
}

/** Distance between two keys, in key widths. */
export function travel(a: Key, b: Key): number {
  return Math.hypot(a.x - b.x, (a.row - b.row) * 1.0);
}
