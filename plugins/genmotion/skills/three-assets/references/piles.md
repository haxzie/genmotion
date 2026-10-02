# Piles and crowds: `components/pile.ts`

Many identical objects that gather into one mass: coins filling a jar, sugar cubes in a bowl, packages heaping on a floor, tokens piling up as a count rises. Two things go wrong when this is improvised: a few dozen loose items look sparse (you can see between them), and the usual fix, a texture of stacked edges on a cylinder, reads as a ribbed can, not as coins, and snaps on in one frame. The recipe here is one `InstancedMesh` of real items, each with a rest slot computed once and a land frame from the film's event schedule, posed in closed form every frame.

Tested: compiled under the project's strict settings and captured at 1920 × 1080 (SwiftShader): 120 coins (44 px, 6 px thick) landing on an accelerating schedule (30f apart down to every 1–2f) into a 190 px radius; frames at 2 s, 6.7 s, 7.4 s and 11.3 s show single coins falling and bouncing, a ragged growing surface, and a final heap with no rows, rings or stripes.

Contents: 1 The module · 2 Using it · 3 Rules

## 1. The module

It needs `PX` from `components/stage.ts` and `hash1` from `components/ease.ts` (`three-camera`, `references/rig.md`).

```ts
import * as THREE from "three";
import { PX } from "./stage";
import { hash1 } from "./ease";

export interface PileOptions {
  count: number; // items, ≤ 2000 (one draw call)
  land: (i: number) => number; // the frame item i comes to rest: the SAME schedule the sound is built from
  radius: number; // px: the container's inner radius (a jar, a bowl, a circle on a floor)
  item: { w: number; h: number }; // px: an item's diameter and thickness
  floorY: number; // px: where the bottom layer rests (local y)
  dropPx?: number; // px fallen before landing (default 420)
  fps?: number;
  seed?: number;
}

/**
 * A heap of identical items as ONE InstancedMesh, posed in closed form from the frame: every
 * item has a rest slot (computed once, bottom layer first) and a land frame; before it lands it
 * falls under gravity, after it lands it gives one damped bounce and a settling wobble. No state
 * between frames, so any frame renders alone. Slots are packed in rings per layer, each layer
 * turned by the golden angle and every slot jittered from a seeded hash, and slots fill in a
 * hashed order inside the current layer, so the top surface is ragged and nothing lines up into
 * stripes (a pile drawn as a repeating texture reads as a ribbed can, not as coins).
 */
export function pile(geometry: THREE.BufferGeometry, material: THREE.Material, o: PileOptions) {
  const fps = o.fps ?? 30;
  const seed = o.seed ?? 1;
  const r = (i: number, j: number) => hash1(seed * 7919 + i * 31 + j);
  const g = 2600; // px/s²: brisk, so a 420 px drop takes about 17f
  const drop = o.dropPx ?? 420;

  // rest slots: rings of items per layer, bottom up
  const slots: { x: number; y: number; z: number; tilt: number; tiltDir: number; yaw: number }[] = [];
  const step = o.item.w * 0.92; // slight overlap: items nest, so no gaps show through
  for (let layer = 0; slots.length < o.count; layer++) {
    const turn = layer * 2.39996; // golden angle: no layer lines up with the one below
    const layerSlots: typeof slots = [];
    for (let ring = 0; ring * step <= o.radius - o.item.w / 2; ring++) {
      const rr = ring * step;
      const n = ring === 0 ? 1 : Math.floor((2 * Math.PI * rr) / step);
      for (let k = 0; k < n; k++) {
        const id = slots.length + layerSlots.length;
        const a = turn + (k / n) * 2 * Math.PI + (r(id, 0) - 0.5) * 0.5;
        const jr = rr + (r(id, 1) - 0.5) * step * 0.35;
        layerSlots.push({
          x: Math.cos(a) * jr,
          z: Math.sin(a) * jr,
          y: o.floorY + layer * o.item.h * 0.85 + (r(id, 2) - 0.5) * o.item.h * 0.5,
          tilt: (r(id, 3) - 0.5) * 0.45, // up to ±13°: a heap, not a stack
          tiltDir: r(id, 4) * 2 * Math.PI,
          yaw: r(id, 5) * 2 * Math.PI,
        });
      }
    }
    // fill each layer in a hashed order, so the surface is ragged while it grows
    const keyed = layerSlots.map((sl, k) => ({ sl, key: r(slots.length + k, 9) }));
    keyed.sort((a, b) => a.key - b.key);
    slots.push(...keyed.map((x) => x.sl));
  }
  slots.length = o.count;

  const mesh = new THREE.InstancedMesh(geometry, material, o.count);
  mesh.name = "pile";
  mesh.frustumCulled = false;
  const tint = new THREE.Color();
  for (let i = 0; i < o.count; i++) {
    const v = 0.92 + 0.16 * r(i, 6); // ±8% value per item: a heap of one colour reads as plastic
    mesh.setColorAt(i, tint.setRGB(v, v, v));
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const zero = new THREE.Vector3(0, 0, 0), one = new THREE.Vector3(1, 1, 1);

  /** Pose every item for `frame`. Returns how many have landed (drive a counter or the sound from it). */
  const set = (frame: number) => {
    let landed = 0;
    const tFall = Math.sqrt((2 * drop) / g); // seconds
    for (let i = 0; i < o.count; i++) {
      const sl = slots[i]!;
      const t = (frame - o.land(i)) / fps; // seconds since landing (negative while falling)
      let y = sl.y, tilt = sl.tilt, spin = 0;
      if (t < -tFall) {
        m.compose(p.set(0, 0, 0), q.identity(), s.copy(zero)); // not dropped yet
        mesh.setMatrixAt(i, m);
        continue;
      }
      if (t < 0) {
        y = sl.y + 0.5 * g * t * t; // falling: the closed form of gravity, lands exactly on its frame
        tilt = sl.tilt + 0.9 * (r(i, 7) - 0.5) * (-t / tFall);
        spin = -t * 6 * (r(i, 8) - 0.5);
      } else {
        landed++;
        const bounce = o.item.h * 1.4 * Math.exp(-14 * t) * Math.abs(Math.sin(18 * t)); // one small hop, gone in ~0.3 s
        y = sl.y + bounce;
        tilt = sl.tilt + 0.35 * Math.exp(-9 * t) * Math.cos(22 * t); // the wobble as it settles
      }
      e.set(tilt * Math.cos(sl.tiltDir), sl.yaw + spin, tilt * Math.sin(sl.tiltDir));
      q.setFromEuler(e);
      m.compose(p.set(sl.x * PX, y * PX, sl.z * PX), q, one);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return landed;
  };
  set(-1e9);
  return { mesh, set, slots };
}
```

