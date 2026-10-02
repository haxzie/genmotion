# Confetti: `components/confetti.ts`

A burst for a land frame (a milestone's number, a launch's reveal), as a pure function of the frame: every piece's launch comes from `hash1` with a seed, and its position is closed-form, so any frame renders on its own and the export matches the preview. No randomness, no wall-clock timers, no state carried from the previous frame.

Tested: compiled under the project's strict settings and rendered at 1080 × 1080 (a 10,000 count landing on frame 60, a box of 680 × 270 px around "10,000" and its unit line). Captured land, +1, +2, +4, +8, +12, +20, +30 and +50: four popper-like bursts from the corners and ends of the number, the pieces tumbling and falling; no piece over the number or its unit line through land +25; at most 8 small, shrinking pieces cross it after that; the last piece is gone by land +64.

Contents: 1 The module · 2 Using it · 3 Tuning and what each number does

## 1. The module

It needs `PX` from `components/stage.ts` and `hash1` from `components/ease.ts` (`three-camera`, `references/rig.md`).

```ts
import * as THREE from "three";
import { PX } from "./stage";
import { hash1 } from "./ease";

export interface ConfettiOptions {
  /** The number's box in composition px (centre x/y from the frame centre, y up; w/h its size at the punch peak). */
  box: { x: number; y: number; w: number; h: number };
  /** The land frame: pieces leave on it and up to 3f after. */
  land: number;
  fps: number;
  count?: number; // 120-180 typical, capped at 300
  colors?: string[];
  seed?: number;
  pad?: number; // px between the box and the spawn line
  speed?: [number, number]; // launch px/s
  gravity?: number; // px/s^2
  drag?: number; // 1/s, linear
  life?: [number, number]; // frames
  size?: [number, number]; // px, the long side
}

/**
 * A burst from the edges of the number, as a pure function of the frame: no randomness,
 * no state carried between frames. Every piece starts outside `box` (plus `pad`) and launches
 * away from its edge, so none crosses the glyphs while they are being read on the land.
 */
export function confetti(o: ConfettiOptions) {
  const n = Math.min(300, o.count ?? 160);
  const colors = (o.colors ?? ["#FF5A36", "#FFC23D", "#2F7BFF", "#19C58A", "#ffffff"]).map((c) => new THREE.Color(c));
  const seed = o.seed ?? 1;
  const pad = o.pad ?? 28;
  const [v0, v1] = o.speed ?? [280, 1250];
  const g = o.gravity ?? 1100;
  const k = o.drag ?? 2.4;
  const [l0, l1] = o.life ?? [44, 60];
  const [s0, s1] = o.size ?? [12, 22];
  const r = (i: number, j: number) => hash1(seed * 7919 + i * 31 + j);

  const hw = o.box.w / 2 + pad, hh = o.box.h / 2 + pad;
  const pieces = Array.from({ length: n }, (_, i) => {
    // a point on the padded box's edge: the two ends take 60% and the top 25%, and along each
    // edge the points crowd toward the corners, so the burst reads as poppers, not an outline
    const side = r(i, 0), u = 2 * r(i, 15) - 1;
    const along = Math.sign(u) * Math.abs(u) ** 0.45; // -1..1, corner-heavy
    let x: number, y: number;
    if (side < 0.3) { x = -hw; y = along * hh; }
    else if (side < 0.6) { x = hw; y = along * hh; }
    else if (side < 0.85) { x = along * hw; y = hh; }
    else { x = along * hw; y = -hh; }
    const a = Math.atan2(y / hh, x / hw) + (r(i, 1) - 0.5) * 0.87;
    const speed = v0 + (v1 - v0) * r(i, 2) ** 0.8;
    const out = 90 * r(i, 14) ** 2; // up to 90 px further out, so the first frame is a cloud
    const vx = Math.cos(a) * speed; let vy = Math.sin(a) * speed;
    if (y > -hh) vy += 0.35 * speed; // ends and top lift; the bottom edge falls
    const long = s0 + (s1 - s0) * r(i, 3);
    const axis = new THREE.Vector3(r(i, 4) - 0.5, r(i, 5) - 0.5, r(i, 6) - 0.5).normalize();
    return {
      x0: o.box.x + x + Math.cos(a) * out, y0: o.box.y + y + Math.sin(a) * out, vx, vy,
      w: long, h: long * (0.45 + 0.2 * r(i, 7)),
      axis, spin: (r(i, 8) < 0.5 ? -1 : 1) * (6 + 10 * r(i, 9)), phase: r(i, 10) * 6.283,
      delay: Math.floor(r(i, 11) * 4), life: l0 + (l1 - l0) * r(i, 12),
      z: 20 + 60 * r(i, 13),
    };
  });

  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }),
    n,
  );
  mesh.name = "confetti";
  mesh.frustumCulled = false;
  pieces.forEach((p, i) => mesh.setColorAt(i, colors[i % colors.length]!));

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
  /** Pose every piece for `frame`. Closed-form linear drag + gravity, so any frame renders alone. */
  const update = (frame: number) => {
    let alive = false;
    pieces.forEach((p, i) => {
      const f = frame - o.land - p.delay;
      if (f < 0 || f > p.life) {
        m.makeScale(0, 0, 0);
      } else {
        const t = f / o.fps, e = 1 - Math.exp(-k * t);
        const x = p.x0 + (p.vx / k) * e;
        const y = p.y0 + (p.vy / k) * e - (g / k) * t + (g / (k * k)) * e;
        const fade = Math.min(1, (p.life - f) / 12, f / 2 + 0.5); // grows in over 1f, shrinks out over the last 12f
        q.setFromAxisAngle(p.axis, p.phase + p.spin * t);
        m.compose(pos.set(x * PX, y * PX, p.z * PX), q, scl.set(p.w * fade * PX, p.h * fade * PX, 1));
        alive = true;
      }
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = alive;
  };
  update(-1);
  return { mesh, update };
}
```

