---
title: "Why does every HyperFrames render take 45 seconds longer than it should?"
description: "A composition that never registers a GSAP timeline still makes the renderer wait for one, and gives up after a fixed 45 seconds. The cost is flat on every render. One attribute removes it."
tool: hyperframes
kind: error
errors:
  - "missing_data_no_timeline"
  - "sub_timeline_readiness_timeout"
date: "2026-10-05"
updated: "2026-10-05"
tags: ["performance", "timelines", "render"]
related:
  - hyperframes-render-is-slow
  - hyperframes-animation-is-static
  - hyperframes-first-render-is-a-still-image
sources:
  - label: "HyperFrames troubleshooting: every render takes about 45 seconds longer"
    url: "https://hyperframes.heygen.com/guides/troubleshooting"
  - label: "hyperframes#2107: registry blocks register their timeline asynchronously"
    url: "https://github.com/heygen-com/hyperframes/issues/2107"
  - label: "HyperFrames: Animate with GSAP"
    url: "https://hyperframes.heygen.com/guides/gsap-animation"
genmotion:
  heading: "Iterate in the preview, render once"
  body: |-
    The studio compiles on every change and previews frame by frame, so most of your iterations never touch a render at all. The export, where a fixed wait hurts, happens once, on your own machine, driven from the project you already have open. Pick the HyperFrames engine when you start a project and describe the video.
faqs:
  - q: "Will lowering the quality or resolution help?"
    a: "No. The wait is a fixed cost, so it does not shrink with draft quality, a smaller resolution or smaller media. It is the same 45 seconds whether the video is two seconds long or two minutes."
  - q: "How do I know this is my problem and not something else?"
    a: "A render that always pauses for close to 45 seconds before it makes progress, regardless of what you change, is the signature. lint also reports missing_data_no_timeline when the attribute is absent on a composition with no timeline."
  - q: "What if I do have a timeline?"
    a: "Then the wait ends as soon as the timeline appears, long before the timeout, as long as it registers synchronously. A timeline built inside an async callback appears too late and can cost the full 45 seconds."
---

You have a short composition. It should render in seconds. Every render sits for most of a minute doing nothing first, and no setting you change makes the wait shorter.

## Why it happens

The producer decides a composition is ready by polling for `window.__timelines[<id>]` until the composition player reports ready. If nothing ever registers, it gives up after `player-ready-timeout`, which defaults to **45 seconds**. That wait is a fixed cost paid on every render. It does not scale with quality, resolution or media size, so lowering any of those cannot reduce it.

A composition with no GSAP timeline at all, because it is static, a still image, or built from video and audio only, has nothing to register. So it pays the full wait every time.

## Fix: declare that there is no timeline

```html
<div
  data-composition-id="promo"
  data-no-timeline
  data-width="1920"
  data-height="1080"
  data-duration="6"
></div>
```

`data-no-timeline` tells the renderer not to wait. `npx hyperframes lint` reports the omission as `missing_data_no_timeline`, so it is easy to find.

If you do want an animation, register a timeline instead of skipping the wait: see [why an animation can be static](/answers/hyperframes-animation-is-static).

## Other ways to pay the same bill

**Registering the timeline too late.** If a timeline is created inside an `async` function or a `.then()`, it is not in `window.__timelines` when the producer first looks. The wait then runs to the timeout. This is documented as a bug in several registry blocks: the map blocks fetch their topology data from a CDN at render time and build their whole timeline inside the async callback, and a device-mockup block registers its timeline inside an async ready handler. Both stall for 45 seconds and fall back to screenshot capture. That report is still open, so if you use those blocks, expect it.

**A script that throws.** If the composition script errors before building the timeline, the timeline never registers and you pay the wait, then get a video that never moved. See [why the first render can be a still image](/answers/hyperframes-first-render-is-a-still-image).

**Static sections that are not marked.** A bare `data-composition-id` host used for a static section was reported as burning the full player-ready budget on every render, for the same reason.

## Check it worked

```bash
time npx hyperframes render --quality draft --output review.mp4
```

Before the change the draft render takes about 45 seconds longer than the work it does. After it, the wait is gone. Then see [the full list of reasons a render is slow](/answers/hyperframes-render-is-slow) for what is left.
