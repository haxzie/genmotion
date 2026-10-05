---
title: "Why is my Remotion render stuck, and what do I check first?"
description: "A Remotion render that hangs at a percentage, or at the last frame, with no error. Four checks in order: a delayRender longer than your Lambda timeout, verbose logs, Chrome Headless Shell, and the Lambda errors field."
tool: remotion
kind: error
date: "2026-10-05"
updated: "2026-10-05"
tags: ["stuck-renders", "chrome", "lambda"]
related:
  - remotion-delayrender-was-called-but-not-cleared
  - remotion-timed-out-evaluating-page-function
  - remotion-render-is-slow
  - remotion-lambda-toomanyrequestsexception
sources:
  - label: "Remotion: Debugging stuck renders"
    url: "https://www.remotion.dev/docs/troubleshooting/stuck-render"
  - label: "Remotion: Debugging failed Lambda renders"
    url: "https://www.remotion.dev/docs/lambda/troubleshooting/debug"
  - label: "Remotion: Debugging timeouts"
    url: "https://www.remotion.dev/docs/timeout"
genmotion:
  heading: "An export you can watch"
  body: |-
    GenMotion exports run on your own machine, driven frame by frame from the editor you already have open, so there is no Lambda function to time out silently and no chunk to go missing. GenMotion does not render Remotion projects: it builds Three.js and HyperFrames videos. [Remotion alternatives, compared honestly](/blog/remotion-alternatives).
faqs:
  - q: "Why is there no error?"
    a: "If the delayRender() timeout is larger than the thing waiting on it, the render can hang indefinitely without failing. On Lambda, if the delayRender timeout is bigger than the Lambda function timeout, the function times out first and the delayRender never gets the chance to fail, so you get no message."
  - q: "Can I use the Chrome from my package manager?"
    a: "Remotion's docs advise against it. Do not download Chrome from a Linux package manager and do not set --chrome-executable. Let Remotion download a compatible Chrome Headless Shell, and use npx remotion browser ensure to make sure it is ready before the first render."
  - q: "What are the symptoms people report?"
    a: "Stuck at a percentage such as 89, stuck at the last frame, stuck in calculateMetadata(), and a chunk that times out with no error, which leaves the whole render waiting until the function timeout."
---

A hang with no error is the worst case, and Remotion's own docs have a short checklist for it. Work through it in this order.

## 1. Is a `delayRender()` outliving everything else?

If the `delayRender()` timeout is too big and never resolves, a render can get stuck indefinitely without an error message. This is more confusing on Lambda, whose runtime also has a timeout: if the `delayRender()` timeout is bigger than the Lambda function timeout, the function times out first, and the `delayRender()` never fails, so there is no error at all.

To debug it:

- Set the `delayRender()` timeout to a smaller value, so that if it does not resolve an error message appears.
- Always call `cancelRender()` for any error that prevents you from calling `continueRender()`.

See [the delayRender answer](/answers/remotion-delayrender-was-called-but-not-cleared) for the full list of causes.

## 2. Turn on verbose logging

```bash
npx remotion render --log=verbose
```

This shows failures from the browser and from child processes that would otherwise be silent.

## 3. Make sure Chrome Headless Shell is used

Newer Chrome versions may no longer work with Remotion and can leave a render stuck, because Chrome removed the old headless mode. Remotion needs Chrome Headless Shell instead. This does not occur on Remotion Lambda.

Follow these practices:

- Do not download Chrome from a Linux package manager.
- Do not set `--chrome-executable`. Let Remotion download a compatible Chrome Headless Shell for you.
- Run `npx remotion browser ensure` so a compatible version is ready before the first render.

## 4. Lambda: are you reading the `errors` field?

If `overallProgress` looks stuck on Lambda:

- Read the `errors` field from `getRenderProgress()`, because there may be errors you are not displaying.
- Stop polling `getRenderProgress()` when `fatalErrorEncountered` is `true`.

If one chunk is running much longer than the rest, check whether it is loading a remote video or audio file. With `<Video>` or `<Audio>` from `@remotion/media`, Remotion may fetch only the byte ranges it needs, and a slow or uncached range request can make one chunk wait much longer than the others. If your assets are on Cloudflare R2, serve them through a custom domain with caching on, because the `r2.dev` development URL does not support caching. If the response header says `CF-Cache-Status: DYNAMIC`, it was not served from cache. A source video with long gaps between keyframes makes this worse, so re-encoding it with a shorter keyframe interval can help.

To make a stalled media load fail before the function reaches its execution timeout, set `delayRenderTimeoutInMilliseconds` on the media component to a value below the Lambda timeout, and use `delayRenderRetries` if it should retry.

## 5. Too much load

A stalled browser from CPU or memory overload surfaces as [a page function timeout](/answers/remotion-timed-out-evaluating-page-function). Lower the concurrency.

## Check it worked

After each change, run a short render of a few seconds with `--log=verbose` rather than the full video. A stuck render should now either finish or fail with a message you can act on.
