---
title: "Why does my video render look different from the preview?"
description: "The principle behind every preview-versus-render mismatch in code-to-video tools: a frame must be a pure function of its time. Here is what breaks that, how HyperFrames and Remotion each enforce it, and how to test for it."
tool: general
kind: explainer
date: "2026-10-05"
updated: "2026-10-05"
tags: ["determinism", "preview", "render", "headless-chrome"]
related:
  - hyperframes-render-looks-different-from-preview
  - hyperframes-determinism-rules
  - remotion-delayrender-was-called-but-not-cleared
  - remotion-blurry-text-in-exported-video
sources:
  - label: "HyperFrames: Deterministic Rendering"
    url: "https://hyperframes.heygen.com/concepts/determinism"
  - label: "HyperFrames rules and anti-patterns"
    url: "https://hyperframes.heygen.com/prompting/rules-and-anti-patterns"
  - label: "Remotion: Quality guide"
    url: "https://www.remotion.dev/docs/quality"
  - label: "Remotion: Debugging timeouts"
    url: "https://www.remotion.dev/docs/timeout"
genmotion:
  heading: "One runtime for the preview and the export"
  body: |-
    GenMotion previews and renders with the same deterministic runtime, so the frame you scrub in the editor is the frame that ends up in the MP4. The export runs on your own machine rather than on a cloud worker, which removes one more place for a render to differ. [What GenMotion is](/blog/introducing-genmotion-ai-motion-video-studio).
faqs:
  - q: "Why would the same code look different in preview and render?"
    a: "Because a live preview plays forward in real time, carrying state with it, while a render asks a headless browser for individual frames, often out of order and across several workers. Anything that depends on the clock, on a previous frame, on randomness, on the network, or on the screen it is displayed on can differ."
  - q: "Is a stuttering preview a sign the render will be bad?"
    a: "No. A preview is limited by your hardware because it must draw in real time. A render takes as long as it needs per frame. Stutter in preview does not carry over to the file."
  - q: "What is the one test that catches most of these?"
    a: "Look at frames from the actual render at three times: the first frame, a moving frame, and the last frame. Then render once more in a clean environment such as Docker."
---

Every tool that turns a web page into a video works the same way underneath. A headless browser draws each frame of your page, the frames are captured as images, and an encoder joins them into a file. The preview you scrub in an editor is a different thing: a browser playing your page live.

That difference is where nearly every mismatch lives.

## The principle

A frame has to be a **pure function of its time**. Give the renderer the same frame number and it must always produce the same pixels, no matter what ran before it, how fast the machine is, or how many workers share the job.

HyperFrames states the rule directly. The time of a frame is computed with integer math, `floor(frame) / fps`, and the answer to "what does frame 90 look like?" depends on exactly one thing that changes, the number 90.

## What breaks it

| Thing a frame reads | Why it breaks | Where it shows up |
| --- | --- | --- |
| The wall clock (`Date.now()`, timers, `requestAnimationFrame`) | Real time differs on every run and on every worker | Animations drift or freeze |
| Unseeded randomness | A different value on every render | A flicker or a layout that changes between runs |
| The network, mid-render | An asset arrives late, or differently, or not at all | Missing images, fonts, video |
| State carried from earlier frames | A render worker seeks straight to a later frame and never saw the earlier ones | Elements hidden in the render but visible in preview |
| The display it is shown on | A video has fixed pixels, a screen has a density | Blurry text on high-density displays |

## How each tool deals with it

**HyperFrames** makes the contract explicit and lints it. Timelines are created paused and registered, seeked to an exact time on every frame, and assets must load before frame 0. Its rules list covers the clock, randomness and fetching, plus a family of seek-order rules for cases where a cold render worker lands on a frame the preview never visited. See [the full checklist](/answers/hyperframes-determinism-rules) and [the HyperFrames-specific causes](/answers/hyperframes-render-looks-different-from-preview).

**Remotion** gives each frame to your React component and asks it to wait for what it needs. If an asset must load before a frame is captured, you hold the render with `delayRender()` and release it with `continueRender()`, and if you do not release it in time, the render fails with a timeout. That is where its most famous error comes from: [A delayRender() was called but not cleared](/answers/remotion-delayrender-was-called-but-not-cleared). Its quality guide also covers the display-density case: video dimensions do not account for a high-density screen, so text renders softer on a 2x display unless you scale the output. See [blurry text in exported video](/answers/remotion-blurry-text-in-exported-video).

## How to test for it

1. **Look at frames, not just the exit code.** Capture the first frame, a moving frame and the last frame of the real render. A timeline that looks right during continuous playback can still fail when a renderer seeks straight to a frame.
2. **Rule out your machine.** Render in a clean, pinned environment (Docker) where the Chrome version, fonts and encoder are fixed. If the result matches your preview there, the difference was your machine.
3. **Render once with a single worker** if you need bit-exact output. Parallel workers each run their own browser process, and rasterisation can differ by a pixel level across them even when your code is perfectly deterministic.
4. **Do not tune the composition for preview speed.** Preview plays in real time and can stutter. Render never drops a frame. A composition that stutters in preview still renders correctly.