## 2. Using it

The scene it was tested with: a 4-digit count that becomes 5 digits on the land, centred throughout (one `three-type` `counter()` per digit length, swapped on the land frame; `components/type.ts` is in its `references/type-kit.md`), on a clock that never parks (`trunc` from `components/ease.ts`). Its frame 15 (25% of the count) already shows 7,694: 62% of the 4,000 → 10,000 range.

```ts
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX } from "../components/stage";
import { outCubic, outQuart, prog, trunc } from "../components/ease";
import { counter, label, setLabel } from "../components/type";
import { confetti } from "../components/confetti";

const LAND = 60;
const FROM = 4000, TO = 10000;
/** The count's clock: outQuart run to 85% of its curve, so it never parks before the land. */
const clock = (frame: number) => prog(frame, 0, LAND, trunc(outQuart, 0.85));

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, height, fps } = ctx;
  fitCamera(camera, height);
  scene.background = new THREE.Color("#101624");
  const style = { size: 200, weight: 500, color: "#ffffff" };
  const before = counter("#,###", style); // centred while the count has 4 digits
  const after = counter("##,###", style); // centred from the land frame
  before.group.position.y = after.group.position.y = 40 * PX;
  const unit = label("GitHub stars", { size: 40, weight: 500, color: "#9AA6BF" });
  unit.position.y = -110 * PX;
  setLabel(unit, { opacity: 1 });
  const burst = confetti({
    // the whole read block: the number at its punch peak plus the unit line under it
    box: { x: 0, y: 5, w: (after.width / PX) * 1.06, h: 270 },
    land: LAND, fps, count: 160, seed: 4,
  });
  scene.add(before.group, after.group, unit, burst.mesh);
  return ({ frame }) => {
    const value = Math.round(FROM + (TO - FROM) * clock(frame));
    const landed = frame >= LAND;
    before.group.visible = !landed;
    after.group.visible = landed;
    (landed ? after : before).set(value);
    after.group.scale.setScalar(landed ? 1 + 0.06 * (prog(frame, LAND, 5, outCubic) - prog(frame, LAND + 5, 13, outCubic)) : 1);
    burst.update(frame);
  };
}
```

- A real film wraps the builder in `three-type`'s `withFonts`; this test drew in the fallback face. The punch is `1 + 0.06 × (up − down)` with two `prog` calls, not `pop()`, which starts from 0 and is for entrances.
- **`box` is everything being read on the land**: the number at its punch peak (its width × 1.06) and the unit line with it. Pieces start outside it plus `pad`, so nothing sits on the glyphs while the eye is on them.
- Call `update(frame)` every frame from the scene's update; it hides itself before the land and after the last piece dies.
- Several bursts (land and a second beat) are several calls with different `seed`s; one call per moment, never one that restarts itself.
- **HyperFrames / React**: the same maths per element (or per absolutely positioned div): position from the closed-form `x`, `y`, a rotation of `phase + spin × t`, scale for the fade. Keep the count at ≤ 120 in the DOM.

## 3. Tuning and what each number does

| Option | Default | Range | What it changes |
| --- | --- | --- | --- |
| `count` | 160 | 120–180 for a hero land, ≤ 300 hard cap | Density. Above 300 it reads as noise and costs frame time |
| `size` | 12–22 px | 10–24 px at 1080 wide | The long side; the short side is 45–65% of it, so pieces read as paper, not dots |
| `speed` | 280–1250 px/s | keep the top ≥ 4× the bottom | The spread. A narrow range makes every piece travel the same distance: an expanding outline instead of a burst |
| `drag` | 2.4 /s | 1.8–3 | How fast the launch dies. A piece settles `speed / drag` px from its start (≤ 520 px here), so it stays in a 1080 frame |
| `gravity` | 1100 px/s² | 800–1400 | Terminal fall is `gravity / drag` (≈ 460 px/s): paper, not stone |
| `life` | 44–60 f | ≤ 60 f | Each piece shrinks out over its last 12 f; the whole burst is gone by land +64 (about 2 s) |
| `pad` | 28 px | ≥ half the largest piece | Clearance between the box and the nearest piece at launch |

Why it is built this way:
- **Spawn on the edges, aimed outward**: each piece starts on the padded box (60% on the two ends, 25% on the top, 15% on the bottom, crowded toward the corners) and launches away from the centre ±25°. Every velocity has an outward component on the edge it starts from, so for the first frames nothing can enter the box. Launching from two points below the number (the steep "popper" shot) gives two narrow columns in the gutters instead of a burst.
- **The ends and top get lift** (+35% of the speed upward), the bottom edge does not: the burst rises and arcs, and the bottom pieces never come back up into the type.
- **Linear drag in closed form**: `x = x0 + (vx/k)(1 − e^(−kt))`, `y = y0 + (vy/k)(1 − e^(−kt)) − (g/k)t + (g/k²)(1 − e^(−kt))`. No integration step, so frame 37 renders the same alone or in sequence.
- **Spin on a random axis per piece** (6–16 rad/s): planes turning edge-on is what makes paper flicker; `DoubleSide` keeps the back faces drawn.
- **One `InstancedMesh`**, unlit and not tone mapped, so the brand colours hold and 300 pieces cost one draw call. Pass the brand palette as `colors` (3–5, including white or the ink), never a rainbow the film has not used.
- Some top pieces fall back across the type from about land +30, small and shrinking. When type must be clean sooner (a meaning line entering at land +20), shorten `life` to 30–40 f rather than moving the burst onto the type's edges.
