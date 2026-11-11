import * as THREE from "three";
import { Easing, interpolate } from "@genmotion/three-engine";
import { layer, measure, place, setOpacity, textMesh, type TextStyle } from "./stage";

/**
 * The film's interstitial title: one line of Inter 400, centred, that eases
 * in from a few px right and holds. Width is matched to the reference.
 */
export function interstitial(str: string, refWidth: number, y = 358) {
  const base: TextStyle = { size: 63, weight: 400, color: "#0a0a0a", tracking: -1.2 };
  const k = refWidth / measure(str, base);
  const style = { ...base, size: base.size * k, tracking: base.tracking! * k };
  const m = textMesh(str, style);
  layer(m, 10);
  return {
    mesh: m as THREE.Mesh,
    update(f: number, inAt = 0, dist = 70, dur = 20) {
      const p = interpolate(f, [inAt, inAt + dur], [0, 1], Easing.outCubic);
      place(m, 640 + (1 - p) * dist, y);
      setOpacity(m, interpolate(f, [inAt, inAt + 3], [0, 1]));
    },
  };
}
