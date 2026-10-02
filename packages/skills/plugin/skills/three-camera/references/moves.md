# Camera move recipes

Each move as a frame-callback fragment over the rig in `references/rig.md` (`fitCamera`, `PX`, and `components/ease.ts`). Durations and sizes are the `motion-language` camera grammar; this file only shows how to write them on a real camera. Everything is built once in the builder and set per frame; nothing allocates in the callback.

Contents: 1 Push / pull · 2 Punch-in · 3 Orbit · 4 Keyed path (one-shot) · 5 Curve path · 6 Parallax and truck · 7 Match-push into the next scene · 8 Carry across a cut at speed · 9 Impact: shake, fov punch, slam · 10 Subject rig (move the layout, not the camera) · 11 Rack focus · 12 It was inside the device all along · 13 Push on a flat film as a view transform

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

## 12. It was inside the device all along

The reveal that the thing we have been watching (a jar filling, a chart drawing, a character) lives in the product's screen: the frame pulls back and the device closes in from beyond the edges until the whole phone or laptop is in shot. A straight camera pull-back cannot do it when the subject is off the screen's centre or the device is small in the final frame: the bezel enters the close-up at any sane zoom, or the screen never covers the frame. Instead, **scale the device about the subject**: one rig group whose origin is the subject, the device inside it offset so the subject sits on that origin, scaled from a size where its screen covers the whole frame down to 1, while the rig travels from the opening framing to the final one.

Tested at 1920 × 1080: frame 0 is the subject on the app's screen colour with no bezel in frame; the bezel enters from both sides by frame 30 of a 54f move; the last frame is the whole phone at the right of the frame with the header bar the viewer never saw.

```ts
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX } from "../components/stage";
import { colorPipeline, productLights, studioEnvironment } from "../components/look";
import { inOutCubic, lerp, logLerp, prog } from "../components/ease";

/** The smallest scale of a screen (half size hw x hh px, subject at (sx, sy) px from the screen's centre)
 *  that still covers the whole frame when the subject sits at screen point (px, py) px from the frame centre. */
export function coverScale(width: number, height: number, hw: number, hh: number, sx: number, sy: number, px: number, py: number) {
  return 1.04 * Math.max((width / 2 + px) / (hw + sx), (width / 2 - px) / (hw - sx), (height / 2 + py) / (hh + sy), (height / 2 - py) / (hh - sy));
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, renderer, width, height } = ctx;
  colorPipeline(renderer, "brand", 1.0);
  fitCamera(camera, height);
  const GROUND = "#efe7da", SCREEN_BG = "#fbf6ee";
  scene.background = new THREE.Color(GROUND);
  studioEnvironment(renderer, scene);
  productLights(scene);

  // the device, laid out in px around its screen centre: a 380 x 800 screen in a 420 x 860 body
  const SCREEN = { hw: 190, hh: 400 };
  const SUBJECT = { x: 0, y: -60 };                       // where the subject sits inside the screen
  const device = new THREE.Group();
  const shape = new THREE.Shape();
  const bw = 210 * PX, bh = 430 * PX, br = 56 * PX;
  shape.moveTo(-bw + br, -bh); shape.lineTo(bw - br, -bh); shape.quadraticCurveTo(bw, -bh, bw, -bh + br);
  shape.lineTo(bw, bh - br); shape.quadraticCurveTo(bw, bh, bw - br, bh); shape.lineTo(-bw + br, bh);
  shape.quadraticCurveTo(-bw, bh, -bw, bh - br); shape.lineTo(-bw, -bh + br); shape.quadraticCurveTo(-bw, -bh, -bw + br, -bh);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, curveSegments: 12 }),
    new THREE.MeshPhysicalMaterial({ color: "#1c1c1f", metalness: 0.4, roughness: 0.3, clearcoat: 1 }));
  body.position.z = -0.32;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.hw * 2 * PX, SCREEN.hh * 2 * PX), new THREE.MeshBasicMaterial({ color: SCREEN_BG, toneMapped: false }));
  screen.position.z = 0.02;
  const header = new THREE.Mesh(new THREE.PlaneGeometry(300 * PX, 40 * PX), new THREE.MeshBasicMaterial({ color: "#c77a45", toneMapped: false }));
  header.position.set(0, 300 * PX, 0.03);
  const subject = new THREE.Mesh(new THREE.CylinderGeometry(70 * PX, 70 * PX, 14 * PX, 48), new THREE.MeshPhysicalMaterial({ color: "#c77a45", metalness: 0.55, roughness: 0.3, clearcoat: 1 }));
  subject.rotation.x = 1.25;
  subject.position.set(SUBJECT.x * PX, SUBJECT.y * PX, 0.8); // clear of the screen plane: depth never scales (below)
  device.add(body, screen, header, subject);
  // the rig's origin is the subject: scaling the rig scales everything about the subject
  const rig = new THREE.Group();
  device.position.set(-SUBJECT.x * PX, -SUBJECT.y * PX, 0);
  rig.add(device);
  scene.add(rig);

  const OPEN = { x: 0, y: 0 };                             // the subject's screen point in the opening framing (px)
  const LAND = { x: 420, y: -60 };                         // ...and once the whole device is in frame
  const K = coverScale(width, height, SCREEN.hw, SCREEN.hh, SUBJECT.x, SUBJECT.y, OPEN.x, OPEN.y);
  return ({ frame }) => {
    const e = prog(frame, 10, 54, inOutCubic);              // 54f: a reveal, not a cut
    const s = logLerp(K, 1, e);                             // scale in log space, like any zoom
    rig.scale.set(s, s, 1);                                 // scale the plane, not the depth: nothing drifts in perspective
    rig.position.set(lerp(OPEN.x, LAND.x, e) * PX, lerp(OPEN.y, LAND.y, e) * PX, 0);
    subject.rotation.z = 0.01 * frame;
  };
}
```

- **`coverScale()`** is the smallest scale at which the screen still covers the frame from the opening framing, from the subject's place inside the screen; the move starts there (×1.04), so frame 0 has no edge in it.
- **Scale in log space** (`logLerp`), like any zoom, over 45–60f inOutCubic: it is a reveal, the film's turn, so it is slower than a push. The subject's own motion keeps running through it.
- **Scale the plane, not the depth** (`rig.scale.set(s, s, 1)`): if z scaled too, the subject (in front of the screen) would rush toward the lens and drift off its screen point in perspective. A 3D subject therefore looks a little thinner in the opening frames; keep it shallow, or give it its own depth scale.
- **The world the subject lived in is the screen**: the opening ground is exactly the screen's background colour (`toneMapped: false`), so nothing changes colour as the bezel arrives; the ground outside the device is the new, final ground.
- **Type and UI drawn into the screen** are magnified up to `K` times at the start: draw them at `res = 2 × K` (`three-assets` drawn UI), or keep them hidden until the scale is under 2. Anything that must read during the move lives on the overlay, not in the screen.
- Pair it with one sound: an air whoosh across the move, or the app's own UI sound on the frame the whole device lands (`sound-design`).

## 13. Push on a flat film as a view transform

In a flat, diagrammatic film (a boundary on paper, a map, a UI with screen-space labels), a camera push also magnifies every label and changes every stroke width. Push a **map group** instead: `map.scale.set(k, k, 1)` and `map.position` set so the focus point stays put (`position = focus × (1 − k)`), with `k = logLerp(1, zoom, e)`. The labels and the overlay stay on the fitted camera at their true px; strokes drawn with a screen-px width (`three-assets` `outline()`, or line art with `uScale = k`) keep their weight. It is the same picture as a camera push for anything flat on z = 0, with none of its side effects.
