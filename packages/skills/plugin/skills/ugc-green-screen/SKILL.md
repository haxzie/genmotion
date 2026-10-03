---
name: ugc-green-screen
description: "The commentary ad: a presenter cut out over a full-bleed source (a competitor's pricing page, a review, a thread, a search result, a chart) reacting line by line, with drawn marks turning the reaction into an argument. Covers what makes a source worth reacting to, the layout inside the safe zone, direction defaults, beat sheets with frame budgets at 15, 30 and 45 seconds, hook options, mark timings to the word, the three presenter routes (the user's clip, a keyed generated still, or presenter-free with a cursor), the sound plan, and building it on Three.js."
---

# UGC green screen

A presenter stands in front of something the viewer can read and argues with it. The source does the persuading; the presenter points.

Read `direction` first, then this, with `ugc-ad-foundations` (shared numbers, claims), `ugc-craft` (moves, captions) and `ai-presenter` when a face is generated. Frames at 30 fps; positions on 1080×1920.

> **These are references, not rules.** The numbers, beat sheets, style families and examples here are starting points distilled from work that landed well, not a recipe to fill in. The user's instructions always win over anything in this skill. When a different idea serves the brief better, propose it and try it: change the structure, break a default, invent a device, and write what you changed and why in `VIDEO.md`. What stays fixed is correctness: determinism, legibility and safe zones, loudness and clipping, licences and credits, and never putting words in a real person's mouth. The checks at the end are a quality bar to clear, not a template to reproduce.

## When to use

- The brief hands you a **thing on a screen that carries the claim**: a competitor's pricing page, a one-star review, a thread asking exactly the user's question, a search result full of bad answers, a chart going the wrong way, a support reply.
- The request says "react to this", "roast this page", "I saw this post", "here's what our competitor charges", "someone said X about us".

Not this when:

- The screen is the product working: `ugc-screen-demo`.
- A felt pain with no source, product demonstrated: `ugc-problem-solution`.
- The user brings their own **filmed** reaction or talking-head footage to be cut and captioned: `video-editing` (it keys and cuts real footage). This skill builds the ad around a source, with or without a short presenter clip.

## Ask first (only what the request does not answer)

1. What page or post is the presenter reacting to? (A URL or a screenshot; I will not invent one.)
2. Is there a real presenter clip, or should I go presenter-free with a cursor (my default) or generate one?

## What makes a source worth reacting to

The best source is something the viewer already half-believes: the ad confirms a suspicion rather than introducing a claim.

| Strong source | Why it works |
| --- | --- |
| A competitor's pricing page, annual toggle on | The viewer already suspects it is expensive |
| A one-star review saying what everyone thinks | It confirms; it does not argue |
| A search result page full of bad answers | Frames the problem before you name it |
| A thread asking exactly the user's question | The ad becomes a reply, not a pitch |
| A chart going the wrong way | Needs no setup |

Weak: a press release, your own landing page, anything needing two sentences of context. Refuse: a named person's post used as an endorsement, a fabricated screenshot attributed to a real company, an invented review. If the user cannot supply the source, mock a **generic** one (an unbranded pricing table, an anonymous review card) and say so in one line. A real third-party page shows only what it actually publishes, captured on a date you write into `VIDEO.md`.

## Layout

| Slot | Where | Size |
| --- | --- | --- |
| Source | Full-bleed behind everything, positioned so the line being read sits in y 300–800 | Scaled so that line's text is ≥34 px tall |
| Presenter cutout | Bottom-left (or bottom-right when the line is left), cropped at the chest by the frame's bottom edge; face inside x 120–480, y 760–1100 | ≤40% of the frame width |
| Caption | The caption line, y 1160 (`ugc-craft` spec) | One line |
| Mark | On the source only, never on the presenter | One at a time |

1. **The cutout never covers the line being read.** Move the presenter between corners per beat, not the source.
2. **The source is never fully covered.** At every frame the viewer can tell it is a real page; the moment it becomes texture, the argument loses its evidence.
3. **Readable at arm's length.** If ≥34 px means showing a quarter of the page, show a quarter of the page.
4. **One colour temperature.** Grade the cutout toward the source (a warm face on a cold white page reads as pasted), and give it a soft shadow: 24 px blur, 25% black, 8 px down.

## Direction defaults

