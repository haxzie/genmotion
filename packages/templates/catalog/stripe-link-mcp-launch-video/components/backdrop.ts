import * as THREE from "three";
import { C } from "./brand";
import { canvasPlane, place, rr } from "./stage";

/** Deterministic PRNG. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The film's ground: dark green field, an optional framed card inset 44px,
 * and a dot grid that glows in soft patches. Returns an `update(time)` for
 * the slow ambient drift of the glow.
 */
export function backdrop(scene: THREE.Scene, opts: { frame?: boolean; glow?: [number, number][] } = {}) {
  const group = new THREE.Group();
  group.name = "backdrop";
  group.userData.pickable = false;

  if (opts.frame !== false) {
    const card = canvasPlane("frame-card", 992, 992, (g) => {
      rr(g, 1, 1, 990, 990, 14);
      g.fillStyle = C.card;
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = C.cardEdge;
      g.stroke();
    });
    place(card, 540, 540, -2);
    group.add(card);
  }

  const glow = opts.glow ?? [[860, 420], [300, 900]];
  const makeDots = (name: string, centres: [number, number][]) =>
    canvasPlane(name, 1080, 1080, (g) => {
      const step = 16;
      for (let y = step / 2; y < 1080; y += step) {
        for (let x = step / 2; x < 1080; x += step) {
          let a = 0.12;
          for (const [cx, cy] of centres) {
            const d = Math.hypot(x - cx, y - cy);
            a += 0.55 * Math.max(0, 1 - d / 420) ** 2;
          }
          g.fillStyle = C.dot;
          g.globalAlpha = Math.min(0.75, a);
          g.beginPath();
          g.arc(x, y, 1.3, 0, Math.PI * 2);
          g.fill();
        }
      }
    });
  const dotsA = makeDots("dot-grid", glow);
  place(dotsA, 540, 540, -1.9);
  group.add(dotsA);

  scene.background = new THREE.Color(C.bg);
  scene.add(group);

  const mat = dotsA.material as THREE.MeshBasicMaterial;
  return (time: number) => {
    mat.opacity = 0.8 + Math.sin(time * 1.1) * 0.15;
    dotsA.position.x = Math.sin(time * 0.3) * 0.04;
  };
}
