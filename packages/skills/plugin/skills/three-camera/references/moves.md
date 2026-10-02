# Camera move recipes

Each move as a frame-callback fragment over the rig in `references/rig.md` (`fitCamera`, `PX`, and `components/ease.ts`). Durations and sizes are the `motion-language` camera grammar; this file only shows how to write them on a real camera. Everything is built once in the builder and set per frame; nothing allocates in the callback.

Contents: 1 Push / pull · 2 Punch-in · 3 Orbit · 4 Keyed path (one-shot) · 5 Curve path · 6 Parallax and truck · 7 Match-push into the next scene · 8 Carry across a cut at speed · 9 Impact: shake, fov punch, slam · 10 Subject rig (move the layout, not the camera) · 11 Rack focus

## 1. Push / pull

```ts
// builder
const D0 = fitCamera(cam, height);
const target = new THREE.Vector3(0, 0, 0);
// frame: a 1.6x push over 36f, inOutCubic, starting 6f after the cut so the cut reads
const t = prog(frame, 6, 36, inOutCubic);
cam.position.set(target.x, target.y, target.z + logLerp(D0, D0 / 1.6, t));
cam.lookAt(target);
```

- Push 24–48f, zoom 1.3–2.5×; pull-back 45–52f. Log-space distance, always.
- To push onto an off-centre subject, lerp the camera's x/y and its look target together, so the subject slides to centre as it grows.
- Creep (+1.5–6% over a long hold): the same line with `prog(frame, 0, durationInFrames, inOutSine)` and `D0 / 1.04`.

## 2. Punch-in

```ts
// 10% over 8f inCubic, hold 18f, release 12f outCubic; the hit lands on `at`
const k = 1 + 0.1 * (prog(frame, at - 8, 8, inCubic) - prog(frame, at + 18, 12, outCubic));
cam.position.z = D0 / k;
```

The only fast camera move: 6–10f in, ≥15f hold, 10–15f out. Use it on the key word or a music hit, not as a habit.

## 3. Orbit

```ts
// 24 degrees over 120f, inOutSine, radius fixed, looking at the product
const a = THREE.MathUtils.degToRad(lerp(-12, 12, prog(frame, 0, 120, inOutSine)));
cam.position.set(Math.sin(a) * R, Y, Math.cos(a) * R);
cam.lookAt(0, 0, 0);
```

- 10–30° over 90–150f reads as premium; a full turn is a turntable (a different shot).
- Keep `R` constant unless the shot is also a push. Turning the product instead (`product.rotation.y`) is the same picture with simpler lighting: the light stays put and the highlights travel over the surface, which is usually what you want.

## 4. Keyed path (one-shot camera film)

A whole film as one keyed camera: each key is `[frame, x, y, zoom]`; the monotone spline glides through interior keys, zoom runs in log space.

```ts
// builder: keys in film frames; x, y in px; zoom 1 = fitted
const KEYS: [number, number, number, number][] = [
  [0, 0, 0, 2.4], [45, 0, 0, 1.02], [96, 120, -40, 1.06], [150, 120, -40, 2.4], [210, -300, 260, 3.15],
];
const f = KEYS.map((k) => k[0]);
const kx = glide(f, KEYS.map((k) => k[1]));
const ky = glide(f, KEYS.map((k) => k[2]));
const kz = glide(f, KEYS.map((k) => Math.log(k[3])));   // spline the log of zoom
// frame (film frame = scene start + local frame)
const F = SCENE_START + frame;
const zoom = Math.exp(kz(F));
const d = drift(F / fps, 6 * PX / zoom);                    // drift shrinks as you zoom in
cam.position.set(kx(F) * PX + d.x, ky(F) * PX + d.y, D0 / zoom);
```

- Moves between keys 45–90f (1.5–3 s). Two equal consecutive values make a deliberate hold.
- Scene files of a one-shot film are windows onto the same function: every scene imports `KEYS` and passes its own `SCENE_START`, so there is nothing to match at the cuts.

## 5. Curve path (fly-through)

```ts
// builder
const curve = new THREE.CatmullRomCurve3([v(-6, 1, 8), v(-2, 0.5, 4), v(2, 0.3, 3), v(5, 1, 6)], false, "centripetal");
const look = new THREE.Vector3();
// frame: arc-length position, eased so it starts and lands
const u = prog(frame, 0, 120, inOutCubic);
curve.getPointAt(u, cam.position);
curve.getPointAt(Math.min(1, u + 0.02), look);
cam.lookAt(look);
```

`getPointAt` is by arc length, so speed is even along the curve; `"centripetal"` avoids loops at tight corners.

## 6. Parallax and truck

Depth sells a lateral move. Three layers at clearly different z: background (z −6 to −20), subject (z 0), one foreground element (z +2 to +4, partly out of frame). Then move only the camera:

