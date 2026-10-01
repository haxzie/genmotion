---
name: three-camera
description: "Camera language for Three.js scenes: push-ins, pull-backs, orbits, dolly-and-track, parallax layers, rack-focus by depth, path moves along a curve, and punch-in emphasis, each written as a pure function of the frame. Also how to frame a subject exactly for any aspect ratio and how to hand a camera move across a cut. Load it when a Three.js scene needs the camera to do something, or when a format skill asks for a punch-in, a zoom or a reframe."
---

# Camera moves for Three.js scenes

The project's own authoring guide covers the basics: the camera is a real `PerspectiveCamera`, moves are slow, one idea per scene. This skill is the vocabulary on top of that, as recipes you can paste into a scene's frame callback.

Every recipe reads only the frame argument. Build vectors and curves once in the builder; the callback only sets values.

## When to use

- A scene needs the camera to move, or a format skill asks for a punch-in, zoom, reframe, Ken Burns or "camera glides over".
- A subject has to fill the frame exactly, in 16:9 and in 9:16.
- Two scenes need to cut on a matching camera position.

Not for type or transitions on their own: those are `three-type` and `three-transitions`.

## Fit before you move

Work out the framing instead of guessing. At distance `d`, a vertical field of view `fov` sees:

```ts
const visibleHeight = (d: number, fov = 50) => 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * d;
const distanceToFit = (size: THREE.Vector3, aspect: number, fov = 50, margin = 1.15) => {
  const v = THREE.MathUtils.degToRad(fov);
  const fitH = (size.y * margin) / (2 * Math.tan(v / 2));
  const fitW = (size.x * margin) / (2 * Math.tan(v / 2) * aspect);
  return Math.max(fitH, fitW) + size.z / 2;
};
```

Measure the subject with `new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3())` in the builder, and compute every move's start and end distance from `distanceToFit` with `width / height`. A move written in fixed numbers is a move that breaks the moment the project is vertical.

## The moves

All of these share one shape: an eased `t` from `interpolate`, then a lerp.

```ts
const t = interpolate(frame, [startFrame, endFrame], [0, 1], Easing.easeInOut);
```

| Move | What it says | Recipe |
| --- | --- | --- |
| **Push-in** | "Look closer" | `camera.position.z = THREE.MathUtils.lerp(far, near, t)` with `lookAt` fixed on the subject |
| **Pull-back** | "Here is the bigger picture" | The push-in reversed. Strong as a closing shot: reveal the context the subject lives in |
| **Orbit** | "Look at it from every side" | `camera.position.set(Math.sin(a) * r, y, Math.cos(a) * r)` with `a = lerp(a0, a1, t)`, then `lookAt(target)`. 30–90° is a move; a full turn is a turntable, which is a different shot |
| **Dolly-and-track** | "Walk past the line-up" | Move camera and `lookAt` target together along x by the same amount, so everything slides past at its own depth |
| **Path** | "Fly through" | A `CatmullRomCurve3` built once; `camera.position.copy(curve.getPointAt(t))` and `lookAt(curve.getPointAt(Math.min(1, t + 0.02)))` |
| **Crane** | "Rise above" | Lerp `position.y` up while `lookAt` stays on the subject, so the angle tilts down as it rises |
| **Punch-in** | Emphasis on a beat | A *fast* push (6–10 frames, `easeOut`) of 8–15% closer, held, then released. The only camera move allowed to be quick |
| **Rack focus** | "This, not that" | No depth-of-field pass is available. Fake it with opacity and scale: dim and shrink the old subject as the new one brightens, while a small push moves toward the new one |

## Timing

- Ordinary moves take 30–60 frames at 30fps, eased `easeInOut`. Shorter than that and it reads as a glitch, not a move.
- Punch-ins are the exception: 6–10 frames in, hold at least 15 frames, release over 10–15.
- Start a move a few frames *after* the cut and land it a few frames before the next. A camera already moving on frame 0 makes the cut feel late.
- Layer ambient drift under a held shot so it never freezes completely: `camera.position.x = base + Math.sin(time * 0.3) * 0.03`. Tiny. If you notice it, it is too big.

## Parallax

Depth is what sells the camera move. Place three layers at clearly different distances: a background plane or field far back, the subject at the focus distance, and one or two foreground elements close to the lens. A lateral move of the camera then moves each layer at its own speed with no extra code. Without a foreground layer, a dolly looks like a 2D slide.

## Across a cut

To hand a camera move to the next scene, end scene N on a known framing (the subject at a measured distance, say `fitDistance * 0.6`) and open scene N+1 with its camera at exactly that framing, continuing in the same direction. Write the shared numbers into `components/` so both scenes import the same constants. That is how the cut disappears.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Seeing the move | `capture-frames` at the start, middle and end of the move | None. A camera move is a frame check |

## Checks before you finish

1. `capture-frames` on the first frame, the middle and the last frame of every move. The subject is inside the frame and the right size at all three.
2. Re-check one scene in the other aspect ratio if the video ships in more than one. The fit maths should hold without edits.
3. Nothing in the frame callback allocates: no `new THREE.Vector3` per frame.
4. `validate` passes.
