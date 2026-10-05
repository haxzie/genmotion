---
title: "What does 'Timed out evaluating page function' mean in Remotion?"
description: "It looks like a delayRender problem and it is not. The browser stopped responding because it is overloaded. The fix is usually to lower concurrency, not to hunt for an uncleared handle."
tool: remotion
kind: error
errors:
  - "Error: Timed out evaluating page function (f, c) => { window.remotion_setFrame(f, c); }"
date: "2026-10-05"
updated: "2026-10-05"
tags: ["timeouts", "concurrency", "render-errors"]
related:
  - remotion-delayrender-was-called-but-not-cleared
  - remotion-render-is-slow
  - remotion-render-stuck
sources:
  - label: "Remotion: Timed out evaluating page function"
    url: "https://www.remotion.dev/docs/troubleshooting/timed-out-page-function"
  - label: "Remotion: Performance tips"
    url: "https://www.remotion.dev/docs/performance"
genmotion:
  heading: "No concurrency setting to tune"
  body: |-
    This error is a browser overloaded by rendering many frames in parallel, a problem that comes with running the pipeline yourself. GenMotion renders on your own machine from the editor you already have open, so there is no concurrency setting to tune. GenMotion does not render Remotion projects: it builds Three.js and HyperFrames videos. [Remotion alternatives, compared honestly](/blog/remotion-alternatives).
faqs:
  - q: "Should I look for a delayRender I forgot to clear?"
    a: "No. Remotion's docs say explicitly that this error does not imply a delayRender was not cleared. The renderer sent a command to the browser and the browser did not answer in time."
  - q: "How long is the timeout?"
    a: "From v4.0.73 it is the value of the --timeout flag, 30 seconds by default. Before v4.0.73 it was 5 seconds."
  - q: "Why would lowering concurrency help?"
    a: "The message means the browser is hanging from CPU and memory overload. Fewer parallel browser tabs means less contention. Remotion also notes that a concurrency that is too high and one that is too low can both be counterproductive, and recommends the benchmark command to find the best value."
---

```
Error: Timed out evaluating page function (f, c) => {
  window.remotion_setFrame(f, c);
}
```

## What it means

The Remotion renderer tried to send a JavaScript command to the browser and the browser did not respond within the timeout. The timeout is the `--timeout` flag from v4.0.73, which is 30 seconds by default (it was 5 seconds before that).

This means the browser is **hanging because of CPU and memory overload**. It does not mean a `delayRender()` was left uncleared, so do not start there.

## Fix

In order:

1. **Lower the concurrency.** More parallel tabs means more contention for the same CPU and memory.
2. **Measure.** Watch the memory and CPU of the render, and add resources if it is simply too heavy for the machine.
3. **Raise `--timeout`** if a frame is legitimately slow.
4. **Look at your own JavaScript.** Watch out for infinite loops, and debug the render to find the slow part.

```bash
npx remotion render --concurrency=2 --timeout=60000
```

## Find the right concurrency, do not guess

Remotion's performance guide says a concurrency that is too high and one that is too low can both slow a render. Use its benchmark command, which tries different values for you:

```bash
npx remotion benchmark
```

## Check it worked

Render with `--log=verbose`, which lists the slowest frames. The first frames rendered in a thread may be slow because of initialisation, so judge by the rest.

If your frames are slow because of GPU-type effects (WebGL, canvas, `box-shadow`, `filter: blur()`) on a cloud instance with no GPU, consider replacing the effect with a precomputed image. See [why Remotion renders are slow](/answers/remotion-render-is-slow).