## 2. Using it

```ts
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX } from "../components/stage";
import { colorPipeline, productLights, studioEnvironment } from "../components/look";
import { pile } from "../components/pile";
import events from "../components/events.json";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, renderer, height } = ctx;
  colorPipeline(renderer, "brand", 1.0);
  const cam = camera as THREE.PerspectiveCamera;
  const D0 = fitCamera(cam, height, 35);
  cam.position.set(0, 3.2, D0 * 0.62);
  cam.lookAt(0, -0.6, 0);
  scene.background = new THREE.Color("#efe7da");
  studioEnvironment(renderer, scene);
  productLights(scene);
  const coin = new THREE.CylinderGeometry(0.5, 0.5, 1, 40);          // unit coin, scaled below
  coin.scale(44 * PX, 6 * PX, 44 * PX);                               // 44 px across, 6 px thick
  const copper = new THREE.MeshPhysicalMaterial({ color: "#c77a45", metalness: 0.55, roughness: 0.3, clearcoat: 1 });
  const LAND = events as number[];                                     // 120 land frames, ascending: the sound uses the same list
  const heap = pile(coin, copper, { count: LAND.length, land: (i) => LAND[i]!, radius: 190, item: { w: 44, h: 6 }, floorY: -260 });
  scene.add(heap.mesh);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.1, 64), new THREE.MeshStandardMaterial({ color: "#d9cfc0", roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.66;
  scene.add(floor);
  return ({ frame }) => {
    heap.set(frame);
  };
}
```

`components/events.json` is an ascending array of land frames, the same list `sound-design`'s many-events stem is built from (`references/sfx-cues.md` there), so every clink lands on its coin. Write it once by hand or from a formula (the tested list: first land at frame 10, then gaps that tighten, `gap = max(1.2, gap × 0.86)` from 30f, rounded), never from a random source. Items in neighbouring slots may touch or slightly intersect where their tilts meet; at coin scale that reads as a heap, but check a close-up still if the camera pushes in.

## 3. Rules

- **One draw call, real items.** Up to a couple of thousand instances render fast under SwiftShader. Never fake the mass with a repeating texture; if the heap must be bigger than the instance budget, fill its hidden core with a plain dark shape under the top two layers of real items.
- **Nothing lines up.** Rings per layer, each layer turned by the golden angle (2.39996 rad), every slot jittered ±17% of a step and tilted up to ±13°, slots filled in a hashed order, ±8% value per item (`setColorAt`). A uniform stack, or a layer that fills left to right, reads as a pattern before it reads as a pile.
- **Settling is closed form.** Falling is `y = rest + ½ g t²` for t < 0, so the item lands exactly on its frame; after landing one damped hop (`h · 1.4 · e^(−14t) · |sin 18t|`) and a tilt wobble (`0.35 · e^(−9t) · cos 22t`) die within ~0.3 s. No state between frames: any frame renders alone and the export matches the preview.
- **Read the count from the picture.** `set()` returns how many items have landed: drive the counter and any fill gauge from it, so the number and the heap never disagree.
- **A container**: the rest slots sit inside `radius`; for a jar, add the glass after the pile (transparent, drawn later) and keep the falling items out of any type above the jar (clip them, or start the drop under the header).
- **Density on screen**: at most 3–5 items falling at once in a calm film; for a "pour", drop 8–12 at once and let the sound's density rules take over (`sound-design`, Many sound events).
- **A crowd** (people, pins, icons standing on a floor) is the same module with one layer: `item.h` the figure's height, `floorY` the floor, `tilt` near 0, and the land frame as each figure's arrival.
