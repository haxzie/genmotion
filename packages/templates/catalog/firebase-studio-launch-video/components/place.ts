import type * as THREE from "three";
import { ink, type TypeStyle } from "./type";
import { sx, sy } from "./stage";

/**
 * Place a label drawn with align "left" so its INK starts at screen x `left`
 * and its ink top sits at screen y `top` (reference measurements are ink boxes).
 */
export function inkPlacer(text: string, s: TypeStyle) {
  const b = ink(text, s);
  const width = b.right - b.left;
  const base = ink("H", s).descent; // alphabetic baseline sits this far below the label's middle line
  return {
    width,
    ascent: b.ascent,
    descent: b.descent,
    /** left = ink left (screen px); top = ink top (screen px). */
    at(m: THREE.Object3D, left: number, top: number) {
      m.position.x = sx(left) - b.left;
      m.position.y = sy(top) - (b.ascent - s.size * 0.04);
    },
    /** left = ink left; baseline = screen y of the alphabetic baseline. */
    atBase(m: THREE.Object3D, left: number, baseline: number) {
      m.position.x = sx(left) - b.left;
      m.position.y = sy(baseline) + s.size * 0.04 + base;
    },
    /** As atBase, for an object scaled uniformly by `k` about its origin. */
    atBaseScaled(m: THREE.Object3D, left: number, baseline: number, k: number) {
      m.position.x = sx(left) - b.left * k;
      m.position.y = sy(baseline) + (s.size * 0.04 + base) * k;
    },
    /** right = ink right (screen px). */
    atRight(m: THREE.Object3D, right: number, top: number) {
      m.position.x = sx(right) - b.right;
      m.position.y = sy(top) - (b.ascent - s.size * 0.04);
    },
  };
}
