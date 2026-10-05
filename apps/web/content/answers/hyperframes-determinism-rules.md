---
title: "What are the HyperFrames determinism rules, in one checklist?"
description: "Same composition, same video, every time, as long as nothing in a frame reads the clock, an unseeded random number or the network. The rules, the reason for each, and the lint codes that enforce them."
tool: hyperframes
kind: explainer
date: "2026-10-05"
updated: "2026-10-05"
tags: ["determinism", "rules", "agents", "checklist"]
related:
  - hyperframes-element-hidden-in-render-but-visible-in-preview
  - hyperframes-animation-is-static
  - hyperframes-render-looks-different-from-preview
  - hyperframes-check-passed-but-the-video-is-wrong
  - why-does-my-render-look-different-from-the-preview
sources:
  - label: "HyperFrames: Deterministic Rendering"
    url: "https://hyperframes.heygen.com/concepts/determinism"
  - label: "HyperFrames rules and anti-patterns"
    url: "https://hyperframes.heygen.com/prompting/rules-and-anti-patterns"
  - label: "HyperFrames: Animate with GSAP"
    url: "https://hyperframes.heygen.com/guides/gsap-animation"
  - label: "HyperFrames: Time elements with data attributes"
    url: "https://hyperframes.heygen.com/concepts/data-attributes"
genmotion:
  heading: "The rules, applied by the agent"
  body: |-
    GenMotion's agent writes from the HyperFrames skills, which encode these rules, and validates the composition after it edits. You get a deterministic project without keeping the checklist in your head, and you can still read and edit the HTML yourself, because the project is a plain HyperFrames folder.
faqs:
  - q: "Why does determinism matter?"
    a: "It is the guarantee everything else rests on. It is why automated pipelines, CI tests and AI-driven editing can be trusted: the same composition always produces the same video."
  - q: "How does HyperFrames compute a frame's time?"
    a: "With integer math, never a clock: time equals floor(frame) divided by fps. Every animation is then seeked to exactly that time. The answer to what frame 90 looks like depends on one thing that changes, the number 90."
  - q: "Can I use randomness?"
    a: "Yes, if it is seeded. Math.random() without a seed gives a different frame on every run. Use a seeded generator such as mulberry32. For a stepped, stop-motion hold, quantise on the integer frame index rather than elapsed seconds, because seek times do not land on exact 1/fps values and second-based arithmetic drifts."
---

HyperFrames does not play your video. It asks for one frame at a time, and the answer to "what does frame 90 look like?" depends on exactly one thing that changes: the number 90. Everything below follows from that.

## How a frame is made

1. **Frame clock.** The engine works out the time with integer math: `time = floor(frame) / fps`. Real time is never consulted.
2. **Seek.** Every animation, DOM change and canvas draw is moved to exactly that time. All GSAP timelines are paused and seeked, never played.
3. **Capture.** Chrome's `HeadlessExperimental.beginFrame` grabs the pixels in one atomic operation, so there are no half-painted frames.
4. **Encode.** FFmpeg turns the frames into the MP4 and mixes in audio from your `<audio>` and `<video>` elements.

## The checklist

**Technical requirements.** Breaking these produces incorrect renders.

1. **Register every timeline** on `window.__timelines`. The renderer cannot seek an animation it does not know about. The key must equal `data-composition-id`. ([Why animation is static](/answers/hyperframes-animation-is-static))
2. **Create timelines paused.** `gsap.timeline({ paused: true })`.
3. **Keep sound on the video, or use `<audio>`.** A video with sound keeps it on the `<video>` with `data-has-audio="true"` and no `muted`. Silent footage and b-roll take `muted`. Use a separate `<audio>` for music and voiceover.
4. **No wall clock.** No `Date.now()`, no `requestAnimationFrame`, no system timers.
5. **No unseeded randomness.** No bare `Math.random()`. Use a seeded PRNG.
6. **No fetching mid-render.** Every asset loads before the first frame. No `async`, `await` or `fetch()` while a timeline is being built.
7. **Fixed output.** `fps`, `width` and `height` are locked before frame 0.
8. **A finite length.** Every composition has a known end. Prefer an explicit root `data-duration`.
9. **Timed elements need `class="clip"`**, plus `data-start`, `data-duration` and `data-track-index`. (A video needs its own timing too: [video renders black](/answers/hyperframes-video-renders-black).)

**Best practices.** The skills apply these by default and you may override them with a reason: add entrance animations to every scene, and add transitions between scenes.

## Seek-order rules

A render worker may seek non-linearly, so anything whose value depends on *when* or *in what order* it ran can differ from your preview. Each of these has a lint code.

- State the visible end state of anything that starts hidden. `gsap_cold_seek_hidden_fromto_missing_reveal`. ([Explained](/answers/hyperframes-element-hidden-in-render-but-visible-in-preview))
- Set initial hidden state outside the timeline. `gsap_timeline_set_initial_hide`.
- Do not stack a relative tween on a property another writer animates. `gsap_relative_value_second_writer`.
- Do not combine `repeatRefresh: true` with a relative value. `gsap_repeat_refresh_relative_value`.
- Function-valued tween vars get `(index, target, targets)`. `gsap_function_value_hazard`.
- Do not measure DOM geometry in a timeline callback. `gsap_callback_dom_measurement`.
- Do not centre with CSS `translate(-50%, -50%)` on an element GSAP moves with `x` or `y`. Centre with flex or grid, or let GSAP own the offset with `xPercent` and `yPercent`. `gsap_css_transform_conflict`.

## Rule out your machine

Fonts and Chrome versions differ between computers, so a local render can shift by a pixel from one machine to the next. Render in Docker for exact reproducibility, which pins the Chromium version, the font set and the FFmpeg encoder:

```bash
npx hyperframes render --docker --output output.mp4
```

One caveat on "identical every time": parallel workers are not bit-identical to each other. A default multi-worker render can differ by a few plus or minus one pixel levels at worker chunk boundaries. If you need exact bits, pass `--workers 1` and compare lossless frames rather than the encoded MP4.

## Check it worked

```bash
npx hyperframes lint
npx hyperframes check
npx hyperframes snapshot --at 0,3,8
```

`lint` enforces the rules above, and `snapshot` shows you seeked frames. Neither replaces looking at a draft render before you ship. See [why a green check can still mean a wrong video](/answers/hyperframes-check-passed-but-the-video-is-wrong).
