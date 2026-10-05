---
title: "What does 'delayRender \"Loading root component\" was called but not cleared' mean in Remotion?"
description: "This one is not about your code. It means Remotion was pointed at a file that never calls registerRoot(). Pass the right entry point and it goes away."
tool: remotion
kind: error
errors:
  - 'A delayRender() "Loading root component" was called but not cleared after 28000ms'
date: "2026-10-05"
updated: "2026-10-05"
tags: ["delayrender", "entry-point", "render-errors"]
related:
  - remotion-delayrender-was-called-but-not-cleared
  - remotion-timed-out-evaluating-page-function
  - remotion-render-stuck
sources:
  - label: "Remotion: Root component timeout"
    url: "https://www.remotion.dev/docs/troubleshooting/loading-root-component"
  - label: "Remotion: Debugging timeouts"
    url: "https://www.remotion.dev/docs/timeout"
genmotion:
  heading: "No entry point to get wrong"
  body: |-
    GenMotion scaffolds the project and its entry for you, so there is no `registerRoot()` to wire up and no path to pass on a command line. GenMotion does not render Remotion projects: it builds Three.js and HyperFrames videos. You describe the video, and it exports on your own machine. [Remotion alternatives, compared honestly](/blog/remotion-alternatives).
faqs:
  - q: "Is this the same as the generic delayRender timeout?"
    a: "It shares the message but not the cause. The generic timeout means your code created a delayRender that was never cleared. This one means the entry point you gave Remotion never registered a root, so there was nothing to render. The fix is different."
  - q: "Which file is the entry point?"
    a: "In most of Remotion's templates it is src/index.ts, the file that calls registerRoot(). It is not src/Root.tsx, which holds the list of compositions, and it is not the file of the component you want to render."
---

```
A delayRender() "Loading root component" was called but not cleared after 28000ms
```

If you saw this, do not go hunting for a `continueRender()` in your components. The cause is simpler, and it is in how you invoked Remotion.

## What it means

Remotion starts a page and waits for your root component to register itself. The call that does that is `registerRoot()`. If the file you passed as the entry point never calls it, the wait is never satisfied, and after about 30 seconds Remotion reports the timeout.

## Why it happens

You specified an entry point that does not call `registerRoot()`. The usual mistakes:

- You passed the **list of compositions** (`src/Root.tsx` in most templates) instead of the file that registers it.
- You passed the filename of **a component** you want to render.

## Fix

Pass the file that calls `registerRoot()`. In most templates that is `src/index.ts`.

```bash
npx remotion render [entry-point] [composition-id] out/video.mp4
```

For example `npx remotion render src/index.ts MyComp out/video.mp4`. In the Node API, the same value goes in the `entryPoint` property of `bundle()`.

```ts
const bundled = await bundle({ entryPoint: "./src/index.ts" });
```

## Check it worked

The render should start and show frame progress within a few seconds. If you still get a root component timeout, open the entry file and confirm it contains a `registerRoot(RemotionRoot)` call. If it does and you still see the error, you may be looking at [the generic delayRender timeout](/answers/remotion-delayrender-was-called-but-not-cleared) with an unrelated cause.
