# Carries: persisting elements, momentum, rushes and real motion blur

The handoffs where something *continues* across the cut rather than covering it. Numbers come from `motion-language`; these are the Three.js builds, from the LightPay, Samsung Pay, NotchBrowser and Moonlight templates; the motion blur and the match-push were compiled and captured.

Contents: 1 Persisting element · 2 Match-push · 3 Continuous spin and loops across a cut · 4 Rush into the lens · 5 Whip with real motion blur · 6 Velocity blur on one element · 7 Exit-then-cut · 8 Board erase · 9 One-shot films

## 1. Persisting element (re-create at the identical transform)

Scenes are separate builders; nothing survives a cut. So the *same* object is built twice, from the same numbers, at the same pose on the last frame of N and the first frame of N+1.

```ts
// components/handoff.ts: the only place these numbers exist
export const COIN = { x: 0, y: 0, z: 0, scale: 1.25, rotY: 0, kind: "lime" as const };

// scene N: the coin swoops to the handoff pose and holds it (no exit)
const t = prog(frame, D - 24, 18, inOutCubic);                     // lands 6f before the cut
coin.position.set(lerp(from.x, COIN.x, t), lerp(from.y, COIN.y, t), lerp(from.z, COIN.z, t));
coin.scale.setScalar(lerp(0.8, COIN.scale, t));
coin.rotation.y = lerp(2.4, COIN.rotY, t);

// scene N+1: built by the same factory, at COIN on frame 0, then moves in its new role
const coin = makeCoin(COIN.kind);                                   // same factory, same materials
const k = prog(frame, 4, 20, inOutCubic);                           // shrinks and rises 20f later
coin.position.set(COIN.x, lerp(COIN.y, 2.2, k), COIN.z);
coin.scale.setScalar(lerp(COIN.scale, 0.6, k));
```

- Both scenes need the same camera framing at the cut (both `fitCamera`, no drift: `restDrift` or drift × (1 − progress)), the same lights and the same `colorPipeline`, or the "same" object renders differently.
- Text carriers come from the same `three-type` helper at the same style, so the glyphs match exactly.
- Everything else in scene N has left 4–8f before the cut. A 1–2 px or 2% mismatch reads as a jump: check the two frames overlaid.

## 2. Match-push

The camera ends scene N on an exact crop; scene N+1 is laid out at that crop's scale. Code and the distance formula are in `three-camera` (`references/moves.md` §7–8): land ≥10f before the cut and hold, or carry the speed through with matching spline slopes.

## 3. Continuous spin and loops across a cut

