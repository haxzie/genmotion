---
title: "Why is my HyperFrames animation static?"
description: "If the render shows your elements frozen in their start state, HyperFrames almost certainly cannot find or seek your timeline. The timeline has to be paused and registered under the exact composition ID."
tool: hyperframes
kind: error
errors:
  - "missing_data_no_timeline"
date: "2026-10-05"
updated: "2026-10-05"
tags: ["gsap", "timelines", "animation"]
related:
  - hyperframes-render-takes-45-seconds-longer
  - hyperframes-nested-paused-timelines-render-black
  - hyperframes-element-hidden-in-render-but-visible-in-preview
  - hyperframes-determinism-rules
sources:
  - label: "HyperFrames: Animate with GSAP"
    url: "https://hyperframes.heygen.com/guides/gsap-animation"
  - label: "HyperFrames troubleshooting: animation is static"
    url: "https://hyperframes.heygen.com/guides/troubleshooting"
  - label: "HyperFrames rules and anti-patterns"
    url: "https://hyperframes.heygen.com/prompting/rules-and-anti-patterns"
genmotion:
  heading: "Timelines you do not have to wire up"
  body: |-
    GenMotion ships the HyperFrames animation skills to its agent, so scenes are written against the rules in this answer (a paused timeline, registered under the composition ID) instead of guessed at. You describe the motion in plain language and scrub the result in the preview. If something does not move, you see it immediately and ask for it to be fixed.
faqs:
  - q: "Does the timeline have to be paused?"
    a: "Yes. Create it with gsap.timeline({ paused: true }). HyperFrames owns the playhead, seeking every timeline to the exact frame time. A timeline that is playing on its own is not under the renderer's control."
  - q: "What must the registry key be?"
    a: "The value of data-composition-id on the composition root, exactly. If the root is data-composition-id=\"my-video\", the line is window.__timelines[\"my-video\"] = timeline. A mismatch means the renderer looks up an ID that does not exist."
  - q: "I have no animation at all, only static content. What do I do?"
    a: "Add data-no-timeline to the composition root. Without a registered timeline and without that attribute, the renderer waits for one that never arrives, which costs 45 seconds on every render. lint reports the omission as missing_data_no_timeline."
---

Your composition looks right in the editor. The render shows every element frozen in the state it had before any animation started, or never visible at all. The renderer is seeking to a time and finding nothing to move.

## The contract

HyperFrames does not play your animation. It asks for a single frame at a time, and moves every registered timeline to exactly that time. So a timeline has to satisfy three conditions:

1. It is created **paused**.
2. It is **registered** on `window.__timelines`.
3. The registry key **matches** `data-composition-id` on the root.

A minimal version that satisfies all three:

```html
<div
  id="root"
  data-composition-id="intro"
  data-start="0"
  data-duration="3"
  data-width="1920"
  data-height="1080"
>
  <h1 id="title" class="clip" data-start="0" data-duration="3" data-track-index="0">
    HyperFrames
  </h1>
</div>

<script>
  const timeline = gsap.timeline({ paused: true });

  timeline.fromTo(
    "#title",
    { opacity: 0, y: 32 },
    { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
    0,
  );

  window.__timelines = window.__timelines || {};
  window.__timelines.intro = timeline;
</script>
```

## What goes wrong

**The key does not match.** The root is `data-composition-id="my-video"` and the registration is `window.__timelines["intro"]`. Nothing connects them. The docs put it plainly: `my-video` must match `data-composition-id="my-video"`.

**The timeline is not paused.** A free-running timeline fights the renderer for control of the playhead.

**Registration happens too late.** If you build the timeline inside an `async` function, a `fetch().then()`, or any callback that runs after the page has loaded, the renderer polls for it, waits, and falls back. The rule is synchronous timeline construction: no `async`, `await` or `fetch()` while the timeline is being set up. See [why that also makes every render slow](/answers/hyperframes-render-takes-45-seconds-longer).

**The timeline never got built because the script threw.** The first error in the log is the cause. See [why the first render can be a still image](/answers/hyperframes-first-render-is-a-still-image).

**There is no animation, but you did not say so.** A composition that never registers a timeline still makes the producer wait for one. If the composition is static by design, declare it:

```html
<div
  data-composition-id="promo"
  data-no-timeline
  data-width="1920"
  data-height="1080"
  data-duration="6"
></div>
```

**Nested timelines.** If you combined paused scene timelines with `.add()`, the parent can report a duration of 0 and nothing will advance. See [the nested paused timelines answer](/answers/hyperframes-nested-paused-timelines-render-black).

## Two smaller rules that avoid the next bug

- Give important tweens an explicit position, and prefer `fromTo()` when both endpoints matter. It stays reliable after backward or random seeks, which is what a render worker does.
- Do not animate layout properties such as `top`, `left`, `width` or `height` repeatedly. Animate transforms and opacity.

## Check it worked

```bash
npx hyperframes lint
npx hyperframes snapshot --at 0,0.6,2.9
```

Look at the first frame, the moving state and the end state. A timeline that looks correct during continuous browser playback can still fail when the renderer seeks straight to a frame, so the seeked snapshot is the real test.
