# Building frame zero, family by family

How each hook family lands as the first scene. Read it when you build the hook scene. Timings are from the scene's own start at 30 fps; positions are on 1080×1920 and stay inside the readable area x 120–840, y 270–1210 (`ugc-ad-foundations`).

## The shape, for every family

One scene, 45–90f (1.5–3 s), three elements:

- **The plate.** An image, a video frame, a UI, or a flat field with type. Present at frame 0, never animated in. Footage is already mid-motion on its first frame: trim the clip's head (`screen-capture` has the re-encode that keeps the trim frame-exact). A still starts its creep at a non-zero progress.
- **The line.** Starts on frame 0–2, legible by frame 6, ≤7 words, the largest text on screen. Placed in the hook band (y 270–450) unless it is the spoken line captioned on the caption line (y 1160). The brand is not on screen.
- **The beat.** Something changes before frame 15: a jump zoom, a punch-in, a hard cut, a caption group landing, a hand entering, a count ticking.

The hook is its own scene file so variants can replace it whole (`ugc-hooks` → "Hook variants"). Nothing later in the film reads its internals.

## Per family

| Family | Plate | Line treatment | Beat |
| --- | --- | --- | --- |
| **Pain** | The failure state, product absent, available light, slightly untidy | On the caption line, plain, no flourish: it should read as speech, not a headline | Creep starts at frame 0; a jump zoom at frame 12 on the stressed word |
| **Curiosity gap** | Deliberately ambiguous: something half-built, half-visible, cropped | Hook band, large, per-word cut-in at 4f per word; the last word lands on the beat | Hard cut at 36f (1.2 s) to a second ambiguous angle of the same thing |
| **Pattern interrupt** | The abrupt thing itself, already in motion at frame 0 | One or two words, slammed in at frame 3 (4f, scale 1.3 → 1, outCubic) | The interrupt is the beat; a transient on frame 1 doubles it |
| **Social proof** | The evidence, legible: a thread, a grid, a count (real numbers only) | Hook band, above the evidence, so the eye reads line then proof | The count ticks or the grid scrolls from frame 6, outCubic |
| **Contrarian** | The thing being attacked, shown plainly and fairly | Hook band, heavy, hard pop at frame 3 | A mark lands over the plate at frame 18: a cross, a strike-through or a circle (`ugc-green-screen` has the mark timings) |
| **Authority** | The credential, visible: past work, a rate card, a results table | On the caption line, restrained; authority does not shout | The evidence reveals left to right over 45f, inOutCubic |
| **Result** | The finished outcome, playing or complete, at frame 0 | Small, top of the readable area, with the number as the largest element | The result plays; do not cut away from it inside the hook |
| **Direct callout** | Close, direct, uncluttered: the viewer's context, not the product | Hook band, large, legible by frame 6 | A punch-in (1.0 → 1.12 over 8f) on the first stressed word |

## Text effects

The hard ones survive: a 4f pop, a slam (scale 1.3 → 1 over 4f), a per-word cut-in (3–4f per word), a mask wipe over 6f. Fades, floats, blurs and slow eases read as a title card, which is the thing a hook exists not to be. On Three.js each word is its own canvas-texture plane so it can pop alone (`three-type`); on React use a hard `<TextAnimation>` effect rather than hand-rolled spans.

Exit the line with a 6f inCubic exit that clears 4f before the scene ends, or hard-cut out of the scene with the line still up. Never let it fade out over a beat of nothing.

## Sound

If there is any audio at all, frame 1 has it: a word already in progress, a transient, or a bed that starts on a downbeat. Silence under the first half second is indistinguishable from a video that has not loaded. A hard cut at 36f carries a swish (0.5) only if every other hard cut in the ad does.
