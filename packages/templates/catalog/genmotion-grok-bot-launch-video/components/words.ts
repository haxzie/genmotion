import * as THREE from "three";
import { text, setOpacity, type TextMesh, type TextOpts } from "./text";
import { place } from "./stage";
import { prog, ease } from "./anim";

/** A headline split into word meshes so each can enter on its own beat. */
export interface WordLine {
  group: THREE.Group;
  words: TextMesh[];
  /** Visual width of each word (stage px). */
  widths: number[];
  space: number;
}

export function wordLine(name: string, str: string, o: TextOpts): WordLine {
  const group = new THREE.Group();
  group.name = name;
  const words = str.split(" ").map((w, i) => {
    const m = text(w, { ...o, align: "left" });
    m.name = `${name}-${w.toLowerCase().replace(/[^a-z0-9]+/g, "") || i}`;
    group.add(m);
    return m;
  });
  const widths = words.map((m) => m.userData.w - m.userData.pad * 2);
  return { group, words, widths, space: o.size * 0.27 };
}

/** Left x of each word for a line centred on cx, with optional extra gap after word i. */
export function lefts(line: WordLine, cx: number, extra: Record<number, number> = {}): number[] {
  let total = 0;
  line.widths.forEach((w, i) => {
    total += w;
    if (i < line.widths.length - 1) total += line.space + (extra[i] ?? 0);
  });
  const out: number[] = [];
  let x = cx - total / 2;
  line.widths.forEach((w, i) => {
    out.push(x);
    x += w + line.space + (extra[i] ?? 0);
  });
  return out;
}

/**
 * The house word move from the reference: rise 16px + fade in over 7 frames,
 * then (if `outAt`) lift 12px + fade out over 5.
 */
export function animWord(m: THREE.Mesh, x: number, y: number, f: number, inAt: number, outAt = Infinity, z = 0): void {
  const a = prog(f, inAt, inAt + 7, ease.outQuart);
  const b = Number.isFinite(outAt) ? prog(f, outAt, outAt + 5, ease.inQuad) : 0;
  place(m, x, y + (1 - a) * 16 - b * 12, z);
  setOpacity(m, a * (1 - b));
}
