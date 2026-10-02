---
name: three-transitions
description: "Building scene handoffs on Three.js, where nothing survives a cut and the renderer never cross-dissolves: one camera-locked cover layer for floods that become objects, irises, directional and bottom-up wipes, block wipes and flash-to-white; persisting elements re-created at the identical transform from shared constants; match-push and carries at speed; continuous loops on film time; rush into the lens; whips with real motion blur by sub-frame sampling. Covers the timing contract on both sides of a cut and how to check it. Load it when a Three.js video has more than one scene."
---

# Transitions on Three.js: the how behind the handoff catalogue

`motion-language` holds the handoff catalogue: which handoff, how many frames, which sound, and the rule of one signature plus one workhorse per film (`direction` picks them). This skill is how each one is built when scenes are separate Three.js builders cut back to back.

Two facts shape everything here:

1. **Nothing crosses a cut.** At the cut the host tears down scene N's graph and builds scene N+1 from scratch. A "persisting" element is the same object built twice from the same numbers. A flood is a colour that both scenes agree on.
2. **The renderer never blends two scenes.** There is no crossfade between scenes and there should not be (the house uses plain crossfades on 0% of cuts). Every transition is something the two scenes do in their own last and first frames.

Code: `references/cover-layers.md` (one overlay shader for flood, iris, wipe, block wipe and flash), `references/carries.md` (persisting element, continuous loops, rush, whip with motion blur, exit-then-cut, board erase). Both build on `three-camera`'s `components/stage.ts` (`overlay()`, `PX`) and `components/ease.ts`.

## When to use

- A Three.js video has two or more scenes and you are planning how each ends and begins.
- A cut feels like a jump, or a flood/flash flickers at the cut.
- The Direction block names a signature (flood becomes object, iris, block wipe, flash-to-white, match-push, persisting element) and it must be built.

Not for: choosing the handoff (`direction`, `motion-language`), the camera rig itself (`three-camera`), the sound on the cut (`sound-design`).

## The contract, in Three.js terms

| Rule (`motion-language`) | How it is enforced here |
| --- | --- |
| Last 10–15f of N and first 10–15f of N+1 are one move | Plan both scenes' timelines together; write the handoff frame numbers into `components/handoff.ts` |
| The carrier is pixel-identical across the cut | Both scenes import the carrier's pose, colour and size from `components/handoff.ts` and build it with the same factory; never retype a number |
| Same picture means same rendering | Both scenes: same `fitCamera`, same `colorPipeline` mode, same lights, `scene.background` set; the carrier and cover layers `toneMapped: false` |
| Drift dies before a matched cut | `restDrift` (zero at both ends) or drift × (1 − transition progress) |
| Non-carriers gone 4–8f before the cut | Exit 6–9f inCubic from `D − 14`; the frame 3f before the cut shows only the carrier |
| Accelerate through the cut or land ≥10f early | Covers complete 2–5f before the cut and hold; camera carries use matching spline slopes (`three-camera`) |

## One cover layer for the whole film

Floods, irises, wipes, block wipes and flashes are all one full-frame plane on the camera-locked overlay (1 unit = 1 px, so radii and edges are in composition px), drawn by one shader:

| `uMode` | Draws | Handoffs |
| --- | --- | --- |
| 0 flat | The colour at `uOpacity` | Flash-to-white, impact, fade to black (final frame only) |
| 1 disc | Inside radius `uRadius` around `uCenter` | Flood becomes object, iris-out, burst |
| 2 hole | Outside the radius | Iris-in onto an object |
| 3 wipe | Behind an edge travelling along `uDir` | Panel wipe, white wipe-up from the bottom, diagonal wipe |
| 4 blocks | 12 × 7 cells by sweep 0.62 + clump 0.24 + jitter 0.14 | Block wipe (textured families) |

- It lives on the camera, so camera moves, punches and shakes never uncover an edge; `renderOrder` 950, no depth test, never picked.
- It is never tone mapped, and its colour is the next scene's background or carrier **exactly**: tested to the pixel across a cut.
- `screenPx(object, cam, width, height)` gives the on-screen point a flood should start from (the pressed button), and `coverRadius()` the radius that reaches the farthest corner × 1.05.

## Recipes at a glance

| Handoff | Scene N | Scene N+1 | Where |
| --- | --- | --- | --- |
| Flood becomes object | Disc from the button, 10f inCubic, complete 3f early | Opens in that colour; disc contracts onto the object 13f, then fades as the real object takes over | cover-layers §2 |
| Iris-in to an object | — | Hole shrinks from the frame to the object's radius over 30f | cover-layers §3 |
| White wipe-up | Wipe, last 8f, ease-in, 40 px feather | Opens white | cover-layers §4 |
| Block wipe | Cells grow out of an on-screen object of the wipe's colour, 18–24f | Starts covered, clears with the same cells; entrance clocks offset +12f (`prog(frame + 12, …)`) | cover-layers §5 |
| Flash-to-white | Ramp the last 4–8f, ease-in | Decay 6–9f | cover-layers §6 |
| Colour-field push | Panel slides over, 8–23f | Panel slides off; content carries 46 px → 0 over 16f | cover-layers §7 |
| Persisting element | Carrier lands on the handoff pose, no exit | Same factory, same pose on frame 0, then moves in its new role | carries §1 |
| Match-push | Push to the exact crop | Laid out at that crop's scale | `three-camera` moves §7 |
| Continuous loop | Spin or time from **film** frame | Same function, same film frame | carries §3 |
| Rush into the lens | Camera to 0.35 from the object, last 14f inCubic, ground to white | Opens white | carries §4 |
| Whip | Content flung out with sub-frame motion blur | Enters from the opposite side at the same speed | carries §5–6 |
| Exit-then-cut | Everything leaves, clear 4–8f early | First element 3–6f after the cut | carries §7 |
| Board erase | Strokes un-draw from `D − 18` over 10f, 8f blank | Identical blank paper | carries §8 |

