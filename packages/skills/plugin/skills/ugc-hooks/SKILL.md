---
name: ugc-hooks
description: "The first 1.5 to 3 seconds of a UGC or social ad: the visual plus verbal plus rhythm triple, frame-zero rules with frame timings, eight hook families matched to audience temperature, how each family is built as the opening scene on any engine, hook variants (three openings on one body, built as swappable scenes), and a library of sixty-plus hook lines with their paired visuals. Load it whenever you write, choose or rewrite an opening, or the user says an ad starts slow."
---

# UGC hooks

The hook is not the first line. It is the first **frame**, the first five words and the first movement, arriving together inside half a second. Get one of the three wrong and the other two do not save it.

Frames are at 30 fps. Positions are on 1080×1920; the readable area and caption band are the shared numbers in `ugc-ad-foundations`.

## When to use

- Writing, choosing or rewriting the opening of any short-form ad, including the hook beat of a UGC owner's beat sheet.
- The user says an ad "starts slow", "doesn't grab", or asks for openings to test.
- Building hook variants of a finished ad.

Not for: the body and CTA (`ugc-scripting`), the edit after the opening (`ugc-craft`), the opening of a launch film (`launch-playbook` and `direction`'s energy curve).

## The triple

Write all three down before writing the line.

| Layer | The question it answers | Fails when |
| --- | --- | --- |
| **Visual** | What is on screen at frame 0, before anything animates? | A logo, a title card, a black frame, a person about to speak |
| **Verbal** | What are the first five words, spoken and on screen? | A greeting, a name, a throat-clear ("So I've been using…"), a sentence that needs the next one to mean anything |
| **Rhythm** | What moves, cuts or sounds inside the first 15f? | Nothing does. A held frame reads as a pause, and a pause reads as an ad |

Two out of three is a weak hook. If you can only get two, keep the visual: it works muted.

## Frame zero, in frames

Frame 0 is the autoplay still and the half-second a scrolling thumb spends deciding. Treat it as a poster.

| Element | Timing | Rule |
| --- | --- | --- |
| The plate (image, footage, UI, flat field with type) | Present at frame 0, already mid-motion | Never animated in. Trim a clip's head so frame 0 is not a still or a blink |
| The hook line | Starts on frame 0–2, legible by frame 6, holds ≥ `max(30, 9 × words + 15)` frames | ≤7 words, the largest text on screen, inside y 270–450 (or on the caption line at y 1160 when it is the spoken line captioned) |
| The movement | Starts before frame 15 | A jump zoom, a punch-in, a hard cut, a hand entering, a caption group landing, a count ticking |
| Sound | Frame 1 | A transient, a downbeat or a word already in progress; never silence or a fade-in |

The hook line's entrance is a hard one: a 4f pop (scale 0.9 → 1, outCubic), a slam, or a per-word cut-in at 3–4f per word. Anything that fades, floats or eases in over 12f or more reads as a title card. No logo and no brand name in the first second; the brand appears in context by 3–4 s (`ugc-ad-foundations`).

Contrast carries the frame: if it reads as grey at thumbnail size, it gets scrolled past. One focal point, inside the readable area x 120–840, y 270–1210.

`references/first-frame.md` has the plate, line placement and beat for each family below. Read it when you build the hook scene.

## The eight families

Pick by **audience temperature**: how much the viewer already knows about the problem and the product.

| Family | What it does | Temperature | Example shape |
| --- | --- | --- | --- |
| **Pain** | Names the failure state, flatly | Cold to warm | "Three hours to make one video. Every week." |
| **Curiosity gap** | Opens a loop the viewer has to close | Cold | "Nobody told me you could do this in a browser." |
| **Pattern interrupt** | Breaks the visual or verbal expectation | Cold | A hand slams a laptop shut. "Stop." |
| **Social proof** | Borrows someone else's judgement (real numbers only) | Warm | "Four hundred people tried this last week." |
| **Contrarian** | Attacks what the viewer assumes | Cold to warm | "Stop paying an editor." |
| **Authority** | Shows the speaker would know (real credential only) | Warm | "I've shipped forty launch videos. Here is what changed." |
| **Result** | Leads with the outcome, backwards | Warm to hot | "This took eleven minutes." |
| **Direct callout** | Names the viewer | Hot | "If you're launching this week, this one's for you." |

Selection, in order:

1. **Cold** (does not know the problem is solvable): pattern interrupt or curiosity gap.
2. **Warm** (knows the problem, not the product): pain or social proof.
3. **Hot** (knows the product, retargeting): result or direct callout.
4. **Contrarian** works cold and warm and is the least predictable family; test it against a safer one, never ship it as the only hook.
5. **Authority** needs a credential the user supplied. Without one it reads as a stranger asserting.

When the brief does not say, assume cold: a cold hook works on a warm audience; the reverse rarely does.

Each UGC owner lists the families that suit its format; prefer those.

## Building the hook scene

The hook is its own scene, 45–90f (1.5–3 s), with nothing else in the film depending on its internals. That is what makes it swappable.

- **Three.js** (default): the plate is a textured plane sized from real pixels or a video texture seeked per frame (`three-assets`); the hook line is canvas-texture planes per word on the camera-locked overlay while the punch-in scales the plate, so the text never moves (`three-type`); the movement is a camera move (`three-camera`). Start the plate's creep at a non-zero progress so frame 0 is already moving.
- **HyperFrames**: the hook is the first slot in the timeline; the plate is an `<img>` or `<video>` element, the line a timed element with a 4f tween, all on the seekable timeline.
- **React**: `<TextAnimation>` with a hard effect for the line; the plate scaled with an `interpolate` on the frame.

Sound for the hook goes on the timeline at frame 0 with `place-audio` (VO line, or a transient from `sfx`), never inside the scene.

## Hook variants

Hooks carry the most variance and are the cheapest to change, so they are the axis to vary first. Three hooks against one body and one CTA teaches more than nine random ads.

1. Build the complete ad once, with hook A.
2. Write hooks B and C from **different families** (three pain hooks teach nothing). Keep each the same length as A, or adjust the next scene's start so the body is untouched.
3. Give each hook its own scene file (`scenes/01-hook-a.ts`, `01-hook-b.ts`, `01-hook-c.ts` on Three.js; a separate slot file per hook on HyperFrames) and its own VO clip. The body and CTA scenes are shared, unchanged.
4. Export one file per hook by pointing the first scene entry at that hook's file (or copying the project folder per variant), and name the exports `<ad>-hook-a.mp4` and so on.
5. Record the matrix in `VIDEO.md` under the Direction block: `Variants: A pain "…" · B curiosity "…" · C result "…"`, so the next session and the user know which axis each file tests.

Only once a hook wins, vary the body (a different proof) or the CTA, one axis at a time. A full hook × body × CTA grid is 27 files; build it only when the user asks for it.

## The library

`references/hook-library.md` holds sixty-plus lines grouped by family, each with the visual it needs and its temperature, plus the stacks worth trying. Read it when you are choosing a specific line rather than a family. Swap every specific for the user's own: a hook's power is its detail, and a borrowed detail is a generic one.

## Good and bad

- **Bad**: frame 0 is the logo on a brand-colour field; "Introducing…" fades in at 0.5 s. **Good**: frame 0 is the render bar at 6%, already crawling; "Three hours. For fifteen seconds of video." is legible by frame 6; a jump zoom at frame 12.
- **Bad**: "Are you tired of slow video editing?" (a question nobody asked). **Good**: "Still exporting." over a spinner held one beat too long.
- **Bad**: three variants that all open on pain. **Good**: pain, curiosity gap, result.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The plate | `save-asset` for the user's own, `generate-image` for a staged still | Typography alone: a bold line on a flat field is a legitimate frame 0 |
| The spoken line | `pick-voice` then `voiceover` | Caption-only; the verbal layer becomes the on-screen line |
| The movement | A jump zoom or punch-in (`ugc-craft`) | A hard cut at frame 12–15 does the same job |
| Sound on frame 1 | `sfx`, or a bed starting on a downbeat (`music`) | The VO's first word, trimmed so it starts on frame 1–3 |
| Looking at it | `capture-frames` | None |

## Checks before you finish

1. `capture-frames` at frame 0. Cover the text: is the image alone worth stopping for? It is not a logo, a title card or a black frame.
2. `capture-frames` at frame 6 and frame 15: the hook line is fully legible at 6, inside y 270–450 (or on the caption line), and something has visibly changed by 15.
3. Read the first five words aloud. A greeting, a name or setup gets cut.
4. The hook line holds for at least `max(30, 9 × words + 15)` frames after it is legible.
5. Frame 1 is audible: the export's first 0.1 s is not silent (check the waveform or `ffmpeg` `astats` on the first 3 frames).
6. For variants: each hook is from a different family, each is its own scene file, and `VIDEO.md` lists the matrix.
7. `validate` passes; then `ad-qa`.