```ts
cam.position.x = lerp(-1.2, 1.2, prog(frame, 0, 90, inOutCubic)); // truck 240 px at z = 0
cam.lookAt(cam.position.x * 0.6, 0, 0);                          // a little pan with it
```

Each layer moves at its own rate with no extra code. Without a foreground layer a truck reads as a slide.

## 7. Match-push into the next scene

Scene N pushes until an element exactly fills the frame; scene N+1 opens laid out at that scale. Both import the handoff numbers.

```ts
// components/handoff.ts
export const SCREEN = { x: 0, y: 40, w: 800, h: 500 }; // px at z = 0 in scene N

// scene N: land the push 10f before the cut and hold (or accelerate through: see 8)
const D1 = D0 * (SCREEN.h / height);                // distance where SCREEN.h fills the frame height
const p = prog(frame, durationInFrames - 34, 24, inOutCubic);
const alive = 1 - p;                                 // drift dies over the push
cam.position.set(lerp(0, SCREEN.x * PX, p) + d.x * alive, lerp(0, SCREEN.y * PX, p) + d.y * alive, logLerp(D0, D1, p));
cam.lookAt(cam.position.x, cam.position.y, 0);

// scene N+1: fitted camera, the element at frame height, centred
const k = height / SCREEN.h;
screen.scale.set(k, k, 1);                           // same content, same crop, frame 0
```

Tested: the last frame of N and the first of N+1 match. Fit to height (or width) by whichever side fills the frame; the other side shows the shared background, which must be identical in both scenes.

## 8. Carry across a cut at speed

When the move should not land (an aggressive 6–10f push, a whip), end scene N at speed and start N+1 at the same speed, measured in the same units:

```ts
// scene N: log-distance falls linearly into the cut (no ease-out)
const v = 0.045;                                     // log-distance per frame at the cut
const lnD = glide([D - 10, D - 1], [Math.log(D0), Math.log(D0) - 9 * v], 0, -v);
cam.position.z = Math.exp(lnD(frame));
// scene N+1: same units, starts at -v and eases to rest
const lnD2 = glide([0, 16], [Math.log(DSTART), Math.log(DSTART) - 0.25], -v, 0);
```

The slope arguments of `glide` are exactly the velocity contract `motion-language` asks for: accelerate through the cut, the next scene continues at the same speed.

## 9. Impact: shake, fov punch, slam

```ts
const HITS = [2.4, 4.1];                             // seconds, on the music hits
const k = kick(time, HITS, 9);                       // 1 on the hit, decaying
const f = frame | 0;
cam.position.x = base.x + (hash1(f) - 0.5) * 0.25 * k;   // shake: per-frame hash, decays with k
cam.position.y = base.y + (hash1(f + 91) - 0.5) * 0.25 * k;
cam.fov = 50 - 8 * k;                                // fov punch -5 to -10 degrees
cam.updateProjectionMatrix();
hud.fit();                                           // the overlay layer re-fits to the new fov
```

- Shake 3–6f of visible decay (sharp 9–14); it lives on the impact frame only.
- Slam a headline out of the lens: `z = lerp(6, 0, e)` and scale keys 0.7 → 1.04 → 1 over 14f (`interpolate(frame, [s, s + 8, s + 14], [0.7, 1.04, 1], Easing.easeOut)`).
- Never dolly and change fov in the same move except in a punch on a hit.

## 10. Subject rig (move the layout, not the camera)

For a flat UI shown in 3D (a dashboard gliding, tilted), it is easier to pose the subject: a pivot that puts a chosen layout point at a chosen screen point, at an apparent scale, tilted.

```ts
// pivot sits at the focus point; inner holds the layout offset so the focus is at the pivot
function applyPose(pivot: THREE.Object3D, inner: THREE.Object3D, p: { fx: number; fy: number; sx: number; sy: number; s: number; rx: number; ry: number }, D0: number) {
  const z = D0 * (1 - 1 / p.s);                     // apparent scale s at the fitted camera
  pivot.position.set((p.sx * PX) / p.s, (p.sy * PX) / p.s, z);
  pivot.rotation.set(p.rx, p.ry, 0, "ZXY");
  inner.position.set(-p.fx * PX, p.fy * PX, 0);
}
```

Key each pose field with `glide` (one spline per field over the same keys) so multi-key glides never stop at a key.

## 11. Rack focus

There is no depth-of-field pass (no post-processing addons). Fake it on the planes that matter: blur the old subject's planes (the type kit's `setLabel({ blur })` in `three-type`, or the same 7×7 blur shader on an image plane) from 0 to 8 px while the new one goes 8 → 0, over 14–20f inOutCubic, with a small push toward the new subject. For lit 3D meshes, dim and desaturate the old subject instead of blurring it.
