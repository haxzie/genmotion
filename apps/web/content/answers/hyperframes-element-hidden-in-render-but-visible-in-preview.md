---
title: "Why is an element invisible in my HyperFrames render but fine in preview?"
description: "A render worker seeks straight to a frame and restores the authored state, not whatever the preview last showed. Elements that start hidden need their visible end state stated explicitly, and a fromTo shows its from-state before it starts."
tool: hyperframes
kind: error
errors:
  - "gsap_cold_seek_hidden_fromto_missing_reveal"
  - "gsap_timeline_set_initial_hide"
date: "2026-10-05"
updated: "2026-10-05"
tags: ["gsap", "determinism", "seek"]
related:
  - hyperframes-render-looks-different-from-preview
  - hyperframes-determinism-rules
  - hyperframes-animation-is-static
sources:
  - label: "HyperFrames rules and anti-patterns: cold-seek visibility and seek-order safety"
    url: "https://hyperframes.heygen.com/prompting/rules-and-anti-patterns"
  - label: "HyperFrames: Deterministic Rendering"
    url: "https://hyperframes.heygen.com/concepts/determinism"
genmotion:
  heading: "Scrub to the frame the renderer will draw"
  body: |-
    GenMotion previews a HyperFrames project by seeking to exact frames with the HyperFrames runtime, and the export drives the same page frame by frame. Scrub to any time in the editor and you are looking at what the renderer will capture there, which is the check that catches an element that only exists when played in sequence.
faqs:
  - q: "What is a cold render worker?"
    a: "A worker process that starts fresh and seeks directly to a later frame without having played the frames before it. It restores each element's authored state. Your preview plays sequentially, so it carries state forward that a cold worker never had."
  - q: "Why does my preview hide the bug?"
    a: "Because you scrub past frame zero before the tween exists, and the preview remembers what happened. A render worker may land on a later frame directly."
  - q: "Are parallel workers identical to each other?"
    a: "Not bit for bit. The docs report that a default multi-worker render produced distinct frame hashes across frames that should have been identical, differing by a handful of plus or minus one pixel values at worker chunk boundaries. Determinism holds in the sense that matters, but if you need exact bits, pass --workers 1 and compare lossless frames rather than the encoded MP4."
---

This is the single most common authoring mistake in HyperFrames that looks fine until you render. The mechanism is the same each time.

## The mechanism

A render worker does not play your video from the start. It seeks straight to a frame, and the element's state at that frame is whatever the **authored** state was, adjusted by any tweens that cover that time. Your live preview plays or scrubs in order, so it carries state along: the thing that was visible a moment ago is still visible.

Anything whose result depends on *when* or *in what order* it ran can render differently.

## Pattern 1: reveal the destination, not just the source

An element that starts hidden and is revealed with `gsap.fromTo()` must state the visible end state, not just the `from` vars.

```js
// Hidden element, revealed
tl.fromTo("#card",
  { opacity: 0, y: 24 },
  { opacity: 1, y: 0, duration: 0.5 },   // state opacity: 1 explicitly
  2
);
```

Without `opacity: 1` (or `autoAlpha: 1`) in the destination, a cold worker restores the hidden authored state and the element can stay invisible even when the sequential preview looks correct. The lint rule is `gsap_cold_seek_hidden_fromto_missing_reveal`.

## Pattern 2: set the hidden state outside the timeline

Do not rely on a `tl.set(...)` at position 0 to hide an element at the start. A zero-duration set at exactly frame 0 may not have applied yet when frame 0 renders. Use a bare `gsap.set(...)` outside the timeline, or author the hidden state in CSS or HTML. The lint rule is `gsap_timeline_set_initial_hide`.

## Pattern 3: a `fromTo` shows its start pose early

`immediateRender` back-renders the `from` vars at every time earlier than the tween's own start. So an element you meant to appear at 3 seconds is already on screen at frame 0, wearing its start pose. Preview hides this because you scrub past frame 0 before the tween exists.

If an element must be absent before its cue, use `to()` plus `keyframes`, or a zero-duration `tl.set()` at the beat boundary.

## Pattern 4: anything that depends on order

These all share a root cause and each has a lint rule:

- **A relative tween on a property another writer is animating.** `"+=50"` captures its base when the tween initialises. Sequential playback initialises mid-flight, a cold worker initialises from the end state, and the same frame lands in two places. State absolute end values instead.
- **`repeatRefresh: true` with a relative value.** The offset accumulates per iteration, so a worker that seeks into iteration N never did the earlier ones. Use `fromTo()` with absolute endpoints.
- **Function-valued tween vars.** They receive `(index, target, targets)`, so the first argument is a number, not the element. Do not call an element method on it, and do not read layout from it.
- **Measuring the DOM in a timeline callback.** `getBoundingClientRect()`, `getTotalLength()` and `getComputedStyle()` depend on the DOM state at that moment, and callbacks re-fire on every seek. Compute geometry once at build time.

## Check it worked

```bash
npx hyperframes lint
npx hyperframes snapshot --at 0,3,8
```

`snapshot` seeks directly to those times, which is a much better test than scrubbing in Studio. It is not a guarantee, because a full render on a cold worker is the final word, so confirm on a draft render before you ship. If you need to prove a result bit for bit, render with `--workers 1`.
