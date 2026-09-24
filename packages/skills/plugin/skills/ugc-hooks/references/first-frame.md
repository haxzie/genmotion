# Building frame zero

How each hook family lands as the first scene of a composition. All timings are from the scene's own start.

## The shape, for every family

One scene, 2 to 3 seconds, three elements:

- **The plate.** An image, a video frame, or a flat field with type. Present at 0.00, never animated in. If it is a video, it is already mid-motion at the first frame, which means trimming the source so the clip does not start on a still.
- **The line.** In by 0.15, settled by 0.4. One line, two at most, at the frame preset's largest display size. The hook line is the largest text on screen; the brand is not on screen at all.
- **The beat.** Something changes before 0.5s. A punch-in, a hard cut, a caption word landing, a hand entering.

Give the hook its own scene file, numbered `01-`. `ugc-variants` replaces it wholesale, so nothing else in the composition may depend on its internals.

## Per family

| Family | Plate | Line treatment | Beat |
| --- | --- | --- | --- |
| **Pain** | The failure state, product absent, available light. Slightly untidy. | Lower third, plain, no flourish. It should read as a caption, not a headline. | A slow push in over the 3 seconds, starting immediately. Nothing else moves. |
| **Curiosity gap** | Deliberately ambiguous. Something half-built, half-visible, cropped. | Centre, large, per-word cut-in. The last word lands on the beat. | A hard cut at 1.2s to a second ambiguous angle of the same thing. |
| **Pattern interrupt** | The abrupt thing itself, already in motion at frame 0. | One or two words, slammed in at 0.1s, oversized. | The interrupt *is* the beat. A sound on frame 1 doubles it. |
| **Social proof** | The evidence, legible: a thread, a grid, a count. | Top third, above the evidence, so the eye reads line then proof. | The count ticks up, or the grid scrolls, starting at 0.2s. |
| **Contrarian** | The thing being attacked, shown plainly and fairly. | Centre, heavy, hard snap at 0.15s. | A mark lands over the plate at 0.6s: a cross, a strike-through, a circle. |
| **Authority** | The credential, visible: past work, a rate card, a results table. | Lower third, restrained. Authority does not shout. | A slow reveal of the evidence, left to right, over 1.5s. |
| **Result** | The finished outcome, playing or complete, at frame 0. | Corner, small, with the number as the largest element. | The result plays. Do not cut away from it inside the hook. |
| **Direct callout** | Close, direct, uncluttered. The viewer's context, not the product's. | Centre, large, in by 0.2s. | A punch in on the first stressed word. |

## Text effects

Use a named text-animation effect if your project's animation system offers one; do not hand-roll per-word spans. For a hook line specifically the effects that survive are the hard ones: a snap, a slam, a per-word cut-in, a mask wipe. Anything that fades, floats, blurs in or eases slowly reads as a title card, and a title card is the thing a hook exists to not be.

Exit the line before the scene ends, or hard-cut out of the scene with the line still up. Never let it fade out over a beat of nothing.

## Sound

If there is any audio at all, something happens on frame 1. Music that starts on a downbeat, a single transient, a spoken word already in progress. Silence under the first half-second is indistinguishable from a video that has not loaded.

## Safe zones

The hook line sits in the middle 60 percent of the height. On a 1080x1920 canvas that is roughly y 380 to y 1540. Above it is the platform's own chrome; below it is the caption block and the action rail. A hook line in the bottom fifth is a hook line nobody read.
