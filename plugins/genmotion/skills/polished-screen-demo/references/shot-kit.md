# The shot kit

Four pieces make a screen recording out of a screenshot: a stage camera, a window to put the capture in, a cursor, and a caption. Build them once in `components/`, then every scene is a few lines of keyframes.

The code below is Three.js, the default engine. The same four pieces apply on any engine; only the drawing changes.

## The stage camera

An orthographic camera over the composition, with one `frame(zoom, x, y)` call. Zoom 1 is the whole desktop; zoom 1.6 is a push-in. The camera is the single thing that turns a static capture into a shot.

```ts
export function setupStage(ctx: ThreeSceneContext) {
  const { width, height } = ctx;
  const cam = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 4000);
  cam.position.set(0, 0, 1000);
  ctx.setCamera(cam);
  const fit = Math.min(width / 1920, height / 1080);
  const frame = (zoom: number, x: number, y: number) => {
    cam.zoom = fit * zoom;
    cam.position.x = x;
    cam.position.y = y;
    cam.updateProjectionMatrix();
  };
  frame(1, 0, 0);
  return { cam, fit, frame, viewW: width / fit, viewH: height / fit };
}
```

Drive it from keyframes, never from a constant drift:

```ts
/** Value along keyed [frame, value] pairs, eased per segment. */
export function keyed(frame: number, keys: [number, number][], ease = Easing.easeInOut) { /* ... */ }

const zoom = keyed(frame, [[22, 1], [70, 1.6], [124, 1.6], [164, 1]]);
const t = (zoom - 1) / 0.6;                       // 0 wide, 1 tight
stage.frame(zoom, lerp(0, target.x, t), lerp(0, target.y, t));
```

Read that as: hold wide until frame 22, push in by 70, **hold through the click**, pull back by 164. The hold is what makes it feel deliberate. Panning to the target only as the zoom tightens keeps the wide frame centred.

Rules of thumb: 1.5x to 1.8x for a button or a field, 1.2x to 1.3x for a panel, never past 2x on a 1920 capture or the pixels show. Two seconds minimum on any held zoom.

## The window

The capture goes inside a window, on a desktop, never bleeding to the video edge. The chrome is what says "a screen", and it gives the camera a frame to push inside.

- A rounded dark panel, a title bar about 52px tall, three dots at the left, a centred title.
- A shadow under it. A window with no shadow reads as a flat image.
- A desktop behind it: a dark, slightly warm field, larger than the composition so a pull-back never reaches its edge.
- The capture is a texture on a plane inside the body, inset by the title bar.

Park windows at shared coordinates in one `LAYOUT` object, so a window present at the end of one scene and the start of the next is in exactly the same place. A window that jumps a few pixels across a cut is the most visible possible error.

## The cursor

Drawn, not captured. `capturePage` never includes the pointer, which is why the cursor has to be yours.

- The classic arrow: a black fill with a white outline and a soft shadow, about 40 by 56, with the **tip at the origin** so positioning is "put the tip here".
- A click ripple: a ring that scales out and fades over about 12 frames.
- A press: the arrow scales to about 0.86 for a few frames around the click, which reads as a push.

```ts
const click = (frame: number, at: number) => {
  const p = interpolate(frame, [at, at + 12], [0, 1], Easing.easeOut);
  ring.scale.setScalar(0.6 + p * 1.2);
  ring.material.opacity = frame >= at && frame <= at + 12 ? 0.9 * (1 - p) : 0;
  const press = interpolate(frame, [at - 2, at, at + 5], [1, 0.86, 1], Easing.easeOut);
  arrow.scale.setScalar(frame >= at - 2 && frame <= at + 5 ? press : 1);
};
```

Movement: ease in and out, about 18 to 26 frames for a short hop, longer across the screen. Arrive two to four frames **before** the click, never on the same frame. Let it drift a few pixels while it waits; a cursor frozen to the pixel is a cursor nobody is holding.

Keep one `CLICK` constant per scene at the top of the file, and use it for the ripple, the press, the UI state change and the click sound. One number means the four can never drift apart.

## Captions and keycaps

- **Step caption**, bottom-left on a dark scrim: a small "Step 2" eyebrow over one line. Rise 40px in, sink out. Camera-locked, so a push-in does not drag it off screen.
- **Keycaps**, bottom-right, for a keyboard action worth naming. A pill that pops in on the press and leaves about 26 frames later.

Both belong to a HUD group that follows the camera, not the world:

```ts
h.follow(stage.cam, zoom);   // keeps the overlay at a fixed screen position and size
```

## Typing

Never space characters evenly. `keystroke-sound` writes a `.timing.json` beside the WAV:

```json
{ "text": "claude\n", "fps": 30, "durationInFrames": 40,
  "steps": [{ "frame": 5, "text": "c" }, { "frame": 10, "text": "cl" }, { "frame": 14, "text": "cla" }] }
```

Build every prefix as its own line once, then show the one whose frame has arrived. The sound and the picture then come from the same plan, and a re-export cannot make them drift.

## Scene lengths

A step is a shot. Most steps want 4 to 7 seconds: approach, click, result, breathe. Under 3 seconds nobody reads the caption; over 8 and the camera is loitering. Cut on the result, not after it.
