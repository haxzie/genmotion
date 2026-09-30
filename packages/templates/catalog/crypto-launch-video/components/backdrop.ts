/**
 * The reference's shared backdrop: near-black, faint 170px grey squares that
 * fade in and out at the edges, `+` crosshairs, and a low green haze.
 * Screen-locked — parent it to nothing but the scene.
 */
import * as THREE from "three";
import { C } from "./brand";
import { canvasMesh, depthScale, mulberry32, px, py, rect } from "./kit";

const SQ = 170;
/** Square slots (top-left px) that recur across the reference. */
const SLOTS: [number, number][] = [
  [113, 240], [283, 30], [0, 70], [113, 0], [0, 240],
  [1440, 555], [1753, 555], [1610, 725], [1480, 895], [1270, 725], [1650, 895],
  [1362, 620], [1440, 725], [283, 780], [440, 900], [1180, 950], [30, 900],
];

export function backdrop(scene: THREE.Scene, opts: { seed: number; haze?: number; hazeLeft?: number } ) {
  scene.background = new THREE.Color(C.bg);
  const group = new THREE.Group();
  group.name = "backdrop";
  group.userData.pickable = false;
  group.position.z = -40;
  // squares are drawn slightly toward the camera from z=-40, so scale up to keep 1u=1px
  const k = depthScale(-40);

  const rnd = mulberry32(opts.seed);
  const squares = SLOTS.map(([x, y]) => {
    const tone = 0.018 + rnd() * 0.02;
    const m = rect(SQ, SQ, "#ffffff", 0);
    m.position.set(px(x + SQ / 2) * k, py(y + SQ / 2) * k, 0);
    m.scale.multiplyScalar(k);
    group.add(m);
    return { m, tone, phase: rnd() * 10, speed: 0.25 + rnd() * 0.35, on: rnd() };
  });

  // green haze along the bottom (and optionally bottom-left)
  const haze = canvasMesh(1920, 700, (g) => {
    const gr = g.createLinearGradient(0, 700, 0, 0);
    gr.addColorStop(0, "rgba(95,17,19,0.55)");
    gr.addColorStop(0.35, "rgba(61,11,12,0.25)");
    gr.addColorStop(1, "rgba(25,5,5,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 1920, 700);
    if (opts.hazeLeft) {
      const r = g.createRadialGradient(300, 700, 0, 300, 700, 900);
      r.addColorStop(0, `rgba(116,20,24,${0.45 * opts.hazeLeft})`);
      r.addColorStop(1, "rgba(116,20,24,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 1920, 700);
    }
  }, { res: 0.5, name: "haze" });
  haze.position.set(0, py(1080 - 350) * k, 0.5);
  haze.scale.setScalar(k);
  (haze.material as THREE.MeshBasicMaterial).opacity = opts.haze ?? 0.6;
  group.add(haze);

  // + crosshairs
  const cross = canvasMesh(22, 22, (g) => {
    g.fillStyle = "rgba(160,160,165,0.55)";
    g.fillRect(10, 2, 2, 18);
    g.fillRect(2, 10, 18, 2);
  }, { res: 2 });
  const crossMat = cross.material as THREE.MeshBasicMaterial;
  for (const [x, y] of [[94, 74], [1839, 74], [84, 555], [1829, 555], [84, 1010], [1829, 1010]] as const) {
    const c = new THREE.Mesh(cross.geometry, crossMat);
    c.position.set(px(x) * k, py(y) * k, 1);
    c.scale.setScalar(k);
    group.add(c);
  }
  group.traverse((o) => (o.renderOrder = -10));
  scene.add(group);

  return {
    group,
    haze,
    crossMat,
    update(time: number, fade = 1) {
      for (const s of squares) {
        const v = 0.5 + 0.5 * Math.sin(time * s.speed + s.phase);
        const o = s.on > 0.35 ? THREE.MathUtils.smoothstep(v, 0.3, 0.8) : 0;
        (s.m.material as THREE.MeshBasicMaterial).opacity = o * s.tone * fade;
      }
    },
  };
}