A value that runs continuously (rays rotating, an orbit ring, a shader's time) is written from **film time**, not scene time, so it is continuous at the cut by construction:

```ts
// components/handoff.ts
export const RAY_SPIN = 0.006;          // rad per frame
export const SCENE3_START = 228;        // film frame where scene 3 begins (sum of earlier durations)
// scene 3 and scene 4 both:
rays.rotation.z = RAY_SPIN * (SCENE_START + frame);
```

Keep the scene start frames in one constant table and update it whenever a duration in `project.json` changes.

## 4. Rush into the lens

```ts
// the badge rushes the lens over the last 14f (ease-in) while the ground goes white
const r = prog(frame, D - 14, 14, inCubic);
cam.position.set(0, BADGE_Y * r, lerp(D0, 0.35, r));             // camera almost touches it
cam.lookAt(0, BADGE_Y * r, 0);
bg.u.uWhite.value = prog(frame, D - 6, 5, inCubic);              // or a white flash cover
```

Exponential version: `badge.scale.setScalar(Math.exp(Math.log(7) * inCubic(t)))`. The next scene opens on white (or the colour the object filled the frame with). Once per film.

## 5. Whip with real motion blur (sub-frame sampling)

For a fast move (a whip pan, a word flung across), render the scene several times across a 180° shutter and average. The scene's content lives in its own `world`; `ctx.scene` only shows the averaged frame.

```ts
import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";

/**
 * Real motion blur by sub-frame sampling: the scene's content lives in its own `world`
 * scene; each frame poses it at N instants across a 180-degree shutter, renders each into a
 * sample target and averages them into an accumulator that ctx.scene shows full-frame.
 * N = 1 costs one extra blit; use N > 1 only on frames that move fast.
 */
export function motionBlur(ctx: ThreeSceneContext, worldCamera: THREE.Camera) {
  const { renderer, scene } = ctx;
  const world = new THREE.Scene();
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = () =>
    new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, depthBuffer: true, samples: 4 });
  const sample = rt();
  const accum = rt();

  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = (map: THREE.Texture, toneMapped: boolean) =>
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map, transparent: true, depthTest: false, depthWrite: false, toneMapped }),
    );
  const blit = quad(sample.texture, false);
  const blitScene = new THREE.Scene();
  blitScene.add(blit);
  const show = quad(accum.texture, true); // tone mapping + sRGB happen once, here, on the way to screen
  show.name = "motion-blur-frame";
  scene.add(show);
  ctx.setCamera(ortho);

  /** Render the frame at scene time `time` (s) with `n` samples over `shutter` seconds. */
  return {
    world,
    render(pose: (time: number) => void, time: number, n: number, shutter = 0.5 / ctx.fps) {
      renderer.getDrawingBufferSize(size);
      if (sample.width !== size.x || sample.height !== size.y) {
        sample.setSize(size.x, size.y);
        accum.setSize(size.x, size.y);
      }
      const count = Math.max(1, Math.min(10, Math.round(n)));
      const autoClear = renderer.autoClear;
      const mat = blit.material as THREE.MeshBasicMaterial;
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? time : time - shutter / 2 + (shutter * (i + 0.5)) / count;
        pose(t);
        renderer.autoClear = true;
        renderer.setRenderTarget(sample);
        renderer.render(world, worldCamera);
        renderer.setRenderTarget(accum);
        renderer.autoClear = i === 0;
        mat.opacity = 1 / (i + 1); // running average
        renderer.render(blitScene, ortho);
      }
      renderer.autoClear = autoClear;
      renderer.setRenderTarget(null);
      pose(time); // leave the world at the true frame for picking
    },
  };
}
```

```ts
// in a scene
const cam = new THREE.PerspectiveCamera(50, width / height, 0.1, 400);
fitCamera(cam, height);
const mb = motionBlur(ctx, cam);
mb.world.background = new THREE.Color(LOOK.bg);                     // opaque: the average needs it
mb.world.add(word);
const xAt = (f: number) => ((1 - prog(f, 10, 8, outCubic)) * 1400 - prog(f, 34, 6, inCubic) * 1400) * PX;
const pose = (t: number) => { word.position.x = xAt(t * fps); };
return ({ frame, time }) => {
  const pxPerFrame = Math.abs(xAt(frame + 0.5) - xAt(frame - 0.5)) / PX;
  mb.render(pose, time, Math.ceil(pxPerFrame / 3));                  // samples = ceil(px moved / 3), up to 10
};
```

- `pose(t)` must be a pure function of time: everything that moves is set inside it.
- Above ~30 px of travel per frame, 10 samples show as steps (each 3 px+ apart); add directional blur to that element too (§6).
- **Limits**: the editor can only point at `motion-blur-frame` in such a scene (the world is off-screen), and nothing asynchronous may appear in it: a video seek or an image that lands after the frame was accumulated is not re-accumulated. Keep footage and late-loading images out of motion-blurred scenes. Use it for the 8–10f around a whip, not for whole films.
- Restores `autoClear` and the render target itself; anything else rendering off-screen must do the same (the renderer is shared).

## 6. Velocity blur on one element

Cheaper and enough for type: blur along the direction of travel from how far the element moved this frame, `blur = min(26, 0.11 × px moved)` (fast scrolls `min(220, 1.6 × v)` as streak length):

```ts
const v = Math.abs(xAt(frame) - xAt(frame - 1)) / PX;           // px this frame
setLabel(word, { blur: Math.min(26, 0.11 * v) });                // three-type kit; x and y blur together
```

The type kit's blur is isotropic; for a pure horizontal streak, give the shader a separate x radius (`uBlur.x` only). Both sides of a whip move at the same speed in the same direction, exit 4–5f ease-in, entry 4–5f ease-out.

## 7. Exit-then-cut (the workhorse)

Per-mesh opacity and position from the frame; every element leaves 6–9f inCubic, staggered 2–3f, clear 4–8f before the cut; the next scene's first element arrives 3–6f after it. Nothing to build: the discipline is the transition. `capture-frames` 3f before the cut must show background only.

## 8. Board erase

Every stroke and handwritten text reverses its own reveal (`uErase` 0 → 1 over 10f inOutCubic, from `D − 18`), 8f of blank paper, cut onto identical paper with drift at rest (`three-look` `references/line-art.md`).

## 9. One-shot films

When the whole film is one camera move, scene files are windows onto one function of film frame: every scene imports the same keys and draw function and passes its own start frame (`three-camera` `references/moves.md` §4). The NotchBrowser template paints its whole film into one canvas per frame this way; there is nothing to match at the cuts.
