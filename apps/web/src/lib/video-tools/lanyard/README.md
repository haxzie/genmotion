# The 3D lanyard drop generator

The odd one out among the free tools under `/tools`. The other four look a
number up and render a React template that `render/rasterize` screenshots per
frame; this one takes two images off the visitor's disk and renders a Three.js
scene, which that rasterizer cannot see at all (it serializes the DOM into an
SVG `<foreignObject>`, and a `<canvas>` carries no pixels through that).

**It is a port, not an original.** The scene is
`packages/templates/catalog/lanyard-drop-job-announcement`: the rig, the clip
hardware, the timeline and the camera move are all the template's, and the only
thing the tool changes is where the two card faces come from. Before changing
how it moves, open that template and look at what it does, because "it matches
the template" is the bar this tool is held to.

It runs on `@genmotion/three-engine`, the same engine a project scene does, so
the free tool is not a second renderer written for the marketing site.

## The parts

| File | What it is |
| --- | --- |
| `types.ts` | Card shapes and their recommended upload sizes, the three scenes, the 16s length, `LanyardConfig` |
| `scene-builder.ts` | The scene, as a `ThreeSceneBuilder`. The port lives here |
| `renderer.ts` | `mountThreeRenderHost` plus decoding the uploads into canvases |
| `art.ts` | Reading a dropped file, sampling a face to the card ratio, the example badge |
| `guidance.ts` | What to tell someone about the image they just dropped |
| `scene.tsx` | The canvas wrapped as a player scene, for the preview |

The UI is `components/tools/lanyard-tool.tsx`, the export is
`render/export-canvas-video.ts`, and `render/common.ts` holds the two pieces
both export paths share.

## Rules

- **Determinism is the contract.** The preview and the export are two separate
  renderers asked the same questions, so `setFrame(n)` has to paint the same
  pixels either way. The engine owns the stepping; the scene has to hold up its
  end by reading `time` off the frame it is handed and never a clock. The one
  seeded random in there (the webbing speckle) is called when building, never
  per frame, for exactly this reason.
- **Analytic, not simulated.** An earlier version of this tool ran a verlet rope
  and settled wherever its damping left it. The template's curves are written to
  arrive, turn and settle on chosen beats, are exact at any frame without being
  walked from zero, and look better. Don't reintroduce a solver.
- **One renderer per resolution, one mode per job.** The preview mounts in
  `preview` mode and sizes its buffer through `setDisplayScale`; the export
  mounts in `capture` with `pixelRatio: 1` and `readback: "drawing-buffer"`,
  because it blits the canvas itself and must not wait on
  `requestAnimationFrame`, which stops firing the moment the window is
  occluded.
- **Nothing is uploaded, and the copy promises it.** Faces are object URLs
  decoded in the tab and drawn onto a canvas. There is deliberately no
  `/api/tools/lanyard-drop-video`. Don't add a server round trip without
  rewriting the FAQ that says there isn't one.
- **Fill, never fit.** An off-ratio upload loses its edges. That is a design
  decision (a badge with letterbox bars stops looking like a badge) and the
  reason `guidance.ts` exists: it is cheaper to tell someone the size to
  re-export at than to render them a card with bars down the side.
- **Every scene's default strap is one of the swatches** in `lanyard-tool.tsx`.
  A default that is not in that list leaves the strap row with nothing pressed,
  which reads as a broken control.

## Working on it

`/dev/lanyard` is the harness. It shows the player preview plus a filmstrip of
ten evenly spaced frames drawn by a second renderer, so the drop, the bounce as
the strap goes taut, the turn onto the card's back, the push in and the yank out
are all in one screenshot. Check a motion or lighting change across all three
card shapes and all three scenes there before touching the tool page.

To compare against the template itself:

```sh
node packages/cli/bin/genmotion.js still \
  --dir packages/templates/catalog/lanyard-drop-job-announcement \
  --at 0 --at 106 --at 231 --at 319 --at 479 --out .context/lanyard-ref/
```
