---
title: "Why is my Remotion render slow, and why does more concurrency make it worse?"
description: "Concurrency is not a dial you turn up. Too high and too low are both slow. Remotion's own performance guide, in order: video tag, concurrency benchmark, GPU effects, slow JavaScript, data fetching, codec, resolution, and Lambda."
tool: remotion
kind: error
date: "2026-10-05"
updated: "2026-10-05"
tags: ["performance", "concurrency", "lambda", "offthreadvideo"]
related:
  - remotion-timed-out-evaluating-page-function
  - remotion-render-stuck
  - remotion-lambda-toomanyrequestsexception
  - is-remotion-worth-it-for-saas-feature-videos
sources:
  - label: "Remotion: Performance tips"
    url: "https://www.remotion.dev/docs/performance"
  - label: "Remotion: Lambda concurrency"
    url: "https://www.remotion.dev/docs/lambda/concurrency"
  - label: "Remotion: Encoding guide"
    url: "https://www.remotion.dev/docs/encoding"
  - label: "remotion#4783: Remotion is too slow to use in production"
    url: "https://github.com/remotion-dev/remotion/issues/4783"
genmotion:
  heading: "Keep the pipeline out of the picture"
  body: |-
    Tuning concurrency, codecs and Lambda is the price of owning a rendering pipeline, and it is worth paying when video is your product. If it is not, GenMotion lets you describe the video, refine it in a live preview and export once on your own machine, with no pipeline to tune. GenMotion does not render Remotion projects: it builds Three.js and HyperFrames videos. [Remotion alternatives, compared honestly](/blog/remotion-alternatives).
faqs:
  - q: "Does more concurrency make renders faster?"
    a: "Not reliably. Remotion's docs say the concurrency flag can influence the speed both positively and negatively, and that a concurrency too high and one too low can both be counterproductive. Run npx remotion benchmark to find the best value for your machine and composition."
  - q: "Which video tag is fastest?"
    a: "Use Video from @remotion/media for the best video rendering performance. Remotion's docs say both Html5Video (the old Video from the remotion package) and OffthreadVideo are not optimised, and suggest migrating if you still use them."
  - q: "How many Lambda functions does Remotion spawn by default?"
    a: "It depends on video length. Concurrency is the frame count divided by framesPerLambda. By default Remotion chooses a framesPerLambda of at least 20, and the default concurrency scales from 75 to 150 over the first ten minutes at 30 fps. The hard limits are a minimum framesPerLambda of 5 and a maximum concurrency of 200."
---

If you came here from an issue titled "Remotion is too slow to use in production", the honest answer is that rendering video is one of the heaviest workloads a computer can take on, and Remotion aims to perform comparably to traditional video editing software. Your result also depends on your code and your hardware. These are the levers in Remotion's own guide, in the order to try them.

## 1. Use the right video tag

Use `<Video>` from `@remotion/media` for the best video performance. Both `<Html5Video>` (formerly just `<Video>` from the `remotion` package) and `<OffthreadVideo>` are not optimised. If you are still on an old tag, migrate.

## 2. Find the right concurrency, do not guess

```bash
npx remotion benchmark
```

The `--concurrency` flag can speed a render up or slow it down. Too high is counterproductive, because the browser tabs compete for CPU and memory, which also produces [page function timeouts](/answers/remotion-timed-out-evaluating-page-function). Too low leaves cores idle. The benchmark command tries values and reports the best one for your machine.

## 3. Watch the GPU effects

These all use the GPU: WebGL content (Three.js, Skia, p5.js, Mapbox), 2D canvas graphics, and GPU-accelerated CSS such as `box-shadow`, `text-shadow`, linear and radial gradients as `background-image`, `filter: blur()` and `filter: drop-shadow()`.

Cloud compute instances have no GPU and can take a long time to render them, which becomes the bottleneck. Replace the effect with a precomputed image where you can.

## 4. Find slow JavaScript

Render with `--log=verbose`, which lists the slowest frames, and use `console.time` around suspicious work. Use `useMemo()` and `useCallback()` to cache expensive computation. The first frames in a thread can be slow from initialisation, so look past those.

## 5. Measure your data fetching

Measure the impact of external resources, look for overfetching, and cache in local storage where you can to reduce time on the network.

## 6. Pick the codec and format with speed in mind

- Image format `png` is slower than `jpeg`, but `png` is required for a transparent video.
- The WebM codecs `vp8` and `vp9` are very slow to encode because of stronger compression.

H.264 is the default and rated very fast to encode. See the [encoding guide](https://www.remotion.dev/docs/encoding) for every tradeoff.

## 7. Lower the resolution

Higher resolutions make the render slower. If you can live with less, scale down with `--scale`. (If text looks soft, go the other way: see [blurry text in exported video](/answers/remotion-blurry-text-in-exported-video).)

## 8. If it is Lambda or Cloud Run

Lambda splits a video into chunks rendered concurrently. By default Remotion picks a `framesPerLambda` of at least 20, scaling concurrency from 75 to 150 across the first ten minutes at 30 fps. The limits are a minimum `framesPerLambda` of 5 and a maximum concurrency of 200, and beyond roughly that point more functions do not make a render faster. Set `framesPerLambda` to `null` and let Remotion choose.

Two more things people mistake for slowness:

- A new AWS account can have a concurrency limit as low as 10, which makes distributed rendering look broken. See [the rate limit answer](/answers/remotion-lambda-toomanyrequestsexception).
- A single chunk waiting on a slow remote media file holds up the whole render. See [stuck renders](/answers/remotion-render-stuck).

Cloud Run renders a video inside one instance rather than distributing chunks. One report measured about five minutes for a 10 second video on the default 1 CPU instance, and found that assigning up to 8 CPUs per instance sped it up but reduced how many videos could render at once.

## Check it worked

Change one thing at a time and re-run `npx remotion benchmark` or a short render with `--log=verbose`, so you know which change paid off.