## Picking the build for a film

- The signature handoff goes on chapter turns and the peak; the workhorse (usually exit-then-cut or a persisting element) on the rest. At most two transition styles besides plain cuts.
- Floods, irises and block wipes want a carrier on screen to motivate them: a button that is pressed, a mark, a dot, a packet in the wipe's colour. A flood or a wipe from nowhere is decoration.
- Flash-to-white on every cut only in a music film, with the cut on the hit.
- Motion blur is for the 8–10f around a whip, never a whole film: it multiplies render time by the sample count and the editor can't point at objects inside it.
- Fade to black only on the final frame or a chapter break of a long piece.

## A complete pair: flood becomes object

The LightPay handoff, as two scenes sharing one constant. Tested: the last frame of the first scene and the first frame of the second are the same colour to the pixel, and the disc then contracts onto the pill.

```ts
// components/handoff.ts
export const FLOOD = "#c8f31d";          // the flood colour IS the next scene's ground
export const PILL_R = 150;               // px: the disc lands at the pill's size

// scenes/01-hook.ts (frame callback): the pressed button floods the frame
const f = prog(frame, D - 13, 10, inCubic);                  // 10f ease-in, complete 3f early
const c = screenPx(button, cam, width, height);
cover.mesh.visible = f > 0;
cover.u.uMode.value = 1;
cover.u.uOpacity.value = 1;
cover.u.uCenter.value.set(c.x, c.y);
cover.u.uRadius.value = f * coverRadius(c.x, c.y, width / 2, height / 2);

// scenes/02-deposit.ts (frame callback): opens inside the flood, contracts into the pill
const k = prog(frame, 0, 13, inOutCubic);
const p = screenPx(pill, cam, width, height);
cover.mesh.visible = frame < 22;
cover.u.uMode.value = 1;
cover.u.uCenter.value.set(lerp(0, p.x, k), lerp(0, p.y, k));
cover.u.uRadius.value = lerp(coverRadius(0, 0, width / 2, height / 2), PILL_R, k);
cover.u.uOpacity.value = 1 - prog(frame, 13, 8, outCubic);   // the real pill takes over
```

Both scenes build `cover = coverLayer(width, height, FLOOD)` on `overlay(scene, cam, height)`. Sound: a whoosh 3f before the flood begins, an optional impact one frame after the cut (`sound-design`).

## Timing on both sides of a cut

| Handoff | Scene N (frames before the cut) | Scene N+1 (frames after) |
| --- | --- | --- |
| Flood becomes object | flood `D−13 … D−3`, hold | contract 0–13, release 13–21 |
| Persisting element | carrier lands by `D−6`, others gone by `D−8` | carrier moves from 4 for 16–22f |
| Match-push | push `D−34 … D−10`, hold | settle or creep from 0 |
| Flash-to-white | ramp `D−6 … D` | decay 0–8 |
| White wipe-up | `D−8 … D` | opens white |
| Block wipe | `D−22 … D−2` | clears 0–20, entrances offset +12f |
| Exit-then-cut | exits `D−14 … D−7` | first entrance at 3–6 |

## Building order for a multi-scene film

1. From the beat table in VIDEO.md, list every cut with its handoff (signature or workhorse) and its carrier.
2. Write `components/handoff.ts`: carrier poses, colours, crops, and the film-frame start of every scene (`SCENE_START`), matching `project.json`.
3. Build each scene's last 15f and the next scene's first 15f together, before the middles.
4. Capture both frames of every cut; fix mismatches by changing the shared constant, never one side.
5. Only then fill the middles of the scenes, and add sound cues at the frames the handoff table gives.

## Anti-patterns

- **Hoping an object "carries over".** It is rebuilt; if its numbers are not shared, it jumps.
- **A flood colour typed twice**, or tone mapped in one scene and not the other: a one-frame flicker at the cut.
- **The cover plane in world space**: a punch-in uncovers its edge. Put it on the overlay.
- **Drift running into a matched cut.**
- **Decelerating into the last frame** of a move that crosses the cut.
- **A different transition on every cut.**
- **Footage or late-loading images inside a motion-blurred scene**: the frame is accumulated before they land.
- **Randomness in a dissolve or block wipe**: cells come from a seeded hash and a fixed `uSeed`.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Checking each cut | `capture-frames` on the last frame of N and the first of N+1, side by side | None |
| Measuring a match | `ffmpeg` to sample the carrier's pixels in both frames of an export | Compare the shared constants by reading both scenes |
| Which handoff, how long, which sound | `motion-language`, `direction`, `sound-design` | — |

## Checks before you finish

1. For every cut, `capture-frames` on the last frame of N and the first of N+1: the carrier matches in position, size, rotation and colour (sample a pixel of floods; the values are identical).
2. The frame 3f before each exit-then-cut shows background only; every cover completes 2–5f before its cut; every block wipe's first cells touch an on-screen object of their colour.
3. Parked carriers (an object waiting in a node, a certificate set aside) sit in a reserved slot that clears every label on the first and last frame of each scene; one larger than its parking spot is hidden while parked.
4. Every handoff number exists once, in `components/handoff.ts`, imported by both scenes; continuous loops run on film frame and the scene-start table matches `project.json`.
5. Cover planes are on the camera overlay, `toneMapped: false`, `pickable = false`.
6. A frame checker flagging single-colour frames at flood or flash cuts shows the carrier colour, not an empty scene.
7. No randomness or wall-clock timing in any transition; block wipes use a fixed seed; `validate` passes.
