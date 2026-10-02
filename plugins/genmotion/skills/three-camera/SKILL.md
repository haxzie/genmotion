---
name: three-camera
description: "Camera craft for Three.js scenes: a stage where 1 world unit is 100 composition px so sizes are exact in every aspect, a shared ease module (house curves, monotone spline, log-space zoom, drift that returns to rest), and recipes for push, pull, punch-in, orbit, keyed one-shot paths, curve fly-throughs, parallax, shake and fov punch, match-push into the next scene and carrying a move across a cut at speed. Load it when a Three.js scene needs the camera to do anything, or a subject must fill the frame exactly."
---

# Camera on Three.js: the how behind the camera grammar

`motion-language` decides *what* the camera does and for how long (push 24–48f, punch 6–10f, orbit 10–30°, drift 4–7 px). On Three.js the camera is a real `PerspectiveCamera`, so every one of those moves is arithmetic on its position, target and fov. This skill is that arithmetic, distilled from the 3D templates (the LightPay and Samsung Pay launch films, the NotchBrowser one-shot, the crypto dashboard glide, the p(doom) music video) and checked by rendering it.

Two modules carry everything: `components/stage.ts` (units, fitting, a camera-locked overlay) and `components/ease.ts` (curves, spline, log zoom, drift, kick). Both are in `references/rig.md` ready to copy; the move recipes are in `references/moves.md`.

## When to use

- A Three.js scene needs a push, pull, punch-in, orbit, fly-through, pan, shake or reframe.
- A subject must fill the frame exactly, or the video ships in more than one aspect.
- Two scenes cut on a matched framing (match-push), or a move must carry across a cut.
- A camera path stops at every keyframe, or a zoom races then crawls.

Not for: choosing the move or its duration (`motion-language`), what sits in front of the lens at a cut (`three-transitions`), type that must survive a move (`three-type`).

## The stage: work in composition pixels

Fit the camera so the z = 0 plane is **100 composition px per world unit**, then lay everything out in px × `PX` (0.01). A 120 px headline is 120 px on screen in 16:9, 9:16 and 1:1 alike; nothing is guessed.

```ts
const D0 = fitCamera(camera, height);   // 50 degree lens, on +z, looking at the origin
title.position.y = 140 * PX;            // 140 px above centre, exactly
```