| Line | Default |
| --- | --- |
| Style family | B (Soft-light SaaS) for a page or UI source; E (Chat-UI social) for a thread, post or comment. Look: Native |
| Energy curve | Social ad: the read-aloud line is the hook at 8; micro-peaks on each mark; the **peak** on the turn (the cut to the user's own page); calm ask |
| Pacing | High (a mark, push or cut every 45–90f); never 90f without a change |
| Transitions | Workhorse: hard cut. Signature: the turn is a hard cut to the user's page in **identical framing and scale**, so only the content changes; focus pushes carry the eye to each line |
| Sound | VO-led, bed 0.12; a pop on each mark landing; a tonal note (or the bed's return on a downbeat) on the turn |
| Memorable moment | The turn frame: their number, then ours, in the same place |

## Beat sheets

**30 s (900f), reacting to a competitor's pricing page**

| # | Frames | Job | On screen | VO (words) |
| --- | --- | --- | --- | --- |
| 1 | 0–75 | Hook | Source full-bleed at frame 0, the price in y 300–500; presenter already in, or rising from the bottom edge over 9f outCubic | "Four hundred dollars. A year. For this." (7) |
| 2 | 75–165 | Mark | Circle draws on the price over 12f, completing on "cheap" | "And that's the cheap tier." (5) |
| 3 | 165–300 | Reaction | Focus push 30f onto the feature row; strike-through on the greyed items after the word | "Half of it is greyed out until you upgrade." (9) |
| 4 | 300–390 | Turn (peak) | Hard cut to the user's own page, identical framing; a tonal note on the cut | "So we put all of it in one price." (9) |
| 5 | 390–540 | Proof | Underline wipes under the price over 9f, completing on the number | "[Price] a month. Everything on." (6) |
| 6 | 540–720 | Demo | Cut to the product doing one thing; presenter corner-locked | "Same job, in about [time]." (6) |
| 7 | 720–900 | Ask | Presenter steps up to 1.2 (jump zoom), source dims 20%; CTA text ≥60f | "Link's in my bio if you want to look." (9) |

Bracketed values come from the user or stay bracketed. 51 words of a 73 budget: the marks need the air.

**15 s (450f)**: 0–60 hook (read the line) · 60–150 mark · 150–240 turn to the user's page · 240–360 proof with an underline · 360–450 ask. ≤35 words.

**45 s (1350f)**: 0–75 hook · 75–165 mark · 165–300 reaction push · 300–480 a second source that agrees (a review), one mark · 480–570 turn · 570–720 proof · 720–1080 demo in two beats · 1080–1170 objection ("Is it worse? No.") · 1170–1350 ask. Two sources is the ceiling; a third turns it into a deck.

## Hook options

The source's own line, read aloud flatly, is the default hook: **Pain** ("Four hundred dollars. A year."), **Contrarian** (strike through a common claim: "This advice is wrong."), **Social proof** (a real thread: "Everyone's asking the same thing."), **Curiosity gap** (the line half-cropped, revealed by the push). `ugc-hooks` has the frame-0 builds.

## Marks

A reaction without a mark is a person talking over a picture. One mark per claim, completing on the stressed word, cleared before the next.

| Mark | Use it for | Draw | Lands |
| --- | --- | --- | --- |
| Hand-drawn circle | A number, a price, a single word | 12f, outCubic on the path progress, slightly uneven, overshooting the close by 8° | Completes on the word's first frame ±2f |
| Underline | A sentence just read aloud | 9f wipe left to right, outQuart | Completes on the last stressed word ±2f |
| Strike-through | A claim being rejected | 8f, after the word, never before | Starts 2f after the word ends |
| Arrow | A second element a circle cannot reach | 10f, shaft then head | With the word naming the element |
| Focus push | The line is small and the argument is on it | `ugc-craft` focus push: 30f inOutCubic to ≥34 px text | Starts on the word naming the line |

Marks are one colour (the ad's accent, or a marker red #FF3B30), 10–12 px stroke at 1080 wide. Each fades over 6f, finishing before the next mark or cut. Never two marks at once. Build the VO first, read its word timings, then place every mark: marks placed before the audio exists always land late.

## The presenter: three routes

1. **The user's clip** (best). A green-screen or plain-wall clip, trimmed and re-encoded per `screen-capture` (VP9 WebM at the project fps, a keyframe every 15 frames, a 0.5 s tail). Key it in the scene (Three.js: a chroma-key shader on the video plane, similarity 0.08–0.12, 1–2 px soft edge, green spill pulled toward grey) or pre-key it with `ffmpeg` (`chromakey=0x00B140:0.12:0.08,despill=type=green`) into a VP9 WebM with alpha (`-pix_fmt yuva420p`, same keyframe interval) for HyperFrames or React.
2. **A keyed generated still** (`ai-presenter`): `generate-image` a chest-up person on a flat pure green (#00B140), lit from one side, phone framing, looking slightly off-lens; key it with the same `ffmpeg` filter into a PNG with alpha. Drive it with a lipsync model through the `fal` connector if connected, in takes ≤4 s (`ai-presenter`); otherwise a still cutout with the `ugc-craft` creep, used for ≤1/3 of the ad.
3. **Presenter-free** (default when there is no clip and no lipsync connector). A cursor moves to the price, hesitates 8f, the circle draws, the caption lands: it reads as a person screen-sharing. Cheaper, and safer with claims.

There is no background-removal capability: a cutout comes from a key colour, the user, or not at all.

## Sound plan

Per `sound-design` and `ugc-craft`: frame 1 is the first word of the read; bed 0.12, instrumental, low energy (90–110 BPM) so the voice owns it; a soft pop 0.45 on each mark's completion frame (a marker squeak at 0.3 under the draw is optional); a tonal note 0.5 on the turn (or the bed's next section starting on that frame), every other cut silent, never a whoosh; room tone 0.03 under a still presenter. Master −14 LUFS, ≤ −1 dBTP.

## Building it

- **Source**: a still. The user's screenshot via `save-asset`; a page you build as a scene and capture with `capture-frames`; or `generate-image` for a generic page. Never a live embed. Positions and pushes are anchored on the line being read.
- **Three.js** (default): the source is a plane sized from the image's real pixels (`three-assets`), with mipmaps on so a zoomed-out page does not shimmer. Focus pushes scale the source plate in log space around the line (or dolly the camera, `three-camera`). The cutout is a plane in front of the source with the key shader or an alpha texture; its shadow a blurred dark plane behind it. Marks are canvas-texture planes redrawn per frame to their progress (an arc stroked from 0 to `p × 2π`, the wobble from a seeded hash of the mark index, never randomness), or a tube geometry revealed with a draw range. Captions in a camera-parented overlay (`three-type`).
- **HyperFrames**: the source an `<img>` in a wrapper the timeline scales; marks as inline vector paths whose stroke is drawn on by a timeline tween; the presenter a `<video>` or `<img>` with alpha.
- **React**: the same with `interpolate` on the frame; marks as SVG paths with an animated dash offset.

Voice: `pick-voice` once, then `voiceover`; conversational, mid-pace, no announcer lift.

## Good and bad

- **Bad**: the cutout covers the price while the VO reads it. **Good**: the presenter moves to the other corner for that beat.
- **Bad**: the whole pricing page at 1080 wide, nothing readable. **Good**: the price row only, at 48 px, with the circle on it.
- **Bad**: three circles on screen at once. **Good**: circle on "cheap", cleared, then a strike on the greyed items.
- **Bad**: a mocked page with a real competitor's logo and an invented price. **Good**: their real published price, dated in `VIDEO.md`, or an unbranded table and a one-line note.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The source | `save-asset` for the user's screenshot or URL capture | Build a generic page as a scene and capture it, or `generate-image` a generic version |
| A presenter | The user's clip, or `ai-presenter` with the `fal` connector | Presenter-free with a cursor |
| Keying, trims | `ffmpeg` | The in-scene key shader on Three.js; or go presenter-free |
| Narration | `pick-voice` then `voiceover` | A caption-led silent cut; the marks still carry the argument |
| Mark and turn sounds | `sfx` | Credited CC0 pops via `web-research` + `save-asset` |

## Checks before you finish

1. `capture-frames` at frame 0: the source is legible and the line being read is ≥34 px; at frame 15 the presenter (or cursor) is in frame.
2. Capture each mark's completion frame: exactly one mark visible, and it completes within ±2f of its word's start (compare with the VO's word timings).
3. On every captured frame, the cutout does not overlap the line being read, its face is inside x 120–480, y 760–1100, and it is ≤40% of the width.
4. Capture the frames either side of the turn: identical framing and scale, only the content changed.
5. Four captures with the sound off: the argument survives on the source, marks and captions alone.
6. Every number on the source and in the VO traces to the user's material or a dated capture; mocked pages are generic.
7. `validate` passes; then run `ad-qa` in full.
