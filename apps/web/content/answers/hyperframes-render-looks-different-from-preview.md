---
title: "Why does my HyperFrames render look different from the preview?"
description: "Preview and render run the same runtime, so a real difference has a specific cause: fonts, remote media, a cold-seek state problem, the wrong entry file, or a variable that never arrived. Here is how to find which."
tool: hyperframes
kind: error
date: "2026-10-05"
updated: "2026-10-05"
tags: ["preview", "render", "determinism", "fonts"]
related:
  - hyperframes-fonts-wrong-in-render
  - hyperframes-element-hidden-in-render-but-visible-in-preview
  - hyperframes-check-passed-but-the-video-is-wrong
  - hyperframes-determinism-rules
  - why-does-my-render-look-different-from-the-preview
sources:
  - label: "HyperFrames: Deterministic Rendering"
    url: "https://hyperframes.heygen.com/concepts/determinism"
  - label: "HyperFrames troubleshooting: the render looks different from preview"
    url: "https://hyperframes.heygen.com/guides/troubleshooting"
  - label: "HyperFrames: Fix a slow preview or render"
    url: "https://hyperframes.heygen.com/guides/performance"
  - label: "hyperframes#2064: render drops data-variable-values in sub-compositions"
    url: "https://github.com/heygen-com/hyperframes/issues/2064"
genmotion:
  heading: "One runtime for the preview and the file"
  body: |-
    In GenMotion the editor preview and the export are the same HyperFrames page. The export drives it frame by frame in an offscreen window and ffmpeg encodes the frames into the MP4, on your own machine, so there is no second renderer for the preview to disagree with.
faqs:
  - q: "Are preview and render really the same?"
    a: "They are designed to be. Both run the same hyperframe.runtime, the producer's seek behaviour is the single source of truth, and readiness gates hold capture until the composition is fully loaded. So every frame should look the same. A real visual difference means something specific differs, and the list below covers the known ones."
  - q: "Preview stutters but the render looks perfect. Is that a problem?"
    a: "No. Preview plays in real time and is limited by your hardware. Render is seek-driven and takes one frame at a time, so it never drops a frame however expensive that frame is. A composition that stutters in preview still renders correctly."
  - q: "How do I rule out my machine?"
    a: "Render in Docker with npx hyperframes render --docker --output output.mp4. Docker pins the Chromium version, the font set and the FFmpeg encoder, so the platform stops being a variable."
---

The design goal is that they match, and the docs say why they should: preview and render run the same runtime, and capture waits until the composition is fully loaded. So when they differ, one of a short list of things is different. Check in this order.

## 1. Fonts

The most common visible difference. Fonts and Chrome versions differ between computers, so a local render can shift by a pixel from one machine to the next, and a font that your machine resolves may not resolve the same way elsewhere. Embed the font with `@font-face` rather than relying on a system font. See [the fonts answer](/answers/hyperframes-fonts-wrong-in-render).

## 2. Remote media

Remote media can fail because of permissions, expiring URLs or cross-origin restrictions. Prefer a local project asset. Confirm the path, the filename capitalisation, and whether the file was moved or renamed.

## 3. An element that only exists in sequence

If something is hidden and revealed by a tween, a render worker that seeks directly to a later frame restores the authored hidden state instead of what the preview showed. Elements stay invisible, or appear early. See [the cold-seek answer](/answers/hyperframes-element-hidden-in-render-but-visible-in-preview).

## 4. You are not looking at the same file

If `check`, `snapshot` and `render` all look blank or wrong, you may be rendering the scaffold instead of your composition. See [the wrong entry file answer](/answers/hyperframes-render-black-wrong-entry-file).

## 5. A value that arrives in preview and not in render

One confirmed case: `data-variable-values` passed to a sub-composition were injected by `preview` and `snapshot`, but `render` left the variables empty and painted the JavaScript defaults, silently and with exit code 0. It was reported against 0.7.42 and closed on July 8, 2026. If your composition uses variables on sub-compositions and an old version, compare a rendered frame, not a snapshot.

## 6. Browser-specific effects

The docs' own checklist for this symptom is fonts, remote media, browser-specific effects and the actual exported file. If an effect such as a blur or a filter looks different in the render, rule out your machine first with a Docker render, which pins the Chromium version.

## What is not a difference

**Speed.** Preview plays in real time and can stutter. Render never drops a frame. Do not "fix" a stuttering preview by degrading the composition, because the render will be perfect regardless.

**Tiny pixel noise between parallel workers.** A default multi-worker render can produce a handful of plus or minus one pixel level differences at worker chunk boundaries. If you need bit-exact output, use `--workers 1`.

## Check it worked

```bash
npx hyperframes render --docker --output output.mp4
```

If the Docker render matches your preview, the difference was your machine. If it does not, the difference is in the composition: go back to causes 3 to 5. For a wider view of the principle behind this, see [why a render looks different from the preview, for any tool](/answers/why-does-my-render-look-different-from-the-preview).