- Visible height at distance d: `2 · tan(fov/2) · d`. Px per unit at d: `height / that`. At 1080p with a 50° lens, `D0` = 11.58.
- Something at depth z appears `D0 / (D0 − z)` times its z = 0 size. Use it to place parallax layers and to compute any matched framing.
- Width is the constraint in 9:16: fit blocks with `fitBlock(width, height, wPx, hPx)` (an 8% margin per side) instead of shrinking type, and re-lay-out lines per aspect (safe zones per `direction`'s pacing reference).
- Flat films (whiteboard, chat UI, 2D compositors) use an orthographic pixel camera instead: `references/rig.md` §4.

## Lens

| Lens (vertical fov) | Use | Why |
| --- | --- | --- |
| 50° (the host default) | Almost everything; type-led scenes | Neutral perspective; the house templates all use it |
| 28–35° | Product hero, logo in 3D | A longer lens flattens the object and keeps edges from bulging; move the camera back to compensate (`unitDistance(height, fov)`) |
| 60–75° | Flying through a space, a ring of tiles | Exaggerates depth and speed |
| −5 to −10° kick | Music hits only | An fov punch decays with `kick()`; it is an effect, not a move |

Never animate dolly and fov in one move (except a punch on a hit): the two fight and the perspective warps. After any fov change call `updateProjectionMatrix()` and re-fit the overlay.

## The move table, built on Three.js

Numbers from `motion-language`; recipes in `references/moves.md`.

| Move | Build | Gotcha |
| --- | --- | --- |
| Push / pull | `cam.position.z = logLerp(D0, D0 / zoom, prog(...))`, look target fixed | Linear distance races at the start and crawls at the end |
| Creep | Same, zoom 1.015–1.06 over the whole scene, inOutSine | Pick creep *or* drift as the hold's life, plus at most one element behaviour |
| Punch-in | `D0 / (1 + 0.1 · (in − out))`, in 8f inCubic, hold ≥15f, out 12f | The only camera move under 24f |
| Orbit | Position on a circle of fixed radius, `lookAt` the subject, 10–30° | Often better as `product.rotation.y`: the lights stay put and highlights travel |
| Keyed path | `[frame, x, y, zoom]` keys through `glide`, zoom splined in log | Segmented `interpolate` stops dead at every interior key |
| Fly-through | `CatmullRomCurve3(…, "centripetal")`, `getPointAt` + look 2% ahead | Arc-length param gives even speed |
| Truck + parallax | Camera x only; three layers at different z | No foreground layer = a slide, not a move |
| Shake | Per-frame `hash1(frame)` offset × `kick(time, hits)` | Never a random source; dies within 3–6f |
| Slam | Headline z 6 → 0, scale keys 0.7 → 1.04 → 1 over 14f | Once per film |
| Subject rig | Pose the layout (pivot + scale + tilt) instead of the camera | For flat UI gliding in 3D, where camera math gets awkward |

## Keyframes that never stop

The engine's `interpolate(frame, [0, 30, 60], [a, b, c], ease)` eases *each segment*, so the camera decelerates to a standstill at frame 30. For any value with three or more keys use `glide(keys, values)`: a monotone cubic through every key that never overshoots and keeps moving through interior keys (two equal values make a deliberate hold).

```ts
const kx = glide([0, 45, 96, 150], [0, 0, 120, 120]);            // px; holds 0→45 and 96→150
const kz = glide([0, 45, 96, 150], [2.4, 1.02, 1.06, 2.4].map(Math.log));
cam.position.set(kx(frame) * PX, 0, D0 / Math.exp(kz(frame)));   // zoom splined in log space
```

## Drift that is alive, and drift that rests

- **Default hold**: `drift(time, amp)` with amp 4–7 px × `PX` at 0.18–0.4 Hz, two incommensurate sines; divide amp by the current zoom so it reads the same everywhere.
- **Drift that returns to rest**: `restDrift(progress, 4 * PX, 2.5 * PX)` is exactly zero on the first and last frame. Use it whenever a cut must land on an identical frame (diagram explainers, board erases, any matched handoff), as the whiteboard template does on every scene.
- **Kill drift before a matched cut**: multiply it by `1 − push progress`.
- Never move the camera while the viewer must read a line for the first time; land the move, then reveal the text, or let the text ride a creep under 3%.

## Across the cut

| Handoff | Scene N | Scene N+1 |
| --- | --- | --- |
| Match-push (land) | Push lands ≥10f before the cut at `D1 = D0 · elementH / height`, drift 0, hold | Fitted camera; element scaled by `height / elementH`, centred |
| Carry (at speed) | Log-distance falls at constant speed into the last frame: `glide(..., 0, -v)` | Starts at the same −v: `glide(..., -v, 0)` and eases to rest |
| Same framing, new subject | Camera parks on a shared pose | Opens on that pose, then moves |
| One-shot film | Each scene file is a window onto one keyed function of film frame | Same keys, its own start frame: nothing to match |

Put the handoff numbers (`SCREEN`, `HANDOFF_ZOOM`, `CAM_POSE`) in `components/handoff.ts` and import them in both scenes; never retype them. `references/moves.md` §7–8 have the code, tested so the last frame of N and the first of N+1 match.

## A complete scene

A product hero opening on a pull-back, holding on a creep with drift, and handing off with a match-push into the app screen; the shape every camera-led scene takes. Tested end to end (the last frame matches the next scene's first).

```ts
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX } from "../components/stage";
import { inOutCubic, lerp, logLerp, prog, restDrift } from "../components/ease";
import { SCREEN } from "../components/handoff";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { camera, height, durationInFrames: D } = ctx;
  const cam = camera as THREE.PerspectiveCamera;
  const D0 = fitCamera(cam, height);
  // ...build the product, the screen plane at SCREEN, lights (three-look)...
  const D1 = D0 * (SCREEN.h / height);              // the screen fills the frame height here
  return ({ frame, progress }) => {
    const open = prog(frame, 0, 48, inOutCubic);    // pull-back 1.3x -> 1, 48f
    const push = prog(frame, D - 34, 24, inOutCubic); // lands 10f before the cut, holds
    const d = restDrift(progress, 5 * PX, 3 * PX);
    const alive = 1 - push;                          // drift dies over the push
    const z = push > 0 ? logLerp(D0, D1, push) : logLerp(D0 / 1.3, D0, open);
    cam.position.set(lerp(0, SCREEN.x * PX, push) + d.x * alive, lerp(0, SCREEN.y * PX, push) + d.y * alive, z);
    cam.lookAt(cam.position.x, cam.position.y, 0);
  };
}
```

## Camera by style family

| Family (`direction`) | Camera | Default move |
| --- | --- | --- |
| Beat-cut kinetic type | Fitted, still | None; a 1.06 → 1 settle on each card is the type's, not the camera's |
| Soft-light SaaS | Fitted or orthographic | Push 2–2.5× onto the control that matters; creep on holds |
| 3D product hero | Fitted, 30–50° | Slam, orbit 10–30°, rush into the lens at the peak |
| One-shot film | Orthographic or fitted, keyed | Keyed `[frame, x, y, zoom]` path, 1.5–3 s moves, log zoom |
| Chat-UI social | Fitted | Push through the screen 45f; pull back 52f |
| Whiteboard | Orthographic | `restDrift` ±4 / ±2.5 px, zoom +1.2% mid-scene |
| Textured tactile | Subject rig | Tilted glides over a dashboard; hard cut to flat close-ups |
| Music video | Perspective, 48–75° | Shots of 3–4 s on bar lines; fov punch and shake on hits |
| Milestone | Fitted | Creep on the number; punch 1.06 on the land |

## Anti-patterns

- **Hard-coded distances.** `camera.position.z = 7` breaks in 9:16. Fit, then move in ratios of `D0`.
- **Stop-start paths** from segmented interpolation. Spline it.
- **Linear zoom.** Log space, always.
- **Several camera ideas in one scene**: a push *and* an orbit *and* a shake. One move per shot.
- **Moving the camera and the subject the same way at once**: the subject sits still on screen and the move reads as nothing.
- **Allocating in the frame callback** (`new THREE.Vector3()` per frame): build once, `set`/`copy` per frame.
- **Drift running into a matched cut**: the frames almost match, which reads as a jump.
- **A wall-clock or random source for shake**: use `hash1(frame)`.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Seeing the move | `capture-frames` at the start, middle and end of each move, and 5 consecutive frames around any interior key | None: a camera move is a frame check |
| Matched cuts | `capture-frames` on the last frame of N and the first of N+1 | Compare by numbers: both scenes import the same handoff constants |
| Timing and grammar | `motion-language` | — |

## Checks before you finish

1. Every scene fits its camera from `height` (no literal camera distances); one scene re-captured in each shipped aspect keeps its subject framed with no edits.
2. `capture-frames` at 0%, 50% and 100% of every move: the subject is in frame and the right size at all three.
3. Around each interior key of a keyed path, 5 consecutive frames show steady movement (no stall).
4. For every matched cut, the last frame of N and the first of N+1 match in position and size of the carrier; drift is zero on both.
5. Nothing reads while the camera is mid-move on its first appearance.
6. No allocation, randomness or wall-clock timing in any frame callback; `validate` passes.
