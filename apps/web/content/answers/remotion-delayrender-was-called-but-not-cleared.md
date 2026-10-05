---
title: "What does 'A delayRender() was called but not cleared after 28000ms' mean in Remotion?"
description: "Remotion waited for something to finish before capturing a frame and gave up after about 30 seconds. The causes, in order of how often they bite: continueRender never called, blocked network, too much concurrency, a large OffthreadVideo, rate-limited remote assets."
tool: remotion
kind: error
errors:
  - "A delayRender() was called but not cleared after 28000ms. See https://remotion.dev/docs/timeout for help."
  - 'A delayRender() "Loading <Html5Video> duration with src=..." was called but not cleared after 28000ms'
date: "2026-10-05"
updated: "2026-10-05"
tags: ["delayrender", "timeouts", "render-errors"]
related:
  - remotion-loading-root-component-timeout
  - remotion-timed-out-evaluating-page-function
  - remotion-render-stuck
  - remotion-render-is-slow
sources:
  - label: "Remotion: Debugging timeouts"
    url: "https://www.remotion.dev/docs/timeout"
  - label: "Remotion: Timeouts with Pexels videos"
    url: "https://www.remotion.dev/docs/miscellaneous/pexels"
  - label: "Remotion: Debugging failed Lambda renders"
    url: "https://www.remotion.dev/docs/lambda/troubleshooting/debug"
  - label: "Remotion: Debugging stuck renders"
    url: "https://www.remotion.dev/docs/troubleshooting/stuck-render"
genmotion:
  heading: "If owning the render pipeline is the cost"
  body: |-
    GenMotion does not render Remotion projects: it builds Three.js and HyperFrames videos. So this fix is yours to make. But if timeouts like this are a tax on videos you only make now and then, GenMotion previews them live and renders on your own machine, with no delayRender to forget and no per-render fee. [Remotion alternatives, compared honestly](/blog/remotion-alternatives).
faqs:
  - q: "Why does it say 28000ms when the default is 30 seconds?"
    a: "Remotion's docs say it waits to make a screenshot but aborts by default after 30 seconds so it does not hang forever, and the error text reports 28000ms. The docs do not explain the two second difference, so treat 28000ms as the default timeout."
  - q: "How do I find which delayRender is the problem?"
    a: "Give each call a label: delayRender('Fetching data from API...'). When it times out, the label appears in the error message, for example A delayRender() \"Fetching data from API...\" was called but not cleared after 28000ms."
  - q: "How do I raise the timeout?"
    a: "Use the --timeout flag, timeoutInMilliseconds in renderMedia() and the other render functions, Config.setDelayRenderTimeoutInMilliseconds() in the config file, or the timeoutInMilliseconds option on an individual delayRender() call. The Img, Audio, Video, Html5Audio, Html5Video and IFrame tags also accept a delayRenderTimeoutInMilliseconds prop. Only raise it for work that is legitimately slow, such as an expensive WebGL scene or a large download."
---

Remotion holds a frame until everything that registered a `delayRender()` has called `continueRender()`. If that does not happen within the timeout, the render fails with this message. The timeout defaults to 30 seconds, and the number in the error is 28000ms.

The message is a symptom. Here are the real causes.

## 1. `continueRender()` was never called

Your code created a handle and never cleared it. Remotion waits forever before it starts rendering, and the timeout fires.

```tsx
const [handle] = useState(() => delayRender("Fetching data from API..."));

useEffect(() => {
  fetch(url)
    .then((r) => r.json())
    .then((data) => {
      setData(data);
      continueRender(handle);
    })
    .catch((err) => cancelRender(err)); // do not leave the handle hanging on error
}, []);
```

Two habits fix most of these. **Label every `delayRender()`**, so the timeout names itself. And **always call `cancelRender()`** in the failure path, so an error fails the render loudly instead of waiting out a timeout.

## 2. Blocked network

If you rely on network assets such as fonts, images, video or audio and the machine has no connection or a firewall blocks the request, the handle never clears. In the cloud this is easy to hit: an Amazon VPC can block outgoing requests. Make sure every network resource you need is reachable from wherever the render runs.

## 3. Too much concurrency

When concurrency is set too high, Chrome may decide not to load some `<Html5Video />` elements, which times out. Remotion's docs call this a bug on their side that they plan to fix. The workaround is to lower `concurrency` until Chrome can load all the videos.

## 4. A large `<OffthreadVideo>` download

`<OffthreadVideo>` must download the video before it can read it. If the file is large and the download takes longer than the timeout, the timeout fires. The related message `Loading <Img> with src=http://localhost:3000/proxy?src=...` is this case. Either raise the timeout, or move to `<Video>` from `@remotion/media`, which does not have this limitation and is the recommended tag for new projects.

## 5. Remote assets that throttle you (Pexels is the classic)

```
A delayRender() 'Loading <Html5Video> duration with src="https://videos.pexels.com/..."' was called but not cleared after 28000ms.
```

Pexels deliberately slows videos that are requested often. On Lambda, each of the many functions spawned loads the video, which looks like a burst of requests and gets throttled. Remotion's docs are blunt that this is not a Remotion problem. Use `<Video>` from `@remotion/media` for a more precise network error, or download the file and re-host it on your own server or an S3 bucket instead of linking directly.

## 6. An old Remotion version

Older versions had bugs that caused this, especially 1.x releases importing large assets. Upgrade with `npm run upgrade`.

## If it is a different delayRender message

Two variants have their own causes:

- `A delayRender() "Loading root component"` means [your entry point is wrong](/answers/remotion-loading-root-component-timeout).
- `Timed out evaluating page function` looks similar but is [not a delayRender problem](/answers/remotion-timed-out-evaluating-page-function).

If a render is hanging with no error at all, see [stuck renders](/answers/remotion-render-stuck).

## On Lambda there are two timeouts

Do not confuse them. The `delayRender()` timeout is set with `--timeout` when you render, or `timeoutInMilliseconds` in `renderMediaOnLambda()`. The Lambda function timeout is set with `--timeout` when you deploy the function. If your error says a `delayRender()` timed out, it is the first one, and it is usually a bug in your code.

## Check it worked

Render with verbose logging to see what the browser reports:

```bash
npx remotion render --log=verbose
```

Set `--concurrency=1` temporarily so each log line appears once instead of once per thread.
