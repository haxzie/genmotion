---
title: "Why is my HyperFrames render slow, and what actually speeds it up?"
description: "Separate a slow preview from a slow render, find the fixed 45 second tax, then work through source video, filters, encoding and resolution. Real fixes from HyperFrames' own performance guide."
tool: hyperframes
kind: error
date: "2026-10-05"
updated: "2026-10-05"
tags: ["performance", "render", "webm"]
related:
  - hyperframes-render-takes-45-seconds-longer
  - hyperframes-fonts-wrong-in-render
  - hyperframes-render-looks-different-from-preview
sources:
  - label: "HyperFrames: Fix a slow preview or render"
    url: "https://hyperframes.heygen.com/guides/performance"
  - label: "HyperFrames troubleshooting: the render is slow"
    url: "https://hyperframes.heygen.com/guides/troubleshooting"
  - label: "HyperFrames rules and anti-patterns: do not over-spec resolution or framerate"
    url: "https://hyperframes.heygen.com/prompting/rules-and-anti-patterns"
  - label: "hyperframes#3927: default BeginFrame capture and a capture-mode summary"
    url: "https://github.com/heygen-com/hyperframes/pull/3927"
genmotion:
  heading: "Keep slow renders out of your edit loop"
  body: |-
    Editing in GenMotion happens in a live, frame-accurate preview. The MP4 is rendered only when you export, on your own machine, so a heavy scene costs you time once instead of on every change. The studio bundles its own ffmpeg for the encoding, so there is nothing to install or tune.
faqs:
  - q: "My preview stutters. Will the render be slow?"
    a: "Not necessarily. Preview has to draw each frame in real time, so it is limited by your hardware. Render can take as long as it needs per frame and never drops one. A composition that stutters in preview still renders correctly."
  - q: "How do I iterate faster?"
    a: "Render at draft quality while you work: npx hyperframes render --quality draft --output review.mp4. Draft changes capture and encoder quality but does not change the composition's timing. Use standard or high only for delivery."
  - q: "Should I render at 4K or 60 fps by default?"
    a: "Not unless the delivery target needs it. The defaults of 1920 by 1080 at 30 fps render fast and look good, and higher specs slow rendering meaningfully. HyperFrames' own prompting guide lists over-specifying resolution and frame rate as an anti-pattern."
---

Start by deciding which kind of slow you have, because the fixes do not overlap.

| What you see | Look first at |
| --- | --- |
| Preview stutters in one scene | Large blurs, masks, shadows, or many animated layers in that scene |
| Preview pauses the first time an image appears | Oversized source images or image decoding |
| The whole page is slow | Script work, layout thrashing, or too many DOM nodes |
| Render is slow but the result is correct | Source video extraction, frame capture, or encoding |
| WebM takes much longer than MP4 | VP9 encoding. Transparent WebM is CPU-heavy |
| Every render pauses about 45 seconds before doing anything | A [missing timeline](/answers/hyperframes-render-takes-45-seconds-longer) |

## 1. The flat 45 second wait

If every render, however small, starts with a long pause, it is not your content. A composition that never registers a timeline makes the producer wait out a fixed 45 second timeout. Fix it with `data-no-timeline` or by registering a real timeline. See the [45 second answer](/answers/hyperframes-render-takes-45-seconds-longer). Rule this out first: it is the biggest single saving for small projects.

## 2. Make a fast review render

```bash
npx hyperframes render --quality draft --output review.mp4
```

Draft reduces capture and encoder quality. It does not change timing, so what you check in the draft is what you ship. Use `standard` or `high` for the final.

## 3. Expensive browser work

Browsers are doing the rendering, so anything expensive in a browser is expensive here.

- Use fewer large `backdrop-filter` and `filter: blur()` layers.
- Avoid animating dozens of shadowed elements at once.
- Replace a static blur or texture stack with a pre-rendered image.
- Size images near their actual delivery dimensions. A very large JPEG still decodes into a very large bitmap. For a 1920 by 1080 composition, a 3840 by 2160 source already gives a 2x display enough detail.
- Keep work inside animation callbacks small. Do not read layout and write styles in the same frame.

## 4. Do not over-spec the output

The defaults of 1920 by 1080 at 30 frames per second render fast and look good. Higher specs slow rendering meaningfully. Ask for 4K only when the delivery target needs it, and supersample instead when you can, with `--resolution`.

## 5. WebM is not MP4

WebM uses the CPU-heavy VP9 encoder, and transparent WebM is the worst case. If you must render it, you can trade encoding time for compression with `--vp9-cpu-used`, which takes integers from -8 to 8. Higher values are faster, with a larger quality and size tradeoff.

```bash
npx hyperframes render --format webm --vp9-cpu-used 2 --output overlay.webm
```

## 6. Find out whether you fell back to screenshot capture

A render on Linux that fell back to screenshot capture used to look like a normal success while being much slower. Since a September 2026 change, `hyperframes render` prints the capture path, GPU mode and per-stage timings, and local auto GPU mode now requests BeginFrame instead of clamping to screenshot. If your summary says screenshot, there is a hint naming the remaining blockers, such as not using `chrome-headless-shell` or using a `--resolution` upscale, which stays on screenshot capture by design.

## 7. Measure before you change things

```bash
npx hyperframes preview
```

Open Chrome DevTools, choose Performance, record the part that stutters, and look at the longest tasks. Paint or Composite Layers points to filters, shadows or masks. Layout or Recalculate Style points to layout work. Script points to your own code. Change one expensive feature, record again, and keep the version that moves the bottleneck. To tune worker settings for a final render, run `npx hyperframes benchmark`.

## Check it worked

Time a draft render before and after each change, one change at a time, so you know which one paid off.
